import type { ReactNode } from 'react';
import styles from './Panel.module.css';

export interface PanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  card?: boolean;
  scroll?: boolean;
  children: ReactNode;
}

export function Panel({ title, actions, card, scroll, children }: PanelProps) {
  return (
    <section className={`${styles.panel} ${card ? styles.card : ''}`}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <span className={styles.spacer} />
          {actions}
        </header>
      )}
      <div className={`${styles.body} ${scroll ? styles.scroll : ''}`}>{children}</div>
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className={styles.sectionTitle}>{children}</h3>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}
