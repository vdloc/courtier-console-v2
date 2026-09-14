import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { Object3D, type DirectionalLight } from 'three';
import { Effects } from './Effects';
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

/** Realistic mode: the exported model lit by its HDRI. `Environment background` is the only writer of scene.background. */
export function RealisticScene() {
  const gl = useThree((state) => state.gl);
  const quality = useAppStore((s) => s.quality);
  const playback = useAppStore((s) => s.playback);
  const lightRef = useRef<DirectionalLight>(null);

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

  // The structure is static except during playback; StructureGlb flags every other change.
  useEffect(() => {
    gl.shadowMap.autoUpdate = playback === 'playing';
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [gl, playback]);

  // three reads mapSize only when allocating, so a resize needs the old map disposed and nulled.
  useLayoutEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    const size = quality === 'high' ? 2048 : 1024;
    if (light.shadow.mapSize.width !== size) {
      light.shadow.mapSize.set(size, size);
      light.shadow.map?.dispose();
      light.shadow.map = null;
    }
    light.shadow.normalBias = (NORMAL_BIAS_PER_TEXEL * SHADOW_EXTENT * 2) / size;
    gl.shadowMap.needsUpdate = true;
  }, [gl, quality]);

  // ContactShadows re-arms `frames={1}` on each re-render, so subscribe to what moves geometry.
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
      <ambientLight intensity={FILL_INTENSITY} color={PALETTE.litFill} />

      <Suspense fallback={null}>
        {/* Local file, never a CDN preset: the viewer must work air-gapped. */}
        <Environment
          files={HDRI_URL}
          background
          backgroundIntensity={BACKGROUND_INTENSITY}
          environmentIntensity={ENVIRONMENT_INTENSITY}
        />
        {quality === 'high' && (
          <ContactShadows
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
