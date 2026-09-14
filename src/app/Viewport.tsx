import { Chip } from '../ui/primitives';
import { DiagramScene } from '../diagram/DiagramScene';
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
  const glbComponents = useAppStore((s) => s.glbComponents);

  // One model in both modes now, so one counting path for both.
  const glbMembers = Object.values(glbComponents);
  const glbDrawn = glbMembers.filter(
    (c) => layers[c.layer] && !hidden.has(c.id),
  ).length;
  const glbHidden = glbMembers.filter((c) => hidden.has(c.id)).length;

  const stats: [string, string][] = [
    ['Members shown', String(glbDrawn)],
    ['Members total', String(glbMembers.length)],
    ['Members hidden', String(glbHidden)],
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
