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
export type ViewMode = 'realistic' | 'engineering';
export type CameraShot = 'front' | 'side' | 'iso' | 'joint';
export type CameraRequestKind = 'shot' | 'reset' | 'fit' | 'focus' | 'viewpoint';
/** Realistic-mode fidelity tier; flat mode ignores it. */
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
  /** Absent for exported-model members: the GLB carries no mass. */
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
  partId: string;
  /** Local to the part — rides explode and any future transform. */
  local: [number, number, number];
  /** World position at capture; fallback only, for a part the timeline has unmounted. */
  world: [number, number, number];
  snap: 'vertex' | 'midpoint' | 'edge' | 'face';
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
  position: [number, number, number];
  target: [number, number, number];
  saved: string;
}
