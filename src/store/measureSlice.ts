import type { StateCreator } from 'zustand';
import type { MeasureMode, MeasurePoint } from './types';

/** Snapping only knows the procedural parts, so no exported-model member can yield a point yet. */
export const MEASURE_UNAVAILABLE = 'Measure works in Engineering mode only for now.';

export const MODE_POINTS: Record<MeasureMode, number> = {
  distance: 2,
  horizontal: 2,
  vertical: 2,
  angle: 3,
  area: 3,
};

export const MODE_HINTS: Record<MeasureMode, string> = {
  distance: 'Pick two points. Reports the straight-line separation.',
  horizontal: 'Pick two points. Ignores the height difference.',
  vertical: 'Pick two points. Reports the height difference only.',
  angle: 'Pick three points. The second is the vertex.',
  area: 'Pick three or more coplanar points.',
};

export interface MeasureSlice {
  measuring: boolean;
  measureMode: MeasureMode;
  measurePoints: MeasurePoint[];

  toggleMeasuring: () => void;
  setMeasureMode: (mode: MeasureMode) => void;
  addMeasurePoint: (point: MeasurePoint) => void;
  undoMeasurePoint: () => void;
  clearMeasurement: () => void;
}

export const createMeasureSlice: StateCreator<MeasureSlice, [], [], MeasureSlice> = (
  set,
) => ({
  measuring: false,
  measureMode: 'distance',
  measurePoints: [],

  toggleMeasuring: () => set((s) => ({ measuring: !s.measuring })),
  setMeasureMode: (measureMode) => set({ measureMode, measurePoints: [] }),
  addMeasurePoint: (point) =>
    set((s) => ({ measurePoints: [...s.measurePoints, point] })),
  undoMeasurePoint: () => set((s) => ({ measurePoints: s.measurePoints.slice(0, -1) })),
  clearMeasurement: () => set({ measurePoints: [] }),
});
