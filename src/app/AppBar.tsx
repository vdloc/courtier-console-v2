import { IconButton } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import styles from './AppBar.module.css';

export function AppBar() {
  const projectName = useAppStore((s) => s.projectName);

  return (
    <header className={styles.bar}>
      <span className={styles.brand}>Console</span>
      <span className={styles.title}>{projectName}</span>
      <span className={styles.spacer} />
      <button type="button" className={styles.pill}>
        Share
      </button>
      <IconButton icon="help" label="Help" tone="onDark" />
      <IconButton icon="search" label="Search" tone="onDark" />
      <IconButton icon="bell" label="Notifications" tone="onDark" badge />
      <span className={styles.user}>
        <span className={styles.avatar}>VL</span>
        Loc Vu
      </span>
    </header>
  );
}
