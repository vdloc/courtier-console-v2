/**
 * Geometry-aware snapping, ported from the old project's `engineering/snapping.ts`.
 *
 * Candidates come from the part's OWN box half-extents, not the mesh: a box
 * face is two triangles, so the mesh carries a diagonal across every face
 * that does not exist on the real member. Eight corners and twelve edges,
 * tested in screen pixels (not world units) so the snap feels the same at
 * every zoom level.
 *
 * Tier order: vertex → edge midpoint → edge → surface. Midpoint is tested
 * before the edge, at the same tolerance, or the arris always wins and the
 * midpoint becomes unreachable.
 *
 * Within a tier, pixel distance only FILTERS candidates (anything inside
 * tolerance is in play) — the winner is whichever is nearest the camera. A
 * box's far corner can project within a pixel or two of its near corner in
 * an isometric view (a pad's body diagonal runs close to the view direction),
 * and picking by screen distance alone silently snaps to the hidden one.
 */

import { Vector2, Vector3 } from 'three';
import type { Camera, Intersection, Plane } from 'three';
import { PARTS_BY_ID } from './model';

export type SnapType = 'vertex' | 'midpoint' | 'edge' | 'face';

export interface SnapResult {
  world: [number, number, number];
  local: [number, number, number];
  type: SnapType;
  partId: string;
}

/** Pixels. ~10 is about a fingertip at 1080p. */
export const SNAP_PIXELS = 10;

const _v = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _screen = new Vector2();

function boxCorners(half: [number, number, number]): Vector3[] {
  const [hx, hy, hz] = half;
  return [
    new Vector3(-hx, -hy, -hz),
    new Vector3(hx, -hy, -hz),
    new Vector3(hx, hy, -hz),
    new Vector3(-hx, hy, -hz),
    new Vector3(-hx, -hy, hz),
    new Vector3(hx, -hy, hz),
    new Vector3(hx, hy, hz),
    new Vector3(-hx, hy, hz),
  ];
}

const BOX_EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

/** Project a world point to CSS-pixel screen coordinates. False if behind. */
function toScreen(
  point: Vector3,
  camera: Camera,
  width: number,
  height: number,
  out: Vector2,
): boolean {
  _v.copy(point).project(camera);
  if (_v.z < -1 || _v.z > 1) return false;
  out.set(((_v.x + 1) / 2) * width, ((1 - _v.y) / 2) * height);
  return true;
}

function closestOnSegment(a: Vector3, b: Vector3, p: Vector3, out: Vector3): Vector3 {
  _a.subVectors(b, a);
  const lengthSq = _a.lengthSq();
  if (lengthSq < 1e-12) return out.copy(a);
  const t = Math.max(0, Math.min(1, _b.subVectors(p, a).dot(_a) / lengthSq));
  return out.copy(a).addScaledVector(_a, t);
}

/** Kept half-space matches the §2.1 convention: normal·p + constant >= 0. */
function passesClip(point: Vector3, planes: Plane[]): boolean {
  return planes.every((pl) => pl.distanceToPoint(point) >= 0);
}

/**
 * First intersection whose point the active section has not cut away, nearest
 * to farthest. R3F's raycaster does not consult clippingPlanes, so a click on
 * cut-away geometry still fires and would otherwise measure to invisible steel.
 *
 * Also skips anything that isn't a named part — the `<Edges>` overlay and the
 * dimension annotations are raycastable and sit exactly on member surfaces, so
 * near a corner they can report a nearer, unnamed hit than the member itself.
 */
export function firstUnclippedHit(
  intersections: Intersection[],
  planes: Plane[],
): Intersection | null {
  for (const hit of intersections) {
    if (!PARTS_BY_ID[hit.object.name]) continue;
    if (passesClip(hit.point, planes)) return hit;
  }
  return null;
}

export function snapToFeature(
  hit: Intersection,
  camera: Camera,
  cursor: Vector2,
  width: number,
  height: number,
  planes: Plane[],
  tolerance = SNAP_PIXELS,
): SnapResult {
  const object = hit.object;
  const part = PARTS_BY_ID[object.name];

  const faceResult = (): SnapResult => {
    const inverse = object.matrixWorld.clone().invert();
    return {
      world: hit.point.toArray() as [number, number, number],
      local: hit.point.clone().applyMatrix4(inverse).toArray() as [
        number,
        number,
        number,
      ],
      type: 'face',
      partId: object.name,
    };
  };

  if (!part) return faceResult();

  const half: [number, number, number] = [
    part.size[0] / 2,
    part.size[1] / 2,
    part.size[2] / 2,
  ];
  const corners = boxCorners(half);
  const worldCorners = corners.map((c) => c.clone().applyMatrix4(object.matrixWorld));

  // --- 1. vertices ------------------------------------------------------
  // Pixel distance only admits candidates; the nearest to the camera wins —
  // a box's far corner can project within a pixel of its near one.
  let best = -1;
  let bestCamDistSq = Infinity;
  for (let i = 0; i < 8; i++) {
    if (!passesClip(worldCorners[i], planes)) continue;
    if (!toScreen(worldCorners[i], camera, width, height, _screen)) continue;
    if (_screen.distanceTo(cursor) >= tolerance) continue;
    const camDistSq = worldCorners[i].distanceToSquared(camera.position);
    if (camDistSq < bestCamDistSq) {
      bestCamDistSq = camDistSq;
      best = i;
    }
  }
  if (best >= 0) {
    return {
      world: worldCorners[best].toArray() as [number, number, number],
      local: corners[best].toArray() as [number, number, number],
      type: 'vertex',
      partId: object.name,
    };
  }

  // --- 2. edge midpoints (checked before the edge, same tolerance) ------
  let bestEdge = -1;
  bestCamDistSq = Infinity;
  for (let e = 0; e < 12; e++) {
    const [i, j] = BOX_EDGES[e];
    _v.addVectors(worldCorners[i], worldCorners[j]).multiplyScalar(0.5);
    if (!passesClip(_v, planes)) continue;
    if (!toScreen(_v, camera, width, height, _screen)) continue;
    if (_screen.distanceTo(cursor) >= tolerance) continue;
    const camDistSq = _v.distanceToSquared(camera.position);
    if (camDistSq < bestCamDistSq) {
      bestCamDistSq = camDistSq;
      bestEdge = e;
    }
  }
  if (bestEdge >= 0) {
    const [i, j] = BOX_EDGES[bestEdge];
    const world = new Vector3()
      .addVectors(worldCorners[i], worldCorners[j])
      .multiplyScalar(0.5);
    const local = new Vector3().addVectors(corners[i], corners[j]).multiplyScalar(0.5);
    return {
      world: world.toArray() as [number, number, number],
      local: local.toArray() as [number, number, number],
      type: 'midpoint',
      partId: object.name,
    };
  }

  // --- 3. edges (closest point on segment to the ray hit) ---------------
  bestEdge = -1;
  bestCamDistSq = Infinity;
  const chosen = new Vector3();
  const candidate = new Vector3();
  for (let e = 0; e < 12; e++) {
    const [i, j] = BOX_EDGES[e];
    closestOnSegment(worldCorners[i], worldCorners[j], hit.point, candidate);
    if (!passesClip(candidate, planes)) continue;
    if (!toScreen(candidate, camera, width, height, _screen)) continue;
    if (_screen.distanceTo(cursor) >= tolerance) continue;
    const camDistSq = candidate.distanceToSquared(camera.position);
    if (camDistSq < bestCamDistSq) {
      bestCamDistSq = camDistSq;
      bestEdge = e;
      chosen.copy(candidate);
    }
  }
  if (bestEdge >= 0) {
    const inverse = object.matrixWorld.clone().invert();
    return {
      world: chosen.toArray() as [number, number, number],
      local: chosen.clone().applyMatrix4(inverse).toArray() as [number, number, number],
      type: 'edge',
      partId: object.name,
    };
  }

  // --- 4. surface ---------------------------------------------------------
  return faceResult();
}
