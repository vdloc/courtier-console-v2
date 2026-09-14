import type { StateCreator } from 'zustand';
import type {
  CameraRequestKind,
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
  showStats: boolean;
  /** The left panel, below the COMPACT breakpoint where it leaves the grid. */
  explorerOpen: boolean;

  sectionEnabled: boolean;
  sectionAxis: SectionAxis;
  sectionPosition: number;
  sectionFlipped: boolean;

  viewpoints: Viewpoint[];
  /** Id of the viewpoint a 'viewpoint' camera request should fly to. */
  viewpointToRestore: string | null;
  /** Name waiting to be turned into a full record once CameraRig reads its refs. */
  pendingViewpointName: string | null;
  viewpointSaveNonce: number;

  /**
   * What the camera should do next, plus a nonce that always changes — even a
   * re-click of the active shot must retrigger the move, and a changed nonce
   * is the only thing guaranteed to differ every time.
   */
  cameraRequestKind: CameraRequestKind | null;
  cameraRequestNonce: number;
  exportRequestNonce: number;

  setMode: (mode: ViewMode) => void;
  setQuality: (quality: Quality) => void;
  requestShot: (shot: CameraShot) => void;
  requestReset: () => void;
  requestFitModel: () => void;
  requestFocusSelected: () => void;
  requestViewpoint: (id: string) => void;
  requestExport: () => void;
  toggleExplode: () => void;
  setExplodeFactor: (v: number) => void;
  toggleStats: () => void;
  setExplorerOpen: (open: boolean) => void;
  toggleSection: () => void;
  setSectionAxis: (axis: SectionAxis) => void;
  setSectionPosition: (v: number) => void;
  toggleSectionFlip: () => void;
  requestSaveViewpoint: (name: string) => void;
  commitViewpoint: (v: Viewpoint) => void;
  deleteViewpoint: (id: string) => void;
}

export const createViewSlice: StateCreator<ViewSlice, [], [], ViewSlice> = (set) => ({
  mode: 'engineering',
  shot: 'iso',
  quality: 'balanced',
  exploded: false,
  explodeFactor: 0.35,
  showStats: false,
  explorerOpen: false,

  sectionEnabled: false,
  sectionAxis: 'x',
  sectionPosition: 0.5,
  sectionFlipped: false,

  viewpoints: MOCK_VIEWPOINTS,
  viewpointToRestore: null,
  pendingViewpointName: null,
  viewpointSaveNonce: 0,

  cameraRequestKind: null,
  cameraRequestNonce: 0,
  exportRequestNonce: 0,

  setMode: (mode) => set({ mode }),
  setQuality: (quality) => set({ quality }),
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
  requestViewpoint: (id) =>
    set((s) => ({
      viewpointToRestore: id,
      cameraRequestKind: 'viewpoint',
      cameraRequestNonce: s.cameraRequestNonce + 1,
    })),
  requestExport: () => set((s) => ({ exportRequestNonce: s.exportRequestNonce + 1 })),
  toggleExplode: () => set((s) => ({ exploded: !s.exploded })),
  setExplodeFactor: (explodeFactor) => set({ explodeFactor }),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  setExplorerOpen: (explorerOpen) => set({ explorerOpen }),
  toggleSection: () => set((s) => ({ sectionEnabled: !s.sectionEnabled })),
  setSectionAxis: (sectionAxis) => set({ sectionAxis }),
  setSectionPosition: (sectionPosition) => set({ sectionPosition }),
  toggleSectionFlip: () => set((s) => ({ sectionFlipped: !s.sectionFlipped })),
  requestSaveViewpoint: (name) =>
    set((s) => ({
      pendingViewpointName: name,
      viewpointSaveNonce: s.viewpointSaveNonce + 1,
    })),
  commitViewpoint: (v) =>
    set((s) => ({
      viewpoints: [...s.viewpoints, v],
      pendingViewpointName: null,
    })),
  deleteViewpoint: (id) =>
    set((s) => ({ viewpoints: s.viewpoints.filter((v) => v.id !== id) })),
});
