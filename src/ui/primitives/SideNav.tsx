import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './SideNav.module.css';

export function SideNav({ children }: { children: ReactNode }) {
  return (
    <nav className={styles.nav} aria-label="Sections">
      {children}
    </nav>
  );
}

export function NavSection({ label }: { label: string }) {
  return <div className={styles.sectionLabel}>{label}</div>;
}

export interface NavItemProps {
  icon?: IconName;
  label: string;
  active?: boolean;
  child?: boolean;
  onClick?: () => void;
}

export function NavItem({ icon, label, active, child, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      className={`${styles.item} ${child ? styles.child : ''}`}
      data-active={active ? 'true' : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      {icon && (
        <span className={styles.icon}>
          <Icon name={icon} size={15} />
        </span>
      )}
      <span className={styles.text}>{label}</span>
    </button>
  );
}

export interface NavGroupProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function NavGroup({ label, open, onToggle, children }: NavGroupProps) {
  return (
    <div>
      <button
        type="button"
        className={styles.groupHeader}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={styles.caret}>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
        </span>
        <span className={styles.text}>{label}</span>
      </button>
      {open && children}
    </div>
  );
}
