import { useEffect, useMemo, useRef } from 'react';
import { Icon, Input } from '../ui/primitives';
import type { Status, TreeNode } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import panels from './panels.module.css';
import styles from './ObjectTree.module.css';

interface Row {
  node: TreeNode;
  depth: number;
  hasChildren: boolean;
}

const STATUS_CLASS: Record<Status, string> = {
  Installed: styles.installed,
  'In progress': styles.progress,
  'Not started': styles.notStarted,
  Clash: styles.clash,
};

function flatten(
  node: TreeNode,
  collapsed: Set<string>,
  filter: string,
  depth = 0,
  out: Row[] = [],
): Row[] {
  const match = !filter || node.label.toLowerCase().includes(filter.toLowerCase());
  const children = node.children ?? [];
  const hasChildren = children.length > 0;

  // A filtered-out container still shows when a descendant matches, otherwise
  // searching for a part would hide the level it lives on.
  const kept: Row[] = [];
  if (hasChildren && !collapsed.has(node.id)) {
    children.forEach((c) => flatten(c, collapsed, filter, depth + 1, kept));
  }

  if (match || kept.length > 0) {
    out.push({ node, depth, hasChildren });
    out.push(...kept);
  }
  return out;
}

export function ObjectTree() {
  const tree = useAppStore((s) => s.tree);
  const collapsed = useAppStore((s) => s.collapsed);
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed);
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);
  const hidden = useAppStore((s) => s.hidden);
  const locked = useAppStore((s) => s.locked);
  const setHidden = useAppStore((s) => s.setHidden);
  const setLocked = useAppStore((s) => s.setLocked);
  const isolateSelected = useAppStore((s) => s.isolateSelected);
  const showEverything = useAppStore((s) => s.showEverything);

  const rows = useMemo(
    () => flatten(tree, collapsed, filter),
    [tree, collapsed, filter],
  );

  // A viewport click can select a row that is scrolled far out of sight.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selected) return;
    scroller.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected, rows]);

  return (
    <section className={`${panels.section} ${panels.grow}`}>
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
          placeholder="Mark, grid ref, type or level"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter model"
        />
      </div>

      <div className={panels.scroll} ref={scroller}>
        {rows.map(({ node, depth, hasChildren }) => {
          const isHidden = hidden.has(node.id);
          const isLocked = locked.has(node.id);
          return (
            <div
              key={node.id}
              className={styles.row}
              data-selected={selected?.id === node.id ? 'true' : undefined}
              data-hidden={isHidden ? 'true' : undefined}
              style={{ paddingLeft: 4 + depth * 12 }}
              onClick={() => (hasChildren ? toggleCollapsed(node.id) : select(node.id))}
              role="treeitem"
              aria-selected={selected?.id === node.id}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (hasChildren) toggleCollapsed(node.id);
                  else select(node.id);
                }
              }}
            >
              <span className={styles.caret}>
                {hasChildren && (
                  <Icon
                    name={collapsed.has(node.id) ? 'chevron-right' : 'chevron-down'}
                    size={12}
                  />
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
                data-on={isHidden || isLocked ? 'true' : undefined}
                aria-label={isHidden ? 'Show' : 'Hide'}
                onClick={(e) => {
                  e.stopPropagation();
                  setHidden(node.id, !isHidden);
                  if (isLocked) setLocked(node.id, false);
                }}
              >
                <Icon name="eye" size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
