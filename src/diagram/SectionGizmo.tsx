import { useEffect, useRef, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Mesh, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAppStore } from '../store/useAppStore';
import { PALETTE } from './palette';
import { MODEL_BOUNDS } from './realistic/rig';
import type { SectionAxis } from '../store/types';

const AXIS_VEC: Record<SectionAxis, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};
const AXIS_INDEX: Record<SectionAxis, number> = { x: 0, y: 1, z: 2 };

interface Drag {
  axisVec: Vector3;
  plane: Plane;
  startWorld: Vector3;
  startFraction: number;
  span: number;
}

/**
 * A draggable handle on the section plane, so the cut can be moved in the
 * viewport instead of only via the slider.
 *
 * Constrained to the active axis: the drag proxy plane *contains* that axis
 * and faces the camera as closely as possible (the camera's view direction
 * with its axis-aligned component removed) — the standard single-axis-
 * translate technique. Deliberately not bim-viewer's "huge plane facing the
 * camera" trick from `docs/FEATURES-TODO.md` P2.1 — that one is for
 * unconstrained 3D placement, and dragging it back onto one axis would just
 * be this same projection done less directly.
 *
 * Hit-testing and drag start happen in a capture-phase native `pointerdown`
 * on the canvas, not R3F's synthetic per-mesh events: drei's OrbitControls
 * registers its own pointerdown listener too, and R3F's delegated event
 * dispatch doesn't reliably run before it. Capture phase always runs before
 * bubble-phase listeners regardless of mount order, so `stopImmediatePropagation`
 * here reliably keeps OrbitControls from starting an orbit at the same time —
 * confirmed empirically: without this, dragging the handle also rotated the
 * camera.
 */
export function SectionGizmo() {
  const enabled = useAppStore((s) => s.sectionEnabled);
  const axis = useAppStore((s) => s.sectionAxis);
  const position = useAppStore((s) => s.sectionPosition);
  const setSectionPosition = useAppStore((s) => s.setSectionPosition);
  const { camera, gl } = useThree();
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const meshRef = useRef<Mesh>(null);
  const drag = useRef<Drag | null>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  const i = AXIS_INDEX[axis];
  const min = MODEL_BOUNDS.min[i];
  const max = MODEL_BOUNDS.max[i];
  const coord = min + position * (max - min);
  const handlePos: [number, number, number] = [
    (MODEL_BOUNDS.min[0] + MODEL_BOUNDS.max[0]) / 2,
    (MODEL_BOUNDS.min[1] + MODEL_BOUNDS.max[1]) / 2,
    (MODEL_BOUNDS.min[2] + MODEL_BOUNDS.max[2]) / 2,
  ];
  handlePos[i] = coord;

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;
    const raycaster = new Raycaster();
    const ndc = new Vector2();
    const hit = new Vector3();

    const setNdcFrom = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };

    const endDrag = (pointerId: number) => {
      drag.current = null;
      setDragging(false);
      if (controls) controls.enabled = true;
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    };

    const onDown = (event: PointerEvent) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      setNdcFrom(event);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(mesh, false);
      if (hits.length === 0) return;

      // Beat drei's OrbitControls to this event — see the doc comment above.
      event.stopImmediatePropagation();
      event.preventDefault();

      const axisVec = new Vector3(...AXIS_VEC[axis]);
      const viewDir = new Vector3();
      camera.getWorldDirection(viewDir);
      const normal = viewDir
        .clone()
        .sub(axisVec.clone().multiplyScalar(viewDir.dot(axisVec)));
      if (normal.lengthSq() < 1e-6) {
        // Looking straight down the axis — any perpendicular will do.
        normal.copy(axisVec).cross(new Vector3(0, 1, 0));
        if (normal.lengthSq() < 1e-6) normal.set(1, 0, 0);
      }
      normal.normalize();
      const startWorld = hits[0].point.clone();
      const plane = new Plane().setFromNormalAndCoplanarPoint(normal, startWorld);
      drag.current = { axisVec, plane, startWorld, startFraction: position, span: max - min };
      setDragging(true);
      if (controls) controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
    };

    const onMove = (event: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      setNdcFrom(event);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(d.plane, hit)) return;
      const delta = hit.clone().sub(d.startWorld).dot(d.axisVec);
      const next = d.span > 0 ? d.startFraction + delta / d.span : d.startFraction;
      setSectionPosition(Math.min(1, Math.max(0, next)));
    };

    const onUp = (event: PointerEvent) => {
      if (drag.current) endDrag(event.pointerId);
    };

    canvas.addEventListener('pointerdown', onDown, { capture: true });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown, { capture: true });
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      // Turning section off mid-drag (unmount) must not leave orbit disabled.
      if (drag.current && controls) controls.enabled = true;
    };
  }, [enabled, axis, position, min, max, camera, controls, gl, setSectionPosition]);

  if (!enabled) return null;

  const active = hovered || dragging;

  return (
    <mesh
      ref={meshRef}
      position={handlePos}
      renderOrder={999}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[active ? 0.55 : 0.4, 16, 16]} />
      <meshBasicMaterial
        color={PALETTE.warn}
        transparent
        opacity={active ? 1 : 0.85}
        depthTest={false}
      />
    </mesh>
  );
}
