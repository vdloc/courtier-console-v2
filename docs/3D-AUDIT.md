# 3D Realism Audit — Realistic mode (master @ 4a3ed1a)

Read-only audit in a frozen, detached worktree (`.claude/worktrees/3d-audit`), never touching
`courtier-console-v2` proper or `.claude/worktrees/3d-realism`. Browser: global Playwright
1.62.0, Chromium, `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`
(software rasterizer — any timing numbers below are swiftshader-relative only, not
production-GPU numbers). App served via `npx vite --port 5220 --strictPort` inside the frozen
worktree, `npm ci` fresh.

**Evidence discipline used**: camera judged by pose (`window.__gl.camera.position` /
`.quaternion`, the app's own DEV-only audit handle from `DiagramScene.tsx:472-474`), not
pixels alone; every screenshot preceded by 8 consecutive identical camera-pose samples 200 ms
apart; screenshots taken via `canvas.toDataURL()` (the canvas already has
`preserveDrawingBuffer: true`) since Playwright's own `page.screenshot()` hung indefinitely on
this canvas under swiftshader; one no-input control diff confirmed **0% pixel difference**
(byte-identical PNGs, sampled every 4px) validating the settle methodology itself.

Scripts and raw JSON live in this session's scratchpad, not committed; screenshots are in
`docs/3d-audit/` inside this scratch worktree, left uncommitted per instructions.

---

## Findings

### P1 — Structure has no visible ground contact at any quality tier
**Measured**: `docs/3d-audit/01-realistic-balanced-default.png` (quality=`balanced`, the
confirmed store default, `src/store/viewSlice.ts:64`) and
`docs/3d-audit/02-realistic-high-quality.png` (quality=`high`) — same settled camera pose in
both. The building's footings appear to float over the HDRI's lower hemisphere; there is no
ground-plane mesh anywhere in `RealisticScene.tsx`, only `<Environment background>`. A
pixel-region diff under one footing between the two shots (the only difference being that
`high` mounts `<ContactShadows>`, gated at `RealisticScene.tsx:119-130`) showed a max
per-pixel delta of 34/765 — not a visually meaningful darkening signal in this view.

**Why**: cheatsheet rule "crevices glow → ambient without occlusion"; more directly, there is
no ground surface at all for a contact shadow to read against, so even a working
`ContactShadows` pass has nothing to visually anchor.

**Fix**: add an actual ground-plane mesh (simple large disc/plane at `GROUND_Y = -0.8`,
`rig.ts:24`) so footings have something physical to sit on and cast/receive against, not just
implicit HDRI background. Consider promoting `<ContactShadows>` out of the `quality==='high'`
gate (`RealisticScene.tsx:119`) since it's comparatively cheap and the default tier is the one
most viewers see first.

### P2 — Full scene is submitted twice per frame (beauty + shadow), doubling the small-batch problem
**Measured** (per-pass draw-call decomposition, patched `gl.info.reset` to accumulate across
every internal `renderer.render()` call the `postprocessing` composer makes per frame — see
Methodology note below for why raw `gl.info` is misleading here):
- Balanced quality, default view: **two** full-scene passes of **938 calls / 135,760
  triangles** each, plus 9 trivial 1-triangle composer fullscreen-quad passes (tone map, SMAA
  stages). Total **1885 calls/frame**, matching the initial unattributed reading exactly
  (938+938+9).
- High quality, same view: two passes of **1236 calls / 146,202 triangles** each (LOD_SCALE
  `high: 1.6` in `rig.ts:53` widens the cull radius vs `balanced: 1.0`, so more meshes are in
  frustum), plus 21 trivial composer passes (N8AO adds more, still cheap fullscreen quads —
  confirmed AO does **not** add a second geometry pass, only post-process ones).

**Batch math** (RTR3 §15.4.2, this skill's ref-08): 135,760 tris / 938 calls ≈ **145 tris per
draw call** — inside RTR3's 130–200 tri/batch small-batch breakpoint even before accounting
for WebGL's higher per-call overhead vs 2008-era native D3D. The shadow pass doubles this cost
structurally: it's not incidental, `StructureGlb.tsx:147-148` sets `castShadow = receiveShadow
= true` on every mesh unconditionally, so every visible mesh is submitted a second time through
the shadow depth material.

**Not claimed**: I attempted a DPR-1-vs-0.5 / shadow-on-vs-off frame-time bottleneck test
(RTR3 §15.2) and got a near-zero delta in both arms (~880–900ms/frame throughout, swiftshader).
I'm **not** reporting that as confirmation of CPU-bound — `gl.setPixelRatio()` resized the
renderer's own backing store correctly (verified: 980×674 → 490×337 canvas pixels), but I did
not verify the `postprocessing` `EffectComposer`'s own internal half-float render targets
resized with it, and `gl.shadowMap.autoUpdate = false` at rest (`RealisticScene.tsx:55`) means
the shadow-off arm may have removed a pass that wasn't running anyway. The call-count
decomposition above is the trustworthy, hardware-independent finding; the timing test is
listed as **inconclusive**, not evidence.

**Fix**: merge the 7 materials' worth of static structure into ~7 batched meshes (keep
per-member identity via a vertex-attribute ID, as RTR3 suggests, since selection/explode/LOD
need it — `glbMembers.ts` already tracks per-mesh records) or adopt `BatchedMesh`. Separately,
give the shadow pass a simplified/merged caster proxy distinct from the full-detail beauty
mesh — RTR3's standard shadow-proxy technique — since it doesn't need per-part clipping-plane
or selection-highlight fidelity.

---

## Verified clean (checked, no defect)

- **Fog math** (`rig.ts:26`, comment "exp(-(d·ρ)²): 0.7% at 30 m, 48% at 300 m"): hand-verified
  against three.js's actual `FogExp2` formula `f = exp(-(density·d)²)` with `FOG_DENSITY =
  0.0028`. At 30 m: 99.30% transmittance (0.70% fog, matches). At 300 m: 49.4% transmittance
  (50.6% fog vs the comment's stated 48% — immaterial gap). Squared-exponential is correctly
  understood and calibrated by whoever wrote this constant; not a defect.
- **Single tone-map site, encode-last**: `DiagramScene.tsx:462` sets `flat` (no renderer-level
  tone mapping) with a comment explicitly citing that AgX lives in the composer instead
  (`Effects.tsx:40`). One encode site, applied after AO, before SMAA — correct order per
  ref-01/ref-06.
- **AO as post-multiply**: `N8AO` runs as a full-screen post-process on the composited beauty
  buffer (`Effects.tsx:26-39`), so it darkens ambient/IBL/directional contributions alike
  rather than only the indirect term — a defensible simplification of RTR3 eq. 9.16 for
  screen-space AO, not a bug.

## Not assessed after pass 1 (see Second pass below for what pass 2 closed)

- Engineering mode: out of scope per instructions (in-flight GLB migration on
  `worktree-3d-realism`).

## Screenshots (pass 1)
- `docs/3d-audit/01-realistic-balanced-default.png` — quality=balanced (store default), settled.
- `docs/3d-audit/02-realistic-high-quality.png` — quality=high, same camera pose, settled.

---

# Second pass

Same frozen worktree (`4a3ed1a`, still detached, still unmodified), same vite on 5220, same
settle discipline (8 consecutive identical `window.__gl.camera` pose samples, 200ms apart)
and canvas-`toDataURL()` capture. Covers, in the requested order: the 3 remaining named
camera shots, the ambient+IBL double-count lead, and material/texture plausibility. Shadow
contact close-up (item 4, lowest priority) was not reached this pass either — see gaps below.

## 1. The other three named shots, at High quality

`docs/3d-audit/03-realistic-front-high.png`, `04-realistic-side-high.png`,
`05-realistic-joint-high.png`. All 3 settled with **0% pixel diff** against a no-input control
(byte-identical PNGs).

- **Front and side confirm P1 more starkly than the default view did**: from directly ahead
  or abeam, the building visibly hangs in mid-air over the HDRI's lower hemisphere — there is
  no ambiguity here the way there might be from an angled iso view. This raises P1's severity
  in my own assessment; still reporting it as P1 since no product decision is being made yet
  per your note.
- **Joint (interior close-up) shows real content**: a blue/maroon pipe pair with visible
  vertical strap hangers, running under a floor slab — plausible as `VF_Pipe_CHW` next to
  `VF_Pipe_LTHW` (rig.ts's two pipe materials) routed together, which is a normal industrial
  arrangement (chilled water + low-temp hot water runs). Railings, floor edges and column
  faces read as reasonably crisp; no obvious jagged/aliased structural edges at this zoom.
- **New observation, not a confirmed finding**: several sky-facing openings in the joint shot
  show vertical scan-line noise/streaking instead of clean sky gradient. I can't attribute
  this to the app vs. the swiftshader software rasterizer without a real-GPU comparison, so
  I'm listing it as **observed, unattributed** rather than a finding.
- **New observation, not a confirmed finding**: no obvious AO darkening is visible in the
  beam-to-column crevices in the joint shot despite N8AO being active at High quality
  (`Effects.tsx:27-36`). Could be correct (crevices here are large-radius, `AO_RADIUS = 0.6m`
  might be too small to reach across them) or could be N8AO under-contributing. Not measured
  quantitatively — flagging as a lead for a future pass, not asserting a defect.

## 2. Ambient + IBL double-count (P-B.12/13) — attempted, inconclusive

Built raycast-based pixel sampling per your requirement (real R3F pointer-event picking via
`page.mouse.click()`, confirmed by reading back the emissive-tint highlight clone
`StructureGlb.tsx:333-349` creates on selection — genuine triangle-accurate picking, never
bounding-box projection).

Three iterations:
1. Guessed screen coordinates from the screenshot: 5/6 missed the geometry entirely (open
   frame structure, thin members — most guessed points landed in gaps).
2. Switched to picking real mesh world-space centers and projecting them through the camera's
   actual matrices (`camera.matrixWorldInverse` / `camera.projectionMatrix`, computed by hand
   in-page) to get exact target pixels. Found one confirmed pair — but the "lit" pick (a roof
   end-plate) and "shadow" pick (a ground-level base plate) differed in surface orientation as
   well as illumination, and the base plate's near-horizontal, ground-level, grazing-angle
   geometry is exactly where Fresnel reflectance of the bright sky would show up regardless of
   real shadow state (ref-02: "reflectance rising to 1 at grazing angles"). The base plate
   read *brighter* than the roof plate, which is far more likely a Fresnel artifact than
   evidence of anything.
3. Added a face-normal filter (up-facing, `|worldNy| > 0.7`) so both picks would share the
   same diffuse geometry term, and excluded true ground-level plates to avoid the grazing-angle
   confound. Found and confirmed one clean "lit" sample (`Plate_EndPlate_RF_C4-C5_C5`, roof
   level, up-facing). Could not find a **camera-visible** shadowed counterpart with a similar
   orientation from this iso framing after 20 tries — the dense, self-occluding frame means a
   member shadowed from the key light also tends to be hidden from the camera at this angle,
   not just dark.

**Conclusion**: did not force a verdict from a confounded or incomplete comparison. This lead
is still open. Recommended next step: repeat the same projection-and-click technique from the
`joint` or `side` camera framing, where interior shadowed members are actually visible to the
camera (see `05-realistic-joint-high.png` — the underside of the upper floor, in shadow from
the slab above, is plainly in view there).

## 3. Material / texture plausibility

**Metalness class assignment — verified correct.** Read materials directly off the live scene
graph (ground truth, not rendering-dependent): `VF_Steel_Bolt` and `VF_Weld_Bead` read
`metalness: 1`; `VF_Steel_Painted`, `VF_Rail_Safety`, `VF_Pipe_CHW`, `VF_Pipe_LTHW` read
`metalness: 0`; `VF_Concrete_Industrial` (not in the `METALNESS` override table,
`rig.ts:57-64`) also reads `0`. Matches the override table exactly — the paint-vs-bare-steel
classification RTR3's cheatsheet cares about ("metal → metalness 1, F0≥0.5 colored" /
"non-metal → metalness 0, F0≈0.04-0.05") is being applied correctly.

**Metalness map confirms the code comment.** Sampled the packed ORM texture (three.js/glTF
convention: one texture feeds `roughnessMap` and `metalnessMap` both, G=roughness, B=metalness
— confirmed here since both properties read from the identical average per material) at 64×64
downscale: metalness channel averages 0.94–0.997 across all 7 materials. Matches `rig.ts:56`'s
comment "the export's metal maps are ~1 everywhere, so the factor decides" exactly.

**Roughness values are plausible.** Roughness channel averages: rail 0.705, painted steel
0.705, bolts 0.74, weld beads 0.894 (roughest, sensible — weld beads are irregular), concrete
0.696, pipes 0.649. All in a matte-to-semi-matte industrial range, no implausible mirror-shiny
or paper-flat values.

**Base color (albedo) — one flag, not confirmed.** Decoded the sRGB base-color texture to
linear and averaged (64×64 downscale) per material:

| Material | linear RGB avg | approx luminance | Note |
|---|---|---|---|
| VF_Rail_Safety | (0.241, 0.089, 0.002) | ~0.115 | plausible safety-orange paint |
| VF_Concrete_Industrial | (0.067, 0.066, 0.054) | ~0.065 | low but inside RTR3's "concrete/soil 0.15–0.4" only if the low end is stretched; worth a look but not alarming |
| VF_Pipe_LTHW | (0.041, 0.005, 0.005) | ~0.012 | dark red/maroon lagging, plausible |
| VF_Pipe_CHW | (0.006, 0.012, 0.042) | ~0.013 | dark blue lagging, plausible |
| VF_Weld_Bead | (0.057, 0.033, 0.020) | ~0.037 | metal — this is F0, not albedo; low but weld discoloration is often dark |
| **VF_Steel_Bolt** | **(0.016, 0.013, 0.012)** | **~0.014** | **metal — this is F0. RTR3's cheatsheet: metal F0 ≥ 0.5, usually colored. 0.014 is an order of magnitude below any real metal's F0 — would render as an almost non-reflective black, defeating `metalness: 1`.** |
| **VF_Steel_Painted** | **(0.005, 0.005, 0.007)** | **~0.005** | **non-metal albedo this close to 0 is implausible for any painted finish — real "black" paints (RAL 9005 etc.) still sit around 0.03–0.05, an order of magnitude higher.** |

**Caveat, stated plainly**: this average is over the *entire* base-color texture image at
64×64, not restricted to each mesh's actual UV footprint. If these textures are packed atlases
with unused/padding regions set to black, that alone would produce exactly this pattern (two
unrelated materials both reading ~10× darker than any real-world material) without any real
paint or F0 problem. I did not correct for UV coverage — flagging this as a **lead**, not a
confirmed defect. Recommended check: either sample only within each material's actual UV
island, or simply open the two texture images directly and look at them.

## Screenshots (pass 2)
- `docs/3d-audit/03-realistic-front-high.png` / `04-realistic-side-high.png` /
  `05-realistic-joint-high.png` — the 3 remaining named shots, High quality, settled.
- `docs/3d-audit/06-raycast-sample-points.png` — iso view, High quality, used for the
  raycast pixel-sampling attempt (item 2).

## Not assessed after pass 2

- Ambient + IBL double-count (P-B.12/13): still open, needs the `joint`/`side`-framing retry
  described above.
- Base-color texture UV-footprint contamination check for `VF_Steel_Painted` /
  `VF_Steel_Bolt`: needs either UV-restricted sampling or a direct look at the source images.
- Shadow contact quality close-up (acne, Peter-Panning) — your item 4, lowest priority,
  not reached this pass.
- AO reach in tight crevices (the joint-shot observation above) — not quantitatively measured.
- The sky-noise artifact in the joint shot — not attributed to app vs. swiftshader.
