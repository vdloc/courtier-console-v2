import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Edges, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import {
  Box3,
  DoubleSide,
  PCFSoftShadowMap,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type Plane,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import {
  BAY_X,
  BAY_Y,
  BOUNDS,
  CENTRE,
  PARTS,
  PARTS_BY_ID,
  STOREY,
  explodedPosition,
  isPartVisible,
  type Bounds,
  type Part,
} from './model';
import { PALETTE, ROLE_BY_KIND } from './palette';
import { Dimension } from './Dimension';
import { useSectionPlanes } from './useSectionPlanes';
import { firstUnclippedHit, snapToFeature } from './snapping';
import { RealisticScene } from './realistic/RealisticScene';
import { EXPOSURE, MODEL_BOUNDS, SHADOW_CENTRE } from './realistic/rig';
import { useAppStore } from '../store/useAppStore';
import type { CameraShot, ViewMode } from '../store/types';
import { PROJECT_NAME, REVISION } from '../lib/mockData';

const SHOT_POSITION: Record<CameraShot, [number, number, number]> = {
  front: [2 * BAY_X, STOREY * 1.5, 64],
  side: [66, STOREY * 1.5, 1.5 * BAY_Y],
  iso: [44, 28, 44],
  joint: [7, 5.5, 7],
};

/** The same shots around the exported model, which stands ~20 m from the procedural one. */
const REALISTIC_SHOT_POSITION: Record<CameraShot, [number, number, number]> = {
  front: [SHADOW_CENTRE[0], SHADOW_CENTRE[1] + 4, SHADOW_CENTRE[2] + 58],
  side: [SHADOW_CENTRE[0] + 58, SHADOW_CENTRE[1] + 4, SHADOW_CENTRE[2]],
  iso: [SHADOW_CENTRE[0] + 34, SHADOW_CENTRE[1] + 22, SHADOW_CENTRE[2] + 38],
  joint: [SHADOW_CENTRE[0] + 8, SHADOW_CENTRE[1] - 1, SHADOW_CENTRE[2] + 9],
};

/** Everything the rig needs to frame one mode's model. */
const FRAMING: Record<
  ViewMode,
  {
    shots: Record<CameraShot, [number, number, number]>;
    centre: [number, number, number];
    bounds: Bounds;
  }
> = {
  engineering: { shots: SHOT_POSITION, centre: CENTRE, bounds: BOUNDS },
  realistic: {
    shots: REALISTIC_SHOT_POSITION,
    centre: SHADOW_CENTRE,
    bounds: MODEL_BOUNDS,
  },
};

function boxSphere(min: [number, number, number], max: [number, number, number]) {
  const center = new Vector3(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  );
  const radius =
    new Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]).length() / 2;
  return { center, radius };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

const TARGET_PHASE_MS = 500;
const POSITION_PHASE_MS = 1500;
const TOTAL_MS = TARGET_PHASE_MS + POSITION_PHASE_MS;

interface CameraAnim {
  startPos: Vector3;
  endPos: Vector3;
  startTarget: Vector3;
  endTarget: Vector3;
  startTime: number;
}

/**
 * Renders the camera and orbit controls, and performs every move imperatively
 * off a store request. A declarative `position` prop can't express "go there
 * again" — the same value twice is not a re-render — so the store only says
 * *which* move is wanted (kind + a nonce that always changes) and this rig
 * drives the camera/controls objects directly.
 */
function CameraRig() {
  const camRef = useRef<PerspectiveCameraImpl>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const anim = useRef<CameraAnim | null>(null);
  // Set when a viewpoint restore changes mode, so the mode reframe below doesn't override it.
  const viewpointOwnsModeChange = useRef(false);
  const scene = useThree((s) => s.scene);

  const shot = useAppStore((s) => s.shot);
  const cameraRequestKind = useAppStore((s) => s.cameraRequestKind);
  const cameraRequestNonce = useAppStore((s) => s.cameraRequestNonce);
  const selected = useAppStore((s) => s.selected);
  const viewpointToRestore = useAppStore((s) => s.viewpointToRestore);
  const viewpoints = useAppStore((s) => s.viewpoints);
  const setMode = useAppStore((s) => s.setMode);
  const mode = useAppStore((s) => s.mode);

  function flyTo(endPos: Vector3, endTarget: Vector3) {
    const camera = camRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    anim.current = {
      startPos: camera.position.clone(),
      endPos,
      startTarget: controls.target.clone(),
      endTarget,
      startTime: performance.now(),
    };
  }

  useEffect(() => {
    const camera = camRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || cameraRequestKind === null) return;
    const framing = FRAMING[mode];

    if (cameraRequestKind === 'shot' || cameraRequestKind === 'reset') {
      // Shots set direction deliberately — no attempt to preserve the current angle.
      flyTo(new Vector3(...framing.shots[shot]), new Vector3(...framing.centre));
      return;
    }
    if (cameraRequestKind === 'viewpoint') {
      const vp = viewpoints.find((v) => v.id === viewpointToRestore);
      if (!vp) return;
      if (vp.mode !== mode) viewpointOwnsModeChange.current = true;
      flyTo(new Vector3(...vp.position), new Vector3(...vp.target));
      setMode(vp.mode);
      return;
    }

    let box: Bounds | null = null;
    if (cameraRequestKind === 'fit') {
      box = framing.bounds;
    } else if (mode === 'realistic') {
      const member = selected && scene.getObjectByName(selected.id);
      if (member) {
        const b = new Box3().setFromObject(member);
        box = { min: b.min.toArray(), max: b.max.toArray() };
      }
    } else {
      const part = selected && PARTS_BY_ID[selected.id];
      if (part) {
        const half = part.size.map((v) => v / 2) as [number, number, number];
        box = {
          min: part.position.map((v, i) => v - half[i]) as [number, number, number],
          max: part.position.map((v, i) => v + half[i]) as [number, number, number],
        };
      }
    }
    if (!box) return;

    const { center, radius } = boxSphere(box.min, box.max);
    const fovRad = (camera.fov * Math.PI) / 180;
    let distance = radius / Math.sin(fovRad / 2);
    if (camera.aspect < 1) distance /= camera.aspect;
    distance *= 1.15;

    // Fly closer without snapping the angle — keep whatever direction the
    // camera is already looking from.
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(1, 1, 1);
    dir.normalize();

    flyTo(center.clone().addScaledVector(dir, distance), center);
    // Only the nonce should retrigger this — shot/selected are read for their
    // current value, not watched for change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraRequestNonce]);

  // Each mode's model stands on different ground, so a mode switch re-frames the current shot.
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) {
      firstMode.current = false;
      return;
    }
    if (viewpointOwnsModeChange.current) {
      viewpointOwnsModeChange.current = false;
      return;
    }
    const framing = FRAMING[mode];
    flyTo(new Vector3(...framing.shots[shot]), new Vector3(...framing.centre));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useFrame(() => {
    const a = anim.current;
    const camera = camRef.current;
    const controls = controlsRef.current;
    if (!a || !camera || !controls) return;

    const elapsed = performance.now() - a.startTime;

    // Phase 1: turn to look at the new target before moving — the camera
    // rotates in place. Phase 2: travel to the new position, still looking.
    if (elapsed <= TARGET_PHASE_MS) {
      const t = easeInOutCubic(Math.min(elapsed / TARGET_PHASE_MS, 1));
      const target = a.startTarget.clone().lerp(a.endTarget, t);
      controls.target.copy(target);
      camera.lookAt(target);
    } else {
      const t = easeInOutCubic(
        Math.min((elapsed - TARGET_PHASE_MS) / POSITION_PHASE_MS, 1),
      );
      const position = a.startPos.clone().lerp(a.endPos, t);
      camera.position.copy(position);
      controls.target.copy(a.endTarget);
      camera.lookAt(a.endTarget);
    }
    controls.update();

    if (elapsed >= TOTAL_MS) anim.current = null;
  });

  const pendingViewpointName = useAppStore((s) => s.pendingViewpointName);
  const viewpointSaveNonce = useAppStore((s) => s.viewpointSaveNonce);
  const commitViewpoint = useAppStore((s) => s.commitViewpoint);

  useEffect(() => {
    const camera = camRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || !pendingViewpointName) return;
    commitViewpoint({
      id: crypto.randomUUID(),
      name: pendingViewpointName,
      mode,
      position: camera.position.toArray() as [number, number, number],
      target: controls.target.toArray() as [number, number, number],
      saved: 'just now',
    });
    // Only the nonce should retrigger this — read current mode, not watch it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewpointSaveNonce]);

  return (
    <>
      {/* Initial framing only — matches the store's default shot ('iso'). Every
          move after mount goes through the effect/useFrame above. */}
      <PerspectiveCamera
        ref={camRef}
        makeDefault
        fov={38}
        position={SHOT_POSITION.iso}
      />
      <OrbitControls
        ref={controlsRef}
        target={CENTRE}
        makeDefault
        enableDamping
        dampingFactor={0.12}
      />
    </>
  );
}

function sanitizeForFilename(s: string): string {
  return s
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * `preserveDrawingBuffer: true` on the Canvas (see below) is what makes this
 * read anything but a blank frame — without it the buffer clears before
 * `toDataURL` can read it. Do not remove that flag.
 *
 * KaTeX dimension labels are DOM elements (drei `Html`), not canvas pixels —
 * they will not appear in the exported PNG. That is a real, known limitation;
 * fixing it needs a different rendering path and is out of scope here.
 */
function ExportHandler() {
  const { gl } = useThree();
  const exportRequestNonce = useAppStore((s) => s.exportRequestNonce);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const dataUrl = gl.domElement.toDataURL('image/png');
    const revision = sanitizeForFilename(REVISION.split('·')[0]);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${sanitizeForFilename(PROJECT_NAME)}_${revision}_${timestamp}.png`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [exportRequestNonce, gl]);

  return null;
}

function Member({ part, planes }: { part: Part; planes: Plane[] }) {
  const select = useAppStore((s) => s.select);
  const isSelected = useAppStore((s) => s.selected?.id === part.id);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);
  const measuring = useAppStore((s) => s.measuring);
  const addMeasurePoint = useAppStore((s) => s.addMeasurePoint);
  const { camera, gl } = useThree();

  const role = ROLE_BY_KIND[part.kind] ?? 'solid';
  const position = exploded ? explodedPosition(part, explodeFactor) : part.position;

  const colour = isSelected
    ? PALETTE.select
    : role === 'service'
      ? PALETTE.rebar
      : role === 'solid'
        ? PALETTE.solid
        : PALETTE.face;

  // Translucent is the reference's default reading for structure; services
  // stay opaque so they read as objects inside the glass.
  const transparent = role === 'translucent' && !isSelected;
  const clipped = planes.length > 0;

  return (
    <mesh
      name={part.id}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // Same threshold R3F uses for onPointerMissed: a drag that starts and
        // ends on this part is a camera orbit, not a pick — see StructureGlb's
        // matching guard for why this matters.
        if (e.delta > 2) return;
        if (measuring) {
          const hit = firstUnclippedHit(e.intersections, planes);
          if (!hit) return;
          const cursor = new Vector2(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
          const width = gl.domElement.clientWidth;
          const height = gl.domElement.clientHeight;
          const snap = snapToFeature(hit, camera, cursor, width, height, planes);
          addMeasurePoint({
            id: crypto.randomUUID(),
            partId: snap.partId,
            local: snap.local,
            world: snap.world,
            snap: snap.type,
          });
          return;
        }
        select(part.id);
      }}
    >
      <boxGeometry args={part.size} />
      <meshBasicMaterial
        color={colour}
        transparent={transparent}
        opacity={transparent ? 0.3 : 1}
        depthWrite={!transparent}
        side={DoubleSide}
        clippingPlanes={planes}
      />
      <Edges
        threshold={15}
        color={isSelected ? PALETTE.select : PALETTE.edge}
        lineWidth={isSelected ? 2 : 1}
        clippingPlanes={planes}
        clipping={clipped}
      />
    </mesh>
  );
}

function Model() {
  const layers = useAppStore((s) => s.layers);
  const hidden = useAppStore((s) => s.hidden);
  const progress = useAppStore((s) => s.progress);
  const planes = useSectionPlanes();

  const visible = useMemo(
    () => PARTS.filter((p) => isPartVisible(p, layers, hidden, progress)),
    [layers, hidden, progress],
  );

  return (
    <group>
      {visible.map((p) => (
        <Member key={p.id} part={p} planes={planes} />
      ))}
    </group>
  );
}

/**
 * KaTeX source must reach the renderer with ONE backslash. A JSX string
 * attribute does not process escapes, so `label="\\Phi"` hands KaTeX a double
 * backslash — its line-break command — and the macro degrades to the word
 * "Phi". Expression containers are the only correct form here.
 */
function Annotations() {
  return (
    <group>
      <Dimension
        from={[0, 0, 0]}
        to={[BAY_X, 0, 0]}
        label={'A = 7.2'}
        offset={[0, -1.4, -4.2]}
      />
      <Dimension
        from={[0, 0, 0]}
        to={[0, 0, BAY_Y]}
        label={'B = 7.2'}
        offset={[-4.2, -1.4, 0]}
      />
      <Dimension
        from={[0, 0, 0]}
        to={[0, STOREY, 0]}
        label={'H_1 = 4.2'}
        offset={[-4.2, 0, -4.2]}
      />
      <Dimension
        from={[-1.2, -0.7, -1.2]}
        to={[1.2, -0.7, -1.2]}
        label={'\\Phi_p = 2.4'}
        offset={[0, -2.6, 0]}
      />
    </group>
  );
}

export function DiagramScene() {
  // Realistic is the one mode that hides the drawing furniture.
  const realistic = useAppStore((s) => s.mode === 'realistic');

  return (
    <Canvas
      dpr={[1, 2]}
      shadows={realistic ? { type: PCFSoftShadowMap } : false}
      // No renderer tone mapping: realistic mode applies AgX in its composer (realistic/Effects.tsx).
      flat
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMappingExposure: EXPOSURE,
      }}
      onCreated={({ gl, scene, camera }) => {
        gl.localClippingEnabled = true;
        gl.outputColorSpace = SRGBColorSpace;
        // DEV-only audit handle for renderer.info; stripped from production builds.
        if (import.meta.env.DEV) {
          (window as unknown as { __gl?: unknown }).__gl = { gl, scene, camera };
        }
      }}
      onPointerMissed={() => useAppStore.getState().select(null)}
      style={{ background: PALETTE.canvas }}
    >
      <CameraRig />
      <ExportHandler />
      {realistic ? <RealisticScene /> : <Model />}
      {!realistic && <Annotations />}
    </Canvas>
  );
}
