import * as RadixSlider from '@radix-ui/react-slider';
import type { ReactNode } from 'react';
import styles from './Slider.module.css';

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  /** Absolutely positioned marks drawn on the rail, e.g. timeline phases. */
  marks?: ReactNode;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.001,
  label,
  marks,
}: SliderProps) {
  return (
    <RadixSlider.Root
      className={styles.root}
      value={[value]}
      onValueChange={([v]) => onValueChange(v)}
      min={min}
      max={max}
      step={step}
      aria-label={label}
    >
      <RadixSlider.Track className={styles.rail}>
        <RadixSlider.Range className={styles.fill} />
        {marks}
      </RadixSlider.Track>
      <RadixSlider.Thumb className={styles.thumb} />
    </RadixSlider.Root>
  );
}
