import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  AnimationMixer,
  type AnimationAction,
  LoopOnce,
  Mesh,
  Object3D,
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
} from './rig';
import { useSectionPlanes } from '../useSectionPlanes';
import { useAppStore } from '../../store/useAppStore';
import { LAYERS, type ComponentInfo, type LayerName } from '../../store/types';

/**
 * The real structure: the demo viewer's Draco-compressed GLB, ~3360 members
 * carrying the metadata this app's `ComponentData` contract was written
 * against.
 *
 * Mounted only in realistic mode. The flat modes keep the procedural boxes in
 * diagram/model.ts — they are a drawing, and a drawing wants a drawing's
 * geometry.
 */

useGLTF.preload(MODEL_URL, DRACO_PATH);

/**
 * The GLB's own metadata, as Blender wrote it. Every field is a string in the
 * file — `dimensions` and `connected_objects` are parsed below.
 */
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

/** One member, with what the per-frame passes need to know about it. */
interface MemberRecord {
  mesh: Mesh;
  /**
   * Where the clip puts the member at the current time, before any explode
   * offset. Re-captured after every seek, because the clip owns the transform
   * and an offset measured against a stale pose collapses the explode.
   */
  home: Vector3;
  /** LOD_DISTANCE for its element type, or undefined if it is never culled. */
  lod: number | undefined;
}

/** Texture slots that are sampled at grazing angles and so want anisotropy. */
const FILTERED_SLOTS = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
] as const;

const EXPLODE_CENTRE = new Vector3(
  (MODEL_BOUNDS.min[0] + MODEL_BOUNDS.max[0]) / 2,
  (MODEL_BOUNDS.min[1] + MODEL_BOUNDS.max[1]) / 2,
  (MODEL_BOUNDS.min[2] + MODEL_BOUNDS.max[2]) / 2,
);

/** Seconds between culling passes. 3000 distances a frame would cost more than the draw calls saved. */
const CULL_INTERVAL = 0.16;

/** Reused by every culling pass rather than allocated inside the frame loop. */
const scratchCentre = new Vector3();

/** "0.033 x 18.500 x 0.033" → 18.5, the longest bounding-box dimension. */
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
    // No mass: see the field's note in store/types.ts.
    status: 'Installed',
    layer,
    connected: (extras.connected_objects ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  };
}

/** Walk up to the layer group the object belongs to. */
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

export function StructureGlb() {
  const { scene, animations } = useGLTF(MODEL_URL, DRACO_PATH);
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const select = useAppStore((s) => s.select);
  const layers = useAppStore((s) => s.layers);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);
  const registerComponents = useAppStore((s) => s.registerComponents);
  const planes = useSectionPlanes(MODEL_BOUNDS);

  const mixerRef = useRef<AnimationMixer | null>(null);
  const actionsRef = useRef<AnimationAction[]>([]);
  const recordsRef = useRef<MemberRecord[]>([]);
  const materialsRef = useRef<Material[]>([]);
  const cullClock = useRef(0);

  const duration = useMemo(
    () => (animations.length ? Math.max(...animations.map((c) => c.duration)) : 0),
    [animations],
  );

  // --- one-time preparation ---------------------------------------------
  useEffect(() => {
    const components: Record<string, ComponentInfo> = {};
    const records: MemberRecord[] = [];
    const materials = new Set<Material>();

    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      // Safe only because every member is its own node with its own bounds,
      // which is exactly what the export preserved. It is the single biggest
      // win on a scene this size.
      object.frustumCulled = true;

      const type = (object.userData as GlbExtras).element_type;
      records.push({
        mesh: object,
        home: object.position.clone(),
        lod: type ? LOD_DISTANCE[type] : undefined,
      });
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        materials.add(material);
      }

      const layer = layerOf(object);
      if (!layer) return;
      const component = componentFrom(object, layer);
      if (component) components[component.id] = component;
    });
    recordsRef.current = records;
    materialsRef.current = [...materials];

    // The materials and textures belong to useGLTF's cache, so everything
    // below is written to be idempotent: a remount re-applies the same values.
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
    // three defaults anisotropy to 1, which blurs a map repeated 5–28 times
    // along a beam down to its compressed axis at any grazing view — and every
    // flange face in a structure is seen at a grazing angle from somewhere.
    for (const texture of textures) {
      if (texture.anisotropy === anisotropy) continue;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    }

    // Registered here rather than in the panel because this is where the
    // scene is known to be loaded and its metadata readable; the panels stay
    // pure consumers with no R3F context of their own.
    registerComponents(components);

    if (animations.length > 0) {
      // THE GLB SHIPS PARKED, NOT BUILT.
      //
      // The exporter samples the scene animation and writes every node from
      // the first frame, so on disk the frame sits scaled to 0.001 and below
      // ground. Setting the Blender scene to the last frame before export does
      // not survive that sampling. Seeking the clip to its end here is what
      // applies the finished transform to every node — without it the
      // viewport is empty and the model looks like it failed to load.
      // Deliberately NOT `action.paused = true`. A paused action has an
      // effective timeScale of zero, and `mixer.setTime` works by resetting
      // every action to t=0 and then advancing by the delta — so with the
      // actions paused the advance is discarded and every seek lands on frame
      // zero, which is the parked pose. The symptom is a model that loads
      // without error and renders at 1/1000 scale.
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

    // The shadow map is only redrawn on demand (see RealisticScene), and the
    // first one may have been drawn before this model finished loading.
    gl.shadowMap.needsUpdate = true;

    return () => {
      // The scene is cached and shared with the next mount: hand it back
      // un-exploded and fully visible, with no section cut on its materials.
      for (const record of records) {
        record.mesh.position.copy(record.home);
        record.mesh.visible = true;
      }
      for (const material of materials) material.clippingPlanes = [];
      mixerRef.current?.stopAllAction();
      // No `uncacheRoot`. It unbinds one property at a time with a linear
      // search each, and with a track per animated property on ~3360 nodes
      // that measured 1310 ms — a frozen UI on every switch out of realistic
      // mode. This mixer is discarded on the next line and nothing else
      // references its caches, so the garbage collector frees the lot.
      mixerRef.current = null;
      actionsRef.current = [];
      recordsRef.current = [];
      materialsRef.current = [];
    };
    // `seek` reads refs only; listing it would re-run the whole preparation
    // on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, animations, duration, registerComponents, gl]);

  // --- construction timeline + explode ------------------------------------
  //
  // Both write `mesh.position`, and the clip owns it, so they go through one
  // sequence: strip the offset, let the clip pose the frame, re-read that pose
  // as home, put the offset back. Applying the explode on top of a pose the
  // clip then overwrites, or seeking while offsets are still applied to nodes
  // the clip does not animate, is how an exploded view drifts apart a little
  // further on every scrub.

  function applyExplode() {
    const store = useAppStore.getState();
    const factor = store.exploded ? store.explodeFactor : 0;
    for (const { mesh, home } of recordsRef.current) {
      // Pushed away from the model centre, lifting with height — the same
      // rule the flat modes use, so both models explode the same way.
      mesh.position.set(
        home.x + (home.x - EXPLODE_CENTRE.x) * factor,
        home.y + (home.y - EXPLODE_CENTRE.y) * factor * 1.6,
        home.z + (home.z - EXPLODE_CENTRE.z) * factor,
      );
    }
  }

  function seek(time: number) {
    const mixer = mixerRef.current;
    if (!mixer) return;
    const records = recordsRef.current;
    for (const { mesh, home } of records) mesh.position.copy(home);
    // Un-pause before every seek, not just the first. `clampWhenFinished`
    // holds the last frame by setting `paused = true` the moment a LoopOnce
    // action reaches its end — which the load-time seek to `duration` always
    // does. From then on every `setTime` resets the action to t=0 and
    // discards the advance, so scrubbing the timeline parks the whole model
    // at 1/1000 scale and records that parked pose as the explode's home.
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

  // The store's `progress` is the same 0..1 the flat modes drive their
  // per-part build order with, so the timeline scrubber works in both without
  // the panel knowing which model is mounted.
  const progress = useAppStore((s) => s.progress);

  // --- visibility: ONE writer for mesh.visible -----------------------------
  //
  // The hidden set and distance culling both decide whether a member is
  // drawn, so they are one predicate evaluated in one place. Two writers
  // cannot coexist: a hide-set effect turns every culled bolt back on at each
  // tree click, and a culling pass on its own turns every hidden bolt back on
  // 0.16 s after the user hid it. Layers are applied to the layer GROUPS, a
  // different object, so they compose with this rather than competing.
  function refreshVisibility(): boolean {
    const { hidden, quality } = useAppStore.getState();
    const scale = LOD_SCALE[quality];
    const eye = camera.position;
    const centre = scratchCentre;
    let changed = false;
    for (const { mesh, lod } of recordsRef.current) {
      let visible = !hidden.has(mesh.name);
      if (visible && lod !== undefined) {
        centre.setFromMatrixPosition(mesh.matrixWorld);
        visible = eye.distanceTo(centre) < lod * scale;
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
      // Subscribed rather than selected: `hidden` is a fresh Set on every
      // toggle, and re-rendering this component on each tree click would buy
      // nothing the listener does not already do.
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
    // A part crossing its threshold changes what casts, so the cached shadow
    // map is redrawn once — at most six times a second while zooming, against
    // every frame before.
    if (refreshVisibility()) gl.shadowMap.needsUpdate = true;
  });

  // --- layer visibility ---------------------------------------------------
  useEffect(() => {
    scene.traverse((object) => {
      if ((LAYERS as readonly string[]).includes(object.name)) {
        object.visible = layers[object.name as LayerName];
      }
    });
    gl.shadowMap.needsUpdate = true;
  }, [scene, layers, gl]);

  // --- section plane ------------------------------------------------------
  //
  // On the seven shared materials rather than the renderer, for the same
  // reason the flat modes clip per material. `clipShadows` so the sun stops
  // casting what the cut has removed — otherwise a sectioned bay still throws
  // the shadow of the half that is gone.
  useEffect(() => {
    for (const material of materialsRef.current) {
      material.clippingPlanes = planes;
      material.clipShadows = true;
    }
    gl.shadowMap.needsUpdate = true;
  }, [planes, gl, scene]);

  return (
    <primitive
      object={scene}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        if (event.object.name) select(event.object.name);
      }}
    />
  );
}
