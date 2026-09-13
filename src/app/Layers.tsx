import { CheckboxRow } from '../ui/primitives';
import { LAYERS } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import styles from './panels.module.css';

export function Layers() {
  const layers = useAppStore((s) => s.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const setAllLayers = useAppStore((s) => s.setAllLayers);

  const allOn = LAYERS.every((l) => layers[l]);

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <span className={styles.title}>Structure layers</span>
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.link}
          onClick={() => setAllLayers(!allOn)}
        >
          {allOn ? 'Hide layers' : 'Show layers'}
        </button>
      </header>
      <div className={styles.body}>
        {LAYERS.map((layer) => (
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
