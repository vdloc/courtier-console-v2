/**
 * Engineering-mode material for the GLB, cached per mesh alongside the
 * Realistic material already assigned by useGLTF. A pointer swap between
 * the two, never a property mutation on either — see docs/GLB-BOTH-MODES.md
 * (d) for why: useGLTF's materials are shared/cached across mounts, so a
 * mutated property would leak into the other mode instead of switching.
 */

import { DoubleSide, MeshBasicMaterial, type Material, type Mesh } from 'three';
import { PALETTE, ROLE_BY_KIND } from '../palette';

export type GlbMode = 'realistic' | 'engineering';

interface MaterialPair {
  realistic: Material;
  engineering: MeshBasicMaterial;
}

const cache = new Map<string, MaterialPair>();

/** Same three roles Member (DiagramScene.tsx) already draws; anything else defaults to solid. */
function engineeringMaterialFor(elementType: string | undefined): MeshBasicMaterial {
  const role = elementType ? ROLE_BY_KIND[elementType] : undefined;
  // Realistic's canvas runs ACES tone mapping; without this these colours
  // shift away from the exact token values, misleading the preview.
  if (role === 'translucent') {
    return new MeshBasicMaterial({
      color: PALETTE.face,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
  }
  if (role === 'service') {
    return new MeshBasicMaterial({
      color: PALETTE.rebar,
      side: DoubleSide,
      toneMapped: false,
    });
  }
  return new MeshBasicMaterial({
    color: PALETTE.solid,
    side: DoubleSide,
    toneMapped: false,
  });
}

/** Builds both variants once per mesh (keyed by uuid) and returns the cached pair thereafter. */
export function materialsFor(
  mesh: Mesh,
  elementType: string | undefined,
): MaterialPair {
  const existing = cache.get(mesh.uuid);
  if (existing) return existing;
  const pair: MaterialPair = {
    realistic: mesh.material as Material,
    engineering: engineeringMaterialFor(elementType),
  };
  cache.set(mesh.uuid, pair);
  return pair;
}

/** A pointer write to the cached variant for `mode` — never mutates either material. */
export function applyGlbMode(
  mesh: Mesh,
  elementType: string | undefined,
  mode: GlbMode,
): void {
  const pair = materialsFor(mesh, elementType);
  mesh.material = mode === 'engineering' ? pair.engineering : pair.realistic;
}

/** Disposes every cached engineering material. Call once, on StructureGlb's full unmount. */
export function disposeGlbMaterials(): void {
  for (const pair of cache.values()) pair.engineering.dispose();
  cache.clear();
}
