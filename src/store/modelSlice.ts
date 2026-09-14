import type { StateCreator } from 'zustand';
import type { ComponentInfo, LayerName, TreeNode, ViewMode } from './types';
import { INITIAL_LAYERS, MOCK_COMPONENTS, MOCK_TREE } from '../lib/mockData';
import { ANCESTORS } from '../diagram/model';
import { buildGlbTree, type GlbTree } from '../diagram/realistic/glbTree';

export interface ModelSlice {
  projectName: string;
  tree: TreeNode;
  filter: string;
  collapsed: Set<string>;
  hidden: Set<string>;
  selected: ComponentInfo | null;
  layers: Record<LayerName, boolean>;
  /** Exported-model members by node name; kept apart from MOCK_COMPONENTS so neither shadows the other's ids. */
  glbComponents: Record<string, ComponentInfo>;
  /** The explorer tree for realistic mode, built once the GLB's members are read. */
  glb: GlbTree | null;
  registerComponents: (components: Record<string, ComponentInfo>) => void;

  setFilter: (filter: string) => void;
  toggleCollapsed: (id: string) => void;
  select: (id: string | null) => void;
  setHidden: (id: string, hidden: boolean) => void;
  isolateSelected: () => void;
  showEverything: () => void;
  toggleLayer: (layer: LayerName) => void;
}

/** The tree the explorer shows: the GLB's in realistic mode once loaded, the procedural one otherwise. */
export function activeTree(s: { mode: ViewMode; tree: TreeNode; glb: GlbTree | null }) {
  return s.mode === 'realistic' && s.glb ? s.glb.tree : s.tree;
}

/** Every component id in the tree, so "isolate" knows what to hide. */
function allComponentIds(node: TreeNode, acc: string[] = []): string[] {
  if (node.kind === 'component') acc.push(node.id);
  node.children?.forEach((c) => allComponentIds(c, acc));
  return acc;
}

export const createModelSlice: StateCreator<ModelSlice, [], [], ModelSlice> = (
  set,
) => ({
  projectName: MOCK_TREE.label,
  tree: MOCK_TREE,
  filter: '',
  collapsed: new Set<string>(['L02', 'L03']),
  hidden: new Set<string>(),
  selected: null,
  layers: { ...INITIAL_LAYERS },
  glbComponents: {},
  glb: null,

  registerComponents: (glbComponents) =>
    set((s) => {
      const glb = buildGlbTree(glbComponents, s.projectName);
      // Collapse groups on first load only, so a user's expansion survives a mode round trip.
      const collapsed = s.glb
        ? s.collapsed
        : new Set([...s.collapsed, ...glb.groupIds]);
      return { glbComponents, glb, collapsed };
    }),

  setFilter: (filter) => set({ filter }),
  toggleCollapsed: (id) =>
    set((s) => {
      const next = new Set(s.collapsed);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { collapsed: next };
    }),
  // Selecting anywhere opens the explorer down to the row, so a viewport click
  // and a tree click leave the panel in the same state.
  select: (id) =>
    set((s) => {
      if (!id) return { selected: null };
      const collapsed = new Set(s.collapsed);
      (s.glb?.ancestors[id] ?? ANCESTORS[id] ?? []).forEach((a) => collapsed.delete(a));
      return {
        selected: s.glbComponents[id] ?? MOCK_COMPONENTS[id] ?? null,
        collapsed,
      };
    }),
  // A GLB group id stands for its members: the scene only ever tests member names.
  setHidden: (id, hidden) =>
    set((s) => {
      const next = new Set(s.hidden);
      for (const target of s.glb?.members[id] ?? [id]) {
        if (hidden) next.add(target);
        else next.delete(target);
      }
      return { hidden: next };
    }),
  isolateSelected: () =>
    set((s) => {
      if (!s.selected) return {};
      const ids = s.glbComponents[s.selected.id]
        ? Object.keys(s.glbComponents)
        : allComponentIds(s.tree);
      return { hidden: new Set(ids.filter((id) => id !== s.selected!.id)) };
    }),
  showEverything: () => set({ hidden: new Set<string>() }),
  toggleLayer: (layer) =>
    set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
});
