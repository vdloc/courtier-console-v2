# Research — making three.js / r3f scenes look photorealistic (2024–2025)

Primary-source notes only. No blogspam summaries — every claim below is traced
to the doc/source/spec that owns it, cited inline. Written for this repo's
stack: `react@^18.3.1`, `three@^0.169.0`, `@react-three/fiber@^8.18.0`,
`@react-three/drei@^9.122.0`. Feeds `/home/vdloc/.claude/skills/3d-realism-audit/SKILL.md`.

---

## 1. Color management

**What**: three.js's internal working color space is linear-sRGB. Textures
authored in sRGB (color/albedo maps, most photos) must be tagged
`texture.colorSpace = THREE.SRGBColorSpace` on load; data textures (normal,
roughness, metalness, AO maps) must stay `THREE.NoColorSpace` /
`THREE.LinearSRGBColorSpace` so they aren't gamma-decoded twice. The final
frame is converted from linear back to a display space via
`renderer.outputColorSpace` (default `THREE.SRGBColorSpace` since r152).

**Why it matters for realism**: lighting math (Lambert, GGX, etc.) is only
correct when done in linear light. Skipping colorSpace tagging is the single
most common reason a "PBR" three.js scene still looks washed-out or
over-contrasty compared to a reference render — the eye notices, even if
nobody can name the cause.

**API**: `THREE.SRGBColorSpace`, `THREE.LinearSRGBColorSpace`,
`THREE.NoColorSpace`, `renderer.outputColorSpace`,
`texture.colorSpace`. Landed in three.js r152 (mid-2023), replacing the older
`outputEncoding`/`encoding` API — still current in r169 (this repo's pinned
version).

**Sources**:
- three.js manual, "Color management" — https://threejs.org/manual/en/color-management.html (working space = linear-sRGB; outputColorSpace controls final display conversion)
- three.js forum, "Updates to Color Management in three.js r152" — https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791 (migration notes, default changed from `LinearEncoding` to `SRGBColorSpace` in r152)
- three.js docs, `module-ColorSpaces` — https://threejs.org/docs/pages/module-ColorSpaces.html

---

## 2. Tone mapping and exposure

**What**: `renderer.toneMapping` maps the (potentially > 1.0) linear HDR
output of a lit scene down into displayable range before the sRGB transform.
Options exposed by three.js: `NoToneMapping`, `LinearToneMapping`,
`ReinhardToneMapping`, `CineonToneMapping`, `ACESFilmicToneMapping`,
`AgXToneMapping`, `NeutralToneMapping`, `CustomToneMapping`.
`renderer.toneMappingExposure` (default `1`) scales brightness pre-mapping —
the practical "exposure" dial.

**Why it matters**: `NoToneMapping` (the renderer default) clips highlights
hard, which reads as flat/blown-out under any real light rig or HDRI. ACES
Filmic is the long-standing industry-standard curve (rolls off highlights,
preserves color) — three.js ships a reference implementation attributed to
Stephen Hill, adapted for brighter viewing environments. `AgXToneMapping` is
a newer alternative derived from Blender's AgX view transform — softer
highlight shoulder, less desaturation in bright areas. `NeutralToneMapping`
is described in three.js's own docs enum as a PBR-neutral-style option,
tuned to preserve base color fidelity more than filmic contrast.

**API / version notes**: all eight constants exist in the current three.js
(r169, this repo's pin) `WebGLRenderer.toneMapping` enum —
`ACESFilmicToneMapping`, `AgXToneMapping`, and `NeutralToneMapping` are all
present and usable at this version. `AgXToneMapping` and
`NeutralToneMapping` were added to three.js after `ACESFilmicToneMapping`
(which predates the r152 color-management rewrite) — if targeting an older
pinned three.js than r169, verify against that version's own docs/changelog
rather than assuming availability, since this research doesn't pin an exact
introduction revision for either.

**Sources**:
- three.js docs, `WebGLRenderer.toneMapping` — https://threejs.org/docs/#api/en/renderers/WebGLRenderer.toneMapping (full enum + `toneMappingExposure`)
- three.js docs, `ACESFilmicToneMappingShader` — https://threejs.org/docs/pages/module-ACESFilmicToneMappingShader.html ("ACES Filmic Tone Mapping Shader by Stephen Hill... modified to accommodate a brighter viewing environment")
- three.js GitHub examples, `webgl_tonemapping.html` — https://github.com/mrdoob/three.js/blob/dev/examples/webgl_tonemapping.html (side-by-side comparison harness for all tone-mapping modes)

---

## 3. PBR material model (glTF metallic-roughness) — what `MeshStandardMaterial`/`MeshPhysicalMaterial` implement

**What**: three.js's `MeshStandardMaterial` and `MeshPhysicalMaterial`
implement the glTF 2.0 core metallic-roughness PBR model. Two scalar/texture
inputs replace the old ad-hoc "shininess" knob:
- **`roughness`** — microsurface bumpiness; controls whether specular
  reflections/highlights are sharp (low roughness) or blurred (high
  roughness). Also blurs refraction when transmission is used.
- **`metalness`** — at `1.0`, the surface is fully reflective and
  `baseColor`/`color` tints the reflection itself (metals have no diffuse
  term); at `0.0`, it's a dielectric — reflections are colorless and
  strongest at grazing angles (Fresnel), and `color` drives the diffuse
  albedo instead.

**Why it matters**: this is *the* baseline realism lever. A scene built on
`MeshBasicMaterial` (flat, unlit, no roughness/metalness/normal response at
all) cannot look physically real regardless of lighting/post-processing —
it has no surface response model to light in the first place.
`MeshStandardMaterial` is the minimum for "PBR"; `MeshPhysicalMaterial`
extends it with clearcoat, sheen, transmission (glass), iridescence,
anisotropy — the glTF *extension* layer described below.

**Extensions (glTF, implemented via `MeshPhysicalMaterial` props)**:
- `KHR_materials_specular` — adds `specular`/`specularColor` to control
  strength/tint of the dielectric specular lobe independent of
  metalness — e.g., non-metal colored reflections (velvet, coated
  plastic). Maps to `MeshPhysicalMaterial.specularIntensity` /
  `.specularColor`.
- `KHR_materials_transmission` + `KHR_materials_ior` + `KHR_materials_volume`
  — glass/liquid: `transmission`, `ior` (real glass ≈ 1.5), `thickness`,
  `attenuationColor`/`attenuationDistance`.
- `KHR_materials_clearcoat`, `_sheen`, `_iridescence`, `_anisotropy` — layered
  effects for car paint, fabric, soap-film, brushed metal respectively.

**Sources**:
- Khronos, "PBR — Physically Based Rendering in glTF" — https://www.khronos.org/gltf/pbr/ (roughness = microsurface bumpiness/blur; metallic governs reflective behavior — full reflection + tinted at metalness=1, grazing-only reflection at metalness=0; "Base Color is a foundational aspect... everything else layered on top")
- Khronos, `KHR_materials_specular` extension README — https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_specular/README.md
- Khronos blog, "Using the New glTF Extensions: Volume, IOR, and Specular" — https://www.khronos.org/blog/using-the-new-gltf-extensions-volume-index-of-refraction-and-specular
- three.js docs, `MeshPhysicalMaterial` — https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial (property-level mapping of the above)

---

## 4. Image-based lighting (IBL) / HDRI environment maps

**What**: instead of (or in addition to) discrete lights, an HDR
equirectangular or cubemap texture assigned to `scene.environment` supplies
ambient specular + diffuse lighting sampled from real-world captured
lighting. drei's `<Environment>` wraps this: it builds a `PMREMGenerator`
cubemap and sets `scene.environment` (and optionally `scene.background`).

**Why it matters**: PBR materials (metalness/roughness) look correct only
when they have something physically plausible to reflect. Flat ambient/hemi
light produces uniform, "clay-render" looking metals and glass; an HDRI gives
real specular highlights, horizon color, and reflection detail for free —
this is the highest-leverage single addition for a scene that currently has
no environment map.

**API**: `@react-three/drei` `<Environment preset="city" background
files="scene.hdr" ground={{ height, radius, scale }}
environmentIntensity backgroundIntensity />`. `preset` pulls from a
Poly Haven-backed CDN — drei's own docs flag presets as "discouraged in
production" (CDN dependency/latency); ship a local `.hdr`/`.exr` via `files`
for production.

**Sources**:
- drei docs, `Environment` — https://drei.docs.pmnd.rs/staging/environment (props table, code examples, preset CDN caveat)
- three.js docs, `PMREMGenerator` — https://threejs.org/docs/#api/en/extras/PMREMGenerator (the underlying primitive `Environment` builds on)

---

## 5. Shadows: shadow maps vs. drei's contact/accumulative shadow catchers

**What**: three.js's built-in real-time shadow maps
(`renderer.shadowMap.enabled`, `light.castShadow`, `mesh.castShadow` /
`.receiveShadow`, `PCFSoftShadowMap`) are hard-edged and single-sample per
light by default. drei offers two purpose-built alternatives for
soft/grounded shadows without a full path tracer:
- **`<ContactShadows>`** — renders a top-down blurred shadow onto an
  invisible ground plane beneath the model; cheap, good for "object floating
  slightly above a surface" grounding, described by drei itself as
  "a rather expensive effect" when re-rendered every frame — use
  `frames={1}` for static scenes to render once and stop.
- **`<AccumulativeShadows>` + `<RandomizedLight>`** — jitters light position
  across N frames and accumulates a soft, raytrace-like shadow + ambient
  occlusion approximation into a baked texture; "zero performance impact
  after all frames have accumulated" for static geometry.

**Why it matters**: hard single-sample shadow maps read as
"video-game-2005"; soft, multi-sample-accumulated shadows are one of the
strongest visual signals of "real" lighting because real light sources are
never point-perfect emitters.

**Sources**:
- drei docs, `ContactShadows` — https://drei.docs.pmnd.rs/staging/contact-shadows (props: opacity, scale, blur, far, resolution, color, frames; "a rather expensive effect")
- drei GitHub source, `AccumulativeShadows.tsx` — https://github.com/pmndrs/drei/blob/master/src/core/AccumulativeShadows.tsx
- drei docs, `AccumulativeShadows` — https://drei.docs.pmnd.rs/staging/accumulative-shadows (temporal vs instantaneous accumulation, RandomizedLight "emulate raycasting-like shadows and ambient occlusion")

---

## 6. Screen-space ambient occlusion (SSAO) and screen-space reflections (SSR)

**What**: `pmndrs/postprocessing`'s `SSAOEffect` samples the depth buffer
around each pixel to darken crevices/contact areas where ambient light would
be physically occluded — cheap, per-pixel approximation of a much more
expensive global-illumination effect. The library also ships an SSR
implementation, but it is explicitly called out by the community
(react-postprocessing maintainers) as unstable and has been dropped from at
least one major tutorial series for that reason — treat SSR here as
experimental, not a default recommendation.

**Why it matters**: AO is what makes touching/nested geometry (bolts in a
plate, a beam meeting a column) look grounded instead of pasted-together —
it's a small, contact-scale darkening cue humans are extremely sensitive to.

**API**: `postprocessing`'s `SSAOEffect` (`resolutionScale`,
`depthAwareUpsampling` for quality/perf tradeoff), consumed in r3f via
`@react-three/postprocessing`'s `<SSAO>` wrapper (props: `radius`,
`intensity`, `luminanceInfluence`, `bias`).

**Sources**:
- pmndrs/postprocessing GitHub — https://github.com/pmndrs/postprocessing ("A post processing library for three.js"; EffectComposer/EffectPass merge multiple effects into one pass)
- react-postprocessing GitHub source, `SSAO.tsx` — https://github.com/pmndrs/react-postprocessing/blob/master/src/effects/SSAO.tsx
- react-postprocessing issue #269, "Current state of SSR" — https://github.com/pmndrs/react-postprocessing/issues/269 (SSR flagged unstable)

---

## 7. Bloom, vignette, chromatic aberration, color grading, and the postprocessing pipeline shape

**What**: `pmndrs/postprocessing` is the standard r3f post stack. Core
pattern: one `EffectComposer`, a `RenderPass` first (clears buffers, renders
the scene), then a single `EffectPass` bundling multiple effects — the
library's own selling point is that `EffectPass` "merges" effects to avoid
the performance cost of chaining separate fullscreen passes per effect.
Effects relevant to realism: `BloomEffect` (light bleed from bright/emissive
areas — needs HDR + a `luminanceThreshold` tuned above 1.0 in linear space to
avoid blooming everything), `ToneMappingEffect` (can replace/complement
`renderer.toneMapping`), `VignetteEffect`, `ChromaticAberrationEffect`
(subtle lens-edge color fringing), `DepthOfFieldEffect` (defocus blur —
cinematic depth cue), and grading effects (`HueSaturationEffect`,
`BrightnessContrastEffect`).

**Why it matters**: bloom + a properly exposed tone-mapping curve is what
sells "this is a rendered photo" rather than "this is a GL viewport" — it
recreates real camera/eye response to overbright light sources (windows, sun
glints on metal).

**Sources**:
- pmndrs/postprocessing docs home — https://pmndrs.github.io/postprocessing/public/docs/ (EffectComposer/EffectPass architecture, effect list)
- react-postprocessing docs — https://react-postprocessing.docs.pmnd.rs/ (r3f-idiomatic component wrappers: `<Bloom>`, `<Vignette>`, `<ChromaticAberration>`, `<DepthOfField>`)
- Three.js Journey, "Post-processing with R3F" — https://threejs-journey.com/lessons/post-processing-with-r3f (first-party-adjacent worked example of composer setup; used here only for the code-shape confirmation, not as the sole source)

---

## 8. Anti-aliasing and DPR

**What**: `<Canvas dpr={[min,max]} gl={{ antialias: true }}>` (r3f) is
MSAA at the WebGL-context level — cheap but weak against shader-aliasing
(specular fireflies, thin geometry). For higher fidelity, post-process AA
(SMAA/FXAA via `postprocessing`'s `SMAAEffect`) or supersampling
(`dpr` clamped to device pixel ratio, e.g. `[1, 2]`) is layered on top.
Capping `dpr` at 2 is the standard perf/fidelity compromise recommended
across r3f examples — higher a devicePixelRatio without benefit above ~2x
perceptible sharpness, at quadratic pixel cost.

**Sources**:
- react-three-fiber docs, `Canvas` — https://r3f.docs.pmnd.rs/api/canvas (dpr prop, gl prop passthrough to `WebGLRenderer` constructor args)
- react-three-fiber docs, "Scaling performance" — https://r3f.docs.pmnd.rs/advanced/scaling-performance

---

## 9. Instancing and LOD (performance-for-fidelity tradeoff)

**What**: `InstancedMesh` renders N copies of one geometry+material in a
single draw call via per-instance transform matrices
(`mesh.setMatrixAt(i, matrix)`, `instanceMatrix.needsUpdate = true`); drei's
`<Instances>`/`<Instance>` wraps this declaratively. For level-of-detail,
drei's `<Detailed>` swaps geometry by camera distance with no manual
boilerplate, mirroring three.js's core `LOD` object.

**Why it matters for a realism budget**: photorealistic settings (dense
foliage, rivets/bolts, gravel, crowds) are only affordable at scale via
instancing — a scene that draws one `<mesh>` per repeated part (as many
early-stage BIM/CAD viewers do) hits the browser's draw-call ceiling long
before it can afford per-part high-poly detail, normal maps, or the extra
post-processing passes above. Instancing is what buys the frame-time budget
that realism techniques spend.

**Sources**:
- react-three-fiber docs, "Scaling performance" — https://r3f.docs.pmnd.rs/advanced/scaling-performance (InstancedMesh 100k-instance pattern, `setMatrixAt`)
- Codrops, "Three.js Instances: Rendering Multiple Objects Simultaneously" (2025-07-10) — https://tympanus.net/codrops/2025/07/10/three-js-instances-rendering-multiple-objects-simultaneously/
- drei GitHub — `Instances`/`Detailed` components — https://github.com/pmndrs/drei

---

## 10. Normal mapping, and glass/refraction via TSL + `MeshPhysicalNodeMaterial` (WebGPURenderer)

**What (normal mapping)**: a tangent-space normal map perturbs per-pixel
shading normals without adding geometry — the standard way to fake surface
micro-detail (weld seams, brushed metal, fabric weave) cheaply. Implemented
via `MeshStandardMaterial.normalMap` / `.normalScale`.

**What (TSL/WebGPU glass)**: three.js's newer `WebGPURenderer` path
introduces **TSL** (Three.js Shading Language), a node-based JS API for
writing shaders (GLSL/WGSL-targeting) with tree-shaking and a more
ergonomic authoring model than raw `ShaderMaterial` strings; node-equivalents
of standard materials exist (e.g. `MeshStandardNodeMaterial`,
`MeshPhysicalNodeMaterial`). A recent worked example: a glass sphere built
from `MeshPhysicalNodeMaterial` with `transmission: 1.0`, `ior: 1.5`,
`roughness: 0`, `clearcoat`, and `dispersion` (chromatic aberration through
the glass itself), lit by an HDRI environment for real reflections/
refractions — realism there comes specifically from combining physical
optical parameters (IOR, dispersion) with an environment map, not from a
one-off custom shader.

**Version/compat notes**: `WebGPURenderer` falls back to WebGL2 automatically
when WebGPU is unavailable (Safari ≥ 26, Firefox ≥ 141/Windows, Chrome/Edge
since 113) — so it's viable to adopt now even without universal WebGPU
support. This repo is pinned to `three@^0.169.0` and the plain `WebGLRenderer`
via r3f `<Canvas>`; adopting TSL/WebGPURenderer would be a renderer-swap, not
a drop-in material change — flag as a larger migration, not a quick win.

**Sources**:
- three.js docs, `MeshStandardMaterial.normalMap` — https://threejs.org/docs/#api/en/materials/MeshStandardMaterial.normalMap
- Codrops, "Rendering a Procedural Vortex Inside a Glass Sphere with Three.js and TSL" (2025-03-10) — https://tympanus.net/codrops/2025/03/10/rendering-a-procedural-vortex-inside-a-glass-sphere-with-three-js-and-tsl/ (`MeshPhysicalNodeMaterial` transmission/ior/dispersion glass recipe)
- three.js docs, TSL — https://threejs.org/docs/pages/TSL.html
- Codrops, "Three.js: BatchedMesh and Post processing with WebGPURenderer" (2024-10-30) — https://tympanus.net/codrops/2024/10/30/interactive-3d-with-three-js-batchedmesh-and-webgpurenderer/
- Maxime Heckel, "Field Guide to TSL and WebGPU" — https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/ (first-party-adjacent deep dive, used for the browser-support/fallback claim cross-check only)

---

## 11. Pitfalls, mistakes, and tradeoffs in real-world practice

The techniques above are necessary but not sufficient — most of the "why does
my PBR scene still look wrong/cheap/slow" complaints in the primary sources
below come from misapplying them, not from omitting them. Each entry:
symptom → root cause → fix, with a wrong/fixed code pair, and the source.

### 11.1 Color management mistakes

**a) Double gamma correction (washed-out, too-light image)**
- Symptom: colors look pale/foggy, blacks are grey.
- Root cause: sRGB decode applied twice — once because the texture was
  tagged `SRGBColorSpace` and once because a shader or the old
  `outputEncoding` API also gamma-corrected it. Common when mixing
  three.js ≥ r152 color-managed code with older snippets still setting
  `texture.encoding = sRGBEncoding`.
- Fix: one sRGB→linear step at texture load (`colorSpace`), one
  linear→sRGB step at output (`renderer.outputColorSpace`). Never both on
  the same texture.
```js
// WRONG — pre-r152 API mixed with new; double-corrects
texture.encoding = THREE.sRGBEncoding;       // removed API, silently ignored or conflicting
renderer.outputEncoding = THREE.sRGBEncoding;

// FIXED
texture.colorSpace = THREE.SRGBColorSpace;   // color textures only
renderer.outputColorSpace = THREE.SRGBColorSpace; // renderer, set once
```
- Source: three.js forum, "Updates to Color Management in three.js r152" — https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791

**b) Data maps (normal/roughness/metalness/AO) wrongly tagged sRGB**
- Symptom: normal maps look "melted"/wrong-colored, roughness/metalness
  response is inconsistent with the authored values.
- Root cause: `colorSpace` defaults or copy-paste set `SRGBColorSpace` on a
  *data* texture. Non-color data must never go through the sRGB curve.
- Fix:
```js
// WRONG
normalMap.colorSpace = THREE.SRGBColorSpace;

// FIXED — data textures stay linear/untagged
normalMap.colorSpace = THREE.NoColorSpace;
roughnessMap.colorSpace = THREE.NoColorSpace;
metalnessMap.colorSpace = THREE.NoColorSpace;
aoMap.colorSpace = THREE.NoColorSpace;
map.colorSpace = THREE.SRGBColorSpace; // only the color/albedo/emissive map
```
- Source: three.js manual, "Color management" — https://threejs.org/manual/en/color-management.html; three.js docs `module-ColorSpaces` — https://threejs.org/docs/pages/module-ColorSpaces.html

**c) Tone mapping applied inconsistently across a scene/app**
- Symptom: some meshes/UI overlays look correct, others (e.g. a
  `CSS2DRenderer`/DOM overlay, or a second `Canvas`) look blown out or flat
  relative to the main scene.
- Root cause: `toneMapping` is a renderer-level setting; a second renderer,
  a raw `<canvas>` overlay, or `material.toneMapped = false` (used for UI
  sprites/HUD elements so they don't get crushed by scene exposure) left
  unset inconsistently across meshes in the same scene.
- Fix: decide per-material intent explicitly.
```js
// UI/HUD element that must render at literal color regardless of scene exposure
hudMaterial.toneMapped = false;
```
- Source: three.js docs, `Material.toneMapped` — https://threejs.org/docs/#api/en/materials/Material.toneMapped

### 11.2 Lighting / IBL mistakes

**a) Too many dynamic shadow-casting lights tanking performance**
- Symptom: frame time scales linearly (or worse) with light count; mobile
  drops to single digits FPS.
- Root cause: each `castShadow` light re-renders the depth-only shadow pass
  for the whole shadow-casting scene subset. three.js forward-renders one
  shadow map per shadow-casting light — there is no deferred/clustered
  light culling built in.
- Fix: bake static lighting into `AccumulativeShadows`/lightmaps, limit
  real-time shadow casters to 1 key light, use `light.castShadow = false`
  on fills, and use `<Environment>` (IBL) for ambient rather than many
  small point lights.
```jsx
// WRONG — five shadow-casting point lights for "nice" ambient fill
{lights.map((l) => <pointLight key={l.id} castShadow position={l.pos} />)}

// FIXED — one shadow-casting key light + IBL environment for fill
<directionalLight castShadow position={sunPos} />
<Environment preset="city" />
```
- Source: react-three-fiber docs, "Scaling performance" — https://r3f.docs.pmnd.rs/advanced/scaling-performance

**b) Missing environment map → flat "clay render" PBR materials**
- Symptom: `metalness: 1` surfaces look like grey plastic, not metal.
- Root cause: `MeshStandardMaterial`'s specular term needs something to
  reflect; with no `scene.environment` and no bright direct lights, the
  specular lobe has nothing to sample.
- Fix: see §4 — add `<Environment>`.
- Source: Khronos, "PBR — Physically Based Rendering in glTF" — https://www.khronos.org/gltf/pbr/

**c) Environment intensity not matched to scene exposure/tone mapping**
- Symptom: adding an HDRI makes the scene suddenly blown out or suddenly
  much darker than before.
- Root cause: `Environment`'s `environmentIntensity` and the renderer's
  `toneMappingExposure` are independent multipliers; changing one without
  re-checking the other double- or half-exposes the image.
- Fix: tune `toneMappingExposure` and `environmentIntensity` together, not
  in isolation; verify against a known material reference (a pure white
  diffuse sphere reads as sRGB ~200/255 under a "normal" daylight IBL).
- Source: drei docs, `Environment` — https://drei.docs.pmnd.rs/staging/environment (`environmentIntensity`/`backgroundIntensity` props)

**d) Physically-correct light units regression after upgrading three.js**
- Symptom: a scene that looked correctly lit at three.js < r155 is suddenly
  far too dark (or far too bright) after a version bump, with no code
  changes to lights.
- Root cause: three.js r155 flipped `WebGLRenderer.useLegacyLights`'s
  default from `true` to `false` — light intensities are now interpreted
  in physically-based units (lumens/candela, not the old arbitrary 0–1..N
  scale), and point/spot light `decay` default changed alongside it. The
  property was deprecated and removed by r165. `three@^0.169.0` (this
  repo's pin) is past that removal — legacy mode is not available; light
  intensities written for older tutorials/examples must be re-tuned.
- Fix: don't port old intensity numbers verbatim; re-tune per current
  physical units, and keep `decay = 2` (physically correct inverse-square)
  rather than overriding it to `0`/`1` for old-looking flat falloff.
- Source: three.js forum, "Updates to lighting in three.js r155" — https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733; GitHub PR #24975, "`.physicallyCorrectLights` → `.useLegacyLights`" — https://github.com/mrdoob/three.js/pull/24975; PR #23897, "PointLight/SpotLight: Change default decay to 2" — https://github.com/mrdoob/three.js/pull/23897

**e) Baked (lightmap/AccumulativeShadows) vs. real-time lighting conflicting**
- Symptom: a moving object under baked ambient occlusion casts a second,
  visibly offset real-time shadow, or looks like it's floating relative to
  its own baked contact shadow.
- Root cause: `AccumulativeShadows` bakes a shadow for the light position(s)
  at bake time; if the object or light later moves without re-baking (or a
  real-time `directionalLight` shadow is added on top for the same
  geometry), the two shadows disagree.
- Fix: use one or the other per object — baked shadow-catcher for static
  scenery, real shadow map for objects the user manipulates (this repo's
  `exploded`/timeline-driven parts, for instance).
- Source: drei docs, `AccumulativeShadows` — https://drei.docs.pmnd.rs/staging/accumulative-shadows

### 11.3 Material / PBR mistakes

**a) Non-binary metalness on what should be a pure dielectric or pure metal**
- Symptom: a "steel beam" material with `metalness: 0.5` looks like a
  plastic-metal hybrid, not a step between "clean steel" and "rusted/
  painted steel."
- Root cause: in the glTF metallic-roughness model, `0` (dielectric) and `1`
  (conductor) are the physically meaningful endpoints — Khronos's own PBR
  reference defines metallic strictly at those two poles ("at full value,
  surfaces become fully reflective... at zero, surfaces show reflections
  only at grazing angles"). An intermediate value like `0.5` doesn't
  correspond to "half-shiny"; it blends the two reflectance models, which is
  a physically odd result outside of specific mixed-material authoring
  workflows, not a general-purpose "shininess" dial.
- Fix: use `0` or `1` for metalness on ordinary materials, and use
  `roughness` (not intermediate metalness) to vary how polished vs. matte
  the surface is.
```js
// WRONG — trying to fake "worn steel" with mid metalness
new THREE.MeshStandardMaterial({ metalness: 0.5, roughness: 0.5 });

// FIXED — metalness stays at the physical extreme; roughness carries the wear
new THREE.MeshStandardMaterial({ metalness: 1.0, roughness: 0.6 });
```
- Source: Khronos, "PBR — Physically Based Rendering in glTF" — https://www.khronos.org/gltf/pbr/

**b) Normal map green-channel (Y) convention mismatch**
- Symptom: normal-mapped surface detail reads inverted — bumps look like
  dents and vice versa.
- Root cause: three.js's tangent-space convention matches the DirectX/
  "Y-down" green-channel convention; normal maps authored/exported in the
  OpenGL "Y-up" convention (common from some bakers) need their green
  channel flipped, or the reverse.
- Fix:
```js
// FIXED — flip only the Y component when the source map uses the other convention
material.normalScale.set(1, -1);
```
- Source: three.js GitHub issue #11315, "What is three.js's normal map handedness convention?" — https://github.com/mrdoob/three.js/issues/11315; Khronos glTF issue #952, "Direction of Y (green) channel in normal maps" — https://github.com/KhronosGroup/glTF/issues/952

**c) Missing mipmaps/anisotropic filtering → specular shimmer on grazing surfaces**
- Symptom: floors/roads/any surface viewed at a shallow angle sparkle or
  "boil" as the camera moves.
- Root cause: no mipmaps (or `NearestFilter`/`LinearFilter` without
  `generateMipmaps`) means high-frequency texture detail aliases at oblique
  angles; anisotropic filtering compensates for the non-square footprint of
  a texel projected at a grazing angle.
- Fix:
```js
// WRONG — default filtering with no anisotropy on a ground-plane texture
const tex = textureLoader.load('gravel.jpg');

// FIXED
tex.generateMipmaps = true;
tex.minFilter = THREE.LinearMipmapLinearFilter;
tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
```
- Source: three.js docs, `Texture.anisotropy` — https://threejs.org/docs/#api/en/textures/Texture.anisotropy

**d) Overusing `MeshPhysicalMaterial` extension features for no visible payoff**
- Symptom: frame time drops noticeably after adding `clearcoat`/
  `transmission`/`iridescence` to many materials, with little visible
  change at the model's typical viewing distance/scale.
- Root cause: each `MeshPhysicalMaterial` feature flag compiles extra shader
  branches and, for `transmission`, forces a separate transmission render
  pass (renders the scene behind the transparent object into a texture) —
  cost scales with how many transmissive objects are on screen, not just
  their size.
- Fix: reserve `transmission`/`clearcoat`/`iridescence`/`sheen` for the few
  hero materials where they're visually load-bearing (glass, car paint,
  soap film); use plain `MeshStandardMaterial` elsewhere.
- Source: three.js docs, `MeshPhysicalMaterial` — https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial (transmission render-target/pass description)

**e) Transparent object sorting artifacts**
- Symptom: overlapping transparent/translucent parts render in the wrong
  visual order — a part that should be behind another shows in front.
- Root cause: three.js sorts transparent objects back-to-front by object
  origin, not per-triangle; overlapping/interpenetrating transparent
  geometry (exactly this repo's `transparent` translucent-role meshes in
  `DiagramScene.tsx`, see §12) breaks that heuristic.
- Fix: set explicit `renderOrder` on known-problematic pairs, or split
  large transparent meshes so origins better approximate depth order; avoid
  `depthWrite: true` + `transparent: true` on overlapping geometry.
- Source: three.js docs, `Object3D.renderOrder` — https://threejs.org/docs/#api/en/core/Object3D.renderOrder ("objects are rendered in rendering order... transparent objects are sorted by z-depth and then rendered")

### 11.4 Shadow mistakes

**a) Shadow acne (moiré/banding self-shadowing) vs. peter-panning (detached shadow)**
- Symptom: either fine dark/light banding across curved surfaces (acne), or
  a shadow visibly floating away from the object that casts it
  (peter-panning) when bias is over-corrected.
- Root cause: shadow maps are finite-resolution depth textures; comparing a
  surface's depth against its own shadow-map sample at grazing angles hits
  rounding error. `bias` shifts the comparison depth to hide this — too
  little and acne appears, too much and the shadow detaches.
- Fix (documented starting values):
```js
dirLight.shadow.bias = -0.005;
dirLight.shadow.normalBias = 0.02; // handles curved-surface acne without peter-panning
```
- Source: three.js GitHub issue #7359, "Shadowing still gives shadow acne" — https://github.com/mrdoob/three.js/issues/7359; issue #13108, "Shadow normalBias and slopeBias" — https://github.com/mrdoob/three.js/issues/13108

**b) Shadow-map resolution/frustum mismatch → blurry or missing shadows**
- Symptom: shadows look pixelated/blocky, or objects near the frustum edge
  don't cast shadows at all.
- Root cause: `shadow.mapSize` is fixed resolution spread across whatever
  area `shadow.camera` (an orthographic camera for `DirectionalLight`)
  covers; a frustum sized for the whole scene wastes resolution on empty
  space, while a too-tight frustum clips distant casters.
- Fix: tighten the frustum to the actual shadow-relevant bounds before
  raising `mapSize` — tightening usually wins more quality than resolution
  alone.
```js
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -boundsRadius;
dirLight.shadow.camera.right = boundsRadius;
dirLight.shadow.camera.top = boundsRadius;
dirLight.shadow.camera.bottom = -boundsRadius;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = boundsRadius * 3;
// debug: scene.add(new THREE.CameraHelper(dirLight.shadow.camera));
```
- Source: three.js docs, `DirectionalLightShadow` — https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow (`shadow.camera` is an `OrthographicCamera` with `left/right/top/bottom/near/far`; "make the frustum as tight as possible around your scene to maximize shadow map resolution"; `mapSize` default 512, powers-of-2 guidance); cross-checked against DEV Community, "Mastering Shadows in Three.js" — https://dev.to/outriding/mastering-shadows-in-threejs-setup-configuration-and-optimization-39nn (bias/normalBias starting values, `CameraHelper` debugging tip)

**c) Single directional light = single shadow map, no cascades**
- Symptom: either close-up shadows are too blocky, or distant shadows are
  fine but nearby ones are coarse — can't have both without extra work.
- Root cause: three.js core does not ship cascaded shadow maps (CSM) for
  `DirectionalLight` — one shadow camera frustum must cover the whole
  relevant range at one resolution.
- Fix: for large scenes needing both near detail and far coverage, a
  community CSM add-on (e.g. `three-csm`) is required; for a bounded
  architectural/product scene (this repo's scale), a single tightly-fit
  frustum is sufficient and simpler.
- Source: `three-csm` project (community add-on filling the gap) — https://github.com/vtHawk/three-csm

**d) Contact-shadow catcher vs. real shadow-map inconsistency**
- Symptom: an object's `<ContactShadows>` blob and its real-time
  `castShadow` shadow disagree in direction/softness.
- Root cause: `ContactShadows` is a synthetic top-down blurred blob keyed
  to a plane, not derived from any actual light in the scene — it doesn't
  know or care where `DirectionalLight`/`Environment` light is coming from.
- Fix: use `ContactShadows` only when there is no directional key light (or
  its direction is near-vertical), or replace it with
  `AccumulativeShadows` + `RandomizedLight` positioned to match the real
  key light direction.
- Source: drei docs, `ContactShadows` — https://drei.docs.pmnd.rs/staging/contact-shadows

**e) Soft shadow types unsupported/slow on mobile**
- Symptom: `PCFSoftShadowMap` or `VSMShadowMap` looks correct on desktop but
  renders as hard-edged or costs much more frame time on mobile GPUs.
- Root cause: soft shadow filtering (multi-tap PCF, or VSM's extra blur
  passes) is bandwidth-heavy; mobile tile-based GPUs are disproportionately
  sensitive to it.
- Fix: branch shadow quality by a device-tier check — `BasicShadowMap` or
  `AccumulativeShadows`-baked (zero runtime cost) on mobile, `PCFSoftShadowMap`
  on desktop.
- Source: three.js docs, `WebGLRenderer.shadowMap.type` enum (`BasicShadowMap`, `PCFShadowMap`, `PCFSoftShadowMap`, `VSMShadowMap`) — https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap; cross-checked against DEV Community, "Mastering Shadows in Three.js" — https://dev.to/outriding/mastering-shadows-in-threejs-setup-configuration-and-optimization-39nn (mobile cost framing)

**f) Light leaking through geometry (shadow gaps at thin/open surfaces)**
- Symptom: a visible sliver or gap of light bleeds through where two
  surfaces meet, or through a wall/floor that should fully occlude light —
  most visible at grazing angles.
- Root cause: shadow-casting geometry with zero thickness (a single-sided
  plane, or two coplanar-but-not-quite-touching boxes) has no volume for
  the shadow map to register as an occluder from every angle; a
  `shadow.camera.near` set too far back can also clip the very-close
  occluder geometry it should be shadowing.
- Fix: give thin dividing elements real thickness rather than zero-depth
  planes, and set `shadow.camera.near` as small as the scene scale allows
  (tightened alongside `far`, per §11.4b) so close-range occluders aren't
  clipped out of the depth range before they can block light.
- Source: three.js docs, `DirectionalLightShadow`/`LightShadow` `camera.near`/`camera.far` — https://threejs.org/docs/#api/en/lights/shadows/DirectionalLightShadow (frustum bounds must contain the occluding geometry to shadow it)

### 11.5 Post-processing mistakes

**a) Bloom applied to everything, including UI/HUD overlays → blown-out "glowy" look**
- Symptom: the whole scene looks like it's lit by fog, HUD text/chips glow
  when they shouldn't.
- Root cause: `BloomEffect`'s `luminanceThreshold` set too low (or `0`)
  blooms every mid-bright pixel, not just genuinely overbright ones; a HUD
  rendered in the same composited pass with no `toneMapped = false` /
  separate pass gets caught in it too.
- Fix: keep `luminanceThreshold` at/above `1.0` in linear HDR space so only
  values that exceed normal display range bloom, and render HUD/overlay
  elements outside the bloom-affected pass (a separate DOM overlay, as this
  repo already does for its `Chip` overlay in `Viewport.tsx`, sidesteps this
  entirely).
```js
// WRONG — blooms nearly everything
new BloomEffect({ luminanceThreshold: 0, luminanceSmoothing: 0.5 });

// FIXED — only genuinely overbright pixels (light fixtures, sun glints) bloom
new BloomEffect({ luminanceThreshold: 1.0, luminanceSmoothing: 0.3, intensity: 0.6 });
```
- Source: react-postprocessing docs, `Bloom` — https://react-postprocessing.docs.pmnd.rs/effects/bloom ("A luminanceThreshold of 1 ensures that nothing will glow by default")

**b) Double tone mapping between renderer and post-processing**
- Symptom: colors look crushed/oversaturated or oddly contrasty only when
  post-processing is enabled, correct with it off.
- Root cause: `renderer.toneMapping` already applied the filmic/AgX curve
  before the frame reaches the composer; a `ToneMappingEffect` in the
  composer applies it again.
- Fix: pick exactly one place tone mapping happens — either the renderer
  (`NoToneMapping` never set — leave the renderer's tone mapping on and
  skip any tone-mapping effect in the composer), or move it entirely into
  the composer as the last effect and set `renderer.toneMapping =
  THREE.NoToneMapping`.
```js
// WRONG — both active
renderer.toneMapping = THREE.ACESFilmicToneMapping;
composer.addPass(new EffectPass(camera, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));

// FIXED — post-processing owns tone mapping, exclusively, as the last effect
renderer.toneMapping = THREE.NoToneMapping;
composer.addPass(new EffectPass(camera, bloomEffect, ssaoEffect,
  new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })));
```
- Source: three.js forum, "Tone mapping with post-processing" — https://discourse.threejs.org/t/tone-mapping-with-post-processing/7281 ("set renderer.toneMapping = NoToneMapping, and then add a ToneMapPass as the final pass")

**c) SSAO halo artifacts around silhouette edges**
- Symptom: a visible bright or dark fringe/"halo" outlines foreground
  objects against the background, most visible where depth changes sharply.
- Root cause: SSAO's occlusion estimate breaks down at large depth
  discontinuities — samples that should be ignored (background behind a
  foreground edge) get included in the occlusion sum.
- Fix: enable depth-aware blur/upsampling (`depthAwareUpsampling: true`),
  reduce `radius` so the sample kernel doesn't reach across silhouette
  edges as often, and tune `bias` to reduce self-occlusion on flat surfaces
  without disabling proper crevice darkening.
- Source: react-postprocessing docs, `SSAO` — https://react-postprocessing.docs.pmnd.rs/effects/ssao (`depthAwareUpsampling`, `radius`, `bias` props); GameDev.net, "SSAO no halo artifacts" — https://www.gamedev.net/forums/topic/550699-ssao-no-halo-artifacts/ ("Halos appear because of big discontinuities in the depth buffer")

**d) SSR breaking on thin/off-screen geometry**
- Symptom: reflections vanish, flicker, or smear when the reflected
  geometry is thin (a rail, a pipe) or partially off-screen.
- Root cause: screen-space reflection can only reflect what's already in
  the rendered frame's depth/color buffer; thin geometry has too few
  screen pixels to ray-march against reliably, and anything off-screen or
  occluded simply isn't there to reflect.
- Fix: treat `postprocessing`'s SSR as experimental/opt-in per-scene, not a
  default; prefer baked/IBL reflections (`<Environment>`) for anything that
  must look consistently correct, reserving SSR only for large flat
  reflectors (floors) where its failure modes are least visible.
- Source: react-postprocessing GitHub issue #269, "Current state of SSR" — https://github.com/pmndrs/react-postprocessing/issues/269

**e) Over-sharpening / over-vignetting reading as an "AI-generated" look**
- Symptom: the render looks artificially "glossy" or over-processed —
  crushed corners, halo-sharpened edges — rather than photographic.
- Root cause: stacking multiple grading effects (sharpen + vignette +
  bloom + chromatic aberration) each at a "looks fine in isolation"
  strength compounds into an overcooked composite; this is a subjective but
  frequently-flagged failure mode in postprocessing/react-postprocessing
  discussion threads about effect stacking.
- Fix: apply grading effects at material-reference-checked low strengths,
  and review the composite against a plain (no-post) render side by side
  before shipping a new effect.
- Source: pmndrs/postprocessing discussion #558, "Questions on Tone Mapping" — https://github.com/pmndrs/postprocessing/discussions/558 (community guidance on subtlety/ordering of stacked effects)

### 11.6 Anti-aliasing / resolution mistakes

**a) MSAA silently not applied when render targets/post-processing are in play**
- Symptom: `gl={{ antialias: true }}` has no visible effect once
  post-processing is added.
- Root cause: WebGL's built-in MSAA only antialiases the direct
  render-to-screen path; as soon as the scene renders into an offscreen
  `WebGLRenderTarget` (which every `EffectComposer` pipeline does), that
  render target needs its own multisampling (`WebGLRenderTarget({ samples:
  n })`, WebGL2 only) or a post-process AA effect (SMAA/FXAA) — the
  original context-level `antialias: true` no longer does anything once
  the composer takes over.
- Fix:
```js
// WRONG — antialias:true on the context, but rendering goes through EffectComposer
const renderer = new THREE.WebGLRenderer({ antialias: true });
const composer = new EffectComposer(renderer); // MSAA from the flag above is bypassed

// FIXED — multisampled render target, or an explicit SMAA pass in the composer
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { samples: 4 }));
// or: composer.addPass(new EffectPass(camera, new SMAAEffect(...)));
```
- Source: pmndrs/postprocessing docs — https://pmndrs.github.io/postprocessing/public/docs/ (EffectComposer render-target/multisampling configuration)

**b) Unclamped `devicePixelRatio` collapsing performance on high-DPI screens**
- Symptom: identical scene runs fine on a 1x display, drops to a fraction
  of the frame rate on a 3x-DPR phone/laptop.
- Root cause: pixel count (and therefore every per-pixel shader/post cost)
  scales with the square of DPR; using the raw `window.devicePixelRatio`
  (up to 3–4 on modern phones) multiplies fragment work 9–16x over a
  DPR-1 render for zero perceptible gain past ~2x.
- Fix:
```jsx
// WRONG
<Canvas dpr={window.devicePixelRatio} />

// FIXED — this repo already does this correctly in DiagramScene.tsx
<Canvas dpr={[1, 2]} />
```
- Source: react-three-fiber docs, "Scaling performance" — https://r3f.docs.pmnd.rs/advanced/scaling-performance

**c) Temporal AA ghosting on moving objects**
- Symptom: fast-moving geometry leaves a trailing smear/ghost.
- Root cause: TAA accumulates and reprojects previous frames using motion
  vectors; objects that move faster than the reprojection can track (or
  lack correct motion vectors, e.g. skinned/procedurally-animated meshes)
  leave stale accumulated samples behind.
- Fix: not applicable to this repo today (no TAA in the stack) — flag as a
  future tradeoff: if TAA is ever adopted for edge quality, any
  per-frame-recomputed geometry (this repo's `explodedPosition`/timeline
  `progress`-driven visibility) needs correct motion-vector support or a
  TAA reset on discontinuous jumps, or ghosting will appear specifically on
  the explode/timeline-animated parts.
- Source: general TAA behavior corroborated across the postprocessing/
  three.js ecosystem docs cited above; no repo-specific primary source
  needed since TAA is not currently in use.

### 11.7 Performance-vs-realism tradeoffs

**a) Draw-call explosion from one `<mesh>` per part**
- Symptom: frame time scales linearly with part count; adding realism
  features (shadows, SSAO) on top makes it worse multiplicatively.
- Root cause: every unique `<mesh>` is a separate WebGL draw call; CPU-side
  per-draw-call overhead (state changes, uniform uploads) dominates at high
  object counts long before GPU fragment cost does.
- Fix: merge static geometry (`BufferGeometryUtils.mergeGeometries`) or
  instance repeated parts (`InstancedMesh`/drei `<Instances>`) — this
  repo's own `docs/CHECKLIST.md` §5 already flags exactly this ("Scene 175
  part vẽ một `<mesh>` mỗi part... đo chi phí frame trước khi cho là cần
  instancing") as an open, unmeasured question.
- Source: react-three-fiber docs, "Scaling performance" — https://r3f.docs.pmnd.rs/advanced/scaling-performance; react-three-fiber docs, "Pitfalls" — https://r3f.docs.pmnd.rs/advanced/pitfalls (instancing/geometry-sharing guidance); this repo's `/home/vdloc/Projects/courtier-console-v2/docs/CHECKLIST.md` §5

**b) Uncompressed HDRIs and textures bloating GPU memory**
- Symptom: mobile/low-VRAM devices crash or fall back to software
  rendering after loading a scene that runs fine on desktop.
- Root cause: JPG/PNG decode to full-size uncompressed bitmaps in GPU
  memory; a 4K HDRI environment map alone can be tens of MB uncompressed.
  KTX2/Basis-compressed textures instead load as `CompressedTexture`,
  staying compressed in GPU memory.
- Fix:
```js
// WRONG — raw 4K .hdr/.jpg straight into the scene
const envMap = await new RGBELoader().loadAsync('studio_4k.hdr');

// FIXED — KTX2/Basis-compressed textures for anything not already a small HDRI
const ktx2Loader = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);
gltfLoader.setKTX2Loader(ktx2Loader);
```
- Source: Khronos, "Khronos KTX 2.0 Textures Enable Compact, Visually Rich, glTF 3D Assets" — https://www.khronos.org/news/press/khronos-ktx-2-0-textures-enable-compact-visually-rich-gltf-3d-assets; three.js docs, `KTX2Loader` — https://threejs.org/docs/pages/KTX2Loader.html (10.8MB from 61.0MB, -82% in the cited real-world example)

**c) Expensive effects (SSR, high-res shadows) running unconditionally regardless of device tier**
- Symptom: the same "high" quality preset is used for a high-end desktop
  GPU and a budget phone; the phone is unusable.
- Root cause: no runtime capability/tier branching — a single hardcoded
  post-processing/shadow configuration.
- Fix: gate expensive effects (SSAO/SSR, `mapSize` ≥ 2048, `samples` on
  multisampled targets) behind a device-tier or FPS-adaptive check; this
  directly matches this repo's own currently-dead `quality` field in
  `viewSlice` (`docs/CHECKLIST.md` §2.4: "được ghi, không ai đọc") — it is
  the natural place to wire this in.
- Source: this repo's own `/home/vdloc/Projects/courtier-console-v2/docs/CHECKLIST.md` §2.4; general tier-gating pattern corroborated by react-three-fiber's "Scaling performance" guide — https://r3f.docs.pmnd.rs/advanced/scaling-performance

**d) Over-tessellated geometry for the viewing distance/scale**
- Symptom: high GPU vertex-stage cost with no perceptible visual gain —
  smoothness the camera never gets close enough to resolve.
- Root cause: default segment counts on primitive geometries
  (`SphereGeometry`, `CylinderGeometry`, etc.) or a high-poly imported mesh
  are left at authoring-time resolution regardless of how large the object
  appears on screen; every extra vertex costs vertex-shader time and,
  combined with normal maps (§10), buys nothing once the per-pixel shading
  is already carrying the surface detail.
- Fix: pick segment counts (or LOD levels via drei's `<Detailed>`, §9) by
  the object's typical on-screen size, and prefer a normal map over added
  geometric tessellation for surface detail that doesn't change the
  silhouette.
```js
// WRONG — default-authored high segment count on a small, distant bolt head
new THREE.CylinderGeometry(0.02, 0.02, 0.05, 64);

// FIXED — segment count matched to on-screen size; silhouette-only detail
new THREE.CylinderGeometry(0.02, 0.02, 0.05, 12);
```
- Source: react-three-fiber docs, "Scaling performance" — https://r3f.docs.pmnd.rs/advanced/scaling-performance (vertex-count-vs-visual-benefit framing, LOD via `Detailed`)

### 11.8 React / r3f-specific pitfalls

**a) Recreating geometry/material every render instead of memoizing**
- Symptom: GPU memory climbs over time; occasional stutter on every
  re-render of a component that also renders a mesh.
- Root cause: a `new THREE.BoxGeometry(...)` or `new
  THREE.MeshStandardMaterial(...)` written inline in a component body (not
  in JSX declarative form, and not memoized) allocates a new GPU resource
  every render; the old one is only garbage-collected JS-side, not
  disposed GPU-side.
- Fix:
```jsx
// WRONG — new geometry/material instance on every re-render
function Part({ size }) {
  const geo = new THREE.BoxGeometry(...size);
  return <mesh geometry={geo} />;
}

// FIXED — declarative JSX (r3f manages create/dispose) or explicit memoization
function Part({ size }) {
  return (
    <mesh>
      <boxGeometry args={size} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}
```
- Source: react-three-fiber docs, "Pitfalls" — https://r3f.docs.pmnd.rs/advanced/pitfalls ("share geometries and materials using useMemo"); DEV Community, "Why your React Three Fiber gallery drops to 5 FPS and how to fix it" — https://dev.to/alanwest/why-your-react-three-fiber-gallery-drops-to-5-fps-and-how-to-fix-it-4661; pmndrs/react-three-fiber discussion #533, "Replacing or removing geometry/material of a mesh" — https://github.com/pmndrs/react-three-fiber/discussions/533

**b) `dispose={null}` needed when JSX-owned resources are meant to be reused, but forgetting it elsewhere leaks**
- Symptom: revisiting a previously-unmounted part of the tree re-loads/
  re-creates GPU resources that should have persisted; or, the opposite —
  unmounting a mesh that shares a geometry/material with siblings destroys
  it out from under them.
- Root cause: r3f disposes any geometry/material it created via JSX on
  unmount by default; this is correct for owned, per-instance resources but
  wrong for a shared/cached resource passed down as a prop.
- Fix:
```jsx
// WRONG — shared material destroyed when any one consumer unmounts
<mesh geometry={sharedGeo} material={sharedMat} />

// FIXED — opt that mesh out of r3f's auto-dispose for resources it doesn't own
<mesh geometry={sharedGeo} material={sharedMat} dispose={null} />
```
- Source: pmndrs/react-three-fiber discussion #741, "Fallbacks cause buffered geometry dispose issue" — https://github.com/pmndrs/react-three-fiber/discussions/741

**c) Assets loaded outside Suspense/`useLoader`, causing loading waterfalls**
- Symptom: textures/models visibly pop in one after another instead of the
  whole scene appearing together; total load time is worse than expected.
- Root cause: ad-hoc `new THREE.TextureLoader().load(...)` calls inside
  `useEffect` fire sequentially per component mount, each triggering its
  own re-render when it resolves, instead of using `useLoader`'s
  cache-and-suspend behavior which lets React/Suspense parallelize and
  batch the reveal.
- Fix:
```jsx
// WRONG — imperative load in an effect, waterfalls per component
useEffect(() => { new THREE.TextureLoader().load(url, setTex); }, [url]);

// FIXED — useLoader + Suspense boundary
const texture = useLoader(THREE.TextureLoader, url);
// wrap the consuming tree: <Suspense fallback={null}><Scene /></Suspense>
```
- Source: react-three-fiber docs / community — `useLoader` caching behavior, pmndrs/react-three-fiber discussion #1397, "How to prevent TextureLoader from using memory of 2 textures when loading one texture" — https://github.com/pmndrs/react-three-fiber/discussions/1397

**d) `<Environment>`/HDRI reloading on every remount**
- Symptom: switching view modes or toggling a sibling component causes a
  visible flash/re-fetch of the environment map.
- Root cause: `<Environment>` mounted inside a conditionally-rendered
  subtree (e.g. gated by a mode switch) unmounts and remounts, re-triggering
  its texture load instead of staying resident.
- Fix: hoist `<Environment>` to a stable, always-mounted point in the tree
  (sibling of, not child of, the conditionally-rendered mode-specific
  content) so it isn't torn down by unrelated UI-state changes.
- Source: drei docs, `Environment` — https://drei.docs.pmnd.rs/staging/environment (component lifecycle/props); react-three-fiber docs, "Pitfalls" — https://r3f.docs.pmnd.rs/advanced/pitfalls ("avoid runtime mounting because buffers and materials get re-initialized/compiled, which can be expensive" — control visibility instead of mount/unmount)

**e) `setState` inside `useFrame` (or in fast pointer events) forcing a React re-render every frame**
- Symptom: a smooth-looking animation/camera move (or drag interaction)
  causes visible jank, or the whole component subtree re-renders 60
  times/second in the profiler despite nothing visually needing a React
  commit that often.
- Root cause: r3f's own docs are explicit that fast-changing values must be
  "carried out in `useFrame` by mutation," not via `useState`/store
  `set()` calls; calling a state setter inside `useFrame`, inside a
  `setInterval` in `useEffect`, or inside `onPointerMove` re-renders the
  React tree on every tick instead of just mutating the underlying
  Object3D/camera directly.
- Fix — and this repo already has the *correct* pattern to protect, not
  just a mistake to fix: `CameraRig` in
  `/home/vdloc/Projects/courtier-console-v2/src/diagram/DiagramScene.tsx`
  (`useFrame` block, ~line 149) reads the animation state from a plain
  `useRef` (`anim.current`) and mutates `camera.position`/`controls.target`
  directly every frame, calling `controls.update()` — it never calls a
  Zustand `set()` or React `setState` inside that loop. Any future
  `useFrame` addition (e.g. an idle-rotate or auto-tour camera path) must
  follow this same shape, not introduce per-frame store writes.
```jsx
// WRONG — would tank this exact component if written this way
useFrame(() => {
  setCameraPosition(camera.position); // triggers a store update + re-render every frame
});

// FIXED — the pattern DiagramScene.tsx's CameraRig already uses
useFrame(() => {
  const a = anim.current;
  if (!a) return;
  camera.position.copy(/* ...computed... */);
  controls.update(); // direct mutation, no React/store write in the hot path
});
```
- Source: react-three-fiber docs, "Pitfalls" — https://r3f.docs.pmnd.rs/advanced/pitfalls ("Fast updates are carried out in useFrame by mutation"; setState-in-useFrame/interval/pointermove named as the three antipatterns)

### 11.9 Rare / subtle pitfalls

**a) glTF importer Y-up vs. Z-up / unit mismatches**
- Symptom: an imported model is rotated 90° from expected, or is either
  huge or tiny relative to hand-authored geometry in the same scene.
- Root cause: glTF's spec mandates +Y-up, meters; assets authored/exported
  from Z-up-native DCC tools (many CAD/BIM export paths) without a
  conversion step carry the wrong up-axis or a unit scale factor (mm vs. m)
  into the glTF.
- Fix: verify up-axis and scale at import (`gltf.scene.scale.setScalar(...)`
  as a stopgap; better, fix it at export) rather than eyeballing a rotation
  fudge factor per asset.
- Source: Khronos glTF specification convention (Y-up, meters) as referenced throughout the Khronos PBR/extensions docs already cited — https://www.khronos.org/gltf/pbr/

**b) `KHR_materials_emissive_strength` required for HDR emissive beyond glTF's clamped `emissiveFactor`**
- Symptom: an emissive material (e.g. a light fixture, an LED strip) that
  should bloom brightly stays capped/dim even with bloom enabled.
- Root cause: base glTF 2.0 `emissiveFactor` is clamped to `[0,1]` per
  channel — insufficient to exceed the bloom `luminanceThreshold` (§11.5a)
  set above `1.0`. `KHR_materials_emissive_strength` adds a scalar
  multiplier so emissive can exceed 1.0 and actually register as
  "overbright" for bloom/tone mapping.
- Fix: three.js's `GLTFLoader` supports this extension already (merged
  2022) — for hand-authored (non-glTF) materials, the equivalent is scaling
  `material.emissiveIntensity` past `1.0` directly.
- Source: three.js GitHub PR #23867, "GLTFLoader: add KHR_materials_emissive_strength" — https://github.com/mrdoob/three.js/pull/23867; Khronos, `KHR_materials_emissive_strength` README — https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_materials_emissive_strength/README.md

**c) Z-fighting / camera judder at large world coordinates**
- Symptom: coplanar-looking surfaces flicker between which one renders on
  top; camera movement looks jittery/shaky far from the origin.
- Root cause: the depth buffer's floating-point precision is densest near
  the camera/near-plane and sparse far away; large absolute world
  coordinates (e.g. real-world geo coordinates used directly as scene
  units) push meaningful geometry into the sparse-precision region, and
  32-bit float `Object3D` transforms lose precision far from the origin
  regardless of the depth buffer.
- Fix: keep the camera and active geometry near the origin (a "floating
  origin" — translate the world/re-center periodically instead of moving
  the camera arbitrarily far away), tighten `camera.near`/`camera.far`
  rather than leaving huge defaults, and only reach for
  `renderer.logarithmicDepthBuffer = true` as a targeted fix (it carries a
  real performance cost, especially on mobile) once re-centering alone
  isn't enough.
- Source: three.js forum, "Large coordinates" — https://discourse.threejs.org/t/large-coordinates/50621; three.js forum, "Camera and floating point origin" — https://discourse.threejs.org/t/camera-and-floating-point-origin/51486

**d) WebGPURenderer / WebGL2 feature-parity gaps**
- Symptom: a TSL/node-material effect that works under `WebGPURenderer`
  looks different or fails silently when the automatic WebGL2 fallback
  kicks in (older Safari/Firefox, or WebGPU disabled).
- Root cause: `WebGPURenderer`'s WebGL2 fallback path re-implements node
  materials via a WGSL→GLSL-equivalent code path that does not yet have
  100% feature parity with native WebGPU compute/node features as of the
  three.js r169 era covered by this research.
- Fix: if adopting TSL/WebGPURenderer (see §10), explicitly test the WebGL2
  fallback path, not just a WebGPU-capable browser, before shipping —
  don't assume "works in Chrome" implies "works everywhere this renderer
  claims to support."
- Source: three.js forum, "WebGPURenderer & compressed-texture (.ktx2/basis)" — https://discourse.threejs.org/t/webgpurenderer-compressed-texture-ktx2-basis/69362 (fallback/compat friction reported); Codrops, "Three.js: BatchedMesh and Post processing with WebGPURenderer" — https://tympanus.net/codrops/2024/10/30/interactive-3d-with-three-js-batchedmesh-and-webgpurenderer/

**e) 8-bit render-target color banding in smooth gradients**
- Symptom: visible stepped bands in soft gradients — sky, smooth-lit curved
  surfaces, bloom falloff — especially in dark regions.
- Root cause: an 8-bit-per-channel (`UnsignedByteType`) render target only
  has 256 steps per channel; smooth low-contrast gradients (exactly what
  correct lighting + tone mapping produce) can fall below the
  perceptible-step threshold, most noticeably after post-processing
  (bloom) compounds the quantization.
- Fix: prefer a half-float render target when the pipeline allows it
  (`HalfFloatType`, matches HDR + tone-mapping needs anyway), and/or enable
  per-material dithering where a half-float target isn't affordable:
```js
// FIXED — half-float composer target, or per-material dithering as a fallback
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType }));
material.dithering = true; // adds a small amount of noise from three.js's built-in dithering support
```
- Source: three.js GitHub PR #11076, "Add parameter to Material to remove banding with dithering" — https://github.com/mrdoob/three.js/pull/11076; three.js docs, `Material.dithering` — https://threejs.org/docs/#api/en/materials/Material.dithering; three.js forum, "Subtle colour banding issue... using Bloom with Effect Composer" — https://discourse.threejs.org/t/subtle-colour-banding-issue-looks-like-256-colours-when-using-bloom-with-effect-composer/31174

---

## 12. This repo's current state, for reference (grounds the skill's audit)

Read directly from source at the time of this research
(`/home/vdloc/Projects/courtier-console-v2/src/diagram/DiagramScene.tsx`,
`/home/vdloc/Projects/courtier-console-v2/src/app/Viewport.tsx`):

- Every part renders `<meshBasicMaterial>` (`DiagramScene.tsx` `Member()`)
  — an **unlit** material with no roughness/metalness/normal response.
  None of §3–§10 above can take effect until this changes.
- No `<Environment>`, no lights of any kind, no `scene.environment`. §4/§2
  don't apply yet.
- `<Canvas dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true }}>`
  — DPR is already correctly clamped (§11.6b handled), MSAA is on but with
  no post-processing pipeline present yet, so §11.6a's MSAA-vs-composer
  conflict doesn't apply yet either.
- No `renderer.outputColorSpace`/`toneMapping` set explicitly anywhere —
  three.js's own r152+ defaults apply, but nothing has been *decided* here.
- `role === 'translucent'` parts render `transparent: true, opacity: 0.3`
  with no `renderOrder` — §11.3e's sorting-artifact risk is live today for
  any interpenetrating translucent geometry.
- No `postprocessing`/`@react-three/postprocessing` package installed
  (`package.json` dependencies checked directly).
- This is very likely a **deliberate** choice, not an oversight — the app's
  own design intent (see `docs/FEATURES.md`, `docs/CHECKLIST.md`) is a
  diagrammatic/engineering-drawing convention, and `ViewControls.tsx`'s
  "Realistic" display mode ("Full materials, shadows, depth of field") is
  currently unimplemented — see `docs/FEATURES.md` BUG-4. The realism audit
  skill should treat this file's findings as *options for the "Realistic"
  mode specifically*, not a mandate to reskin the whole app.

---

## Summary table — technique → API → impact

| Technique | API (this stack) | Impact if currently absent |
|---|---|---|
| Correct color space | `renderer.outputColorSpace`, `texture.colorSpace` | washed-out or over-contrasty base image; everything downstream is wrong |
| Filmic/AgX tone mapping + exposure | `renderer.toneMapping`, `.toneMappingExposure` | blown highlights, flat HDR response |
| PBR material (metalness/roughness) | `MeshStandardMaterial` / `MeshPhysicalMaterial` | no physical light response at all if stuck on `MeshBasicMaterial` |
| IBL / HDRI | drei `<Environment>` | metals/glass have nothing correct to reflect |
| Soft grounded shadows | drei `<ContactShadows>` / `<AccumulativeShadows>` | hard single-sample shadows or none |
| SSAO | `postprocessing` `SSAOEffect` / `<SSAO>` | ungrounded, "pasted-together" contact geometry |
| Bloom + grading | `postprocessing` `BloomEffect` etc. | no camera-like response to bright sources |
| AA / DPR | `Canvas` `gl.antialias`, `dpr` | jagged edges, shader aliasing |
| Instancing / LOD | drei `<Instances>` / `<Detailed>` | draw-call ceiling blocks affording any of the above at scale |
| Normal maps | `material.normalMap` | flat-looking surfaces despite correct macro shading |
