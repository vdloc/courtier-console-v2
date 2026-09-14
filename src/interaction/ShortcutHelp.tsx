import { useMemo } from 'react';
import { Modal } from '../ui/primitives';
import { COMMANDS, CATEGORY_LABELS, type CommandCategory } from './commands';
import { useHelpStore } from './helpStore';
import styles from './ShortcutHelp.module.css';

const CATEGORY_ORDER: CommandCategory[] = [
  'navigation',
  'visibility',
  'tools',
  'sequence',
  'general',
];

/** Reads the same registry the keyboard does, so it can't list a key that doesn't work. */
export function ShortcutHelp() {
  const open = useHelpStore((s) => s.open);
  const close = useHelpStore((s) => s.close);

  const groups = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        category,
        commands: COMMANDS.filter((c) => c.category === category && c.shortcut),
      })).filter((g) => g.commands.length > 0),
    [],
  );

  return (
    <Modal open={open} title="Keyboard shortcuts" onClose={close} closeOnEscape={false}>
      <div className={styles.grid}>
        {groups.map(({ category, commands }) => (
          <section key={category}>
            <h3 className={styles.label}>{CATEGORY_LABELS[category]}</h3>
            {commands.map((c) => (
              <div key={c.id} className={styles.row}>
                <span title={c.hint}>{c.label}</span>
                <span className={styles.keys}>
                  {(c.shortcut as string).split('+').map((part) => (
                    <kbd key={part} className={styles.kbd}>
                      {part}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </Modal>
  );
}
