import { useCallback, useEffect } from 'react';
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
  const measuring = useAppStore((s) => s.measuring);
  const toggleMeasuring = useAppStore((s) => s.toggleMeasuring);
  const drawerOpen = Boolean(selected) || measuring;

  // Picking a measurement point IS clicking the canvas — a modal scrim would
  // eat every pick. Only block the canvas when the drawer is showing
  // properties alone; measuring always keeps it click-through beside itself.
  const showScrim = drawerOpen && !measuring;

  const closeDrawer = useCallback(() => {
    select(null);
    if (measuring) toggleMeasuring();
  }, [select, measuring, toggleMeasuring]);

  // Below 1280px .right is an overlay, not a column — Escape should only
  // close it there, not change desktop selection behaviour.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.matchMedia(NARROW).matches) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, closeDrawer]);

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

      {showScrim && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close panel"
          onClick={closeDrawer}
        />
      )}
      <div className={styles.right} data-open={drawerOpen ? 'true' : undefined}>
        <IconButton
          icon="close"
          label="Close panel"
          className={styles.closeDrawer}
          onClick={closeDrawer}
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
