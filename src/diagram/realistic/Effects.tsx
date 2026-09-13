import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { AO_RADIUS } from './rig';
import { PALETTE } from '../palette';
import { useAppStore } from '../../store/useAppStore';

/**
 * Realistic mode's postprocessing chain. Mounted only in realistic mode: the
 * flat modes' system colours were chosen by eye against an untone-mapped
 * pipeline, and a curve under them would shift every one.
 *
 * TONE MAPPING LIVES HERE NOW, AND HAS TO.
 *
 * three compiles its tone mapping curve into the material shader only for
 * renders whose target is the screen. With a composer every scene render goes
 * into a render target first, so a curve left on the renderer compiles out and
 * the frame reaches the display as a raw linear-to-sRGB conversion — dark,
 * flat, plausible enough to survive unnoticed. The Canvas is `flat` for that
 * reason, and the AgX curve is the last colour operation in this chain.
 *
 * ORDER. AO first, because it composites into the buffer everything after it
 * reads — occlusion applied after the curve darkens an image that has already
 * been graded. SMAA last, because edge detection wants displayed values.
 *
 * ANTI-ALIASING. The canvas's own MSAA does nothing for a render that goes
 * into a composer target, so the composer multisamples its own buffer. SMAA
 * is kept on top: this model is almost entirely thin steel edges, and MSAA
 * alone leaves the rails and bolts crawling. The buffers are half float (the
 * composer's default), so the AO and the curve do not band the sky.
 */
export function Effects() {
  const quality = useAppStore((s) => s.quality);

  // N8AO takes its own depth render over ~3000 objects — the same class of
  // cost as the shadow map — so it is the first thing the quality preset
  // gives up.
  const occlusion = quality === 'high';

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
