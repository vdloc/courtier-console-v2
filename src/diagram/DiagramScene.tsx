import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { DoubleSide, Vector3, type Plane } from 'three';
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
  type Part,
} from './model';
import { PALETTE, ROLE_BY_KIND } from './palette';
import { Dimension } from './Dimension';
import { useSectionPlanes } from './useSectionPlanes';
import { useAppStore } from '../store/useAppStore';
import type { CameraShot } from '../store/types';

const SHOT_POSITION: Record<CameraShot, [number, number, number]> = {
  front: [2 * BAY_X, STOREY * 1.5, 64],
  side: [66, STOREY * 1.5, 1.5 * BAY_Y],
  iso: [44, 28, 44],
  joint: [7, 5.5, 7],
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

  const shot = useAppStore((s) => s.shot);
  const cameraRequestKind = useAppStore((s) => s.cameraRequestKind);
  const cameraRequestNonce = useAppStore((s) => s.cameraRequestNonce);
  const selected = useAppStore((s) => s.selected);

  useEffect(() => {
    const camera = camRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || cameraRequestKind === null) return;

    let endPos: Vector3;
    let endTarget: Vector3;

    if (cameraRequestKind === 'shot' || cameraRequestKind === 'reset') {
      // Shots set direction deliberately — no attempt to preserve the current angle.
      endPos = new Vector3(...SHOT_POSITION[shot]);
      endTarget = new Vector3(...CENTRE);
    } else {
      const box =
        cameraRequestKind === 'fit'
          ? BOUNDS
          : (() => {
              const part = selected && PARTS_BY_ID[selected.id];
              if (!part) return null;
              const half = part.size.map((v) => v / 2) as [number, number, number];
              return {
                min: part.position.map((v, i) => v - half[i]) as [
                  number,
                  number,
                  number,
                ],
                max: part.position.map((v, i) => v + half[i]) as [
                  number,
                  number,
                  number,
                ],
              };
            })();
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

      endPos = center.clone().addScaledVector(dir, distance);
      endTarget = center;
    }

    anim.current = {
      startPos: camera.position.clone(),
      endPos,
      startTarget: controls.target.clone(),
      endTarget,
      startTime: performance.now(),
    };
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

function Member({ part, planes }: { part: Part; planes: Plane[] }) {
  const select = useAppStore((s) => s.select);
  const isSelected = useAppStore((s) => s.selected?.id === part.id);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);

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
  const showDimensions = useAppStore((s) => s.mode !== 'realistic');

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
      onPointerMissed={() => useAppStore.getState().select(null)}
      style={{ background: PALETTE.canvas }}
    >
      <CameraRig />
      <Model />
      {showDimensions && <Annotations />}
    </Canvas>
  );
}
