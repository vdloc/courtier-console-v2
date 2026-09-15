import { useEffect, useState } from 'react';
import { IconButton } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import styles from './PresentStepper.module.css';

/** Present mode's only chrome: step through saved viewpoints, or leave. */
export function PresentStepper() {
  const viewpoints = useAppStore((s) => s.viewpoints);
  const requestViewpoint = useAppStore((s) => s.requestViewpoint);
  const togglePresent = useAppStore((s) => s.togglePresent);
  const [index, setIndex] = useState(0);

  const current = viewpoints[index] ?? null;

  // Fly to the first saved viewpoint the moment Present opens.
  useEffect(() => {
    if (viewpoints[0]) requestViewpoint(viewpoints[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = (delta: number) => {
    if (viewpoints.length === 0) return;
    const next = (index + delta + viewpoints.length) % viewpoints.length;
    setIndex(next);
    requestViewpoint(viewpoints[next].id);
  };

  return (
    <div className={styles.bar}>
      <IconButton
        icon="chevron-right"
        tone="onDark"
        label="Previous viewpoint"
        className={styles.prev}
        disabled={viewpoints.length === 0}
        onClick={() => step(-1)}
      />
      <span className={styles.name}>
        {current ? current.name : 'No saved viewpoints'}
      </span>
      <IconButton
        icon="chevron-right"
        tone="onDark"
        label="Next viewpoint"
        disabled={viewpoints.length === 0}
        onClick={() => step(1)}
      />
      <IconButton
        icon="close"
        tone="onDark"
        label="Exit Present"
        onClick={togglePresent}
      />
    </div>
  );
}
