import { useState } from 'react';
import { Button, Icon, Input, Slider } from '../ui/primitives';
import type { CameraShot, Quality, SectionAxis, ViewMode } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import styles from './panels.module.css';
import local from './ViewControls.module.css';

const SHOTS: { id: CameraShot; label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'iso', label: 'ISO' },
  { id: 'joint', label: 'Joint' },
];

const MODES: { id: ViewMode; label: string; hint: string }[] = [
  {
    id: 'realistic',
    label: 'Realistic',
    hint: 'Full materials, shadows, depth of field',
  },
  { id: 'engineering', label: 'Engineering', hint: 'Flat colour by element type' },
  { id: 'analysis', label: 'Analysis', hint: 'Shaded by load path' },
  { id: 'construction', label: 'Construction', hint: 'Ghosted ahead of the sequence' },
];

const AXES: SectionAxis[] = ['x', 'y', 'z'];

/**
 * Realistic mode's fidelity tiers. The flat modes draw the same either way,
 * so the control only matters — and is only enabled — in realistic mode.
 */
const QUALITIES: { id: Quality; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'performance', label: 'Fast' },
];

export function ViewControls() {
  const shot = useAppStore((s) => s.shot);
  const setShot = useAppStore((s) => s.setShot);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const quality = useAppStore((s) => s.quality);
  const setQuality = useAppStore((s) => s.setQuality);
  const exploded = useAppStore((s) => s.exploded);
  const toggleExplode = useAppStore((s) => s.toggleExplode);
  const tour = useAppStore((s) => s.tour);
  const toggleTour = useAppStore((s) => s.toggleTour);
  const showStats = useAppStore((s) => s.showStats);
  const toggleStats = useAppStore((s) => s.toggleStats);
  const measuring = useAppStore((s) => s.measuring);
  const toggleMeasuring = useAppStore((s) => s.toggleMeasuring);
  const selected = useAppStore((s) => s.selected);
  const isolateSelected = useAppStore((s) => s.isolateSelected);
  const showEverything = useAppStore((s) => s.showEverything);

  const sectionEnabled = useAppStore((s) => s.sectionEnabled);
  const sectionAxis = useAppStore((s) => s.sectionAxis);
  const sectionPosition = useAppStore((s) => s.sectionPosition);
  const sectionFlipped = useAppStore((s) => s.sectionFlipped);
  const toggleSection = useAppStore((s) => s.toggleSection);
  const setSectionAxis = useAppStore((s) => s.setSectionAxis);
  const setSectionPosition = useAppStore((s) => s.setSectionPosition);
  const toggleSectionFlip = useAppStore((s) => s.toggleSectionFlip);

  const viewpoints = useAppStore((s) => s.viewpoints);
  const saveViewpoint = useAppStore((s) => s.saveViewpoint);
  const deleteViewpoint = useAppStore((s) => s.deleteViewpoint);
  const [vpName, setVpName] = useState('');

  return (
    <>
      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>View</span>
        </header>
        <div className={`${styles.body} ${styles.stack}`}>
          <div className={`${styles.buttonGrid} ${styles.cols4}`}>
            {SHOTS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.pick}
                data-active={shot === s.id ? 'true' : undefined}
                onClick={() => setShot(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className={`${styles.buttonGrid} ${styles.cols2}`}>
            <button type="button" className={styles.pick}>
              Fit model
            </button>
            <button type="button" className={styles.pick} disabled={!selected}>
              Focus selected
            </button>
            <button
              type="button"
              className={styles.pick}
              data-active={exploded ? 'true' : undefined}
              onClick={toggleExplode}
            >
              Explode
            </button>
            <button
              type="button"
              className={styles.pick}
              data-active={tour ? 'true' : undefined}
              onClick={toggleTour}
            >
              Tour
            </button>
            <button
              type="button"
              className={styles.pick}
              data-active={showStats ? 'true' : undefined}
              onClick={toggleStats}
            >
              Statistics
            </button>
            <button type="button" className={styles.pick}>
              Reset view
            </button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Display mode</span>
        </header>
        <div className={styles.body}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={local.mode}
              data-active={mode === m.id ? 'true' : undefined}
              onClick={() => setMode(m.id)}
            >
              <span className={local.modeLabel}>{m.label}</span>
              <span className={local.modeHint}>{m.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Quality</span>
        </header>
        <div className={`${styles.body} ${styles.buttonGrid} ${styles.cols3}`}>
          {QUALITIES.map((q) => (
            <button
              key={q.id}
              type="button"
              className={styles.pick}
              data-active={quality === q.id ? 'true' : undefined}
              disabled={mode !== 'realistic'}
              onClick={() => setQuality(q.id)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Tools</span>
        </header>
        <div className={`${styles.body} ${styles.buttonGrid} ${styles.cols3}`}>
          <button
            type="button"
            className={styles.pick}
            data-active={measuring ? 'true' : undefined}
            onClick={toggleMeasuring}
          >
            Measure
          </button>
          <button
            type="button"
            className={styles.pick}
            onClick={isolateSelected}
            disabled={!selected}
          >
            Isolate
          </button>
          <button type="button" className={styles.pick} onClick={showEverything}>
            Show all
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Viewpoints</span>
        </header>
        <div className={`${styles.body} ${styles.stack}`}>
          <div className={local.saveRow}>
            <Input
              placeholder="Name this view"
              value={vpName}
              onChange={(e) => setVpName(e.target.value)}
              aria-label="Viewpoint name"
            />
            <Button
              size="sm"
              disabled={!vpName.trim()}
              onClick={() => {
                saveViewpoint(vpName.trim());
                setVpName('');
              }}
            >
              Save
            </Button>
          </div>
          {viewpoints.map((v) => (
            <div key={v.id} className={local.viewpoint}>
              <span className={local.vpName}>{v.name}</span>
              <span className={local.vpMeta}>{v.saved}</span>
              <button
                type="button"
                className={local.vpDelete}
                aria-label={`Delete ${v.name}`}
                onClick={() => deleteViewpoint(v.id)}
              >
                <Icon name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Section</span>
          <span className={styles.spacer} />
          <button type="button" className={styles.link} onClick={toggleSection}>
            {sectionEnabled ? 'Disable' : 'Enable'}
          </button>
        </header>
        <div className={`${styles.body} ${styles.stack}`}>
          <div className={`${styles.buttonGrid} ${styles.cols4}`}>
            {AXES.map((a) => (
              <button
                key={a}
                type="button"
                className={styles.pick}
                data-active={sectionEnabled && sectionAxis === a ? 'true' : undefined}
                disabled={!sectionEnabled}
                onClick={() => setSectionAxis(a)}
              >
                {a.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              className={styles.pick}
              data-active={sectionFlipped ? 'true' : undefined}
              disabled={!sectionEnabled}
              onClick={toggleSectionFlip}
            >
              Flip
            </button>
          </div>
          <Slider
            label="Section position"
            value={sectionPosition}
            onValueChange={setSectionPosition}
          />
        </div>
      </section>
    </>
  );
}
