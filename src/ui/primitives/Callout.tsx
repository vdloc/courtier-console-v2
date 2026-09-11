import type { ReactNode } from 'react';
import styles from './Callout.module.css';

export interface CalloutProps {
  tone?: 'warn' | 'info' | 'danger';
  title?: string;
  children: ReactNode;
}

export function Callout({ tone = 'warn', title, children }: CalloutProps) {
  return (
    <div className={`${styles.base} ${styles[tone]}`} role="note">
      {title && <strong className={styles.title}>{title}</strong>}
      {children}
    </div>
  );
}
