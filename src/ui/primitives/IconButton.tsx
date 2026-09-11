import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  tone?: 'default' | 'onDark';
  active?: boolean;
  badge?: boolean;
}

export function IconButton({
  icon,
  label,
  tone = 'default',
  active,
  badge,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.base,
    tone === 'onDark' && styles.onDark,
    badge && styles.badge,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      aria-label={label}
      title={label}
      data-active={active ? 'true' : undefined}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
