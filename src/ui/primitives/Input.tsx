import type { InputHTMLAttributes } from 'react';
import { Icon } from './Icon';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  numeric?: boolean;
  invalid?: boolean;
}

export function Input({ numeric, invalid, className, ...rest }: InputProps) {
  const classes = [styles.input, numeric && styles.numeric, className]
    .filter(Boolean)
    .join(' ');
  return <input className={classes} aria-invalid={invalid || undefined} {...rest} />;
}

export interface UnitInputProps extends InputProps {
  unit: string;
  units?: string[];
  onUnitChange?: (unit: string) => void;
}

/** A value and its unit read as one field, so they are drawn as one control. */
export function UnitInput({
  unit,
  units,
  onUnitChange,
  numeric = true,
  invalid,
  className,
  ...rest
}: UnitInputProps) {
  const choices = units ?? [unit];
  return (
    <div className={`${styles.group} ${className ?? ''}`}>
      <Input numeric={numeric} invalid={invalid} {...rest} />
      {choices.length > 1 ? (
        <span className={styles.unitWrap}>
          <select
            className={styles.unit}
            value={unit}
            onChange={(e) => onUnitChange?.(e.target.value)}
            aria-label="Unit"
          >
            {choices.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <span className={styles.unitCaret}>
            <Icon name="chevron-down" size={12} />
          </span>
        </span>
      ) : (
        <span className={styles.unitStatic}>{unit}</span>
      )}
    </div>
  );
}
