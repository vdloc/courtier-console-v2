import { useEffect } from 'react';
import { Slider } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import { shortcutFor } from '../interaction/commands';
import panels from './panels.module.css';
import styles from './Timeline.module.css';

/**
 * Outside the Canvas on purpose — a plain rAF loop rather than `useFrame`, so
 * the sequence clock keeps running under `frameloop="demand"` if on-demand
 * rendering lands later. That does mean `tick()` alone won't repaint the
 * scene under demand mode; that day, this loop also needs to call `invalidate()`.
 */
function usePlaybackLoop(playback: string) {
  useEffect(() => {
    if (playback !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const state = useAppStore.getState();
      const next = state.progress + dt / state.duration;
      state.tick(next);
      if (next < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playback]);
}

export function Timeline() {
  const phases = useAppStore((s) => s.phases);
  const duration = useAppStore((s) => s.duration);
  const playback = useAppStore((s) => s.playback);
  const progress = useAppStore((s) => s.progress);
  const play = useAppStore((s) => s.play);
  const pause = useAppStore((s) => s.pause);
  const reset = useAppStore((s) => s.reset);
  const setProgress = useAppStore((s) => s.setProgress);

  usePlaybackLoop(playback);

  const seconds = progress * duration;
  const active = phases.find((p) => seconds >= p.start && seconds <= p.end);

  return (
    <div className={styles.timeline}>
      <div className={styles.head}>
        <span className={styles.title}>Construction sequence</span>
        <button
          type="button"
          className={panels.pick}
          title={`${playback === 'playing' ? 'Pause' : 'Play'} (${shortcutFor('toggle-playback')})`}
          aria-keyshortcuts={shortcutFor('toggle-playback')}
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
          {seconds.toFixed(1)}s / {duration.toFixed(1)}s
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
