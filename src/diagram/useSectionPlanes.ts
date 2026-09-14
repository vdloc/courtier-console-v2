import { useMemo } from 'react';
import { Plane, Vector3 } from 'three';
import { useAppStore } from '../store/useAppStore';
import type { Bounds } from './realistic/rig';
import type { SectionAxis } from '../store/types';

const AXIS_NORMAL: Record<SectionAxis, [number, number, number]> = {
  x: [1, 0, 0],
  y: [0, 1, 0],
  z: [0, 0, 1],
};
const AXIS_INDEX: Record<SectionAxis, number> = { x: 0, y: 1, z: 2 };

/**
 * Member materials only — clipping the renderer globally would also cut dimension leaders.
 * `bounds` is what the slider's 0..1 spans; each model passes its own.
 */
export function useSectionPlanes(bounds: Bounds): Plane[] {
  const enabled = useAppStore((s) => s.sectionEnabled);
  const axis = useAppStore((s) => s.sectionAxis);
  const position = useAppStore((s) => s.sectionPosition);
  const flipped = useAppStore((s) => s.sectionFlipped);

  return useMemo(() => {
    if (!enabled) return [];
    const i = AXIS_INDEX[axis];
    const coord = bounds.min[i] + position * (bounds.max[i] - bounds.min[i]);
    const plane = new Plane(new Vector3(...AXIS_NORMAL[axis]), -coord);
    if (flipped) plane.negate();
    return [plane];
  }, [bounds, enabled, axis, position, flipped]);
}
