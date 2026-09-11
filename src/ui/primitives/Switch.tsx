import * as RadixSwitch from '@radix-ui/react-switch';
import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/** Radix supplies the behaviour; every pixel of the appearance is ours. */
export function Switch({ checked, onCheckedChange, label, disabled }: SwitchProps) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <RadixSwitch.Root
        className={styles.root}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
      >
        <RadixSwitch.Thumb className={styles.thumb} />
      </RadixSwitch.Root>
    </div>
  );
}
