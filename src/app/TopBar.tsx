import { PROJECT_META, REVISION } from '../lib/mockData';
import { useAppStore } from '../store/useAppStore';
import { IconButton } from '../ui/primitives';
import { shortcutFor } from '../interaction/commands';
import { useHelpStore } from '../interaction/helpStore';
import styles from './TopBar.module.css';

export function TopBar() {
  const projectName = useAppStore((s) => s.projectName);
  const requestExport = useAppStore((s) => s.requestExport);
  const explorerOpen = useAppStore((s) => s.explorerOpen);
  const setExplorerOpen = useAppStore((s) => s.setExplorerOpen);
  const togglePresent = useAppStore((s) => s.togglePresent);
  const toggleHelp = useHelpStore((s) => s.toggle);

  return (
    <header className={styles.bar}>
      <span className={styles.name}>{projectName}</span>
      <span className={styles.meta}>{PROJECT_META}</span>
      <span className={styles.rule} />
      <span className={styles.revision}>{REVISION}</span>
      <span className={styles.spacer} />
      <IconButton
        icon="cube"
        tone="onDark"
        label="Model explorer"
        aria-expanded={explorerOpen}
        className={styles.explorerToggle}
        onClick={() => setExplorerOpen(!explorerOpen)}
      />
      <IconButton
        icon="eye"
        tone="onDark"
        label="Present"
        title={`Present (${shortcutFor('toggle-present')})`}
        aria-keyshortcuts={shortcutFor('toggle-present')}
        onClick={togglePresent}
      />
      <IconButton
        icon="help"
        tone="onDark"
        label="Keyboard shortcuts"
        title={`Keyboard shortcuts (${shortcutFor('toggle-help')})`}
        aria-keyshortcuts={shortcutFor('toggle-help')}
        onClick={toggleHelp}
      />
      <button type="button" className={styles.export} onClick={requestExport}>
        Export view
      </button>
    </header>
  );
}
