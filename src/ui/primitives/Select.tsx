import type { SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

export function Select({ options, className, ...rest }: SelectProps) {
  return (
    <span className={`${styles.wrap} ${className ?? ''}`}>
      <select className={styles.select} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className={styles.caret}>
        <Icon name="chevron-down" size={14} />
      </span>
    </span>
  );
}
