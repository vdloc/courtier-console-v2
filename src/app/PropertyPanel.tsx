import type { ReactNode } from 'react';
import { Chip } from '../ui/primitives';
import { ELEMENT_LABELS } from '../lib/mockData';
import type { Status } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import panels from './panels.module.css';
import styles from './PropertyPanel.module.css';

const STATUS_TONE: Record<Status, 'ok' | 'warn' | 'neutral' | 'danger'> = {
  Installed: 'ok',
  'In progress': 'warn',
  'Not started': 'neutral',
  Clash: 'danger',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      {children}
    </div>
  );
}

export function PropertyPanel() {
  const selected = useAppStore((s) => s.selected);
  const select = useAppStore((s) => s.select);

  return (
    <section className={`${panels.section} ${panels.grow}`}>
      <header className={panels.header}>
        <span className={panels.title}>Properties</span>
      </header>

      {!selected ? (
        <div className={panels.empty}>
          No component selected.
          <br />
          Click a member in the viewport or the model explorer. Every value shown is
          read from the model itself, not a separate schedule.
        </div>
      ) : (
        <div className={panels.scroll}>
          <div className={styles.head}>
            <span className={styles.name}>{selected.name}</span>
            <span className={styles.sub}>
              <span className={styles.category}>
                {ELEMENT_LABELS[selected.element_type] ?? selected.element_type}
              </span>
              {selected.status && (
                <Chip tone={STATUS_TONE[selected.status]}>{selected.status}</Chip>
              )}
            </span>
          </div>

          <div className={panels.body}>
            <Group title="Identity">
              <Field label="Discipline">{selected.discipline}</Field>
              <Field label="Level">{selected.level}</Field>
              <Field label="Grid ref">{selected.grid_ref}</Field>
              <Field label="Layer">{selected.layer}</Field>
              {selected.system && <Field label="System">{selected.system}</Field>}
            </Group>

            <Group title="Classification">
              <Field label="IFC class">{selected.ifc_class ?? '—'}</Field>
              <Field label="IFC type">{selected.ifc_type ?? '—'}</Field>
            </Group>

            <Group title="Geometry">
              <Field label="Section">{selected.section}</Field>
              <Field label="Length">{selected.length.toFixed(3)} m</Field>
              {/* Dash, not 0.0 kg: the GLB has no mass. */}
              <Field label="Mass">
                {selected.mass === undefined ? '—' : `${selected.mass.toFixed(1)} kg`}
              </Field>
            </Group>

            <Group title="Material">
              <Field label="Specification">{selected.material_spec}</Field>
            </Group>

            {selected.connected.length > 0 && (
              <Group title="Connected to">
                {selected.connected.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={styles.link}
                    onClick={() => select(id)}
                  >
                    {id}
                  </button>
                ))}
              </Group>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
