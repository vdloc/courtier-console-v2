import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldProps {
  label: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  span?: boolean;
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, error, required, span, children }: FieldProps) {
  const id = useId();
  return (
    <div className={`${styles.field} ${span ? styles.span : ''}`}>
      <label
        className={`${styles.label} ${required ? styles.required : ''}`}
        htmlFor={id}
      >
        {label}
      </label>
      {children(id)}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <span className={styles.hint}>{hint}</span>
      ) : null}
    </div>
  );
}

export interface FormGridProps {
  columns?: 1 | 2 | 3;
  children: ReactNode;
}

export function FormGrid({ columns = 2, children }: FormGridProps) {
  const cls =
    columns === 1
      ? `${styles.grid} ${styles.grid1}`
      : columns === 3
        ? `${styles.grid} ${styles.grid3}`
        : styles.grid;
  return <div className={cls}>{children}</div>;
}
