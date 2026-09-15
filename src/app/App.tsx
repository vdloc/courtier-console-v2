import { useCallback } from 'react';
import { TopBar } from './TopBar';
import { ObjectTree } from './ObjectTree';
import { Layers } from './Layers';
import { ViewControls } from './ViewControls';
import { PropertyPanel } from './PropertyPanel';
import { MeasurePanel } from './MeasurePanel';
import { Timeline } from './Timeline';
import { Viewport } from './Viewport';
import { PresentStepper } from './PresentStepper';
import { Gallery } from '../gallery/Gallery';
import { IconButton } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import { useShortcuts } from '../interaction/useShortcuts';
import { ShortcutHelp } from '../interaction/ShortcutHelp';
import styles from './App.module.css';

/** `?gallery` shows the design system on its own, with no model content. */
const GALLERY = new URLSearchParams(window.location.search).has('gallery');

export default function App() {
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);
  const measuring = useAppStore((s) => s.measuring);
  const toggleMeasuring = useAppStore((s) => s.toggleMeasuring);
  const explorerOpen = useAppStore((s) => s.explorerOpen);
  const setExplorerOpen = useAppStore((s) => s.setExplorerOpen);
  const inspectForcedOpen = useAppStore((s) => s.inspectForcedOpen);
  const setInspectForcedOpen = useAppStore((s) => s.setInspectForcedOpen);
  const presenting = useAppStore((s) => s.presenting);
  const drawerOpen = Boolean(selected) || measuring || inspectForcedOpen;

  // Picking a measurement point IS clicking the canvas — a modal scrim would
  // eat every pick. Only block the canvas when the drawer is showing
  // properties alone; measuring always keeps it click-through beside itself.
  const showScrim = ((drawerOpen && !measuring) || explorerOpen) && !presenting;

  const closeDrawer = useCallback(() => {
    select(null);
    if (measuring) toggleMeasuring();
    if (explorerOpen) setExplorerOpen(false);
    if (inspectForcedOpen) setInspectForcedOpen(false);
  }, [
    select,
    measuring,
    toggleMeasuring,
    explorerOpen,
    setExplorerOpen,
    inspectForcedOpen,
    setInspectForcedOpen,
  ]);

  // Escape now lives in the shortcut registry's cancel command — see interaction/commands.ts.
  useShortcuts();

  if (GALLERY) return <Gallery />;

  return (
    <div className={styles.app} data-presenting={presenting ? 'true' : undefined}>
      <div className={styles.top} hidden={presenting || undefined}>
        <TopBar />
      </div>

      <div
        className={styles.left}
        data-open={explorerOpen ? 'true' : undefined}
        hidden={presenting || undefined}
      >
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
      <div
        className={styles.right}
        data-open={drawerOpen ? 'true' : undefined}
        hidden={presenting || undefined}
      >
        <IconButton
          icon="close"
          label="Close panel"
          className={styles.closeDrawer}
          onClick={closeDrawer}
        />
        <MeasurePanel />
        <PropertyPanel />
      </div>

      <div className={styles.bottom} hidden={presenting || undefined}>
        <Timeline />
      </div>

      {presenting && <PresentStepper />}

      <ShortcutHelp />
    </div>
  );
}
