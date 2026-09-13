import type { ComponentInfo, TreeNode } from '../../store/types';

export interface GlbTree {
  tree: TreeNode;
  /** Member id → group ids above it, so a viewport pick can expand down to its row. */
  ancestors: Record<string, string[]>;
  /** Group id → every member id under it, so hiding a group hides real meshes. */
  members: Record<string, string[]>;
  /** Every group id, collapsed by default: one level holds hundreds of bolts. */
  groupIds: string[];
}

/** Prefixed so GLB groups never share collapse/hide state with the mock tree's `L02`-style ids. */
const levelId = (level: string) => `glb:${level}`;
const typeId = (level: string, type: string) => `glb:${level}/${type}`;

const TYPE_LABELS: Record<string, string> = {
  column: 'Columns',
  beam_x: 'Beams (X)',
  beam_y: 'Beams (Y)',
  brace: 'Braces',
  foundation: 'Pad foundations',
  base_plate: 'Base plates',
  end_plate: 'End plates',
  splice_plate: 'Splice plates',
  stiffener: 'Stiffeners',
  bolt: 'Bolts',
  weld: 'Welds',
  guard_rail: 'Guard rails',
  guard_post: 'Guard posts',
  toe_board: 'Toe boards',
  hanger: 'Hangers',
  pipe: 'Pipes',
  insulation: 'Insulation',
};

function levelLabel(level: string): string {
  if (level === 'L00') return 'Level 00 · Ground';
  if (level === 'RF') return 'Roof';
  const span = /^L(\d+)-L(\d+)$/.exec(level);
  if (span) return `Levels ${span[1]}–${span[2]}`;
  return /^L\d+$/.test(level) ? `Level ${level.slice(1)}` : level;
}

/** Sort key: a level by its number, a span (L00-L01) just after its first level, RF last. */
function levelRank(level: string): number {
  const m = /^L(\d+)(-L\d+)?$/.exec(level);
  return m ? Number(m[1]) + (m[2] ? 0.5 : 0) : Number.MAX_SAFE_INTEGER;
}

function compareLevels(a: string, b: string): number {
  return levelRank(a) - levelRank(b) || a.localeCompare(b);
}

export function buildGlbTree(
  components: Record<string, ComponentInfo>,
  projectName: string,
): GlbTree {
  const byLevel = new Map<string, Map<string, ComponentInfo[]>>();
  for (const c of Object.values(components)) {
    const types = byLevel.get(c.level) ?? new Map<string, ComponentInfo[]>();
    const list = types.get(c.element_type) ?? [];
    list.push(c);
    types.set(c.element_type, list);
    byLevel.set(c.level, types);
  }

  const ancestors: Record<string, string[]> = {};
  const members: Record<string, string[]> = {};
  const groupIds: string[] = [];

  const levels = [...byLevel.keys()].sort(compareLevels).map((level): TreeNode => {
    const lId = levelId(level);
    groupIds.push(lId);
    members[lId] = [];
    const types = byLevel.get(level)!;
    const children = [...types.keys()]
      .sort((a, b) => (TYPE_LABELS[a] ?? a).localeCompare(TYPE_LABELS[b] ?? b))
      .map((type): TreeNode => {
        const tId = typeId(level, type);
        groupIds.push(tId);
        const list = types.get(type)!.sort((a, b) => a.name.localeCompare(b.name));
        members[tId] = list.map((c) => c.id);
        members[lId].push(...members[tId]);
        for (const c of list) ancestors[c.id] = [lId, tId];
        return {
          id: tId,
          kind: 'system',
          label: TYPE_LABELS[type] ?? type,
          detail: String(list.length),
          children: list.map((c) => ({
            id: c.id,
            kind: 'component',
            label: c.name,
            detail: c.grid_ref,
            status: c.status,
          })),
        };
      });
    return {
      id: lId,
      kind: 'level',
      label: levelLabel(level),
      detail: String(members[lId].length),
      children,
    };
  });

  return {
    tree: {
      id: 'glb:project',
      kind: 'project',
      label: projectName,
      detail: String(Object.keys(components).length),
      children: levels,
    },
    ancestors,
    members,
    groupIds,
  };
}
