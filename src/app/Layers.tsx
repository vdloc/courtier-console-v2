import { CheckboxRow } from '../ui/primitives';
import { LAYERS } from '../store/types';
import { PARTS } from '../diagram/model';
import { useAppStore } from '../store/useAppStore';
import styles from './panels.module.css';

// Derived from PARTS, not hardcoded, so Engineering never lists a dead checkbox for a GLB-only layer.
const ENGINEERING_LAYERS = LAYERS.filter((l) => PARTS.some((p) => p.layer === l));

export function Layers() {
  const mode = useAppStore((s) => s.mode);
  const layers = useAppStore((s) => s.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);

  const visibleLayers = mode === 'realistic' ? LAYERS : ENGINEERING_LAYERS;
  const allOn = visibleLayers.every((l) => layers[l]);

  // Only the listed layers are the toggle's business — flipping one the user
  // can't see here would surprise them after a mode switch.
  const toggleAll = () => {
    const next = !allOn;
    visibleLayers.forEach((l) => {
      if (layers[l] !== next) toggleLayer(l);
    });
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <span className={styles.title}>Structure layers</span>
        <span className={styles.spacer} />
        <button type="button" className={styles.link} onClick={toggleAll}>
          {allOn ? 'Hide layers' : 'Show layers'}
        </button>
      </header>
      <div className={styles.body}>
        {visibleLayers.map((layer) => (
          <CheckboxRow
            key={layer}
            checked={layers[layer]}
            onCheckedChange={() => toggleLayer(layer)}
            label={layer}
          />
        ))}
      </div>
    </section>
  );
}
