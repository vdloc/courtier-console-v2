import { useEffect } from 'react';
import { IconButton, Slider } from '../ui/primitives';
import { useAppStore } from '../store/useAppStore';
import { shortcutFor } from '../interaction/commands';
import styles from './Timeline.module.css';

/**
 * Outside the Canvas on purpose — a plain rAF loop rather than `useFrame`,
 * since this clock has to keep running under `frameloop="demand"`. Each
 * `tick()` writes `progress` to the store, and `DiagramScene`'s
 * `StoreInvalidator` calls `invalidate()` on every store change — so the
 * scene repaints once per tick without this loop needing to know about R3F.
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

/**
 * A media-player transport, floating over the 3D viewport (`Viewport.tsx`
 * mounts it, not `App.tsx` — there's no dedicated bottom grid row for it
 * any more). Phase ticks live on the scrubber itself via `Slider`'s `marks`
 * slot, not as a row of text labels: the labels used to overlap into an
 * unreadable run-on below ~600px width (docs/ui-audit's HIGH-02) — a
 * transport track showing only the current position and phase name, like
 * a video player's chapter marks, doesn't have that problem at any width.
 */
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
  const playing = playback === 'playing';

  return (
    <div className={styles.bar} role="group" aria-label="Construction sequence playback">
      <IconButton
        icon={playing ? 'pause' : 'play'}
        label={playing ? 'Pause' : 'Play'}
        title={`${playing ? 'Pause' : 'Play'} (${shortcutFor('toggle-playback')})`}
        aria-keyshortcuts={shortcutFor('toggle-playback')}
        active={playing}
        className={styles.playButton}
        onClick={playing ? pause : play}
      />
      <IconButton icon="refresh" label="Reset" title="Reset" onClick={reset} />

      <span className={styles.time}>{seconds.toFixed(1)}s</span>

      <div className={styles.scrubWrap}>
        <Slider
          label="Construction progress"
          value={progress}
          onValueChange={setProgress}
          marks={phases.map((p) => (
            <span
              key={p.name}
              className={styles.tick}
              data-active={active?.name === p.name ? 'true' : undefined}
              style={{ left: `${(p.start / duration) * 100}%` }}
            />
          ))}
        />
      </div>

      <span className={styles.time}>{duration.toFixed(1)}s</span>

      <span className={styles.phaseName}>{active?.name}</span>
    </div>
  );
}
