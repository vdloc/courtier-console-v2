/**
 * The site lighting rig, ported from the demo viewer's `scene/rigs.ts`.
 *
 * Every number here was measured off the HDRI rather than dialled in by eye,
 * and the measurement is why they must move together. Re-derive all of them if
 * the HDRI is ever swapped.
 */

/** Bundled locally, never fetched: the viewer has to work air-gapped. */
export const HDRI_URL = '/env/site_2k.hdr';

export const MODEL_URL = '/structure_demo.glb';

/** The GLB is Draco-compressed, so the decoder is a hard dependency. */
export const DRACO_PATH = '/draco/';

/**
 * Key light position: the sun's own direction in the HDRI, at 80 m.
 *
 * Located by decoding the Radiance file and taking the luminance-weighted
 * centroid of everything above half the peak — 47.9° elevation on a 34.3°
 * bearing. If the directional light and the sun in the visible sky disagree
 * about where light comes from, every cast shadow points somewhere the
 * background says it cannot, and no amount of intensity tuning recovers it.
 */
export const KEY_POSITION: [number, number, number] = [44.3, 59.3, 30.2];

/**
 * Intensities only. The three colours these pair with (`--lit-key`,
 * `--lit-fill`, `--lit-fog`) live in design/tokens.css like every other colour
 * in the app and are read through palette.ts — measured values still go in the
 * one place values are written down.
 */
export const KEY_INTENSITY = 2.4;

/** Roughly 7:1 key to fill — sun and sky, not a softbox and a bounce card. */
export const FILL_INTENSITY = 0.34;

export const ENVIRONMENT_INTENSITY = 1.2;
export const BACKGROUND_INTENSITY = 0.92;

/**
 * AgX, not ACES: ACES shifts saturated hues toward the highlights, which turns
 * a warm sun on painted steel orange at the hot end. AgX desaturates as it
 * rolls off, the way a camera does, and holds the sky's gradient instead of
 * clipping it to a flat band.
 */
export const EXPOSURE = 0.8;

/**
 * Aerial perspective density. Its colour is `--lit-fog`: the HDRI's own
 * horizon (linear (0.4152, 0.4481, 0.5466)) scaled by BACKGROUND_INTENSITY.
 * Fog toward anything else makes the distance a different colour from the sky
 * it stands against, and that seam reads worse than no fog at all — so if
 * BACKGROUND_INTENSITY moves, `--lit-fog` has to move with it.
 *
 * exp(-(d*rho)^2): 0.7% at 30 m, 48% at 300 m. Distance, not a foggy level.
 */
export const FOG_DENSITY = 0.0028;

/** The datum the slab and the contact shadow both sit on, in metres. */
export const GROUND_Y = -0.8;

/** Centre of everything that casts a shadow, measured in the loaded scene. */
export const SHADOW_CENTRE: [number, number, number] = [14.4, 6.24, -9.0];

/** Casters reach 25.8 m from that centre in light space; 27 bounds them. */
export const SHADOW_EXTENT = 27;
export const SHADOW_NEAR = 45;
export const SHADOW_FAR = 125;

/**
 * normalBias per metre of shadow texel — the 0.02 that was tuned at 5.9 cm.
 * Scaled with the texel, or a tightened map peter-pans at the connections.
 */
export const NORMAL_BIAS_PER_TEXEL = 0.341;

/**
 * Extent of every mesh in the exported model with the construction clip at
 * its end, metres, measured in the loaded scene. The section slider maps 0..1
 * across this, and the explode pushes members away from its centre. The flat
 * modes' BOUNDS in diagram/model.ts describe different geometry and would put
 * the cut in the wrong place.
 */
export const MODEL_BOUNDS = {
  min: [-1.2, -0.74, -19.2] as [number, number, number],
  max: [30, 14.72, 1.2] as [number, number, number],
};

/**
 * Distance past which a detail part is not drawn, metres, keyed by the GLB's
 * `element_type`. Ported from the demo viewer's DetailCulling.
 *
 * For a 24 mm bolt there is no meaningful lower level of detail, only present
 * or absent — and bolts, welds and stiffeners are two thirds of the model's
 * 3362 draw calls while covering under a pixel each at framing distance.
 * Thresholds are per type because a 100 mm plate stays legible far longer
 * than an M24 nut.
 */
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

/** The quality preset is the user choosing between frame rate and fastener detail. */
export const LOD_SCALE = { high: 1.6, balanced: 1.0, performance: 0.6 } as const;

/**
 * Metalness overrides by material name.
 *
 * The export's metallic-roughness textures read ~0.99 in the metal channel on
 * every material, so the scalar factor alone decides metalness — and the
 * factors were 0.05 to 0.60, blends that describe no real surface. A paint
 * film or pipe lagging is a dielectric however much steel is underneath it;
 * a bare bolt or a weld bead is a conductor. Finish belongs in roughness,
 * which the textures already carry.
 */
export const METALNESS: Partial<Record<string, number>> = {
  VF_Steel_Painted: 0,
  VF_Rail_Safety: 0,
  VF_Pipe_CHW: 0,
  VF_Pipe_LTHW: 0,
  VF_Steel_Bolt: 1,
  VF_Weld_Bead: 1,
};

/**
 * Ambient occlusion radius, metres: the scale of a connection — a beam
 * meeting a column, the inside of an end plate. Larger puts a grey wash over
 * the whole frame and darkens nothing that reads as contact.
 */
export const AO_RADIUS = 0.6;
