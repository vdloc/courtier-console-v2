import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export interface ChipProps {
  tone?: 'ok' | 'warn' | 'danger' | 'neutral';
  children: ReactNode;
}

export function Chip({ tone = 'neutral', children }: ChipProps) {
  return <span className={`${styles.base} ${styles[tone]}`}>{children}</span>;
}
