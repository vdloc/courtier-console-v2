import { Callout } from '../ui/primitives';
import type { MeasureMode } from '../store/types';
import { MODE_HINTS, MODE_POINTS } from '../store/measureSlice';
import { evaluate, resolveMeasurePoint } from '../diagram/measurement';
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

export function MeasurePanel() {
  const measuring = useAppStore((s) => s.measuring);
  const toggleMeasuring = useAppStore((s) => s.toggleMeasuring);
  const mode = useAppStore((s) => s.measureMode);
  const setMode = useAppStore((s) => s.setMeasureMode);
  const points = useAppStore((s) => s.measurePoints);
  const undo = useAppStore((s) => s.undoMeasurePoint);
  const clear = useAppStore((s) => s.clearMeasurement);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);

  const resolved = points.map((p) => resolveMeasurePoint(p, exploded, explodeFactor));
  const result = evaluate(mode, resolved);
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

        {result && (
          <div className={styles.readout}>
            <span className={styles.readoutLabel}>{result.label}</span>
            <span className={styles.readoutValue}>{result.text}</span>
          </div>
        )}

        {points.map((p, i) => (
          <div key={p.id} className={styles.point}>
            <span className={styles.tag}>{i + 1}</span>
            <span>
              <span className={styles.snap}>{p.snap}</span>
              <span className={styles.object}>{p.partId}</span>
              <span className={styles.xyz}>
                {resolved[i]
                  .toArray()
                  .map((n) => n.toFixed(3))
                  .join(', ')}
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
