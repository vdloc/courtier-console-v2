import type { StateCreator } from 'zustand';
import type { MeasureMode, MeasurePoint } from './types';

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

/** What the cursor is over right now, while measuring — a proposal, not a commit. */
export interface HoverSnap {
  world: [number, number, number];
  type: 'vertex' | 'midpoint' | 'edge' | 'face';
  /** Both ends of the snapped edge, world space, when the snap is an edge or midpoint. */
  edge?: [[number, number, number], [number, number, number]];
}

export interface MeasureSlice {
  measuring: boolean;
  measureMode: MeasureMode;
  measurePoints: MeasurePoint[];
  hoverSnap: HoverSnap | null;

  toggleMeasuring: () => void;
  setMeasureMode: (mode: MeasureMode) => void;
  addMeasurePoint: (point: MeasurePoint) => void;
  undoMeasurePoint: () => void;
  clearMeasurement: () => void;
  setHoverSnap: (snap: HoverSnap | null) => void;
}

export const createMeasureSlice: StateCreator<MeasureSlice, [], [], MeasureSlice> = (
  set,
) => ({
  measuring: false,
  measureMode: 'distance',
  measurePoints: [],
  hoverSnap: null,

  toggleMeasuring: () =>
    set((s) => ({
      measuring: !s.measuring,
      hoverSnap: s.measuring ? null : s.hoverSnap,
    })),
  setMeasureMode: (measureMode) => set({ measureMode, measurePoints: [] }),
  addMeasurePoint: (point) =>
    set((s) => ({ measurePoints: [...s.measurePoints, point] })),
  undoMeasurePoint: () => set((s) => ({ measurePoints: s.measurePoints.slice(0, -1) })),
  clearMeasurement: () => set({ measurePoints: [] }),
  setHoverSnap: (hoverSnap) => set({ hoverSnap }),
});
