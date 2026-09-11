import { TopBar } from './TopBar';
import { ObjectTree } from './ObjectTree';
import { Layers } from './Layers';
import { ViewControls } from './ViewControls';
import { PropertyPanel } from './PropertyPanel';
import { MeasurePanel } from './MeasurePanel';
import { Timeline } from './Timeline';
import { Viewport } from './Viewport';
import { Gallery } from '../gallery/Gallery';
import styles from './App.module.css';

/** `?gallery` shows the design system on its own, with no model content. */
const GALLERY = new URLSearchParams(window.location.search).has('gallery');

export default function App() {
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

      <div className={styles.right}>
        <MeasurePanel />
        <PropertyPanel />
      </div>

      <div className={styles.bottom}>
        <Timeline />
      </div>
    </div>
  );
}
