import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.base, styles[variant], size === 'sm' && styles.sm, className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
