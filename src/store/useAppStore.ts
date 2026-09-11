import { create } from 'zustand';
import { createViewSlice, type ViewSlice } from './viewSlice';
import { createModelSlice, type ModelSlice } from './modelSlice';
import { createTimelineSlice, type TimelineSlice } from './timelineSlice';
import { createMeasureSlice, type MeasureSlice } from './measureSlice';

export type AppState = ViewSlice & ModelSlice & TimelineSlice & MeasureSlice;

/**
 * Four slices, composed. The previous project's store was one 786-line object
 * with no slices and no `get`, which is why none of it could be reused.
 */
export const useAppStore = create<AppState>()((...a) => ({
  ...createViewSlice(...a),
  ...createModelSlice(...a),
  ...createTimelineSlice(...a),
  ...createMeasureSlice(...a),
}));
