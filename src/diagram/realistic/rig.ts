/** Site lighting rig, ported from the demo's scene/rigs.ts. Values are measured off the HDRI: re-derive all if it changes. */

export const HDRI_URL = '/env/site_2k.hdr';
export const MODEL_URL = '/structure_demo.glb';
export const DRACO_PATH = '/draco/';

/** The HDRI sun's direction (47.9° elevation, 34.3° bearing) at 80 m, so shadows agree with the sky. */
export const KEY_POSITION: [number, number, number] = [44.3, 59.3, 30.2];

export const KEY_INTENSITY = 2.4;
/** ~7:1 key to fill: sun and sky. */
export const FILL_INTENSITY = 0.34;

export const ENVIRONMENT_INTENSITY = 1.2;
/** `--lit-fog` is the HDRI horizon scaled by this; change them together. */
export const BACKGROUND_INTENSITY = 0.92;

/** Applied under the composer's AgX curve (Effects.tsx). */
export const EXPOSURE = 0.8;

/** exp(-(d·ρ)²): 0.7% at 30 m, 48% at 300 m. */
export const FOG_DENSITY = 0.0028;

export const GROUND_Y = -0.8;

/** Centre of the shadow casters in the loaded scene; SHADOW_EXTENT bounds them (25.8 m reach). */
export const SHADOW_CENTRE: [number, number, number] = [14.4, 6.24, -9.0];
export const SHADOW_EXTENT = 27;
export const SHADOW_NEAR = 45;
export const SHADOW_FAR = 125;

/** normalBias per metre of shadow texel (0.02 tuned at a 5.9 cm texel). */
export const NORMAL_BIAS_PER_TEXEL = 0.341;

export interface Bounds {
  min: [number, number, number];
  max: [number, number, number];
}

/** Extent of the built model, metres; the section slider and explode centre use it. */
export const MODEL_BOUNDS: Bounds = {
  min: [-1.2, -0.74, -19.2],
  max: [30, 14.72, 1.2],
};

/** Cull distance by `element_type`, metres; ported from the demo's DetailCulling. */
export const LOD_DISTANCE: Partial<Record<string, number>> = {
  bolt: 18,
  weld: 14,
  stiffener: 45,
  hanger: 60,
  toe_board: 60,
  guard_post: 70,
  splice_plate: 60,
  end_plate: 80,
};

export const LOD_SCALE = { high: 1.6, balanced: 1.0, performance: 0.6 } as const;

/** The export's metal maps are ~1 everywhere, so the factor decides: paint and lagging 0, bare steel 1. */
export const METALNESS: Partial<Record<string, number>> = {
  VF_Steel_Painted: 0,
  VF_Rail_Safety: 0,
  VF_Pipe_CHW: 0,
  VF_Pipe_LTHW: 0,
  VF_Steel_Bolt: 1,
  VF_Weld_Bead: 1,
};

/** Metres: the scale of a connection. */
export const AO_RADIUS = 0.6;

/** Engineering-mode edges draw only these — spike-measured, see docs/GLB-BOTH-MODES.md (a). */
export const STRUCTURAL_TYPES = new Set([
  'column',
  'beam_x',
  'beam_y',
  'brace',
  'foundation',
]);
