import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import { Box3, PCFSoftShadowMap, SRGBColorSpace, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { PerspectiveCamera as PerspectiveCameraImpl } from 'three';
import { PALETTE } from './palette';
import { Dimension } from './Dimension';
import { RealisticScene } from './realistic/RealisticScene';
import { StructureGlb } from './realistic/StructureGlb';
import { EXPOSURE, MODEL_BOUNDS, SHADOW_CENTRE, type Bounds } from './realistic/rig';
import { useAppStore } from '../store/useAppStore';
import type { CameraShot } from '../store/types';
import { PROJECT_NAME, REVISION } from '../lib/mockData';

/** One model, one set of shots — every mode looks at the same GLB now. */
const SHOT_POSITION: Record<CameraShot, [number, number, number]> = {
  front: [SHADOW_CENTRE[0], SHADOW_CENTRE[1] + 4, SHADOW_CENTRE[2] + 58],
  side: [SHADOW_CENTRE[0] + 58, SHADOW_CENTRE[1] + 4, SHADOW_CENTRE[2]],
  iso: [SHADOW_CENTRE[0] + 34, SHADOW_CENTRE[1] + 22, SHADOW_CENTRE[2] + 38],
  joint: [SHADOW_CENTRE[0] + 8, SHADOW_CENTRE[1] - 1, SHADOW_CENTRE[2] + 9],
};

const CENTRE = SHADOW_CENTRE;
const BOUNDS: Bounds = MODEL_BOUNDS;

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

    if (cameraRequestKind === 'shot' || cameraRequestKind === 'reset') {
      // Shots set direction deliberately — no attempt to preserve the current angle.
      flyTo(new Vector3(...SHOT_POSITION[shot]), new Vector3(...CENTRE));
      return;
    }
    if (cameraRequestKind === 'viewpoint') {
      const vp = viewpoints.find((v) => v.id === viewpointToRestore);
      if (!vp) return;
      flyTo(new Vector3(...vp.position), new Vector3(...vp.target));
      setMode(vp.mode);
      return;
    }

    let box: Bounds | null = null;
    if (cameraRequestKind === 'fit') {
      box = BOUNDS;
    } else {
      const member = selected && scene.getObjectByName(selected.id);
      if (member) {
        const b = new Box3().setFromObject(member);
        box = { min: b.min.toArray(), max: b.max.toArray() };
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
    // flyTo only queues an animation, so reading the live camera can capture
    // the pre-move pose — save where it's heading instead.
    const a = anim.current;
    commitViewpoint({
      id: crypto.randomUUID(),
      name: pendingViewpointName,
      mode,
      position: (a ? a.endPos : camera.position).toArray() as [number, number, number],
      target: (a ? a.endTarget : controls.target).toArray() as [number, number, number],
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

/**
 * DERIVED off the exported GLB (Steel_Column_Main_L00_A1/_A2/_B1,
 * Concrete_Pad_Foundation_A1): grid bay X = 7.2 m (A1→A2 centres), grid bay Z
 * = 6.0 m (A1→B1 centres), ground-storey column height = 4.0 m (base to
 * top), pad footprint = 2.4 m. Re-measure if the GLB changes.
 *
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
        to={[7.2, 0, 0]}
        label={'A = 7.2'}
        offset={[0, -1.4, 3]}
      />
      <Dimension
        from={[0, 0, 0]}
        to={[0, 0, -6.0]}
        label={'B = 6.0'}
        offset={[-3, -1.4, 0]}
      />
      <Dimension
        from={[0, 0, 0]}
        to={[0, 4.0, 0]}
        label={'H_1 = 4.0'}
        offset={[-3, 0, 3]}
      />
      <Dimension
        from={[-1.2, -0.74, -1.2]}
        to={[1.2, -0.74, -1.2]}
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
      <Suspense fallback={null}>
        <StructureGlb />
      </Suspense>
      {realistic && <RealisticScene />}
      {!realistic && <Annotations />}
    </Canvas>
  );
}
