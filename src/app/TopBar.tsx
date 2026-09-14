import { PROJECT_META, REVISION } from '../lib/mockData';
import { useAppStore } from '../store/useAppStore';
import { shortcutFor } from '../interaction/commands';
import { useHelpStore } from '../interaction/helpStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const projectName = useAppStore((s) => s.projectName);
  const requestExport = useAppStore((s) => s.requestExport);
  const toggleHelp = useHelpStore((s) => s.toggle);

  return (
    <header className={styles.bar}>
      <span className={styles.name}>{projectName}</span>
      <span className={styles.meta}>{PROJECT_META}</span>
      <span className={styles.rule} />
      <span className={styles.revision}>{REVISION}</span>
      <span className={styles.spacer} />
      <button
        type="button"
        className={styles.export}
        title={`Keyboard shortcuts (${shortcutFor('toggle-help')})`}
        aria-keyshortcuts={shortcutFor('toggle-help')}
        onClick={toggleHelp}
      >
        Keyboard shortcuts
      </button>
      <button type="button" className={styles.export} onClick={requestExport}>
        Export view
      </button>
    </header>
  );
}
