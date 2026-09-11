import { Slider } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import panels from './panels.module.css';
import styles from './Timeline.module.css';

export function Timeline() {
  const phases = useAppStore((s) => s.phases);
  const duration = useAppStore((s) => s.duration);
  const playback = useAppStore((s) => s.playback);
  const progress = useAppStore((s) => s.progress);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const reset = useAppStore((s) => s.reset);
  const setProgress = useAppStore((s) => s.setProgress);

  const seconds = progress * duration;
  const active = phases.find((p) => seconds >= p.start && seconds <= p.end);

  return (
    <div className={styles.timeline}>
      <div className={styles.head}>
        <span className={styles.title}>Construction sequence</span>
        <button
          type="button"
          className={panels.pick}
          onClick={playback === 'playing' ? pause : play}
        >
          {playback === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button type="button" className={panels.pick} onClick={reset}>
          Reset
        </button>
        <span className={styles.phaseName}>{active?.name}</span>
        <span className={styles.spacer} />
        <span className={styles.time}>
          {seconds.toFixed(1)}s / {duration}s
        </span>
      </div>

      <div className={styles.track}>
        <Slider
          label="Construction progress"
          value={progress}
          onValueChange={setProgress}
        />
        <div className={styles.marks}>
          {phases.map((p) => (
            <span
              key={p.name}
              className={styles.mark}
              data-active={active?.name === p.name ? 'true' : undefined}
              style={{ left: `${(p.start / duration) * 100}%` }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
