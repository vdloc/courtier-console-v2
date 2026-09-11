import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { Edges, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useMemo } from 'react';
import { DoubleSide } from 'three';
import { BAY_X, BAY_Y, PARTS, STOREY, type Part } from './model';
import { PALETTE, ROLE_BY_KIND } from './palette';
import { Dimension } from './Dimension';
import { useAppStore } from '../store/useAppStore';
import type { CameraShot } from '../store/types';

const CENTRE: [number, number, number] = [2 * BAY_X, STOREY, 1.5 * BAY_Y];

const SHOT_POSITION: Record<CameraShot, [number, number, number]> = {
  front: [2 * BAY_X, STOREY * 1.5, 64],
  side: [66, STOREY * 1.5, 1.5 * BAY_Y],
  iso: [44, 28, 44],
  joint: [7, 5.5, 7],
};

/** The order the timeline names: foundations, columns, beams, then services. */
const BUILD_ORDER: Record<Part['kind'], number> = {
  foundation: 0,
  column: 1,
  beam_x: 2,
  beam_y: 2,
  pipe: 3,
};

/** Explode pushes each part away from the model centre, lifting with height. */
function explodedPosition(part: Part, factor: number): [number, number, number] {
  const [x, y, z] = part.position;
  return [
    x + (x - CENTRE[0]) * factor,
    y + (y - CENTRE[1]) * factor * 1.6,
    z + (z - CENTRE[2]) * factor,
  ];
}

function Member({ part }: { part: Part }) {
  const select = useAppStore((s) => s.select);
  const isSelected = useAppStore((s) => s.selected?.id === part.id);
  const exploded = useAppStore((s) => s.exploded);
  const explodeFactor = useAppStore((s) => s.explodeFactor);

  const role = ROLE_BY_KIND[part.kind] ?? 'solid';
  const position = exploded ? explodedPosition(part, explodeFactor) : part.position;

  const colour = isSelected
    ? PALETTE.select
    : role === 'service'
      ? PALETTE.rebar
      : role === 'solid'
        ? PALETTE.solid
        : PALETTE.face;

  // Translucent is the reference's default reading for structure; services
  // stay opaque so they read as objects inside the glass.
  const transparent = role === 'translucent' && !isSelected;

  return (
    <mesh
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select(part.id);
      }}
    >
      <boxGeometry args={part.size} />
      <meshBasicMaterial
        color={colour}
        transparent={transparent}
        opacity={transparent ? 0.3 : 1}
        depthWrite={!transparent}
        side={DoubleSide}
      />
      <Edges
        threshold={15}
        color={isSelected ? PALETTE.select : PALETTE.edge}
        lineWidth={isSelected ? 2 : 1}
      />
    </mesh>
  );
}

function Model() {
  const layers = useAppStore((s) => s.layers);
  const hidden = useAppStore((s) => s.hidden);
  const progress = useAppStore((s) => s.progress);

  const visible = useMemo(
    () =>
      PARTS.filter(
        (p) =>
          layers[p.layer] &&
          !hidden.has(p.id) &&
          BUILD_ORDER[p.kind] / 4 < progress + 0.001,
      ),
    [layers, hidden, progress],
  );

  return (
    <group>
      {visible.map((p) => (
        <Member key={p.id} part={p} />
      ))}
    </group>
  );
}

/**
 * KaTeX source must reach the renderer with ONE backslash. A JSX string
 * attribute does not process escapes, so `label="\\Phi"` hands KaTeX a double
 * backslash — its line-break command — and the macro degrades to the word
 * "Phi". Expression containers are the only correct form here.
 */
function Annotations() {
  return (
    <group>
      <Dimension
        from={[0, 0, 0]}
        to={[BAY_X, 0, 0]}
        label={'A = 7.2'}
        offset={[0, -1.4, -4.2]}
      />
      <Dimension
        from={[0, 0, 0]}
        to={[0, 0, BAY_Y]}
        label={'B = 7.2'}
        offset={[-4.2, -1.4, 0]}
      />
      <Dimension
        from={[0, 0, 0]}
        to={[0, STOREY, 0]}
        label={'H_1 = 4.2'}
        offset={[-4.2, 0, -4.2]}
      />
      <Dimension
        from={[-1.2, -0.7, -1.2]}
        to={[1.2, -0.7, -1.2]}
        label={'\\Phi_p = 2.4'}
        offset={[0, -2.6, 0]}
      />
    </group>
  );
}

export function DiagramScene() {
  const shot = useAppStore((s) => s.shot);
  // Realistic is the one mode that hides the drawing furniture.
  const showDimensions = useAppStore((s) => s.mode !== 'realistic');

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => useAppStore.getState().select(null)}
      style={{ background: PALETTE.canvas }}
    >
      <PerspectiveCamera makeDefault fov={38} position={SHOT_POSITION[shot]} />
      <OrbitControls target={CENTRE} makeDefault enableDamping dampingFactor={0.12} />
      <Model />
      {showDimensions && <Annotations />}
    </Canvas>
  );
}
