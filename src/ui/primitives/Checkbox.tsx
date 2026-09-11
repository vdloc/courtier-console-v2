import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { useId, type ReactNode } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxRowProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  meta?: ReactNode;
}

/** Radix supplies the behaviour; the tick and the box are ours. */
export function CheckboxRow({
  checked,
  onCheckedChange,
  label,
  meta,
}: CheckboxRowProps) {
  const id = useId();
  return (
    <div className={styles.row}>
      <RadixCheckbox.Root
        id={id}
        className={styles.box}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      >
        <RadixCheckbox.Indicator>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1.5 5.2 4 7.5 8.5 2.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {meta && <span className={styles.count}>{meta}</span>}
    </div>
  );
}
