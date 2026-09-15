import { useState } from 'react';
import { CheckboxRow, Icon } from '../ui/primitives';
import { LAYERS } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import styles from './panels.module.css';

export function Layers() {
  const layers = useAppStore((s) => s.layers);
  const toggleLayer = useAppStore((s) => s.toggleLayer);
  const [open, setOpen] = useState(true);

  const allOn = LAYERS.every((l) => layers[l]);

  const toggleAll = () => {
    const next = !allOn;
    LAYERS.forEach((l) => {
      if (layers[l] !== next) toggleLayer(l);
    });
  };

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.collapseToggle}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
          Structure layers
        </button>
        <span className={styles.spacer} />
        <button type="button" className={styles.link} onClick={toggleAll}>
          {allOn ? 'Hide layers' : 'Show layers'}
        </button>
      </header>
      {open && (
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
      )}
    </section>
  );
}
