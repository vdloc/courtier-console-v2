import { Chip } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import styles from './Viewport.module.css';

const STATS: [string, string][] = [
  ['Objects', '3,362'],
  ['Triangles', '435,896'],
  ['Draw calls', '78'],
  ['Frame', '16.7 ms'],
];

/** The seam the diagram renderer plugs into at milestone 2. */
export function Viewport() {
  const mode = useAppStore((s) => s.mode);
  const shot = useAppStore((s) => s.shot);
  const showStats = useAppStore((s) => s.showStats);
  const measuring = useAppStore((s) => s.measuring);
  const sectionEnabled = useAppStore((s) => s.sectionEnabled);
  const exploded = useAppStore((s) => s.exploded);

  return (
    <div className={styles.host}>
      <div className={styles.grid} />

      <div className={styles.overlay}>
        <Chip tone="neutral">{mode}</Chip>
        <Chip tone="neutral">{shot}</Chip>
        {measuring && <Chip tone="warn">measuring</Chip>}
        {sectionEnabled && <Chip tone="warn">section</Chip>}
        {exploded && <Chip tone="warn">exploded</Chip>}
      </div>

      <div className={styles.placeholder}>
        <span className={styles.badge}>Diagram viewport</span>
        Translucent solids, blue edges and orange reinforcement land here at
        milestone&nbsp;2.
      </div>

      {showStats && (
        <div className={styles.stats}>
          {STATS.map(([label, value]) => (
            <div key={label} className={styles.statRow}>
              <span className={styles.statLabel}>{label}</span>
              <span className={styles.statValue}>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
