/**
 * Measurement arithmetic, ported wholesale from the old project's
 * `engineering/measurement.ts`, plus resolving a stored point to where its
 * part is NOW — the point rides the member through explode, since it is
 * stored as `local` + `partId` rather than a world coordinate.
 */

import { Vector3 } from 'three';
import type { MeasureMode, MeasurePoint } from '../store/types';
import { MODE_POINTS } from '../store/measureSlice';
import { explodedPosition } from './model';
import { glbLocalToWorld } from './realistic/glbMembers';
import { memberByName } from './snapping';

export interface MeasurementValue {
  value: number;
  text: string;
  label: string;
  direct?: number;
}

/** Metres to the millimetre. Structural work is quoted in mm below 10 m. */
export function formatMetres(value: number): string {
  return value < 10 ? `${value.toFixed(3)} m` : `${value.toFixed(2)} m`;
}

/**
 * Null when the point's member isn't in the model on screen (an exported member
 * while the GLB is unmounted): a stale world position would read as a real number.
 */
export function resolveMeasurePoint(
  point: MeasurePoint,
  exploded: boolean,
  explodeFactor: number,
): Vector3 | null {
  const ref = memberByName(point.partId);
  if (!ref) return null;
  if (ref.model === 'glb') {
    return glbLocalToWorld(ref.member, point.local, exploded ? explodeFactor : 0);
  }
  const { part } = ref;
  const base = exploded ? explodedPosition(part, explodeFactor) : part.position;
  return new Vector3(
    base[0] + point.local[0],
    base[1] + point.local[1],
    base[2] + point.local[2],
  );
}

export function evaluate(
  mode: MeasureMode,
  points: Vector3[],
): MeasurementValue | null {
  if (points.length < MODE_POINTS[mode]) return null;

  if (mode === 'distance') {
    const value = points[0].distanceTo(points[1]);
    return { value, text: formatMetres(value), label: 'Distance' };
  }

  if (mode === 'horizontal') {
    // Plan distance. Y is up, so the plan is XZ.
    const dx = points[1].x - points[0].x;
    const dz = points[1].z - points[0].z;
    const value = Math.hypot(dx, dz);
    return {
      value,
      text: formatMetres(value),
      label: 'Plan distance',
      direct: points[0].distanceTo(points[1]),
    };
  }

  if (mode === 'vertical') {
    const value = Math.abs(points[1].y - points[0].y);
    return {
      value,
      text: formatMetres(value),
      label: 'Height difference',
      direct: points[0].distanceTo(points[1]),
    };
  }

  if (mode === 'angle') {
    // Angle at the middle point — the vertex, in the CAD sense.
    const a = new Vector3().subVectors(points[0], points[1]);
    const b = new Vector3().subVectors(points[2], points[1]);
    if (a.lengthSq() < 1e-12 || b.lengthSq() < 1e-12) return null;
    const cos = Math.max(-1, Math.min(1, a.normalize().dot(b.normalize())));
    const value = (Math.acos(cos) * 180) / Math.PI;
    return { value, text: `${value.toFixed(2)}°`, label: 'Included angle' };
  }

  // Area: the shoelace formula generalised to 3D — half the magnitude of the
  // summed cross products of consecutive edge vectors about the first vertex.
  const normal = new Vector3();
  const edge1 = new Vector3();
  const edge2 = new Vector3();
  const cross = new Vector3();
  for (let i = 1; i < points.length - 1; i++) {
    edge1.subVectors(points[i], points[0]);
    edge2.subVectors(points[i + 1], points[0]);
    normal.add(cross.crossVectors(edge1, edge2));
  }
  const value = normal.length() * 0.5;
  return { value, text: `${value.toFixed(3)} m²`, label: 'Area' };
}
