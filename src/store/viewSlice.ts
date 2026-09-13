import type { StateCreator } from 'zustand';
import type {
  CameraRequestKind,
  CameraShot,
  SectionAxis,
  ViewMode,
  Viewpoint,
} from './types';
import { MOCK_VIEWPOINTS } from '../lib/mockData';

export interface ViewSlice {
  mode: ViewMode;
  shot: CameraShot;
  exploded: boolean;
  explodeFactor: number;
  showStats: boolean;

  sectionEnabled: boolean;
  sectionAxis: SectionAxis;
  sectionPosition: number;
  sectionFlipped: boolean;

  viewpoints: Viewpoint[];

  /**
   * What the camera should do next, plus a nonce that always changes — even a
   * re-click of the active shot must retrigger the move, and a changed nonce
   * is the only thing guaranteed to differ every time.
   */
  cameraRequestKind: CameraRequestKind | null;
  cameraRequestNonce: number;
  exportRequestNonce: number;

  setMode: (mode: ViewMode) => void;
  requestShot: (shot: CameraShot) => void;
  requestReset: () => void;
  requestFitModel: () => void;
  requestFocusSelected: () => void;
  requestExport: () => void;
  toggleExplode: () => void;
  setExplodeFactor: (v: number) => void;
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
  exploded: false,
  explodeFactor: 0.35,
  showStats: false,

  sectionEnabled: false,
  sectionAxis: 'x',
  sectionPosition: 0.5,
  sectionFlipped: false,

  viewpoints: MOCK_VIEWPOINTS,

  cameraRequestKind: null,
  cameraRequestNonce: 0,
  exportRequestNonce: 0,

  setMode: (mode) => set({ mode }),
  requestShot: (shot) =>
    set((s) => ({
      shot,
      cameraRequestKind: 'shot',
      cameraRequestNonce: s.cameraRequestNonce + 1,
    })),
  requestReset: () =>
    set((s) => ({
      cameraRequestKind: 'reset',
      cameraRequestNonce: s.cameraRequestNonce + 1,
    })),
  requestFitModel: () =>
    set((s) => ({
      cameraRequestKind: 'fit',
      cameraRequestNonce: s.cameraRequestNonce + 1,
    })),
  requestFocusSelected: () =>
    set((s) => ({
      cameraRequestKind: 'focus',
      cameraRequestNonce: s.cameraRequestNonce + 1,
    })),
  requestExport: () => set((s) => ({ exportRequestNonce: s.exportRequestNonce + 1 })),
  toggleExplode: () => set((s) => ({ exploded: !s.exploded })),
  setExplodeFactor: (explodeFactor) => set({ explodeFactor }),
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
