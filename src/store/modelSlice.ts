import type { StateCreator } from 'zustand';
import type { ComponentInfo, LayerName, TreeNode } from './types';
import { LAYERS } from './types';
import { INITIAL_LAYERS, MOCK_COMPONENTS, MOCK_TREE } from '../lib/mockData';
import { ANCESTORS } from '../diagram/model';

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
  /**
   * Members read out of the GLB in realistic mode, keyed by object name.
   *
   * The flat modes and the realistic mode render different geometry — 175
   * procedural boxes against ~3360 exported members — so their ids do not
   * overlap and neither set can answer for the other. Keeping the GLB's
   * members here rather than merging them into `MOCK_COMPONENTS` is what lets
   * `select` serve whichever model is mounted without either one shadowing the
   * other's ids.
   */
  glbComponents: Record<string, ComponentInfo>;
  registerComponents: (components: Record<string, ComponentInfo>) => void;

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

export const createModelSlice: StateCreator<ModelSlice, [], [], ModelSlice> = (
  set,
) => ({
  projectName: MOCK_TREE.label,
  tree: MOCK_TREE,
  filter: '',
  collapsed: new Set<string>(['L02', 'L03']),
  hidden: new Set<string>(),
  locked: new Set<string>(),
  selected: null,
  hovered: null,
  layers: { ...INITIAL_LAYERS },
  glbComponents: {},

  registerComponents: (glbComponents) => set({ glbComponents }),

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
      (ANCESTORS[id] ?? []).forEach((a) => collapsed.delete(a));
      // GLB members first: in realistic mode they are the only ids the
      // viewport can produce, and falling through to the mock set would empty
      // the panel on every click.
      return {
        selected: s.glbComponents[id] ?? MOCK_COMPONENTS[id] ?? null,
        collapsed,
      };
    }),
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
