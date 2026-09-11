import { useState } from 'react';
import {
  Button,
  Callout,
  CheckboxRow,
  Chip,
  Field,
  FormGrid,
  IconButton,
  Input,
  Modal,
  Panel,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Toolbar,
  ToolbarSeparator,
  UnitInput,
} from '../ui/primitives';
import { MathLabel } from '../lib/mathLabel';
import styles from './Gallery.module.css';

const SWATCHES: { token: string; label: string; measured: boolean }[] = [
  { token: '--navy', label: 'navy', measured: true },
  { token: '--primary', label: 'primary', measured: true },
  { token: '--accent', label: 'accent', measured: true },
  { token: '--surface', label: 'surface', measured: true },
  { token: '--ink', label: 'ink', measured: true },
  { token: '--dia-face', label: 'dia-face', measured: true },
  { token: '--dia-edge', label: 'dia-edge', measured: true },
  { token: '--dia-solid', label: 'dia-solid', measured: true },
  { token: '--sidebar', label: 'sidebar', measured: false },
  { token: '--sunken', label: 'sunken', measured: false },
  { token: '--border', label: 'border', measured: false },
  { token: '--primary-wash', label: 'primary-wash', measured: false },
  { token: '--ok', label: 'ok', measured: false },
  { token: '--warn', label: 'warn', measured: false },
  { token: '--danger', label: 'danger', measured: false },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export function Gallery() {
  const [seg, setSeg] = useState<'2d' | '3d'>('3d');
  const [on, setOn] = useState(true);
  const [modal, setModal] = useState(false);
  const [value, setValue] = useState('0.30');
  const [unit, setUnit] = useState('m');
  const [checked, setChecked] = useState(true);
  const [slider, setSlider] = useState(0.4);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Design system</h1>

      <Section title="Colour — measured vs derived">
        <div className={styles.swatches}>
          {SWATCHES.map((s) => (
            <div key={s.token} className={styles.swatch}>
              <div
                className={styles.chipBox}
                style={{ background: `var(${s.token})` }}
              />
              {s.label}
              <br />
              <span style={{ color: 'var(--text-faint)' }}>
                {s.measured ? 'measured' : 'derived'}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className={styles.typeRow} style={{ font: '700 20px/1.3 var(--sans)' }}>
          Section heading — 20 / 700
        </div>
        <div className={styles.typeRow} style={{ font: '500 16px/1.3 var(--sans)' }}>
          Page title — 16 / 500
        </div>
        <div className={styles.typeRow} style={{ font: '700 13px/1.5 var(--sans)' }}>
          Sub-heading — 13 / 700
        </div>
        <div className={styles.typeRow} style={{ font: '400 13px/1.5 var(--sans)' }}>
          Body and input — 13 / 400
        </div>
        <div
          className={styles.typeRow}
          style={{
            font: '500 11px/1.5 var(--sans)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
          }}
        >
          Section label — 11 / 500 uppercase
        </div>
        <div className={styles.typeRow}>
          Math symbols: <MathLabel symbol="H_2" /> <MathLabel symbol="Φ_m" />{' '}
          <MathLabel symbol="F_Ed" /> <MathLabel symbol="A" />
        </div>
      </Section>

      <Section title="Buttons">
        <div className={styles.row}>
          <Button variant="primary">Calculate</Button>
          <Button variant="secondary">Cancel</Button>
          <Button variant="ghost">View details</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" size="sm">
            Small
          </Button>
        </div>
        <div className={styles.row}>
          <IconButton icon="plus" label="Add" />
          <IconButton icon="layers" label="Layers" active />
          <IconButton icon="refresh" label="Reset" />
          <IconButton icon="cube" label="3D" disabled />
        </div>
        <div className={styles.row}>
          <Toolbar label="Sample toolbar">
            <IconButton icon="grid" label="Grid" />
            <IconButton icon="ruler" label="Measure" />
            <ToolbarSeparator />
            <IconButton icon="eye" label="Visibility" />
          </Toolbar>
        </div>
      </Section>

      <Section title="Controls">
        <div className={styles.row}>
          <SegmentedControl
            label="View"
            value={seg}
            onChange={setSeg}
            options={[
              { value: '2d', label: '2D' },
              { value: '3d', label: '3D' },
            ]}
          />
          <div className={styles.narrow} style={{ flex: 1 }}>
            <Switch label="Show dimensions" checked={on} onCheckedChange={setOn} />
          </div>
        </div>
        <div className={`${styles.row} ${styles.narrow}`}>
          <Select
            options={[
              { value: 'geometry', label: 'Geometry' },
              { value: 'rebar', label: 'Reinforcement' },
            ]}
            aria-label="Display"
          />
        </div>
        <div className={styles.narrow}>
          <CheckboxRow
            checked={checked}
            onCheckedChange={setChecked}
            label="Connections"
            meta="696"
          />
          <Slider label="Section position" value={slider} onValueChange={setSlider} />
        </div>
      </Section>

      <Section title="Fields">
        <FormGrid columns={2}>
          <Field
            label={
              <>
                <MathLabel symbol="A" /> Overhang
              </>
            }
          >
            {(id) => (
              <UnitInput
                id={id}
                value={value}
                unit={unit}
                units={['m', 'mm']}
                onChange={(e) => setValue(e.target.value)}
                onUnitChange={setUnit}
              />
            )}
          </Field>
          <Field label="Plate thickness" hint="Rolled plate, 20 mm minimum">
            {(id) => <UnitInput id={id} defaultValue="20" unit="mm" />}
          </Field>
          <Field label="Reference" error="This reference is already in use">
            {(id) => <Input id={id} defaultValue="C1" invalid />}
          </Field>
          <Field label="Disabled">{(id) => <Input id={id} value="—" disabled />}</Field>
        </FormGrid>
      </Section>

      <Section title="Status and messages">
        <div className={styles.row}>
          <Chip tone="ok">Pass</Chip>
          <Chip tone="warn">Check</Chip>
          <Chip tone="danger">Fail</Chip>
          <Chip tone="neutral">Not run</Chip>
        </div>
        <div className={styles.row} style={{ display: 'block' }}>
          <Callout tone="warn" title="Link area close to the limit">
            Provided horizontal links are within 4% of the required area.
          </Callout>
        </div>
        <div className={styles.row} style={{ display: 'block' }}>
          <Callout tone="info">Results are current as of the last calculation.</Callout>
        </div>
        <div className={styles.row} style={{ display: 'block' }}>
          <Callout tone="danger" title="Bearing stress exceeded">
            Reduce the design load or increase the plate area.
          </Callout>
        </div>
      </Section>

      <Section title="Containers">
        <div className={`${styles.row} ${styles.narrow}`} style={{ display: 'block' }}>
          <Panel title="Results" card>
            A card panel with a header rule.
          </Panel>
        </div>
        <div className={styles.row}>
          <Button onClick={() => setModal(true)}>Open modal</Button>
        </div>
        <Modal open={modal} title="Enlarge the diagram" onClose={() => setModal(false)}>
          Modal body sits on the measured surface colour.
        </Modal>
      </Section>
    </div>
  );
}
