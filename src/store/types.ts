/**
 * The data contract. Deliberately free of any renderer type: the previous app
 * hung a live `Object3D` off its selection, which made every panel untestable
 * without a GL context. A node here is identified by string id and nothing else.
 */

export const LAYERS = [
  'Foundation',
  'Columns',
  'Beams',
  'Pipes',
  'Connections',
  'Accessories',
] as const;
export type LayerName = (typeof LAYERS)[number];

export type Discipline = 'STR' | 'ARC' | 'MEP' | 'TMP';
export type ViewMode = 'realistic' | 'engineering' | 'analysis' | 'construction';
export type CameraShot = 'front' | 'side' | 'iso' | 'joint';
export type Quality = 'high' | 'balanced' | 'performance';
export type SectionAxis = 'x' | 'y' | 'z';
export type MeasureMode = 'distance' | 'horizontal' | 'vertical' | 'angle' | 'area';
export type Playback = 'idle' | 'playing' | 'paused' | 'finished';
export type Status = 'Installed' | 'In progress' | 'Not started' | 'Clash';

export type NodeKind = 'project' | 'level' | 'system' | 'component';

export interface ComponentData {
  discipline: Discipline;
  element_type: string;
  ifc_class?: string;
  ifc_type?: string;
  system?: string;
  level: string;
  grid_ref: string;
  section: string;
  material_spec: string;
}

export interface ComponentInfo extends ComponentData {
  id: string;
  name: string;
  /** Longest bounding-box dimension, metres. */
  length: number;
  /**
   * Absent for members loaded from the GLB: the export carries dimensions but
   * no mass, and the demo viewer's answer is an ESTIMATE with a stated basis
   * (`estimateMass`, engineering/PropertyPanel.tsx) rather than a number the
   * file actually knows. Until that is ported, realistic mode shows no mass
   * rather than a fabricated one.
   */
  mass?: number;
  status: Status;
  layer: LayerName;
  connected: string[];
}

export interface TreeNode {
  id: string;
  kind: NodeKind;
  label: string;
  detail?: string;
  status?: Status;
  children?: TreeNode[];
}

export interface MeasurePoint {
  id: string;
  snap: 'vertex' | 'edge' | 'face' | 'centre';
  object: string;
  xyz: [number, number, number];
}

export interface TimelinePhase {
  name: string;
  start: number;
  end: number;
}

export interface Viewpoint {
  id: string;
  name: string;
  mode: ViewMode;
  saved: string;
}
