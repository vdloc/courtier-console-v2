import type { LayerName, TimelinePhase, TreeNode, Viewpoint } from '../store/types';
import { LAYERS } from '../store/types';

export const PROJECT_NAME = 'Northgate Plant Extension';
export const PROJECT_META = 'STEEL FRAME · 4 × 3 BAYS · G+3';
export const REVISION = 'REV C · ISSUED FOR REVIEW';

/** Shown only until the GLB registers and activeTree() switches to its real tree. */
export const PLACEHOLDER_TREE: TreeNode = {
  id: 'project',
  kind: 'project',
  label: PROJECT_NAME,
  children: [],
};

export const INITIAL_LAYERS: Record<LayerName, boolean> = LAYERS.reduce(
  (acc, l) => ({ ...acc, [l]: true }),
  {} as Record<LayerName, boolean>,
);

export const PHASES: TimelinePhase[] = [
  { name: 'Foundations', start: 0, end: 4.5 },
  { name: 'Columns', start: 4.5, end: 9 },
  { name: 'Beams', start: 9, end: 13.5 },
  { name: 'Services', start: 13.5, end: 18 },
];

export const DURATION = 18;

export const MOCK_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'v1',
    name: 'Base connection A1',
    mode: 'engineering',
    position: [4, 3.5, 4],
    target: [0, 1, 0],
    saved: '2 days ago',
  },
  {
    id: 'v2',
    name: 'Services clash — L01',
    mode: 'engineering',
    position: [10, 6, 12],
    target: [14.4, 3.5, 3.6],
    saved: 'yesterday',
  },
];

export const ELEMENT_LABELS: Record<string, string> = {
  column: 'Column',
  beam_x: 'Beam (X)',
  beam_y: 'Beam (Y)',
  brace: 'Brace',
  foundation: 'Pad foundation',
  base_plate: 'Base plate',
  pipe: 'Pipe',
};
