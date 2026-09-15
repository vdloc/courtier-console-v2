/** Inline 16px stroke icons. A dependency-free subset of what the shell needs. */

type Name =
  | 'chevron-down'
  | 'chevron-right'
  | 'close'
  | 'search'
  | 'bell'
  | 'help'
  | 'plus'
  | 'expand'
  | 'refresh'
  | 'layers'
  | 'cube'
  | 'ruler'
  | 'grid'
  | 'eye'
  | 'play'
  | 'pause';

const PATHS: Record<Name, string> = {
  'chevron-down': 'M4 6.5 8 10.5 12 6.5',
  'chevron-right': 'M6.5 4 10.5 8 6.5 12',
  close: 'M4 4l8 8M12 4l-8 8',
  search: 'M7.2 2.5a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4ZM10.6 10.6 14 14',
  bell: 'M8 2a4 4 0 0 0-4 4v3l-1.2 2h10.4L12 9V6a4 4 0 0 0-4-4ZM6.5 13a1.5 1.5 0 0 0 3 0',
  help: 'M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1M8 11.6h.01',
  plus: 'M8 3.5v9M3.5 8h9',
  expand: 'M6 2H2v4M10 14h4v-4M14 6V2h-4M2 10v4h4',
  refresh: 'M13.5 8a5.5 5.5 0 1 1-1.7-4M13.5 2v3.5H10',
  layers: 'M8 2 2 5.5 8 9l6-3.5L8 2ZM2 10.5 8 14l6-3.5',
  cube: 'M8 1.8 14 5v6l-6 3.2L2 11V5l6-3.2ZM2 5l6 3.3L14 5M8 8.3V14',
  ruler:
    'M2 10.5 10.5 2 14 5.5 5.5 14 2 10.5ZM5 7.5l1.5 1.5M7.5 5 9 6.5M9.8 2.6l1.6 1.6',
  grid: 'M2.5 2.5h5v5h-5v-5ZM8.5 2.5h5v5h-5v-5ZM2.5 8.5h5v5h-5v-5ZM8.5 8.5h5v5h-5v-5Z',
  eye: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8ZM8 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  play: 'M5 3.2 12.5 8 5 12.8Z',
  pause: 'M5.3 3v10M10.7 3v10',
};

export interface IconProps {
  name: Name;
  size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export type IconName = Name;
