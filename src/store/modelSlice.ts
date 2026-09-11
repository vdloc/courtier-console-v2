import type { StateCreator } from 'zustand';
import type { ComponentInfo, LayerName, TreeNode } from './types';
import { LAYERS } from './types';
import { INITIAL_LAYERS, MOCK_COMPONENTS, MOCK_TREE } from '../lib/mockData';

export interface ModelSlice {
  projectName: string;
  tree: TreeNode;
  filter: string;
  collapsed: Set<string>;
  hidden: Set<string>;
  locked: Set<string>;
  selected: ComponentInfo | null;
  hovered: string | null;
  layers: Record<LayerName, boolean>;

  setFilter: (filter: string) => void;
  toggleCollapsed: (id: string) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setHidden: (id: string, hidden: boolean) => void;
  setLocked: (id: string, locked: boolean) => void;
  isolateSelected: () => void;
  showEverything: () => void;
  toggleLayer: (layer: LayerName) => void;
  setAllLayers: (on: boolean) => void;
}

/** Every component id in the tree, so "isolate" knows what to hide. */
function allComponentIds(node: TreeNode, acc: string[] = []): string[] {
  if (node.kind === 'component') acc.push(node.id);
  node.children?.forEach((c) => allComponentIds(c, acc));
  return acc;
}

export const createModelSlice: StateCreator<ModelSlice, [], [], ModelSlice> = (set) => ({
  projectName: MOCK_TREE.label,
  tree: MOCK_TREE,
  filter: '',
  collapsed: new Set<string>(['L02', 'L03']),
  hidden: new Set<string>(),
  locked: new Set<string>(),
  selected: null,
  hovered: null,
  layers: { ...INITIAL_LAYERS },

  setFilter: (filter) => set({ filter }),
  toggleCollapsed: (id) =>
    set((s) => {
      const next = new Set(s.collapsed);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { collapsed: next };
    }),
  select: (id) => set({ selected: id ? (MOCK_COMPONENTS[id] ?? null) : null }),
  hover: (hovered) => set({ hovered }),
  setHidden: (id, hidden) =>
    set((s) => {
      const next = new Set(s.hidden);
      if (hidden) next.add(id);
      else next.delete(id);
      return { hidden: next };
    }),
  setLocked: (id, locked) =>
    set((s) => {
      const next = new Set(s.locked);
      if (locked) next.add(id);
      else next.delete(id);
      return { locked: next };
    }),
  isolateSelected: () =>
    set((s) => {
      if (!s.selected) return {};
      const others = allComponentIds(s.tree).filter((id) => id !== s.selected!.id);
      return { hidden: new Set(others) };
    }),
  showEverything: () => set({ hidden: new Set<string>() }),
  toggleLayer: (layer) =>
    set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  setAllLayers: (on) =>
    set({
      layers: LAYERS.reduce(
        (acc, l) => ({ ...acc, [l]: on }),
        {} as Record<LayerName, boolean>,
      ),
    }),
});
