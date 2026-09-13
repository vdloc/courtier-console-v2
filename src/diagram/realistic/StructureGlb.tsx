import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { AnimationMixer, LoopOnce, Mesh, Object3D } from 'three';
import { DRACO_PATH, MODEL_URL } from './rig';
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
  const select = useAppStore((s) => s.select);
  const hidden = useAppStore((s) => s.hidden);
  const layers = useAppStore((s) => s.layers);
  const registerComponents = useAppStore((s) => s.registerComponents);
  const mixerRef = useRef<AnimationMixer | null>(null);

  const duration = useMemo(
    () => (animations.length ? Math.max(...animations.map((c) => c.duration)) : 0),
    [animations],
  );

  // --- one-time preparation ---------------------------------------------
  useEffect(() => {
    const components: Record<string, ComponentInfo> = {};

    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;
      // Safe only because every member is its own node with its own bounds,
      // which is exactly what the export preserved. It is the single biggest
      // win on a scene this size.
      object.frustumCulled = true;

      const layer = layerOf(object);
      if (!layer) return;
      const component = componentFrom(object, layer);
      if (component) components[component.id] = component;
    });

    // Registered here rather than in the panel because this is where the
    // scene is known to be loaded and its metadata readable; the panels stay
    // pure consumers with no R3F context of their own.
    registerComponents(components);

    if (animations.length === 0) return;

    // THE GLB SHIPS PARKED, NOT BUILT.
    //
    // The exporter samples the scene animation and writes every node from the
    // first frame, so on disk the frame sits scaled to 0.001 and below ground.
    // Setting the Blender scene to the last frame before export does not
    // survive that sampling. Seeking the clip to its end here is what applies
    // the finished transform to every node — without it the viewport is empty
    // and the model looks like it failed to load.
    // Deliberately NOT `action.paused = true`. A paused action has an
    // effective timeScale of zero, and `mixer.setTime` works by resetting
    // every action to t=0 and then advancing by the delta — so with the
    // actions paused the advance is discarded and every seek lands on frame
    // zero, which is the parked pose. The symptom is a model that loads
    // without error and renders at 1/1000 scale.
    const mixer = new AnimationMixer(scene);
    mixerRef.current = mixer;
    for (const clip of animations) {
      const action = mixer.clipAction(clip);
      action.loop = LoopOnce;
      action.clampWhenFinished = true;
      action.play();
    }
    mixer.setTime(duration);

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      mixerRef.current = null;
    };
  }, [scene, animations, duration, registerComponents]);

  // --- construction timeline --------------------------------------------
  //
  // The store's `progress` is the same 0..1 the flat modes drive their
  // per-part build order with, so the timeline scrubber works in both without
  // the panel knowing which model is mounted.
  const progress = useAppStore((s) => s.progress);
  useFrame(() => {
    const mixer = mixerRef.current;
    if (!mixer || duration === 0) return;
    const target = progress * duration;
    if (Math.abs(mixer.time - target) > 1e-4) mixer.setTime(target);
  });

  // --- layer visibility ---------------------------------------------------
  //
  // Applied to the six layer GROUPS, while the hidden set below is applied to
  // meshes. Different targets is what lets both be live at once without one
  // silently undoing the other: a layer is a discipline filter, the hidden set
  // is surgery on one named member.
  useEffect(() => {
    scene.traverse((object) => {
      if ((LAYERS as readonly string[]).includes(object.name)) {
        object.visible = layers[object.name as LayerName];
      }
    });
  }, [scene, layers]);

  // --- per-object visibility ---------------------------------------------
  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      object.visible = !hidden.has(object.name);
    });
  }, [scene, hidden]);

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
