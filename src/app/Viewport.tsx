import { Chip } from '../ui/primitives';
import { DiagramScene } from '../diagram/DiagramScene';
import { PARTS } from '../diagram/model';
import { useAppStore } from '../store/useAppStore';
import styles from './Viewport.module.css';

export function Viewport() {
  const mode = useAppStore((s) => s.mode);
  const shot = useAppStore((s) => s.shot);
  const showStats = useAppStore((s) => s.showStats);
  const measuring = useAppStore((s) => s.measuring);
  const sectionEnabled = useAppStore((s) => s.sectionEnabled);
  const exploded = useAppStore((s) => s.exploded);
  const hidden = useAppStore((s) => s.hidden);
  const layers = useAppStore((s) => s.layers);

  const shown = PARTS.filter((p) => layers[p.layer] && !hidden.has(p.id)).length;

  const stats: [string, string][] = [
    ['Parts drawn', String(shown)],
    ['Parts total', String(PARTS.length)],
    ['Hidden', String(hidden.size)],
  ];

  return (
    <div className={styles.host}>
      <DiagramScene />

      <div className={styles.overlay}>
        <Chip tone="neutral">{mode}</Chip>
        <Chip tone="neutral">{shot}</Chip>
        {measuring && <Chip tone="warn">measuring</Chip>}
        {sectionEnabled && <Chip tone="warn">section</Chip>}
        {exploded && <Chip tone="warn">exploded</Chip>}
      </div>

      {showStats && (
        <div className={styles.stats}>
          {stats.map(([label, value]) => (
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
