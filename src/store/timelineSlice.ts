import type { StateCreator } from 'zustand';
import type { Playback, TimelinePhase } from './types';
import { DURATION, PHASES } from '../lib/mockData';

export interface TimelineSlice {
  phases: TimelinePhase[];
  duration: number;
  playback: Playback;
  /** 0..1 across the whole sequence. */
  progress: number;

  play: () => void;
  pause: () => void;
  reset: () => void;
  setProgress: (progress: number) => void;
}

export const createTimelineSlice: StateCreator<TimelineSlice, [], [], TimelineSlice> = (
  set,
) => ({
  phases: PHASES,
  duration: DURATION,
  playback: 'finished',
  progress: 1,

  play: () => set({ playback: 'playing' }),
  pause: () => set({ playback: 'paused' }),
  reset: () => set({ playback: 'idle', progress: 0 }),
  setProgress: (progress) =>
    set({ progress, playback: progress >= 1 ? 'finished' : 'paused' }),
});
