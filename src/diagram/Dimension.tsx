import { Html, Line } from '@react-three/drei';
import { useMemo } from 'react';
import katex from 'katex';
import { PALETTE } from './palette';
import styles from './Dimension.module.css';

export interface DimensionProps {
  from: [number, number, number];
  to: [number, number, number];
  /** KaTeX source, e.g. `A = 7.2` or `H_2 = 0.35`. */
  label: string;
  /** Perpendicular offset of the dimension line from the measured edge. */
  offset?: [number, number, number];
  colour?: string;
}

const TICK = 0.28;

/**
 * A witness-line dimension in the reference's drawing convention: thin
 * near-black rules with end ticks, and a typeset label sitting on the line.
 */
export function Dimension({
  from,
  to,
  label,
  offset = [0, 0, 0],
  colour = PALETTE.ink,
}: DimensionProps) {
  const a: [number, number, number] = [
    from[0] + offset[0],
    from[1] + offset[1],
    from[2] + offset[2],
  ];
  const b: [number, number, number] = [
    to[0] + offset[0],
    to[1] + offset[1],
    to[2] + offset[2],
  ];
  const mid: [number, number, number] = [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
  ];

  // Ticks run along whichever axis the dimension does NOT, so they read as
  // witness marks rather than as an extension of the line itself. Cheap
  // enough to derive each render; memoising it would only add a dependency
  // on two arrays that are themselves rebuilt every render.
  const spans = [b[0] - a[0], b[1] - a[1], b[2] - a[2]].map(Math.abs);
  const tick: [number, number, number] =
    spans.indexOf(Math.max(...spans)) === 1 ? [TICK, 0, 0] : [0, TICK, 0];

  const html = useMemo(
    () => katex.renderToString(label, { throwOnError: false, displayMode: false }),
    [label],
  );

  const witness = (p: [number, number, number]): [number, number, number][] => [
    [p[0] - tick[0] / 2, p[1] - tick[1] / 2, p[2] - tick[2] / 2],
    [p[0] + tick[0] / 2, p[1] + tick[1] / 2, p[2] + tick[2] / 2],
  ];

  return (
    <group>
      <Line points={[a, b]} color={colour} lineWidth={1} />
      <Line points={witness(a)} color={colour} lineWidth={1} />
      <Line points={witness(b)} color={colour} lineWidth={1} />
      {/* Leaders back to what is being measured. */}
      <Line points={[from, a]} color={colour} lineWidth={0.6} dashed dashSize={0.1} />
      <Line points={[to, b]} color={colour} lineWidth={0.6} dashed dashSize={0.1} />
      <Html position={mid} center distanceFactor={26} zIndexRange={[10, 0]}>
        <span
          className={styles.label}
          style={{ color: colour }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Html>
    </group>
  );
}
