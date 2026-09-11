import type { StateCreator } from 'zustand';
import type {
  CameraShot,
  Quality,
  SectionAxis,
  ViewMode,
  Viewpoint,
} from './types';
import { MOCK_VIEWPOINTS } from '../lib/mockData';

export interface ViewSlice {
  mode: ViewMode;
  shot: CameraShot;
  quality: Quality;
  exploded: boolean;
  explodeFactor: number;
  tour: boolean;
  showStats: boolean;

  sectionEnabled: boolean;
  sectionAxis: SectionAxis;
  sectionPosition: number;
  sectionFlipped: boolean;

  viewpoints: Viewpoint[];

  setMode: (mode: ViewMode) => void;
  setShot: (shot: CameraShot) => void;
  setQuality: (quality: Quality) => void;
  toggleExplode: () => void;
  setExplodeFactor: (v: number) => void;
  toggleTour: () => void;
  toggleStats: () => void;
  toggleSection: () => void;
  setSectionAxis: (axis: SectionAxis) => void;
  setSectionPosition: (v: number) => void;
  toggleSectionFlip: () => void;
  saveViewpoint: (name: string) => void;
  deleteViewpoint: (id: string) => void;
}

export const createViewSlice: StateCreator<ViewSlice, [], [], ViewSlice> = (set) => ({
  mode: 'engineering',
  shot: 'iso',
  quality: 'balanced',
  exploded: false,
  explodeFactor: 0.35,
  tour: false,
  showStats: false,

  sectionEnabled: false,
  sectionAxis: 'x',
  sectionPosition: 0.5,
  sectionFlipped: false,

  viewpoints: MOCK_VIEWPOINTS,

  setMode: (mode) => set({ mode }),
  setShot: (shot) => set({ shot }),
  setQuality: (quality) => set({ quality }),
  toggleExplode: () => set((s) => ({ exploded: !s.exploded })),
  setExplodeFactor: (explodeFactor) => set({ explodeFactor }),
  toggleTour: () => set((s) => ({ tour: !s.tour })),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  toggleSection: () => set((s) => ({ sectionEnabled: !s.sectionEnabled })),
  setSectionAxis: (sectionAxis) => set({ sectionAxis }),
  setSectionPosition: (sectionPosition) => set({ sectionPosition }),
  toggleSectionFlip: () => set((s) => ({ sectionFlipped: !s.sectionFlipped })),
  saveViewpoint: (name) =>
    set((s) => ({
      viewpoints: [
        ...s.viewpoints,
        { id: `v${Date.now()}`, name, mode: s.mode, saved: 'just now' },
      ],
    })),
  deleteViewpoint: (id) =>
    set((s) => ({ viewpoints: s.viewpoints.filter((v) => v.id !== id) })),
});
