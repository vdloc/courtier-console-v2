import { useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { Vector3 } from 'three';
import katex from 'katex';
import { useAppStore } from '../store/useAppStore';
import { MODE_POINTS, type HoverSnap } from '../store/measureSlice';
import { resolveMeasurePoint, evaluate } from './measurement';
import { Dimension } from './Dimension';
import { PALETTE } from './palette';
import dimStyles from './Dimension.module.css';
import styles from './MeasureOverlay.module.css';

/**
 * The measure tool's viewport drawing: committed points, the hover snap
 * preview, the rubber band, and the value on the dimension itself. Picking
 * and committing already lives on the model's own `<primitive>` in
 * StructureGlb — this only draws what that path produces.
 *
 * Committed points are resolved from the member's current matrix every
 * frame, not memoised on the point list: the points don't change when the
 * model moves, and the model moving (explode, the construction sequence) is
 * exactly the case this has to survive.
 */

const SNAP_LABELS: Record<HoverSnap['type'], string> = {
  vertex: 'Vertex',
  midpoint: 'Midpoint',
  edge: 'Edge',
  face: 'Surface',
};

function centroid(points: Vector3[]): Vector3 {
  const out = new Vector3();
  for (const point of points) out.add(point);
  return out.multiplyScalar(1 / points.length);
}

/** Dimension's label is KaTeX source. Math mode collapses a bare space, so
 * plain readouts like "3.245 m" need \text{} to keep the space between the
 * number and the unit. */
function toLabel(text: string): string {
  return `\\text{${text}}`;
}

export function MeasureOverlay() {
  const measuring = useAppStore((s) => s.measuring);
  const mode = useAppStore((s) => s.measureMode);
  const points = useAppStore((s) => s.measurePoints);
  const hoverSnap = useAppStore((s) => s.hoverSnap);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);

  const [resolved, setResolved] = useState<Vector3[]>([]);
  useFrame(() => {
    if (points.length === 0) {
      if (resolved.length > 0) setResolved([]);
      return;
    }
    const next = points
      .map((p) => resolveMeasurePoint(p, exploded, explodeFactor))
      .filter((v): v is Vector3 => v !== null);
    const moved =
      next.length !== resolved.length ||
      next.some((v, i) => v.distanceToSquared(resolved[i]) > 1e-8);
    if (moved) setResolved(next);
  });

  const value = useMemo(() => evaluate(mode, resolved), [mode, resolved]);
  const angleLabel = useMemo(
    () =>
      value ? katex.renderToString(toLabel(value.text), { throwOnError: false }) : '',
    [value],
  );

  if (!measuring && resolved.length === 0) return null;

  const complete = resolved.length >= MODE_POINTS[mode];
  const hoverWorld = hoverSnap ? new Vector3(...hoverSnap.world) : null;
  const rubber: [Vector3, Vector3] | null =
    measuring && hoverWorld && resolved.length > 0 && !complete
      ? [resolved[resolved.length - 1], hoverWorld]
      : null;

  return (
    <group>
      {/* --- hover snap preview -------------------------------------------
          Amber, not the selection blue: a proposal, not a state — at a joint
          the two would otherwise be indistinguishable. */}
      {measuring && hoverSnap && hoverWorld && (
        <group>
          <mesh position={hoverWorld}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshBasicMaterial color={PALETTE.warn} depthTest={false} />
          </mesh>
          {hoverSnap.edge && (
            <Line
              points={[hoverSnap.edge[0], hoverSnap.edge[1]]}
              color={PALETTE.warn}
              lineWidth={2.5}
              depthTest={false}
            />
          )}
          <Html
            position={hoverWorld}
            center
            zIndexRange={[40, 0]}
            style={{ pointerEvents: 'none', transform: 'translate(0, -22px)' }}
          >
            <span className={styles.chip}>{SNAP_LABELS[hoverSnap.type]}</span>
          </Html>
        </group>
      )}

      {/* --- committed points ----------------------------------------------
          A faint larger sphere reads as a glow without a post pass, keeping
          the marker findable against a light surface. */}
      {resolved.map((point, index) => (
        <group key={index} position={point}>
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color={PALETTE.select} depthTest={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshBasicMaterial
              color={PALETTE.select}
              transparent
              opacity={0.22}
              depthTest={false}
            />
          </mesh>
        </group>
      ))}

      {/* --- the dimension --------------------------------------------------
          Reuses Dimension's own label rendering (KaTeX + its .label class)
          rather than a second label style. */}
      {resolved.length >= 2 &&
        (mode === 'distance' || mode === 'horizontal' || mode === 'vertical') &&
        value && (
          <Dimension
            from={resolved[0].toArray() as [number, number, number]}
            to={resolved[1].toArray() as [number, number, number]}
            label={toLabel(value.text)}
          />
        )}

      {mode === 'angle' && resolved.length >= 3 && (
        <>
          <Line
            points={[resolved[0], resolved[1], resolved[2]]}
            color={PALETTE.select}
            lineWidth={2}
            depthTest={false}
          />
          {value && (
            <Html position={resolved[1]} center zIndexRange={[30, 0]}>
              <span
                className={dimStyles.label}
                style={{ color: PALETTE.select }}
                dangerouslySetInnerHTML={{ __html: angleLabel }}
              />
            </Html>
          )}
        </>
      )}

      {mode === 'area' && resolved.length >= 2 && (
        <>
          <Line
            points={[...resolved, resolved[0]]}
            color={PALETTE.select}
            lineWidth={2}
            depthTest={false}
          />
          {value && (
            <Html position={centroid(resolved)} center zIndexRange={[30, 0]}>
              <span
                className={dimStyles.label}
                style={{ color: PALETTE.select }}
                dangerouslySetInnerHTML={{ __html: angleLabel }}
              />
            </Html>
          )}
        </>
      )}

      {/* The rubber band from the last point to the cursor. Without it the
          user is aiming blind between clicks. */}
      {rubber && (
        <Line
          points={rubber}
          color={PALETTE.warn}
          lineWidth={1.5}
          dashed
          dashSize={0.12}
          gapSize={0.09}
          depthTest={false}
        />
      )}
    </group>
  );
}
