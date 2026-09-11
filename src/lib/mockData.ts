/**
 * Project-level stand-in content. The model itself is NOT here — it comes from
 * diagram/model.ts, which generates the parts, the component records and the
 * tree from one spec so the viewport and the explorer cannot disagree.
 */

import type { LayerName, MeasurePoint, TimelinePhase, Viewpoint } from '../store/types';
import { LAYERS } from '../store/types';
import { BAY_X, COMPONENTS, buildTree } from '../diagram/model';

export const PROJECT_NAME = 'Northgate Plant Extension';
export const PROJECT_META = 'STEEL FRAME · 4 × 3 BAYS · G+3';
export const REVISION = 'REV C · ISSUED FOR REVIEW';

export const MOCK_TREE = buildTree(PROJECT_NAME);
export const MOCK_COMPONENTS = COMPONENTS;

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

export const MOCK_MEASURE_POINTS: MeasurePoint[] = [
  { id: 'p1', snap: 'vertex', object: 'Steel_Column_L00_A1', xyz: [0, 0, 0] },
  { id: 'p2', snap: 'centre', object: 'Steel_Column_L00_B1', xyz: [BAY_X, 0, 0] },
];

export const MOCK_VIEWPOINTS: Viewpoint[] = [
  { id: 'v1', name: 'Base connection A1', mode: 'engineering', saved: '2 days ago' },
  { id: 'v2', name: 'Services clash — L01', mode: 'analysis', saved: 'yesterday' },
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
