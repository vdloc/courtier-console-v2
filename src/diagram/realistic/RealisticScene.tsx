import { Suspense, useMemo } from 'react';
import { ContactShadows, Environment } from '@react-three/drei';
import { Object3D } from 'three';
import { StructureGlb } from './StructureGlb';
import {
  BACKGROUND_INTENSITY,
  ENVIRONMENT_INTENSITY,
  FILL_INTENSITY,
  FOG_DENSITY,
  GROUND_Y,
  HDRI_URL,
  KEY_INTENSITY,
  KEY_POSITION,
  NORMAL_BIAS_PER_TEXEL,
  SHADOW_CENTRE,
  SHADOW_EXTENT,
  SHADOW_FAR,
  SHADOW_NEAR,
} from './rig';
import { PALETTE } from '../palette';
import { useAppStore } from '../../store/useAppStore';

/**
 * Realistic mode: an environment-lit site render, the way a photograph is lit.
 *
 * The IBL is doing the real work. Painted steel is mostly a reflection of its
 * surroundings, so a flat ambient light makes every member read as grey
 * plastic no matter what the material values say — which is exactly what the
 * flat modes want and exactly what this one must not do.
 *
 * ONE OWNER FOR `scene.background`. drei's `Environment background` writes it
 * and restores its captured value on unmount, so nothing else in this app may
 * touch it. The flat modes get their backdrop from the `<Canvas>` element's
 * CSS instead, which is a different property and cannot race with this one.
 */
export function RealisticScene() {
  const quality = useAppStore((s) => s.quality);

  // The sun is aimed at the model rather than at the origin so the direction
  // decoded from the HDRI is preserved while the shadow frustum stays tight.
  const shadowTarget = useMemo(() => {
    const target = new Object3D();
    target.position.set(...SHADOW_CENTRE);
    return target;
  }, []);

  const keyPosition = useMemo<[number, number, number]>(
    () => [
      SHADOW_CENTRE[0] + KEY_POSITION[0],
      SHADOW_CENTRE[1] + KEY_POSITION[1],
      SHADOW_CENTRE[2] + KEY_POSITION[2],
    ],
    [],
  );

  const shadowMapSize = quality === 'high' ? 2048 : 1024;
  // Scaled with the texel, or the tightened map peter-pans at the connections
  // — the joints this viewer exists to inspect.
  const shadowNormalBias =
    (NORMAL_BIAS_PER_TEXEL * SHADOW_EXTENT * 2) / shadowMapSize;

  return (
    <>
      <fogExp2 attach="fog" args={[PALETTE.litFog, FOG_DENSITY]} />

      <primitive object={shadowTarget} />
      <directionalLight
        castShadow
        position={keyPosition}
        target={shadowTarget}
        intensity={KEY_INTENSITY}
        color={PALETTE.litKey}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={shadowNormalBias}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={SHADOW_NEAR}
        shadow-camera-far={SHADOW_FAR}
      />
      {/* The HDRI is the main fill; this only lifts what a low-resolution
          PMREM misses. */}
      <ambientLight intensity={FILL_INTENSITY} color={PALETTE.litFill} />

      <Suspense fallback={null}>
        <StructureGlb />
        {/* Bundled locally, never a CDN preset: an `<Environment preset=…>` is
            a network fetch, which is how a realistic view comes to render a
            blank frame on a firewalled client network. */}
        <Environment
          files={HDRI_URL}
          background
          backgroundIntensity={BACKGROUND_INTENSITY}
          environmentIntensity={ENVIRONMENT_INTENSITY}
        />
        {quality === 'high' && (
          <ContactShadows
            /* The short-range darkening a shadow map spanning 54 m cannot
               resolve: the millimetres under a base plate, inside a bolt
               group. It is not what grounds the model any more — the real sun
               does that — so it stays tight and light rather than ringing the
               footprint with a dark halo.

               Not black. A shadow is the part of a surface lit only by the
               bounce, and under a warm sun on concrete the bounce is warm;
               pure black subtracts luminance without carrying any, which reads
               as a hole cut in the ground rather than as ground. */
            position={[SHADOW_CENTRE[0], GROUND_Y + 0.01, SHADOW_CENTRE[2]]}
            scale={90}
            resolution={1024}
            far={20}
            blur={2.4}
            opacity={0.3}
            color={PALETTE.litContact}
          />
        )}
      </Suspense>
    </>
  );
}
