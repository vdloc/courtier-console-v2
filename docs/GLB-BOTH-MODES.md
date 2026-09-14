# Design: GLB drives both modes

Design only — no product code in this doc's commit. Read alongside
`docs/CHECKLIST.md` §1 (the invariant this reverses) and `docs/FEATURES.md`.

**Decision under design:** Engineering mode stops drawing `diagram/model.ts`'s
procedural building and instead draws the same GLB `RealisticScene`/
`StructureGlb` loads, styled in the diagram convention (translucent faces,
edges, orange accents, dimensions, per `palette.ts`'s tokens). One building,
one explorer tree, one id set, in both modes.

---

## a) Rendering: Engineering materials onto the GLB, and the edges cost

### The material swap

`StructureGlb.tsx:172-190` already overrides `metalness` per named material
(`METALNESS` in `rig.ts`) idempotently on the shared, cached materials from
`useGLTF`'s cache — the exact pattern the mode swap needs. Engineering mode
needs a second override pass, applied and reverted on mode change:

- **Per-element colour** by `element_type`, mapped through `ROLE_BY_KIND`
  (`palette.ts:62-68`) exactly as `Member` does today for procedural parts:
  `translucent` → `PALETTE.face` at 0.3 opacity, `depthWrite: false`;
  `service` (pipes) → `PALETTE.rebar`, opaque. Every other GLB type (bolt,
  weld, stiffener, plates, rails, hangers, insulation) needs a role
  assignment that doesn't exist yet — see the LOD_DISTANCE keys in `rig.ts`
  for the full type list this has to cover. Proposed default: `solid`
  (`PALETTE.solid`, opaque) for anything not already in `ROLE_BY_KIND`,
  so nothing silently disappears if a new export type shows up.
- **Selection highlight** stays as-is: `StructureGlb.tsx:333-349` already
  clones the selected mesh's material and tints it with `PALETTE.select`,
  independent of the base material — this works unchanged under an
  Engineering-styled base material.
- **Mechanism**: swap `MeshStandardMaterial` (real one, used by Realistic)
  for `MeshBasicMaterial` (flat, used by Engineering's `Member`) per mesh
  when mode is `engineering` — not a property override on the existing
  material, a material *replacement*, since `MeshBasicMaterial` and
  `MeshStandardMaterial` aren't the same class and don't share PBR
  properties. Cache both materials per mesh (keyed by `mesh.uuid`) so
  switching modes back and forth doesn't rebuild `MeshBasicMaterial`
  instances every time — same idempotency discipline as the existing
  `METALNESS` pass.
- **Lighting**: Engineering mode has no lights and no HDRI today
  (`DiagramScene.tsx` renders flat, tone-mapping off; `flat` prop on
  `Canvas`). `MeshBasicMaterial` ignores lights, so this is moot once the
  material is swapped — the GLB will render exactly as flat as the
  procedural boxes do now, regardless of whether `RealisticScene`'s
  lights/`Environment` stay mounted (they must NOT stay mounted in
  Engineering — see the `RealisticScene` split in (e)).

### Edges cost — spike results

Spike script (uncommitted, ran via a throwaway `page.evaluate` injecting
real `THREE.EdgesGeometry` + `LineSegments` onto the live GLB scene, no
source file touched): dev server, Realistic mode, ISO shot, Balanced
quality, 90-frame sample after 10 warm-up frames, `renderer.info` for draw
calls/triangles.

| Scenario | avg frame (ms) | p95 frame (ms) | draw calls | Δ draw calls |
|---|---|---|---|---|
| Baseline, no edges | 2.016 | 3.5 | 938 | — |
| Edges on **all 3362 members** | 6.263 | 6.8 | 1875 | +937 (+~100%) |
| Edges on **structural only** (228 members: column/beam_x/beam_y/brace/foundation) | 2.890 | 3.5 | 1166 | +228 (+24%) |

**Reading**: edging every member triples frame time (2.0ms → 6.3ms) and
doubles draw calls — one extra `LineSegments` draw call per mesh, no
batching, exactly the cost the brief warned about. Edging only the primary
structural types (228 of 3362 members, ~7%) costs +24% draw calls and is
within noise on frame time at this sample size (2.02ms → 2.89ms, both far
under a 16.6ms/frame budget at 60fps).

**Recommendation**: Engineering mode edges the same primary-steel types
Engineering already models today (`column`, `beam_x`, `beam_y`, `brace`,
`foundation` — mirroring `model.ts`'s `Part['kind']` union) and skips edges
entirely on fasteners/plates/rails/insulation/bolts/welds
(`bolt`, `weld`, `stiffener`, `end_plate`, `splice_plate`, `base_plate`,
`guard_rail`, `guard_post`, `toe_board`, `hanger`, `insulation`, `pipe`) —
this is the "FASTENERS exclusion" the old project used, and the numbers
justify it directly rather than by analogy. Small parts also get a coarser
`EdgesGeometry` threshold angle or none at all if a follow-up spike shows
that matters at scale (not measured here — the 228-member number already
excludes them).

**Not measured, flagged as a gap**: shadow-map cost, `ContactShadows`
interaction, and Draco-decode-then-edge timing on first mode switch (edges
must be computed once per mesh and cached, not recomputed every render —
`useMemo`/ref-cached per mesh, built once in the same `useEffect` that
already walks `scene.traverse` in `StructureGlb.tsx:145-167`).

---

## b) What dies, what merges

| Today | After |
|---|---|
| `diagram/model.ts`: `buildParts`, `PARTS`, `PARTS_BY_ID`, `BUILD_ORDER`, `isPartVisible`, `computeBounds`, `BOUNDS`, `CENTRE`, `explodedPosition`, `componentOf`, `COMPONENTS`, `ANCESTORS`, `buildTree` | **Dies.** The GLB is the only generator. `glbTree.ts`'s `buildGlbTree` becomes the one tree builder for both modes (it already handles this shape — see `modelSlice.ts:33` `activeTree`, which collapses to always returning `s.glb.tree`). |
| `lib/mockData.ts`: `MOCK_TREE = buildTree(...)`, `MOCK_COMPONENTS = COMPONENTS` | **Dies** (the two lines that call into `model.ts`). `PROJECT_NAME`/`PROJECT_META`/`REVISION`/`PHASES`/`DURATION`/`MOCK_VIEWPOINTS`/`ELEMENT_LABELS`/`INITIAL_LAYERS` stay — none of those come from `model.ts`. |
| `diagram/snapping.ts`'s `memberByName` dual lookup (`{model:'part'}` vs `{model:'glb'}`) | **Merges to one branch.** Only the GLB branch (`glbMember(name)`) survives; the `PARTS_BY_ID` branch is deleted along with `model.ts`. |
| `measurement.ts`'s `resolveMeasurePoint` mode-branch (`ref.model === 'glb'` vs part-based `explodedPosition`) | **Merges to one path** — always `glbLocalToWorld`. `model.ts`'s own `explodedPosition` (different signature, part-based) dies with it; `glbMembers.ts`'s `explodedPosition` (already the one Realistic uses) becomes the only one. |
| `Viewport.tsx`'s Statistics branch (`PARTS.filter(isPartVisible)` vs GLB member count — this was UX-02, already fixed on master per `9d41a1a`) | **Collapses to one branch** — always the GLB member count, since there's only one model now. Simplifies a fix that was just landed. |
| `Layers.tsx`'s engineering filter (UX-07's fix, `9d41a1a`, greys out layers no part uses) | **Question, not resolved here**: do "layers" still mean the same thing once every GLB type is on screen? The GLB's real categories (17 `element_type` values) don't map 1:1 onto the 6 `LayerName`s (`Foundation`/`Columns`/`Beams`/`Pipes`/`Connections`/`Accessories`). Recommend: keep the 6-layer UI, but define the mapping explicitly per `element_type` (e.g. `bolt`/`weld`/`stiffener`/`end_plate`/`splice_plate` → `Connections`; `guard_rail`/`guard_post`/`toe_board`/`hanger`/`insulation` → `Accessories`) so UX-07's fix keeps meaning something instead of reverting to "control that does nothing" for the two categories that were empty before. |
| Per-mode `FRAMING` (`DiagramScene.tsx:54-68`, two `shots`/`centre`/`bounds` records) | **Merges to one.** Only `REALISTIC_SHOT_POSITION`/`SHADOW_CENTRE`/`MODEL_BOUNDS` survive; `SHOT_POSITION`/`CENTRE`/`BOUNDS` (procedural-model-scaled) die with `model.ts`. |
| The explorer tree switch (`activeTree` in `modelSlice.ts:33-35`) | **Simplifies to one branch** — always `s.glb.tree` once loaded; the `s.tree` (procedural) fallback dies. A loading state is needed for the brief instant before the GLB's `useEffect` registers components (today masked by mode defaulting to `engineering` with its always-ready procedural tree — after this change, Engineering's tree is equally async as Realistic's is today). |
| `clearMeasurement` on every mode switch (`RealisticScene.tsx:33-36`) | **Can survive a mode switch — yes.** Measure points are stored as `{partId, local}` and resolved via `memberByName`/`glbLocalToWorld` (`measurement.ts:31-48`); once both modes read the *same* GLB member by the *same* id, a point placed in one mode resolves identically in the other. The `clearMeasurement` effect becomes unnecessary and should be deleted — keeping it would be an active regression once the two modes share one id space, discarding an engineer's work for no reason. (Today it exists specifically because the two modes have disjoint id spaces — item (b) removes that cause.) |
| Two explode functions (`model.ts`'s part-based one, `glbMembers.ts`'s home-based one) | **One survives** — `glbMembers.ts`'s, already used by `StructureGlb.tsx:228-234` and `measurement.ts:39`. |
| Name collisions | Procedural ids (`Steel_Beam_X_L01_B2`) and GLB ids (`Steel_Beam_Floor_Primary_L03_C1-C2`) never overlapped — moot once procedural ids no longer exist. `glbComponents`/`MOCK_COMPONENTS` split in `modelSlice.ts:17,54` collapses to one map. |

## c) Feature-by-feature: where the data comes from after

| Feature | Reads today | After — source, and gaps |
|---|---|---|
| **Dimension annotations** (`Annotations` in `DiagramScene.tsx:417-446`, four hardcoded `Dimension`s: two bay spans, one storey height, one pipe diameter) | `BAY_X`/`BAY_Y`/`STOREY` constants from `model.ts` | GLB extras carry `dimensions` as a bounding-box string (`"0.033 x 18.500 x 0.033"`, `StructureGlb.tsx:71-77`'s `longestDimension` already parses it) and `position` implicitly via the mesh transform. A bay span or storey height isn't a single member's dimension — it's a *derived* distance between two members' positions (e.g. two adjacent column centrelines). **Gap, explicit**: nothing in the GLB extras states "this is bay A-B" as a labelled span; the four annotations would need to be re-derived by picking two known members (by id or grid_ref) and computing `distance`, the same arithmetic `measurement.ts:evaluate('distance', ...)` already does — reusing that function is the natural move, but the *choice* of which two members define "the" bay span for the drawing is a modelling decision, not something extras hand you. Recommend keeping these four as-is, hardcoded to two known GLB member ids, clearly commented as derived-not-authoritative (matching the CHECKLIST's DERIVED/MEASURED distinction already used for colour tokens). |
| **PropertyPanel fields** (`PropertyPanel.tsx:64-103`) | `ComponentInfo` from either `COMPONENTS` (model.ts) or `componentFrom` (StructureGlb.tsx GLB extras) | Already unified in *shape* (`ComponentInfo`, `store/types.ts:42-52`) — only the *source* changes, to always be `componentFrom`. Per-field reality check: `section`, `material_spec`, `grid_ref`, `level`, `discipline`, `ifc_class`, `ifc_type`, `element_type`, `connected` (as `connected_objects`) all exist in GLB extras (`StructureGlb.tsx:40-52,79-102`) and are used today only for Realistic. **`mass` does not exist in the GLB** (`PropertyPanel.tsx:80-83` already renders `—` for it, correctly) — the procedural model's `mass` (`model.ts:237-256`, computed from a hollow-section volume estimate) was real derived data for a shape that no longer exists; nothing to port, no invention needed, the dash stays. `status` is hardcoded `'Installed'` for every GLB member (`StructureGlb.tsx:95`) — the procedural model's `statusFor()` (`model.ts:38-42`, level-based "Installed/In progress/Not started") reflected the timeline story; **gap**: if status should still vary in the merged model, it needs a real source (GLB extras don't carry it) or the status column becomes uniformly "Installed" and the timeline (see below) becomes the only place construction progress shows. |
| **Timeline phases vs the GLB animation clip** | `PHASES`/`DURATION` (`mockData.ts:23-30`, four named phases, 18s) drive `isPartVisible`'s `BUILD_ORDER` gate (`model.ts:152-176`) for the procedural model; the GLB's own animation clip (`StructureGlb.tsx:194-206,237-251`) is a single pose-at-end scrub, `progress` maps directly to `mixer.setTime` | These are two different mechanisms already, and only the GLB one survives (Realistic already ignores `PHASES` entirely for visibility — it only reads `progress` for the mixer). `PHASES` labels (Foundations/Columns/Beams/Services) become purely cosmetic timeline captions with no visibility effect unless the GLB clip is authored with matching named markers — **gap**: confirm whether the GLB clip has any embedded phase markers (unlikely, `duration` in `StructureGlb.tsx:135-138` is just `Math.max(...clip.durations)`, no marker API used) or whether `PHASES`' four labels are simply approximate captions over an unrelated 0-100% scrub. If the latter, that should be stated in the UI, not implied as "the actual build phase," to satisfy "do not invent engineering data." |
| **Section clipping** | `useSectionPlanes(bounds)` (`useSectionPlanes.ts`), called with `BOUNDS` (procedural) in `DiagramScene.tsx:395` for `Model`/`Member`, and with `MODEL_BOUNDS` in `StructureGlb.tsx:127` for the GLB | Collapses to one call site, always `MODEL_BOUNDS` — the function itself is already model-agnostic (`bounds` is a parameter). No feature loss; the procedural `Model`/`Member` component and its own `useSectionPlanes(BOUNDS)` call simply stop existing. |
| **Selection highlight** | Two mechanisms: `Member`'s `colour = isSelected ? PALETTE.select : ...` (a full material colour swap, `DiagramScene.tsx:333-339`) vs `StructureGlb`'s emissive-tint material clone (`StructureGlb.tsx:333-349`) | The GLB mechanism survives unchanged (it already works under any base material, including the new `MeshBasicMaterial` Engineering swap in (a) — emissive is a no-op on `MeshBasicMaterial` though, since it has no `emissive` property; **gap**: Engineering's selection highlight under `MeshBasicMaterial` needs the *procedural* mechanism instead — swap `color` directly to `PALETTE.select` on the cloned material, same clone-and-revert lifecycle already in place). |
| **The Layers list** | See (b) — same gap, needs an explicit `element_type → LayerName` mapping table. |
| **Isolate / hide** | `setHidden`/`isolateSelected` in `modelSlice.ts:88-104` already branches on `s.glbComponents[id]` vs the procedural tree; collapses to the GLB-only branch, no feature loss, code simplification only (the `allComponentIds(s.tree)` fallback in `isolateSelected` and the `[id]` fallback in `setHidden` die with `model.ts`). |

## d) Shared cached materials: idempotency

`useGLTF`'s cache (`StructureGlb.tsx:117`, `useGLTF.preload` at module scope,
`StructureGlb.tsx:37`) means the loaded `scene`/materials are **not** unique
per mount — the same objects are reused across mode round-trips and even
across component remounts within a session. The existing `METALNESS` pass
(`StructureGlb.tsx:172-190`) already handles this correctly: it checks
`override !== undefined` and only writes when the value would actually
differ, comment at `rig.ts:56` explains why. The mode-swap material
override must follow the same rule, but stronger, because it's a full
material *object* swap, not a property tweak:

- **Cache both variants per mesh**, built once, keyed by `mesh.uuid`
  (a `Map<string, {realistic: MeshStandardMaterial; engineering:
  MeshBasicMaterial}>` ref, populated in the same `scene.traverse` pass that
  already runs in `StructureGlb.tsx:145-167`) — never construct a new
  `MeshBasicMaterial` on every mode switch; that would leak GPU resources on
  every toggle (no `.dispose()` path today for a repeatedly-recreated
  material) and would defeat the whole point of the cache existing.
- **On mode change**, walk `recordsRef.current` (already the per-mesh list
  the `LOD`/visibility pass uses, `StructureGlb.tsx:130,152-156`) and assign
  `mesh.material = cache.get(mesh.uuid)[mode]` — a pointer swap, not a
  property write, so neither variant ever mutates the other.
  `needsUpdate`/`shadowMap.needsUpdate` follow the same pattern already used
  after every material-affecting change (`gl.shadowMap.needsUpdate = true`
  appears after every scene mutation in this file — the mode swap needs one
  too).
  - **Selected mesh** is a separate concern already: `highlightRef.current`
    (`StructureGlb.tsx:329-349`) clones *whichever* material is currently
    assigned and restores the *original* reference on cleanup — this
    composes correctly with a prior mode-swap pointer-write as long as the
    highlight effect re-runs (or is reordered to run after) the mode-swap
    effect on every mode change, so it clones the *new* mode's material, not
    a stale one. Effect ordering matters here; call this out explicitly in
    the implementation commit, don't leave it to hook-order luck.
- **Unmount** (`StructureGlb.tsx:210-224`) already restores position/
  visibility/clippingPlanes on the *shared* cached materials — add the
  mode-swap cache disposal here too (`.dispose()` both variants) since
  unlike `METALNESS`'s scalar override, a `MeshBasicMaterial` is a real GPU
  resource this component now owns the lifecycle of.

## e) Migration, in commits

The implementor currently has uncommitted keyboard-shortcut work touching
`App.tsx`, `MeasurePanel.tsx`, `Timeline.tsx`, `TopBar.tsx`,
`ViewControls.tsx`, `Modal.tsx`. Every commit below is scoped to avoid those
five files; where a step would naturally touch one (e.g. removing the
Display-mode section's "Engineering" description text in `ViewControls.tsx`
once "Engineering" stops meaning "flat colour by element type" and starts
meaning "the GLB, styled flat"), that specific hunk is deferred to a final,
separate, small commit called out below rather than bundled into the
functional changes.

1. **`diagram/realistic/glbMaterials.ts`** (new file): the per-mesh
   `MeshBasicMaterial`/`MeshStandardMaterial` cache-and-swap module from (d),
   unit-shaped but not yet wired to `mode` — built and gated behind a
   temporary `?engineeringGlb` query flag so it's independently testable
   (gates green) before `StructureGlb.tsx` depends on it. Touches: new file
   only.
2. **Wire the swap into `StructureGlb.tsx`**: mode-aware material
   assignment + the selection-highlight color-vs-emissive branch from (c).
   Touches: `StructureGlb.tsx` only. Gate: screenshot diff, Engineering-style
   GLB render side-by-side with the current procedural render, at the same
   shot — visually comparable silhouette proportions confirm the swap
   itself works before touching anything else.
3. **Edges**: add `EdgesGeometry`+`LineSegments` per structural-type mesh
   (the 5 types from (a)'s spike), cached alongside the material swap, mode
   gated (`visible` toggle, not add/remove, to avoid rebuild cost on every
   toggle). Touches: `StructureGlb.tsx`, `rig.ts` (a `STRUCTURAL_TYPES` set
   constant). Gate: repeat the draw-call/frame-time spike against the real
   (non-throwaway) code path, confirm it matches the spike's ~24% draw-call
   number within noise.
4. **`activeTree` collapse + `glbTree.ts` becomes the only tree builder**:
   `modelSlice.ts` loses the procedural branch; `ObjectTree.tsx` needs no
   change (it already calls `activeTree` and only cares about the returned
   `TreeNode`). Touches: `modelSlice.ts`. Gate: Engineering's Model Explorer
   shows the GLB's real hierarchy (Level → type → member) instead of the
   procedural one, row counts match Realistic's.
5. **`Layers` mapping table**: the explicit `element_type → LayerName` table
   from (b)/(c), consumed by `setHidden`'s member-expansion in
   `modelSlice.ts:88-96` (already GLB-aware via `s.glb?.members[id]`).
   Touches: `modelSlice.ts` or a new small `layerOf` extension in
   `StructureGlb.tsx` (reuse the existing `layerOf()` function,
   `StructureGlb.tsx:104-113`, which currently only recognizes the 6
   `LayerName`s as literal group-node names in the GLB's own hierarchy —
   check whether the GLB's Blender export actually groups nodes by these
   names already, which would mean this step is data-verification, not
   code). Gate: toggling each of the 6 layers now visibly hides/shows real
   members in both modes.
6. **Delete `diagram/model.ts` and its dependents**: `mockData.ts`'s
   `buildTree`/`COMPONENTS` imports, `snapping.ts`'s part-branch,
   `measurement.ts`'s part-branch, `DiagramScene.tsx`'s `Model`/`Member`/
   `Annotations`/procedural `FRAMING` entries, `Viewport.tsx`'s Statistics
   procedural branch (already simplified once by `9d41a1a` — this finishes
   it), `useSectionPlanes.ts`'s call-site duplication. The four `Dimension`
   annotations from (c) are re-pointed at two real GLB member ids in this
   commit (not deleted — re-sourced), with the DERIVED-style comment (c)
   recommends. Touches: `model.ts` (deleted), `mockData.ts`, `snapping.ts`,
   `measurement.ts`, `DiagramScene.tsx`, `Viewport.tsx`, `useSectionPlanes.ts`
   call sites. **Not** `ViewControls.tsx` (implementor's file) even though
   its "Flat colour by element type" hint text is now stale — flagged for a
   follow-up commit, not bundled here. Gate: full CHECKLIST §0 (typecheck,
   lint, hex grep, dev zero-console, preview zero-console) plus a full
   Engineering-mode walkthrough screenshot set replacing this session's
   `docs/ux-audit/*-engineering-*.png` baseline.
7. **Drop `clearMeasurement` on mode switch** (`RealisticScene.tsx:33-36`):
   once both modes share one id space (step 4+6 complete), a measurement
   surviving a mode switch is correct, not stale. Touches:
   `RealisticScene.tsx`. Gate: place a point in Realistic, switch to
   Engineering, confirm the point (and its readout) is unchanged.
8. **CHECKLIST.md update**: flip §1's last bullet from "model.ts is the one
   generator" to "the GLB is the one generator," in the same commit as step
   6 (the invariant and the code that makes it true land together, never
   separately).
9. **Follow-up, separate, after the implementor's keyboard-shortcut work
   lands**: the `ViewControls.tsx` "Display mode" copy fix flagged in step 6.

Each commit above is independently gate-green (CHECKLIST §0, all five) and
independently revertable — none depend on a later commit to compile or pass
lint, though 3-7 are only *meaningful* once 2 has landed.

---

## Open questions for go/no-go — ANSWERED, see Decisions below

1. Status: uniform "Installed" for every GLB member, or drop the status dot
   entirely in the merged model? (c)
2. Timeline phase labels: keep as approximate captions with a UI disclaimer,
   or drop the four named phases in favour of a plain 0-100% progress bar?
   (c)
3. Layers mapping: confirm the GLB's Blender export actually groups meshes
   under the 6 `LayerName` group nodes today (data check, not code) — if
   not, the mapping in (b)/(e step 5) needs a different data source
   (per-`element_type` lookup table instead of tree-position lookup).

---

## Decisions — GO received, verbatim from the coordinating session

Status: **approved to build.** This section is the full go-ahead, copied in
so a fresh session can pick up the implementation without needing this
session's chat history. Read it alongside the sections above, which it
answers and amends.

### Answers to the open questions

**Q3 — Layers.** Answered from the data (every one of the 3362
`element_type` nodes already sits under one of the 6 layer groups, zero
orphans):

- Foundation: `foundation` 20
- Columns: `column` 80
- Beams: `beam_x` 64, `beam_y` 60, `brace` 4
- Pipes: `pipe` 9, `insulation` 9, `hanger` 120
- Connections: `bolt` 1552, `weld` 576, `stiffener` 248, `end_plate` 248,
  `splice_plate` 120, `base_plate` 20
- Accessories: `guard_rail` 32, `guard_post` 184, `toe_board` 16

The existing `layerOf()` tree-position lookup is correct as-is. **Drop
migration step 5 — no mapping table needed.** Note the correction to this
doc's (b)/(c) tables: `pipe`/`insulation`/`hanger` are the **Pipes** layer,
not "Accessories" as guessed above.

**Q1 — Status.** The GLB carries no status field; hardcoding `'Installed'`
is inventing data. `componentFrom` must leave `status` **undefined**. The
tree's status dot and `PropertyPanel` show nothing / "—" where there is no
source. `PropertyPanel.tsx` and `ObjectTree.tsx` are shared files — touch
only the status-rendering branch, and only if it doesn't already handle
`undefined` correctly (check first, don't assume).

**Q2 — Timeline phases.** Derive them, don't caption them. The GLB has one
clip ("Scene", 6726 channels). Compute each layer's first/last keyframe
time from the clip's tracks, grouped by `layerOf()` of each track's target.
If the layers occupy distinct time ranges, the phase markers come from
those measured ranges (label = layer name, span = measured). If they don't
separate cleanly, drop the named phases in favour of a plain scrub — report
which case occurred, with the numbers. `PHASES` in `mockData.ts` dies
either way. **`Timeline.tsx` is the implementor's file right now — do this
derivation as the LAST commit in the series, after the implementor's
shortcut work has landed. Coordinate through the architect session before
touching it.**

### Conditions on the build

1. **Spike gap — closed, before commit 2.** The first spike (section a)
   only measured edges on Realistic's PBR materials, not Engineering's real
   material mix (translucent MeshBasicMaterial, opacity 0.3, depthWrite
   false, on the 228 structural meshes; opaque MeshBasicMaterial on
   everything else) with structural-only edges. Re-measured (same
   throwaway `page.evaluate` technique, nothing committed):

   | Scenario | avg frame (ms) | p95 (ms) | draw calls | triangles |
   |---|---|---|---|---|
   | Baseline (Realistic PBR, no edges) | 1.869 | 2.5 | 938 | 135760 |
   | Engineering materials + structural edges | 5.498 | 6.7 | 1394 | 208912 |

   +3.63ms/frame (~2.9x), +456 draw calls (+49%), still comfortably under
   the 16.6ms (60fps) budget. **Accepted — build as designed, no
   alternative needed.**

   The +54% triangle count with no geometry change is very likely real, not
   a counting artifact: in three r169, a material that is both
   `transparent: true` and `side: DoubleSide` draws in two passes (back
   faces, then front faces) unless `material.forceSinglePass` is true —
   doubling submitted triangles for the translucent structural set. That
   cost is already inside the 5.498ms figure above. **When building commit
   2**, confirm this by toggling `forceSinglePass` on one run and comparing
   `renderer.info.render.triangles` — but do not flip it to `true` by
   default without a screenshot comparison first, since single-pass changes
   how the far side of a translucent box sorts and may look wrong.

2. **Intermediate states.** Every commit message must state what
   Engineering mode shows to a user *at that commit*. In particular: from
   commit 2 onward, is the procedural `Model` still mounted? **The app must
   never render both buildings on top of each other at any commit.** If
   "each commit independently shippable" can't hold under that constraint,
   merge commits 2 and 6's scene-rendering part into one commit and say so
   explicitly in the commit message — don't silently violate the
   no-double-render rule to preserve the original commit count.

3. **Startup.** Mode defaults to `'engineering'`, so after this change first
   paint waits on the GLB fetch + Draco decode. Measure time-to-first-model
   on a cold load (dev **and** preview) before vs after this change. A
   visible loading state is required — an empty canvas with a blank tree is
   not acceptable per CHECKLIST §5 (empty states).

4. **Temporary flag.** The `?engineeringGlb` query flag introduced in
   commit 1 must be deleted by the end of the series. `grep` for it proves
   it's gone.

5. **One-model rule, `clearMeasurement`.** Deleting the
   clear-measurement-on-mode-switch effect (step 7) is **approved**.
   Acceptance: a point placed in Realistic reads the same xyz and value in
   Engineering, and survives a switch back.

6. **Selection highlight under `MeshBasicMaterial`.** The colour-swap branch
   from section (c) is **approved**. Acceptance: select in Engineering,
   switch to Realistic — the highlight moves to the Realistic material's
   emissive-tint mechanism (prove the effect ordering that makes this work,
   don't assume it), and back.

7. **CHECKLIST §1 flip** lands in the same commit as the `model.ts`
   deletion — fold the former step 8 into step 6, don't split them.

8. **UX-07 in `Layers.tsx`** (Engineering hides layers no procedural part
   used) becomes moot once all 6 layers are populated in both modes.
   Removing that filter is a `Layers.tsx` change. `Layers.tsx` is **not**
   in the implementor's current uncommitted set, so it's safe to include in
   commit 6.

9. **Do not touch** `App.tsx`, `MeasurePanel.tsx`, `Timeline.tsx`,
   `TopBar.tsx`, `ViewControls.tsx`, `Modal.tsx` until the architect session
   confirms the implementor's keyboard-shortcut work is merged. (Q2's
   Timeline derivation is the one exception, explicitly sequenced as the
   last commit, after that confirmation.)

### Acceptance for the whole series (in addition to each commit's own gate)

- Engineering and Realistic at the same shot show the same silhouette:
  overlaid screenshots, column positions match within 2px.
- The Explorer tree row count is identical in both modes.
- Statistics: one code path, same totals in both modes.
- Measure: the SHS 400 top corners read `0.400 m` in Engineering (this was
  only ever tested in Realistic before now).
- UX-01's drag guard and BUG-11's pose fix still pass.
- Draw calls and frame time in Engineering, on the real (non-spike) code,
  are within noise of condition 1's corrected spike numbers above.
- Zero console errors, dev and preview. `prettier --check`. Comments 1-2
  lines (reasoning goes in the commit message, per project convention).

### Process

Commit on the `worktree-3d-realism` branch. Report to the architect session
after every 2-3 commits, not only at the end. Stop and ask if any condition
above turns out to be impossible to satisfy as stated.
