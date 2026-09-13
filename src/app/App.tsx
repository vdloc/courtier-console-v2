import { useEffect } from 'react';
import { TopBar } from './TopBar';
import { ObjectTree } from './ObjectTree';
import { Layers } from './Layers';
import { ViewControls } from './ViewControls';
import { PropertyPanel } from './PropertyPanel';
import { MeasurePanel } from './MeasurePanel';
import { Timeline } from './Timeline';
import { Viewport } from './Viewport';
import { Gallery } from '../gallery/Gallery';
import { IconButton } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import styles from './App.module.css';

/** `?gallery` shows the design system on its own, with no model content. */
const GALLERY = new URLSearchParams(window.location.search).has('gallery');

const NARROW = '(max-width: 1280px)';

export default function App() {
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);
  const drawerOpen = Boolean(selected);

  // Below 1280px .right is an overlay, not a column — Escape should only
  // close it there, not change desktop selection behaviour.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.matchMedia(NARROW).matches) select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, select]);

  if (GALLERY) return <Gallery />;

  return (
    <div className={styles.app}>
      <div className={styles.top}>
        <TopBar />
      </div>

      <div className={styles.left}>
        <ObjectTree />
        <div className={styles.controls}>
          <Layers />
          <ViewControls />
        </div>
      </div>

      <div className={styles.view}>
        <Viewport />
      </div>

      {drawerOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close properties"
          onClick={() => select(null)}
        />
      )}
      <div className={styles.right} data-open={drawerOpen ? 'true' : undefined}>
        <IconButton
          icon="close"
          label="Close properties"
          className={styles.closeDrawer}
          onClick={() => select(null)}
        />
        <MeasurePanel />
        <PropertyPanel />
      </div>

      <div className={styles.bottom}>
        <Timeline />
      </div>
    </div>
  );
}
