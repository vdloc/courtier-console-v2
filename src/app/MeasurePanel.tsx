import { Callout } from '../ui/primitives';
import type { MeasureMode } from '../store/types';
import { MODE_HINTS, MODE_POINTS } from '../store/measureSlice';
import { useAppStore } from '../store/useAppStore';
import panels from './panels.module.css';
import styles from './MeasurePanel.module.css';

const MODES: { id: MeasureMode; label: string }[] = [
  { id: 'distance', label: 'Distance' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'angle', label: 'Angle' },
  { id: 'area', label: 'Area' },
];

/** Placeholder for the geometry the viewer will supply at the next milestone. */
function readout(mode: MeasureMode, points: number): string | null {
  if (points < MODE_POINTS[mode]) return null;
  if (mode === 'angle') return '90.0°';
  if (mode === 'area') return '8.640 m²';
  return '7.200 m';
}

export function MeasurePanel() {
  const measuring = useAppStore((s) => s.measuring);
  const toggleMeasuring = useAppStore((s) => s.toggleMeasuring);
  const mode = useAppStore((s) => s.measureMode);
  const setMode = useAppStore((s) => s.setMeasureMode);
  const points = useAppStore((s) => s.measurePoints);
  const undo = useAppStore((s) => s.undoMeasurePoint);
  const clear = useAppStore((s) => s.clearMeasurement);

  const value = readout(mode, points.length);
  const needed = MODE_POINTS[mode];

  return (
    <section className={panels.section}>
      <header className={panels.header}>
        <span className={panels.title}>Measure</span>
        <span className={panels.spacer} />
        <button
          type="button"
          className={panels.link}
          onClick={undo}
          disabled={points.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className={panels.link}
          onClick={clear}
          disabled={points.length === 0}
        >
          Clear
        </button>
      </header>

      <div className={`${panels.body} ${panels.stack}`}>
        <button
          type="button"
          className={panels.pick}
          data-active={measuring ? 'true' : undefined}
          onClick={toggleMeasuring}
        >
          {measuring ? 'Measuring — click to stop' : 'Start measuring'}
        </button>

        <div className={`${panels.buttonGrid} ${panels.cols3}`}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={panels.pick}
              data-active={mode === m.id ? 'true' : undefined}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <p className={panels.hint}>{MODE_HINTS[mode]}</p>

        {value && (
          <div className={styles.readout}>
            <span className={styles.readoutLabel}>{mode}</span>
            <span className={styles.readoutValue}>{value}</span>
          </div>
        )}

        {points.map((p, i) => (
          <div key={p.id} className={styles.point}>
            <span className={styles.tag}>{i + 1}</span>
            <span>
              <span className={styles.snap}>{p.snap}</span>
              <span className={styles.object}>{p.object}</span>
              <span className={styles.xyz}>
                {p.xyz.map((n) => n.toFixed(3)).join(', ')}
              </span>
            </span>
          </div>
        ))}

        {points.length > 0 && points.length < needed && (
          <Callout tone="warn">
            {needed - points.length} more point{needed - points.length > 1 ? 's' : ''}{' '}
            needed for a {mode} measurement.
          </Callout>
        )}
      </div>
    </section>
  );
}
