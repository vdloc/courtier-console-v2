/**
 * Construction phases derived from the GLB clip's own keyframes, not
 * authored separately — so the timeline markers can never drift from what
 * the model actually animates.
 *
 * Connections (bolts/welds/stiffeners/plates) has no phase of its own: its
 * members are fastened continuously across the Columns and Beams windows,
 * not as a distinct construction step, so its reveal times overlap both
 * and it is excluded by design, not because derivation failed for it.
 */

import type { AnimationClip, Object3D } from 'three';
import type { LayerName, TimelinePhase } from '../../store/types';

const PHASE_LAYERS: LayerName[] = [
  'Foundation',
  'Columns',
  'Beams',
  'Pipes',
  'Accessories',
];

const PHASE_LABEL: Partial<Record<LayerName, string>> = {
  Foundation: 'Foundations',
};

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}

/** The keyframe time of a track's single largest value jump — its "reveal" instant. */
function revealTime(track: {
  times: ArrayLike<number>;
  values: ArrayLike<number>;
}): number | null {
  const { times, values } = track;
  const componentCount = values.length / times.length;
  let bestDelta = -1;
  let bestTime: number | null = null;
  for (let i = 1; i < times.length; i++) {
    let delta = 0;
    for (let c = 0; c < componentCount; c++) {
      delta += Math.abs(
        values[i * componentCount + c] - values[(i - 1) * componentCount + c],
      );
    }
    if (delta > bestDelta) {
      bestDelta = delta;
      bestTime = times[i];
    }
  }
  return bestDelta > 1e-4 ? bestTime : null;
}

export function derivePhases(
  clips: AnimationClip[],
  scene: Object3D,
  layerOf: (object: Object3D) => LayerName | null,
  duration: number,
): TimelinePhase[] {
  const revealTimesByLayer = new Map<LayerName, number[]>();

  for (const clip of clips) {
    for (const track of clip.tracks) {
      const dot = track.name.lastIndexOf('.');
      if (dot < 0) continue;
      const targetName = track.name.slice(0, dot);
      const target = scene.getObjectByName(targetName);
      if (!target) continue;
      const layer = layerOf(target);
      if (!layer || !PHASE_LAYERS.includes(layer)) continue;
      const time = revealTime(track);
      if (time === null) continue;
      const list = revealTimesByLayer.get(layer) ?? [];
      list.push(time);
      revealTimesByLayer.set(layer, list);
    }
  }

  // Every phase layer needs its own keyframes to derive a start time; if
  // any is missing, the clip doesn't animate that layer independently and
  // named phases would mislabel it -- a plain scrub is more honest.
  if (PHASE_LAYERS.some((layer) => !revealTimesByLayer.has(layer))) return [];

  const starts = PHASE_LAYERS.map((layer) => ({
    layer,
    start: percentile(revealTimesByLayer.get(layer)!, 0.1),
  })).sort((a, b) => a.start - b.start);

  return starts.map((entry, i) => ({
    name: PHASE_LABEL[entry.layer] ?? entry.layer,
    start: entry.start,
    end: i + 1 < starts.length ? starts[i + 1].start : duration,
  }));
}
