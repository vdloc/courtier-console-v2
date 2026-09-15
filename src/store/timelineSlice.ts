import type { StateCreator } from 'zustand';
import type { Playback, TimelinePhase } from './types';

export interface TimelineSlice {
  phases: TimelinePhase[];
  duration: number;
  playback: Playback;
  /** 0..1 across the whole sequence. */
  progress: number;

  /** Called once when the GLB's clip loads — phases are derived from its keyframes, not authored. */
  registerTimeline: (duration: number, phases: TimelinePhase[]) => void;
  play: () => void;
  pause: () => void;
  reset: () => void;
  setProgress: (progress: number) => void;
  /** The playback loop's own path — `setProgress` pausing itself every frame would stop it dead. */
  tick: (progress: number) => void;
}

export const createTimelineSlice: StateCreator<TimelineSlice, [], [], TimelineSlice> = (
  set,
) => ({
  phases: [],
  // Nominal fallback shown for the brief window before the GLB's real clip registers.
  duration: 18,
  playback: 'finished',
  progress: 1,

  registerTimeline: (duration, phases) => set({ duration, phases }),

  // Resuming from a pause continues where it left off; from finished it restarts —
  // sitting at 1 doing nothing on Play is the bug this button exists to fix.
  play: () =>
    set((s) => ({ playback: 'playing', progress: s.progress >= 1 ? 0 : s.progress })),
  pause: () => set({ playback: 'paused' }),
  reset: () => set({ playback: 'idle', progress: 0 }),
  setProgress: (progress) =>
    set({ progress, playback: progress >= 1 ? 'finished' : 'paused' }),
  tick: (progress) =>
    set({
      progress: Math.min(progress, 1),
      playback: progress >= 1 ? 'finished' : 'playing',
    }),
});
