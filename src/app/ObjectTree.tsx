import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon, Input } from '../ui/primitives';
import type { Status, TreeNode } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import { activeTree } from '../store/modelSlice';
import panels from './panels.module.css';
import styles from './ObjectTree.module.css';

interface Row {
  node: TreeNode;
  depth: number;
  hasChildren: boolean;
  open: boolean;
}

const WINDOW_THRESHOLD = 300;
const OVERSCAN = 12;

const STATUS_CLASS: Record<Status, string> = {
  Installed: styles.installed,
  'In progress': styles.progress,
  'Not started': styles.notStarted,
  Clash: styles.clash,
};

/** Mark (label) or grid ref (a component's own detail). Type and level aren't on the
 * leaf itself — they're the label of the group node it sits under. */
function matches(node: TreeNode, filter: string): boolean {
  if (node.label.toLowerCase().includes(filter)) return true;
  return Boolean(node.detail && node.detail.toLowerCase().includes(filter));
}

/** `filter` arrives lowercased. A non-empty filter opens every group, so a match inside a
 * collapsed level is never hidden by a flag the query can't see past. A group match (e.g.
 * "Columns", "Level 01") includes its whole subtree, since type/level live only there. */
function flatten(
  node: TreeNode,
  collapsed: Set<string>,
  filter: string,
  depth = 0,
  out: Row[] = [],
  inherited = false,
): Row[] {
  const ownMatch = !filter || inherited || matches(node, filter);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  // A filtered-out container still shows when a descendant matches, otherwise
  // searching for a part would hide the level it lives on.
  const kept: Row[] = [];
  const open = !collapsed.has(node.id) || filter !== '';
  if (hasChildren && open) {
    children.forEach((c) => flatten(c, collapsed, filter, depth + 1, kept, ownMatch));
  }

  if (ownMatch || kept.length > 0) {
    out.push({ node, depth, hasChildren, open });
    out.push(...kept);
  }
  return out;
}

export function ObjectTree() {
  const tree = useAppStore(activeTree);
  const glb = useAppStore((s) => (s.mode === 'realistic' ? s.glb : null));
  const collapsed = useAppStore((s) => s.collapsed);
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed);
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);
  const hidden = useAppStore((s) => s.hidden);
  const setHidden = useAppStore((s) => s.setHidden);
  const isolateSelected = useAppStore((s) => s.isolateSelected);
  const showEverything = useAppStore((s) => s.showEverything);

  const rows = useMemo(
    () => flatten(tree, collapsed, filter.toLowerCase()),
    [tree, collapsed, filter],
  );

  // A GLB group row reads hidden when every member under it is.
  const isRowHidden = (id: string) => {
    const members = glb?.members[id];
    return members
      ? members.length > 0 && members.every((m) => hidden.has(m))
      : hidden.has(id);
  };

  const scroller = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ top: 0, height: 0, rowH: 32 });
  // Measured: ~1500 DOM rows cost 60-70 ms per keystroke; windowing only kicks in past this.
  const windowed = rows.length > WINDOW_THRESHOLD;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => {
      const rowH = parseFloat(getComputedStyle(el).getPropertyValue('--row-h')) || 32;
      setView({ top: el.scrollTop, height: el.clientHeight, rowH });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A viewport click can select a row that is scrolled far out of sight.
  useEffect(() => {
    const el = scroller.current;
    if (!selected || !el) return;
    if (!windowed) {
      el.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const index = rows.findIndex((r) => r.node.id === selected.id);
    if (index < 0) return;
    const rowTop = index * view.rowH;
    if (rowTop < el.scrollTop) el.scrollTop = rowTop;
    else if (rowTop + view.rowH > el.scrollTop + el.clientHeight)
      el.scrollTop = rowTop + view.rowH - el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, rows]);

  const first = windowed ? Math.max(0, Math.floor(view.top / view.rowH) - OVERSCAN) : 0;
  const last = windowed
    ? Math.min(rows.length, Math.ceil((view.top + view.height) / view.rowH) + OVERSCAN)
    : rows.length;

  return (
    <section className={`${panels.section} ${panels.growTree}`}>
      <header className={panels.header}>
        <span className={panels.title}>Model explorer</span>
        <span className={panels.spacer} />
        {hidden.size > 0 ? (
          <button type="button" className={panels.link} onClick={showEverything}>
            Show all
          </button>
        ) : (
          <button
            type="button"
            className={panels.link}
            onClick={isolateSelected}
            disabled={!selected}
          >
            Isolate
          </button>
        )}
        <span className={panels.count}>{rows.length} rows</span>
      </header>

      <div className={styles.filter}>
        <Input
          placeholder="Mark, type or level"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter model"
        />
      </div>

      <div
        className={panels.scroll}
        ref={scroller}
        onScroll={
          windowed
            ? (e) => {
                const top = e.currentTarget.scrollTop;
                setView((v) => (v.top === top ? v : { ...v, top }));
              }
            : undefined
        }
      >
        {filter && rows.length === 0 ? (
          <div className={`${panels.empty} ${styles.filterEmpty}`}>
            No matches for “{filter}”.
            <br />
            <button type="button" className={panels.link} onClick={() => setFilter('')}>
              Clear filter
            </button>
          </div>
        ) : (
          <>
            {first > 0 && <div style={{ height: first * view.rowH }} aria-hidden />}
            {rows.slice(first, last).map(({ node, depth, hasChildren, open }) => {
              const isHidden = isRowHidden(node.id);
              // Groups are forced open while filtering; collapsing one would be invisible.
              const toggle = () => {
                if (hasChildren && filter === '') toggleCollapsed(node.id);
              };
              return (
                <div
                  key={node.id}
                  className={styles.row}
                  data-selected={selected?.id === node.id ? 'true' : undefined}
                  data-hidden={isHidden ? 'true' : undefined}
                  style={{ paddingLeft: 4 + depth * 12 }}
                  onClick={() => (hasChildren ? toggle() : select(node.id))}
                  role="treeitem"
                  aria-selected={selected?.id === node.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (hasChildren) toggle();
                      else select(node.id);
                    }
                  }}
                >
                  <span className={styles.caret}>
                    {hasChildren && (
                      <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
                    )}
                  </span>
                  <span
                    className={`${styles.label} ${
                      node.kind === 'level'
                        ? styles.level
                        : node.kind === 'system'
                          ? styles.system
                          : ''
                    }`}
                  >
                    {node.label}
                  </span>
                  <span className={styles.detail}>{node.detail}</span>
                  <span
                    className={`${styles.dot} ${node.status ? STATUS_CLASS[node.status] : ''}`}
                  />
                  <button
                    type="button"
                    className={styles.iconToggle}
                    data-on={isHidden ? 'true' : undefined}
                    aria-label={isHidden ? 'Show' : 'Hide'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHidden(node.id, !isHidden);
                    }}
                  >
                    <Icon name="eye" size={13} />
                  </button>
                </div>
              );
            })}
            {last < rows.length && (
              <div style={{ height: (rows.length - last) * view.rowH }} aria-hidden />
            )}
          </>
        )}
      </div>
    </section>
  );
}
