import { useState } from 'react';
import { Button, Icon, Input, Slider } from '../ui/primitives';
import type { CameraShot, Quality, SectionAxis, ViewMode } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import { shortcutFor } from '../interaction/commands';
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
    hint: 'PBR materials, HDRI lighting, soft shadows',
  },
  { id: 'engineering', label: 'Engineering', hint: 'Flat colour by structural role' },
];

const AXES: SectionAxis[] = ['x', 'y', 'z'];

/** Realistic mode only: flat mode draws identically at every tier, so the control is hidden there. */
const QUALITIES: { id: Quality; label: string }[] = [
  { id: 'high', label: 'High' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'performance', label: 'Fast' },
];

export function ViewControls() {
  const shot = useAppStore((s) => s.shot);
  const requestShot = useAppStore((s) => s.requestShot);
  const requestReset = useAppStore((s) => s.requestReset);
  const requestFitModel = useAppStore((s) => s.requestFitModel);
  const requestFocusSelected = useAppStore((s) => s.requestFocusSelected);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const realistic = mode === 'realistic';
  const quality = useAppStore((s) => s.quality);
  const setQuality = useAppStore((s) => s.setQuality);
  const exploded = useAppStore((s) => s.exploded);
  const toggleExplode = useAppStore((s) => s.toggleExplode);
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
  const requestSaveViewpoint = useAppStore((s) => s.requestSaveViewpoint);
  const requestViewpoint = useAppStore((s) => s.requestViewpoint);
  const deleteViewpoint = useAppStore((s) => s.deleteViewpoint);
  const [vpName, setVpName] = useState('');

  // Collapsed by default: Layers + View (+ Quality in Realistic) already push
  // Tools below the fold, so the two least-reached-for sections start closed.
  const [qualityOpen, setQualityOpen] = useState(false);
  const [viewpointsOpen, setViewpointsOpen] = useState(false);

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
                title={`${s.label} (${shortcutFor(`view-${s.id}`)})`}
                aria-keyshortcuts={shortcutFor(`view-${s.id}`)}
                onClick={() => requestShot(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className={`${styles.buttonGrid} ${styles.cols2}`}>
            <button
              type="button"
              className={styles.pick}
              title={`Fit model (${shortcutFor('fit-model')})`}
              aria-keyshortcuts={shortcutFor('fit-model')}
              onClick={requestFitModel}
            >
              Fit model
            </button>
            <button
              type="button"
              className={styles.pick}
              disabled={!selected}
              title={`Focus selected (${shortcutFor('focus-selected')})`}
              aria-keyshortcuts={shortcutFor('focus-selected')}
              onClick={requestFocusSelected}
            >
              Focus selected
            </button>
            <button
              type="button"
              className={styles.pick}
              title={`Reset view (${shortcutFor('reset-view')})`}
              aria-keyshortcuts={shortcutFor('reset-view')}
              onClick={requestReset}
            >
              Reset view
            </button>
          </div>
          {/* Not camera moves: Explode changes what's drawn, Statistics is a
              debug overlay — kept out of the navigation grid above. */}
          <div className={`${styles.buttonGrid} ${styles.cols2}`}>
            <button
              type="button"
              className={styles.pick}
              data-active={exploded ? 'true' : undefined}
              title={`Explode (${shortcutFor('toggle-explode')})`}
              aria-keyshortcuts={shortcutFor('toggle-explode')}
              onClick={toggleExplode}
            >
              Explode
            </button>
            <button
              type="button"
              className={styles.pick}
              data-active={showStats ? 'true' : undefined}
              title="Statistics"
              onClick={toggleStats}
            >
              Statistics
            </button>
          </div>
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
            title={`Measure (${shortcutFor('measure-distance')})`}
            aria-keyshortcuts={shortcutFor('measure-distance')}
            onClick={toggleMeasuring}
          >
            Measure
          </button>
          <button
            type="button"
            className={styles.pick}
            title="Isolate"
            onClick={isolateSelected}
            disabled={!selected}
          >
            Isolate
          </button>
          <button
            type="button"
            className={styles.pick}
            title={`Show all (${shortcutFor('show-all')})`}
            aria-keyshortcuts={shortcutFor('show-all')}
            onClick={showEverything}
          >
            Show all
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Display mode</span>
        </header>
        <div className={`${styles.body} ${styles.stack}`}>
          <div className={`${styles.buttonGrid} ${styles.cols2}`}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={styles.pick}
                data-active={mode === m.id ? 'true' : undefined}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className={styles.hint}>{MODES.find((m) => m.id === mode)?.hint}</p>
        </div>
      </section>

      {realistic && (
        <section className={styles.section}>
          <header className={styles.header}>
            <span className={styles.title}>Quality</span>
            <span className={styles.spacer} />
            <span className={styles.count}>
              {QUALITIES.find((q) => q.id === quality)?.label}
            </span>
            <button
              type="button"
              className={styles.link}
              onClick={() => setQualityOpen(!qualityOpen)}
            >
              {qualityOpen ? 'Hide' : 'Show'}
            </button>
          </header>
          {qualityOpen && (
            <div className={`${styles.body} ${styles.buttonGrid} ${styles.cols3}`}>
              {QUALITIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className={styles.pick}
                  data-active={quality === q.id ? 'true' : undefined}
                  onClick={() => setQuality(q.id)}
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Viewpoints</span>
          <span className={styles.spacer} />
          <span className={styles.count}>{viewpoints.length}</span>
          <button
            type="button"
            className={styles.link}
            onClick={() => setViewpointsOpen(!viewpointsOpen)}
          >
            {viewpointsOpen ? 'Hide' : 'Show'}
          </button>
        </header>
        {viewpointsOpen && (
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
                title={`Save (${shortcutFor('save-viewpoint')})`}
                aria-keyshortcuts={shortcutFor('save-viewpoint')}
                onClick={() => {
                  requestSaveViewpoint(vpName.trim());
                  setVpName('');
                }}
              >
                Save
              </Button>
            </div>
            {viewpoints.map((v) => (
              <div key={v.id} className={local.viewpoint}>
                <button
                  type="button"
                  className={local.vpRestore}
                  onClick={() => requestViewpoint(v.id)}
                >
                  <span className={local.vpName}>{v.name}</span>
                  <span className={local.vpMeta}>{v.saved}</span>
                </button>
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
        )}
      </section>

      <section className={styles.section}>
        <header className={styles.header}>
          <span className={styles.title}>Section</span>
          <span className={styles.spacer} />
          <button
            type="button"
            className={styles.link}
            title={`Section plane (${shortcutFor('toggle-section')})`}
            aria-keyshortcuts={shortcutFor('toggle-section')}
            onClick={toggleSection}
          >
            {sectionEnabled ? 'Disable section' : 'Enable section'}
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
                title={`Section across ${a.toUpperCase()} (${shortcutFor(`section-axis-${a}`)})`}
                aria-keyshortcuts={shortcutFor(`section-axis-${a}`)}
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
              title={`Flip section (${shortcutFor('section-flip')})`}
              aria-keyshortcuts={shortcutFor('section-flip')}
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
