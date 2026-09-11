import { useMemo } from 'react';
import { Plane, Vector3 } from 'three';
import { useAppStore } from '../store/useAppStore';
import { BOUNDS } from './model';
import type { SectionAxis } from '../store/types';

const AXIS_NORMAL: Record<SectionAxis, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};
const AXIS_INDEX: Record<SectionAxis, number> = { x: 0, y: 1, z: 2 };

/** Member materials only — clipping the renderer globally would also cut dimension leaders. */
export function useSectionPlanes(): Plane[] {
  const enabled = useAppStore((s) => s.sectionEnabled);
  const axis = useAppStore((s) => s.sectionAxis);
  const position = useAppStore((s) => s.sectionPosition);
  const flipped = useAppStore((s) => s.sectionFlipped);

  return useMemo(() => {
    if (!enabled) return [];
    const i = AXIS_INDEX[axis];
    const coord = BOUNDS.min[i] + position * (BOUNDS.max[i] - BOUNDS.min[i]);
    const plane = new Plane(new Vector3(...AXIS_NORMAL[axis]), -coord);
    if (flipped) plane.negate();
    return [plane];
  }, [enabled, axis, position, flipped]);
}
