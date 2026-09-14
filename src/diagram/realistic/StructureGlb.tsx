import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  AnimationMixer,
  type AnimationAction,
  type BufferGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  LoopOnce,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector2,
  Vector3,
  type Material,
  type Texture,
} from 'three';
import {
  DRACO_PATH,
  LOD_DISTANCE,
  LOD_SCALE,
  METALNESS,
  MODEL_BOUNDS,
  MODEL_URL,
  STRUCTURAL_TYPES,
} from './rig';
import { useSectionPlanes } from '../useSectionPlanes';
import { firstUnclippedHit, snapToFeature } from '../snapping';
import {
  clearGlbMembers,
  explodedPosition,
  registerGlbMembers,
  type GlbMember,
} from './glbMembers';
import { applyGlbMode, disposeGlbMaterials } from './glbMaterials';
import { PALETTE } from '../palette';
import { useAppStore } from '../../store/useAppStore';
import { LAYERS, type ComponentInfo, type LayerName } from '../../store/types';

useGLTF.preload(MODEL_URL, DRACO_PATH);

/** The GLB's Blender metadata; every field is a string in the file. */
interface GlbExtras {
  discipline?: string;
  element_type?: string;
  ifc_class?: string;
  ifc_type?: string;
  system?: string;
  level?: string;
  grid_ref?: string;
  section?: string;
  material_spec?: string;
  dimensions?: string;
  connected_objects?: string;
}

interface MemberRecord extends GlbMember {
  lod: number | undefined;
  /** Structural types only (rig.ts STRUCTURAL_TYPES); visibility follows Engineering mode. */
  edgeLine: LineSegments | null;
}

const FILTERED_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
] as const;

/** Seconds between culling passes; per-frame distance checks would cost more than they save. */
const CULL_INTERVAL = 0.16;

const scratchCentre = new Vector3();

/** "0.033 x 18.500 x 0.033" → 18.5 */
function longestDimension(dimensions: string | undefined): number {
  if (!dimensions) return 0;
  const parts = dimensions.split('x').map((n) => Number.parseFloat(n.trim()));
  const valid = parts.filter((n) => Number.isFinite(n));
  return valid.length ? Math.max(...valid) : 0;
}

function componentFrom(object: Object3D, layer: LayerName): ComponentInfo | null {
  const extras = object.userData as GlbExtras;
  if (!extras?.element_type) return null;
  return {
    id: object.name,
    name: object.name,
    discipline: (extras.discipline as ComponentInfo['discipline']) ?? 'STR',
    element_type: extras.element_type,
    ifc_class: extras.ifc_class,
    ifc_type: extras.ifc_type,
    system: extras.system,
    level: extras.level ?? 'L00',
    grid_ref: extras.grid_ref ?? '',
    section: extras.section ?? '',
    material_spec: extras.material_spec ?? '',
    length: longestDimension(extras.dimensions),
    status: 'Installed',
    layer,
    connected: (extras.connected_objects ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  };
}

export function layerOf(object: Object3D): LayerName | null {
  let node: Object3D | null = object;
  while (node) {
    if ((LAYERS as readonly string[]).includes(node.name)) {
      return node.name as LayerName;
    }
    node = node.parent;
  }
  return null;
}

/** The exported structure, mounted in realistic mode only. */
export function StructureGlb() {
  const { scene, animations } = useGLTF(MODEL_URL, DRACO_PATH);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const select = useAppStore((s) => s.select);
  const measuring = useAppStore((s) => s.measuring);
  const addMeasurePoint = useAppStore((s) => s.addMeasurePoint);
  const layers = useAppStore((s) => s.layers);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);
  const registerComponents = useAppStore((s) => s.registerComponents);
  const planes = useSectionPlanes(MODEL_BOUNDS);

  // Temporary: previews the Engineering material set before the real mode
  // cutover lands (docs/GLB-BOTH-MODES.md condition 4). Deleted with it.
  const engineeringPreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('engineeringGlb');

  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<AnimationAction[]>([]);
  const recordsRef = useRef<MemberRecord[]>([]);
  const materialsRef = useRef<Material[]>([]);
  const cullClock = useRef(0);

  const duration = useMemo(
    () => (animations.length ? Math.max(...animations.map((c) => c.duration)) : 0),
    [animations],
  );

  useEffect(() => {
    const components: Record<string, ComponentInfo> = {};
    const records: MemberRecord[] = [];
    const materials = new Set<Material>();

    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = true;

      const type = (object.userData as GlbExtras).element_type;
      let edgeLine: LineSegments | null = null;
      if (type && STRUCTURAL_TYPES.has(type)) {
        edgeLine = new LineSegments(
          new EdgesGeometry(object.geometry, 15),
          new LineBasicMaterial({ color: PALETTE.edge }),
        );
        edgeLine.visible = engineeringPreview;
        object.add(edgeLine);
      }
      records.push({
        mesh: object,
        home: object.position.clone(),
        lod: type ? LOD_DISTANCE[type] : undefined,
        edgeLine,
      });
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
      }
      // Collected above from the Realistic material, before this swap.
      applyGlbMode(object, type, engineeringPreview ? 'engineering' : 'realistic');

      const layer = layerOf(object);
      if (!layer) return;
      const component = componentFrom(object, layer);
      if (component) components[component.id] = component;
    });
    recordsRef.current = records;
    registerGlbMembers(records);
    materialsRef.current = [...materials];

    // Materials and textures belong to useGLTF's cache, so these writes must stay idempotent.
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    const textures = new Set<Texture>();
    for (const material of materials) {
      const override = METALNESS[material.name];
      if (override !== undefined && 'metalness' in material) {
        (material as Material & { metalness: number }).metalness = override;
      }
      const slots = material as unknown as Record<string, Texture | null | undefined>;
      for (const slot of FILTERED_SLOTS) {
        const texture = slots[slot];
        if (texture) textures.add(texture);
      }
    }
    for (const texture of textures) {
      if (texture.anisotropy === anisotropy) continue;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    }

    registerComponents(components);

    if (animations.length > 0) {
      // The GLB is exported at frame 0 (scaled 0.001), so seek to the clip's end to show it built.
      const mixer = new AnimationMixer(scene);
      mixerRef.current = mixer;
      actionsRef.current = animations.map((clip) => {
        const action = mixer.clipAction(clip);
        action.loop = LoopOnce;
        action.clampWhenFinished = true;
        action.play();
        return action;
      });
      seek(duration);
    }

    gl.shadowMap.needsUpdate = true;

    return () => {
      // The cached scene is reused on the next mount: hand it back un-exploded, visible, uncut.
      for (const record of records) {
        record.mesh.position.copy(record.home);
        record.mesh.visible = true;
      }
      for (const material of materials) material.clippingPlanes = [];
      for (const record of records) {
        if (!record.edgeLine) continue;
        record.edgeLine.parent?.remove(record.edgeLine);
        record.edgeLine.geometry.dispose();
        (record.edgeLine.material as Material).dispose();
      }
      disposeGlbMaterials();
      // No uncacheRoot: it took 1310 ms on this model, and the mixer is garbage once dropped.
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = [];
      recordsRef.current = [];
      clearGlbMembers();
      materialsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, animations, duration, registerComponents, gl]);

  function applyExplode() {
    const store = useAppStore.getState();
    const factor = store.exploded ? store.explodeFactor : 0;
    for (const { mesh, home } of recordsRef.current) {
      explodedPosition(home, factor, mesh.position);
    }
  }

  // Strip explode, let the clip pose, re-read home, re-apply explode — or scrubbing drifts the explode.
  function seek(time: number) {
    const mixer = mixerRef.current;
    if (!mixer) return;
    const records = recordsRef.current;
    for (const { mesh, home } of records) mesh.position.copy(home);
    // clampWhenFinished pauses the action at its end, and a paused action ignores setTime.
    for (const action of actionsRef.current) {
      action.paused = false;
      action.enabled = true;
    }
    mixer.setTime(time);
    for (const { mesh, home } of records) home.copy(mesh.position);
    applyExplode();
    gl.shadowMap.needsUpdate = true;
  }

  useEffect(() => {
    applyExplode();
    gl.shadowMap.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exploded, explodeFactor, gl]);

  const progress = useAppStore((s) => s.progress);

  // The only writer of mesh.visible: hide set and distance culling as one predicate, or each undoes the other.
  function refreshVisibility(): boolean {
    const { hidden, quality } = useAppStore.getState();
    const scale = LOD_SCALE[quality];
    const eye = camera.position;
    let changed = false;
    for (const { mesh, lod } of recordsRef.current) {
      let visible = !hidden.has(mesh.name);
      if (visible && lod !== undefined) {
        scratchCentre.setFromMatrixPosition(mesh.matrixWorld);
        visible = eye.distanceTo(scratchCentre) < lod * scale;
      }
      if (mesh.visible !== visible) {
        mesh.visible = visible;
        changed = true;
      }
    }
    return changed;
  }

  useEffect(
    () =>
      useAppStore.subscribe((state, previous) => {
        if (state.hidden === previous.hidden && state.quality === previous.quality) {
          return;
        }
        refreshVisibility();
        gl.shadowMap.needsUpdate = true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gl, camera],
  );

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    if (mixer && duration > 0) {
      const target = progress * duration;
      if (Math.abs(mixer.time - target) > 1e-4) seek(target);
    }

    cullClock.current += delta;
    if (cullClock.current < CULL_INTERVAL) return;
    cullClock.current = 0;
    if (refreshVisibility()) gl.shadowMap.needsUpdate = true;
  });

  // Layers toggle the layer groups, a different object from the meshes refreshVisibility writes.
  useEffect(() => {
    scene.traverse((object) => {
      if ((LAYERS as readonly string[]).includes(object.name)) {
        object.visible = layers[object.name as LayerName];
      }
    });
    gl.shadowMap.needsUpdate = true;
  }, [scene, layers, gl]);

  useEffect(() => {
    for (const material of materialsRef.current) {
      material.clippingPlanes = planes;
      material.clipShadows = true;
    }
    const lit = highlightRef.current;
    if (lit) lit.mesh.material.clippingPlanes = planes;
    gl.shadowMap.needsUpdate = true;
  }, [planes, gl, scene]);

  // Members share seven materials, so the selected one gets its own tinted clone.
  // Declared after the mode-swap effect above, so it always clones whichever
  // material that effect just assigned — never a stale one from the other mode.
  const selectedId = useAppStore((s) => s.selected?.id ?? null);
  const highlightRef = useRef<{
    mesh: Mesh<BufferGeometry, Material>;
    original: Material;
  } | null>(null);
  useEffect(() => {
    const mesh = selectedId ? scene.getObjectByName(selectedId) : undefined;
    if (!(mesh instanceof Mesh)) return;
    const original = mesh.material as Material;
    const lit = original.clone();
    // PBR (Realistic) glows via emissive; flat (Engineering) has none, so it swaps colour instead.
    if (lit instanceof MeshStandardMaterial) {
      lit.emissive.set(PALETTE.select);
      lit.emissiveIntensity = 0.6;
    } else if (lit instanceof MeshBasicMaterial) {
      // Same rule as procedural Member: a selected part is always opaque, even a translucent one.
      lit.color.set(PALETTE.select);
      lit.transparent = false;
      lit.opacity = 1;
      lit.depthWrite = true;
    } else {
      return;
    }
    lit.clippingPlanes = original.clippingPlanes;
    mesh.material = lit;
    highlightRef.current = { mesh, original };
    return () => {
      mesh.material = original;
      lit.dispose();
      highlightRef.current = null;
    };
  }, [selectedId, scene]);

  return (
    <primitive
      object={scene}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        // A drag past R3F's click threshold is an orbit, not a pick.
        if (event.delta > 2) return;
        const hit = firstUnclippedHit(event.intersections, planes);
        if (!hit) return;
        if (!measuring) {
          select(hit.object.name);
          return;
        }
        const cursor = new Vector2(
          event.nativeEvent.offsetX,
          event.nativeEvent.offsetY,
        );
        const { clientWidth, clientHeight } = gl.domElement;
        const snap = snapToFeature(
          hit,
          camera,
          cursor,
          clientWidth,
          clientHeight,
          planes,
        );
        addMeasurePoint({
          id: crypto.randomUUID(),
          partId: snap.partId,
          local: snap.local,
          world: snap.world,
          snap: snap.type,
        });
      }}
    />
  );
}
