import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { Object3D, type DirectionalLight } from 'three';
import { Effects } from './Effects';
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
  const gl = useThree((state) => state.gl);
  const quality = useAppStore((s) => s.quality);
  const playback = useAppStore((s) => s.playback);
  const lightRef = useRef<DirectionalLight>(null);

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

  // --- shadow map: redrawn when the structure changes, not every frame -----
  //
  // The map re-renders all ~3360 casters from the sun's point of view, and
  // with `autoUpdate` on it did so every frame — doubling the draw calls of a
  // model that does not move. A camera orbit changes nothing about where
  // shadows fall. So it is redrawn continuously only during playback, and
  // otherwise once per change: StructureGlb raises `needsUpdate` on every
  // seek, explode, layer, hide, section and culling change.
  useEffect(() => {
    gl.shadowMap.autoUpdate = playback === 'playing';
    gl.shadowMap.needsUpdate = true;
    return () => {
      // The flat modes cast no shadows, but hand the renderer back as found.
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, playback]);

  // --- shadow map size follows quality -------------------------------------
  //
  // Not a `shadow-mapSize` prop. three reads `mapSize` only when it allocates
  // the render target, and allocates only when `shadow.map` is null — so a
  // prop change writes a Vector2 and resizes nothing, while the normal bias
  // beside it DOES update, leaving a 2048-tuned bias on a 1024 map. The
  // target has to be disposed and nulled for the new size to take, and the
  // bias is derived from the size actually allocated, in the same place.
  // Layout effect so the first shadow render already has the right size.
  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const size = quality === 'high' ? 2048 : 1024;
    if (light.shadow.mapSize.width !== size) {
      light.shadow.mapSize.set(size, size);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
    // Scaled with the texel, or the tightened map peter-pans at the
    // connections — the joints this viewer exists to inspect.
    light.shadow.normalBias = (NORMAL_BIAS_PER_TEXEL * SHADOW_EXTENT * 2) / size;
    gl.shadowMap.needsUpdate = true;
  }, [gl, quality]);

  // --- contact shadow: rendered once per change ----------------------------
  //
  // drei renders ContactShadows' depth pass `frames` times, and defaults to
  // Infinity: a third full render of the model per frame. With `frames={1}`
  // its counter lives in the component body, so any re-render of this
  // component re-arms it for exactly one more pass. Subscribing to the state
  // that moves geometry is what makes that re-render happen when it matters.
  const moving = playback === 'playing';
  useAppStore((s) => s.progress);
  useAppStore((s) => s.layers);
  useAppStore((s) => s.hidden);
  useAppStore((s) => s.exploded);
  useAppStore((s) => s.explodeFactor);
  useAppStore((s) => s.sectionEnabled);
  useAppStore((s) => s.sectionAxis);
  useAppStore((s) => s.sectionPosition);
  useAppStore((s) => s.sectionFlipped);

  return (
    <>
      <fogExp2 attach="fog" args={[PALETTE.litFog, FOG_DENSITY]} />

      <primitive object={shadowTarget} />
      <directionalLight
        ref={lightRef}
        castShadow
        position={keyPosition}
        target={shadowTarget}
        intensity={KEY_INTENSITY}
        color={PALETTE.litKey}
        shadow-bias={-0.0004}
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
            frames={moving ? Infinity : 1}
          />
        )}
      </Suspense>

      <Effects />
    </>
  );
}
