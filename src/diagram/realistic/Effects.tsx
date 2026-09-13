import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { AO_RADIUS } from './rig';
import { PALETTE } from '../palette';
import { useAppStore } from '../../store/useAppStore';

/**
 * Tone mapping must live here: under a composer a renderer-level curve compiles out of the shaders.
 * Order is AO → curve → SMAA; the composer multisamples its own half-float buffers.
 */
export function Effects() {
  const gl = useThree((s) => s.gl);
  const occlusion = useAppStore((s) => s.quality === 'high');

  // postprocessing's composer sets autoClear = false and never restores it; flat mode would stop clearing.
  useEffect(
    () => () => {
      gl.autoClear = true;
    },
    [gl],
  );

  return (
    <EffectComposer enableNormalPass={false} multisampling={4}>
      {occlusion ? (
        <N8AO
          halfRes
          aoRadius={AO_RADIUS}
          distanceFalloff={0.6}
          intensity={1.6}
          aoSamples={16}
          denoiseSamples={4}
          color={PALETTE.litOcclusion}
        />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
    </EffectComposer>
  );
}
