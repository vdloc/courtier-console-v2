/**
 * Stand-in content so the shell can be judged before the viewer is wired.
 * Shaped like the previous project's model so the panels are the real ones,
 * not sketches — but none of it is loaded from a file yet.
 */

import type {
  ComponentInfo,
  LayerName,
  MeasurePoint,
  TimelinePhase,
  TreeNode,
  Viewpoint,
} from '../store/types';
import { LAYERS } from '../store/types';

export const PROJECT_NAME = 'Northgate Plant Extension';
export const PROJECT_META = 'STEEL FRAME · 4 × 3 BAYS · G+3';
export const REVISION = 'REV C · ISSUED FOR REVIEW';

export const INITIAL_LAYERS: Record<LayerName, boolean> = LAYERS.reduce(
  (acc, l) => ({ ...acc, [l]: true }),
  {} as Record<LayerName, boolean>,
);

export const PHASES: TimelinePhase[] = [
  { name: 'Foundations', start: 0, end: 3 },
  { name: 'Columns', start: 3, end: 6 },
  { name: 'Beams', start: 6, end: 10 },
  { name: 'Services', start: 10, end: 14 },
  { name: 'Handover', start: 14, end: 18 },
];

export const DURATION = 18;

export const MOCK_TREE: TreeNode = {
  id: 'project',
  kind: 'project',
  label: PROJECT_NAME,
  detail: '3362',
  children: [
    {
      id: 'L00',
      kind: 'level',
      label: 'Level 00 · Ground',
      detail: '220',
      children: [
        {
          id: 'L00/sub',
          kind: 'system',
          label: 'Substructure',
          detail: '40',
          children: [
            {
              id: 'Concrete_Pad_Foundation_A1',
              kind: 'component',
              label: 'Concrete_Pad_Foundation_A1',
              detail: 'A1',
              status: 'Installed',
            },
            {
              id: 'Concrete_Pad_Foundation_A2',
              kind: 'component',
              label: 'Concrete_Pad_Foundation_A2',
              detail: 'A2',
              status: 'Installed',
            },
          ],
        },
        {
          id: 'L00/frame',
          kind: 'system',
          label: 'Primary Frame',
          detail: '20',
          children: [
            {
              id: 'Steel_Column_L00_A1',
              kind: 'component',
              label: 'Steel_Column_L00_A1',
              detail: 'A1',
              status: 'Installed',
            },
            {
              id: 'Steel_Column_L00_A2',
              kind: 'component',
              label: 'Steel_Column_L00_A2',
              detail: 'A2',
              status: 'In progress',
            },
          ],
        },
        { id: 'L00/conn', kind: 'system', label: 'Connections', detail: '160' },
      ],
    },
    {
      id: 'L01',
      kind: 'level',
      label: 'Level 01',
      detail: '851',
      children: [
        { id: 'L01/frame', kind: 'system', label: 'Primary Frame', detail: '20' },
        { id: 'L01/floor', kind: 'system', label: 'Floor Framing', detail: '31' },
        { id: 'L01/conn', kind: 'system', label: 'Connections', detail: '696' },
        {
          id: 'L01/svc',
          kind: 'system',
          label: 'Services',
          detail: '46',
          children: [
            {
              id: 'Pipe_Run_CHW_L01_01',
              kind: 'component',
              label: 'Pipe_Run_CHW_L01_01',
              detail: 'CHW',
              status: 'Not started',
            },
          ],
        },
      ],
    },
    { id: 'L02', kind: 'level', label: 'Level 02', detail: '845' },
    { id: 'L03', kind: 'level', label: 'Level 03', detail: '811' },
  ],
};

export const MOCK_COMPONENTS: Record<string, ComponentInfo> = {
  Steel_Column_L00_A1: {
    id: 'Steel_Column_L00_A1',
    name: 'Steel_Column_L00_A1',
    discipline: 'STR',
    element_type: 'column',
    ifc_class: 'IfcColumn',
    ifc_type: 'COLUMN',
    system: '',
    level: 'L00',
    grid_ref: 'A1',
    section: 'UC 254×254×89',
    material_spec: 'S355 JR, painted',
    length: 4.2,
    mass: 373.8,
    status: 'Installed',
    layer: 'Columns',
    connected: ['Plate_Base_L00_A1', 'Concrete_Pad_Foundation_A1'],
  },
  Concrete_Pad_Foundation_A1: {
    id: 'Concrete_Pad_Foundation_A1',
    name: 'Concrete_Pad_Foundation_A1',
    discipline: 'STR',
    element_type: 'foundation',
    ifc_class: 'IfcFooting',
    ifc_type: 'PAD_FOOTING',
    system: '',
    level: 'L00',
    grid_ref: 'A1',
    section: '2400×2400×700 mm pad',
    material_spec: 'C25/30 concrete, Ø16@150 both ways',
    length: 2.4,
    mass: 9676.8,
    status: 'Installed',
    layer: 'Foundation',
    connected: ['Plate_Base_L00_A1'],
  },
  Steel_Column_L00_A2: {
    id: 'Steel_Column_L00_A2',
    name: 'Steel_Column_L00_A2',
    discipline: 'STR',
    element_type: 'column',
    ifc_class: 'IfcColumn',
    ifc_type: 'COLUMN',
    system: '',
    level: 'L00',
    grid_ref: 'A2',
    section: 'UC 254×254×89',
    material_spec: 'S355 JR, painted',
    length: 4.2,
    mass: 373.8,
    status: 'In progress',
    layer: 'Columns',
    connected: ['Plate_Base_L00_A2'],
  },
  Concrete_Pad_Foundation_A2: {
    id: 'Concrete_Pad_Foundation_A2',
    name: 'Concrete_Pad_Foundation_A2',
    discipline: 'STR',
    element_type: 'foundation',
    ifc_class: 'IfcFooting',
    ifc_type: 'PAD_FOOTING',
    system: '',
    level: 'L00',
    grid_ref: 'A2',
    section: '2400×2400×700 mm pad',
    material_spec: 'C25/30 concrete, Ø16@150 both ways',
    length: 2.4,
    mass: 9676.8,
    status: 'Installed',
    layer: 'Foundation',
    connected: ['Plate_Base_L00_A2'],
  },
  Pipe_Run_CHW_L01_01: {
    id: 'Pipe_Run_CHW_L01_01',
    name: 'Pipe_Run_CHW_L01_01',
    discipline: 'MEP',
    ifc_class: 'IfcPipeSegment',
    ifc_type: 'RIGIDSEGMENT',
    element_type: 'pipe',
    system: 'CHW',
    level: 'L01',
    grid_ref: 'A1–D1',
    section: 'Ø168.3 × 6.3 CHS',
    material_spec: 'Carbon steel, chilled water',
    length: 21.6,
    mass: 542.1,
    status: 'Not started',
    layer: 'Pipes',
    connected: [],
  },
};

export const MOCK_MEASURE_POINTS: MeasurePoint[] = [
  {
    id: 'p1',
    snap: 'vertex',
    object: 'Steel_Column_L00_A1',
    xyz: [0.0, 0.0, -0.04],
  },
  {
    id: 'p2',
    snap: 'centre',
    object: 'Steel_Column_L00_A2',
    xyz: [7.2, 0.0, -0.04],
  },
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
  end_plate: 'End plate',
  splice_plate: 'Splice plate',
  gusset: 'Gusset',
  stiffener: 'Stiffener',
  bolt: 'Bolt',
  weld: 'Weld',
  pipe: 'Pipe',
  guard_rail: 'Guard rail',
  guard_post: 'Guard post',
  toe_board: 'Toe board',
};
