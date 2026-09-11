/**
 * The model, generated rather than authored. One generator feeds both the 3D
 * scene and the model tree, so clicking a member in the viewport and clicking
 * its row in the explorer resolve to the same id — which two hand-written
 * mocks could never guarantee.
 */

import type { ComponentInfo, LayerName, Status, TreeNode } from '../store/types';

export const BAY_X = 7.2;
export const BAY_Y = 7.2;
export const STOREY = 4.2;

/** 4 × 3 bays, G+3 — the frame the project meta line claims. */
const COLS = ['A', 'B', 'C', 'D', 'E'];
const ROWS = [1, 2, 3, 4];
const LEVELS = ['L00', 'L01', 'L02', 'L03'];

const PAD = { b: 2.4, d: 2.4, t: 0.7 };
const COLUMN = { b: 0.26, d: 0.26 };
const BEAM = { b: 0.19, d: 0.45 };

export interface Part {
  id: string;
  kind: 'foundation' | 'column' | 'beam_x' | 'beam_y' | 'pipe';
  layer: LayerName;
  level: string;
  gridRef: string;
  /** Centre, metres. */
  position: [number, number, number];
  /** Full extents, metres. */
  size: [number, number, number];
  section: string;
  material: string;
  status: Status;
}

function statusFor(levelIndex: number): Status {
  if (levelIndex <= 1) return 'Installed';
  if (levelIndex === 2) return 'In progress';
  return 'Not started';
}

export function buildParts(): Part[] {
  const parts: Part[] = [];

  COLS.forEach((c, ci) => {
    ROWS.forEach((r) => {
      const x = ci * BAY_X;
      const z = (r - 1) * BAY_Y;
      const ref = `${c}${r}`;

      parts.push({
        id: `Concrete_Pad_Foundation_${ref}`,
        kind: 'foundation',
        layer: 'Foundation',
        level: 'L00',
        gridRef: ref,
        position: [x, -PAD.t / 2, z],
        size: [PAD.b, PAD.t, PAD.d],
        section: '2400×2400×700 mm pad',
        material: 'C25/30 concrete, Ø16@150 both ways',
        status: 'Installed',
      });

      for (let lift = 0; lift < 3; lift++) {
        parts.push({
          id: `Steel_Column_${LEVELS[lift]}_${ref}`,
          kind: 'column',
          layer: 'Columns',
          level: LEVELS[lift],
          gridRef: ref,
          position: [x, lift * STOREY + STOREY / 2, z],
          size: [COLUMN.b, STOREY, COLUMN.d],
          section: 'UC 254×254×89',
          material: 'S355 JR, painted',
          status: statusFor(lift + 1),
        });
      }
    });
  });

  for (let lift = 1; lift <= 3; lift++) {
    const y = lift * STOREY;
    const level = LEVELS[lift];

    // Beams spanning X, one per bay on every grid row.
    COLS.slice(0, -1).forEach((c, ci) => {
      ROWS.forEach((r) => {
        const ref = `${c}${r}`;
        parts.push({
          id: `Steel_Beam_X_${level}_${ref}`,
          kind: 'beam_x',
          layer: 'Beams',
          level,
          gridRef: `${ref}–${COLS[ci + 1]}${r}`,
          position: [ci * BAY_X + BAY_X / 2, y - BEAM.d / 2, (r - 1) * BAY_Y],
          size: [BAY_X - COLUMN.b, BEAM.d, BEAM.b],
          section: 'UB 406×178×60',
          material: 'S355 JR, painted',
          status: statusFor(lift),
        });
      });
    });

    // Beams spanning Y.
    COLS.forEach((c, ci) => {
      ROWS.slice(0, -1).forEach((r) => {
        const ref = `${c}${r}`;
        parts.push({
          id: `Steel_Beam_Y_${level}_${ref}`,
          kind: 'beam_y',
          layer: 'Beams',
          level,
          gridRef: `${ref}–${c}${r + 1}`,
          position: [ci * BAY_X, y - BEAM.d / 2, (r - 1) * BAY_Y + BAY_Y / 2],
          size: [BEAM.b, BEAM.d, BAY_Y - COLUMN.b],
          section: 'UB 356×171×51',
          material: 'S355 JR, painted',
          status: statusFor(lift),
        });
      });
    });
  }

  // Two service runs at L01, the only non-structural parts.
  ['CHW', 'LTHW'].forEach((system, i) => {
    parts.push({
      id: `Pipe_Run_${system}_L01_01`,
      kind: 'pipe',
      layer: 'Pipes',
      level: 'L01',
      gridRef: 'A1–E1',
      position: [2 * BAY_X, STOREY - 0.9, i * 0.45],
      size: [4 * BAY_X, 0.17, 0.17],
      section: 'Ø168.3 × 6.3 CHS',
      material:
        system === 'CHW' ? 'Carbon steel, chilled water' : 'Carbon steel, heating',
      status: 'Not started',
    });
  });

  return parts;
}

export const PARTS = buildParts();

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

function computeBounds(parts: Part[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  parts.forEach((p) => {
    for (let axis = 0; axis < 3; axis++) {
      const half = p.size[axis] / 2;
      min[axis] = Math.min(min[axis], p.position[axis] - half);
      max[axis] = Math.max(max[axis], p.position[axis] + half);
    }
  });
  return { min, max };
}

/** World extent of every part, for anything that needs to map 0..1 to a coordinate (section plane). */
export const BOUNDS = computeBounds(PARTS);

const DENSITY: Record<Part['kind'], number> = {
  foundation: 2400,
  column: 7850,
  beam_x: 7850,
  beam_y: 7850,
  pipe: 7850,
};

const IFC: Record<Part['kind'], [string, string]> = {
  foundation: ['IfcFooting', 'PAD_FOOTING'],
  column: ['IfcColumn', 'COLUMN'],
  beam_x: ['IfcBeam', 'BEAM'],
  beam_y: ['IfcBeam', 'BEAM'],
  pipe: ['IfcPipeSegment', 'RIGIDSEGMENT'],
};

function connectionsOf(part: Part): string[] {
  if (part.kind === 'column' && part.level === 'L00') {
    return [`Concrete_Pad_Foundation_${part.gridRef}`];
  }
  if (part.kind === 'foundation') {
    return [`Steel_Column_L00_${part.gridRef}`];
  }
  return [];
}

export function componentOf(part: Part): ComponentInfo {
  const [ifcClass, ifcType] = IFC[part.kind];
  // Members are hollow sections; a solid box would overstate their mass ~6x.
  const solid = part.size[0] * part.size[1] * part.size[2];
  const volume = part.kind === 'foundation' ? solid : solid * 0.17;

  return {
    id: part.id,
    name: part.id,
    discipline: part.kind === 'pipe' ? 'MEP' : 'STR',
    element_type: part.kind,
    ifc_class: ifcClass,
    ifc_type: ifcType,
    system: part.kind === 'pipe' ? part.id.split('_')[2] : '',
    level: part.level,
    grid_ref: part.gridRef,
    section: part.section,
    material_spec: part.material,
    length: Math.max(...part.size),
    mass: volume * DENSITY[part.kind],
    status: part.status,
    layer: part.layer,
    connected: connectionsOf(part),
  };
}

export const COMPONENTS: Record<string, ComponentInfo> = Object.fromEntries(
  PARTS.map((p) => [p.id, componentOf(p)]),
);

const SYSTEM_LABEL: Record<Part['kind'], string> = {
  foundation: 'Substructure',
  column: 'Primary Frame',
  beam_x: 'Floor Framing',
  beam_y: 'Floor Framing',
  pipe: 'Services',
};

/**
 * Component id → the container ids above it. Selecting in the viewport has to
 * open the explorer down to the row, and walking the tree for that on every
 * click is work already done once here.
 */
export const ANCESTORS: Record<string, string[]> = Object.fromEntries(
  PARTS.map((p) => [p.id, [p.level, `${p.level}/${SYSTEM_LABEL_OF(p.kind)}`]]),
);

function SYSTEM_LABEL_OF(kind: Part['kind']): string {
  return SYSTEM_LABEL[kind];
}

export function buildTree(projectName: string): TreeNode {
  const levels = LEVELS.map((level) => {
    const inLevel = PARTS.filter((p) => p.level === level);
    const systems = new Map<string, Part[]>();
    inLevel.forEach((p) => {
      const key = SYSTEM_LABEL[p.kind];
      systems.set(key, [...(systems.get(key) ?? []), p]);
    });

    return {
      id: level,
      kind: 'level' as const,
      label: level === 'L00' ? 'Level 00 · Ground' : `Level ${level.slice(1)}`,
      detail: String(inLevel.length),
      children: [...systems.entries()].map(([name, group]) => ({
        id: `${level}/${name}`,
        kind: 'system' as const,
        label: name,
        detail: String(group.length),
        children: group.map((p) => ({
          id: p.id,
          kind: 'component' as const,
          label: p.id,
          detail: p.gridRef,
          status: p.status,
        })),
      })),
    };
  }).filter((l) => Number(l.detail) > 0);

  return {
    id: 'project',
    kind: 'project',
    label: projectName,
    detail: String(PARTS.length),
    children: levels,
  };
}
