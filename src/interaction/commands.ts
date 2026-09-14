import { useAppStore } from '../store/useAppStore';
import type { CameraShot } from '../store/types';
import { useHelpStore } from './helpStore';
import { NARROW } from '../app/breakpoints';

export type CommandCategory =
  'navigation' | 'visibility' | 'tools' | 'sequence' | 'general';

export interface Command {
  id: string;
  label: string;
  category: CommandCategory;
  /** Display form, e.g. `F` or `Shift+H` — also what useShortcuts matches against. */
  shortcut?: string;
  hint?: string;
  enabled?: () => boolean;
  active?: () => boolean;
  run: () => void;
}

const store = () => useAppStore.getState();

const SHOTS: Array<{ key: string; shot: CameraShot; label: string }> = [
  { key: '1', shot: 'front', label: 'Front view' },
  { key: '2', shot: 'side', label: 'Side view' },
  { key: '3', shot: 'iso', label: 'ISO view' },
  { key: '4', shot: 'joint', label: 'Joint view' },
];

export const COMMANDS: Command[] = [
  {
    id: 'fit-model',
    label: 'Fit model',
    category: 'navigation',
    shortcut: 'F',
    hint: 'Frame the whole structure',
    run: () => store().requestFitModel(),
  },
  {
    id: 'focus-selected',
    label: 'Focus selected',
    category: 'navigation',
    shortcut: 'I',
    hint: 'Frame the selected component',
    enabled: () => store().selected !== null,
    run: () => store().requestFocusSelected(),
  },
  {
    id: 'reset-view',
    label: 'Reset view',
    category: 'navigation',
    shortcut: 'R',
    hint: 'Return to the default view',
    run: () => store().requestReset(),
  },
  ...SHOTS.map(({ key, shot, label }): Command => ({
    id: `view-${shot}`,
    label,
    category: 'navigation',
    shortcut: key,
    active: () => store().shot === shot,
    run: () => store().requestShot(shot),
  })),

  {
    id: 'hide-selected',
    label: 'Hide selected',
    category: 'visibility',
    shortcut: 'H',
    hint: 'Take the selected component out of the view',
    enabled: () => store().selected !== null,
    run: () => {
      const { selected, setHidden, select } = store();
      if (!selected) return;
      setHidden(selected.id, true);
      select(null);
    },
  },
  {
    id: 'show-all',
    label: 'Show all',
    category: 'visibility',
    shortcut: 'Shift+H',
    hint: 'Restore every hidden object',
    run: () => store().showEverything(),
  },
  {
    id: 'toggle-section',
    label: 'Section plane',
    category: 'visibility',
    shortcut: 'P',
    hint: 'Cut through the model to see inside a joint',
    active: () => store().sectionEnabled,
    run: () => store().toggleSection(),
  },
  {
    id: 'section-axis-x',
    label: 'Section across X',
    category: 'visibility',
    shortcut: 'Shift+X',
    enabled: () => store().sectionEnabled,
    active: () => store().sectionAxis === 'x',
    run: () => store().setSectionAxis('x'),
  },
  {
    id: 'section-axis-y',
    label: 'Section across Y',
    category: 'visibility',
    shortcut: 'Shift+Y',
    enabled: () => store().sectionEnabled,
    active: () => store().sectionAxis === 'y',
    run: () => store().setSectionAxis('y'),
  },
  {
    id: 'section-axis-z',
    label: 'Section across Z',
    category: 'visibility',
    shortcut: 'Shift+Z',
    enabled: () => store().sectionEnabled,
    active: () => store().sectionAxis === 'z',
    run: () => store().setSectionAxis('z'),
  },
  {
    id: 'section-flip',
    label: 'Flip section',
    category: 'visibility',
    shortcut: 'Shift+F',
    hint: 'Keep the other half, without moving the cut',
    enabled: () => store().sectionEnabled,
    active: () => store().sectionFlipped,
    run: () => store().toggleSectionFlip(),
  },

  {
    id: 'measure-distance',
    label: 'Measure distance',
    category: 'tools',
    shortcut: 'M',
    hint: 'Arm the measure tool between two points',
    active: () => store().measuring && store().measureMode === 'distance',
    run: () => {
      const s = store();
      // Already measuring distance: M is its own way out. From another mode
      // it switches instead of disarming, which is what the old app did.
      if (s.measuring && s.measureMode === 'distance') {
        s.toggleMeasuring();
        return;
      }
      if (s.measureMode !== 'distance') s.setMeasureMode('distance');
      if (!s.measuring) s.toggleMeasuring();
    },
  },
  {
    id: 'measure-angle',
    label: 'Measure angle',
    category: 'tools',
    shortcut: 'Shift+M',
    hint: 'Arm the measure tool in three-point angle mode',
    active: () => store().measuring && store().measureMode === 'angle',
    run: () => {
      const s = store();
      if (s.measuring && s.measureMode === 'angle') {
        s.toggleMeasuring();
        return;
      }
      if (s.measureMode !== 'angle') s.setMeasureMode('angle');
      if (!s.measuring) s.toggleMeasuring();
    },
  },
  {
    id: 'measure-undo',
    label: 'Undo measurement point',
    category: 'tools',
    shortcut: 'Ctrl+Z',
    hint: 'Take back the last point placed',
    enabled: () => store().measurePoints.length > 0,
    run: () => store().undoMeasurePoint(),
  },
  {
    id: 'measure-clear',
    label: 'Clear measurement',
    category: 'tools',
    shortcut: 'Delete',
    hint: 'Remove every placed point',
    enabled: () => store().measurePoints.length > 0,
    run: () => store().clearMeasurement(),
  },
  {
    id: 'toggle-explode',
    label: 'Exploded view',
    category: 'tools',
    shortcut: 'E',
    hint: 'Pull the assembly apart along its connections',
    active: () => store().exploded,
    run: () => store().toggleExplode(),
  },

  {
    id: 'toggle-playback',
    label: 'Play construction sequence',
    category: 'sequence',
    shortcut: 'C',
    hint: 'Run the erection sequence, or pause it',
    active: () => store().playback === 'playing',
    run: () => {
      const s = store();
      if (s.playback === 'playing') s.pause();
      else s.play();
    },
  },

  {
    id: 'save-viewpoint',
    label: 'Save viewpoint',
    category: 'general',
    shortcut: 'V',
    hint: 'Keep this camera, mode and hidden set as a named view',
    run: () => {
      const { viewpoints, requestSaveViewpoint } = store();
      requestSaveViewpoint(`View ${viewpoints.length + 1}`);
    },
  },
  {
    id: 'toggle-help',
    label: 'Keyboard shortcuts',
    category: 'general',
    shortcut: '?',
    run: () => useHelpStore.getState().toggle(),
  },
  {
    id: 'cancel',
    label: 'Cancel',
    category: 'general',
    shortcut: 'Esc',
    hint: 'Close a dialog, disarm measuring, or clear the selection',
    run: () => {
      const help = useHelpStore.getState();
      if (help.open) {
        help.close();
        return;
      }
      const s = store();
      const drawerOpen = Boolean(s.selected) || s.measuring;
      if (window.matchMedia(NARROW).matches && drawerOpen) {
        s.select(null);
        if (s.measuring) s.toggleMeasuring();
        return;
      }
      if (s.measuring) {
        s.toggleMeasuring();
        return;
      }
      if (s.selected) s.select(null);
    },
  },
];

export const COMMANDS_BY_ID = new Map(COMMANDS.map((c) => [c.id, c]));

/** Look up the display shortcut for a UI control, so labels stay in step. */
export function shortcutFor(id: string): string | undefined {
  return COMMANDS_BY_ID.get(id)?.shortcut;
}

export const CATEGORY_LABELS: Record<CommandCategory, string> = {
  navigation: 'Navigation',
  visibility: 'Visibility',
  tools: 'Tools',
  sequence: 'Sequence',
  general: 'General',
};
