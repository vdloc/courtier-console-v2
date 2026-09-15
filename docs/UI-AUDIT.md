# UI/UX Audit — Northgate Plant Extension console (2026-09-15)

**Scope**: master @ `4a3ed1a`, frozen in detached worktree `.claude/worktrees/ui-audit`, dev server on :5210 (`--strictPort`). Read-only — no src edits, no commits.
**Method**: Playwright (global install, `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, MCP was down) driving real navigation/click/type; full-page screenshots at 375/768/1280px in both **Engineering** and **Realistic** display modes; live in-app search tests; source citations for every code claim.
**Per user instruction this pass**: UI/UX only — accessibility (contrast, focus rings, ARIA, keyboard) and i18n are explicitly out of scope and not scored here.
**Not re-litigated**: findings already on record in `/home/vdloc/Projects/courtier-console-v2/.claude/worktrees/3d-realism/docs/UX-AUDIT.md` (UX-05, 06, 08, 09, 10 etc.) are not repeated below unless their status changed. Screenshots: `docs/ui-audit/*.png` (uncommitted).

---

## 1. Re-verification of UX-01/02/03/04/07 (previously reported, claimed fixed on master)

| ID | Status | Evidence |
|---|---|---|
| **UX-01** — orbit-drag reselects wrong member in Realistic | ✅ **Fixed** | `StructureGlb.tsx:354-357`: `onClick` now checks `event.delta > 2` and returns early — a drag past R3F's click threshold no longer fires selection. Matches Engineering's existing per-mesh stability. |
| **UX-02** — Statistics panel shows Engineering counts while in Realistic | ✅ **Fixed** | `Viewport.tsx:20-37`: stats branch on `mode === 'realistic'` and read `glbComponents`/`glbDrawn`/`glbHidden` instead of `PARTS` in that mode. |
| **UX-03** — search placeholder promises grid ref/type, only matches label | ❌ **Still broken — not fixed** | See detail below this table; this is a re-opened, not a new, issue. |
| **UX-04** — Escape does not cancel Measure | ✅ **Fixed** | `App.tsx:37` + `interaction/commands.ts`: Escape now routes through a shortcut-registry cancel command that calls `toggleMeasuring()`. (Side effect: a keyboard-shortcut registry now exists at all, which didn't before — relevant context for UX-05, not re-scored here since a11y/shortcuts weren't the ask this pass.) |
| **UX-07** — Connections/Accessories layer toggles are dead controls in Engineering | ✅ **Fixed** | `Layers.tsx:8,15`: `ENGINEERING_LAYERS = LAYERS.filter(l => PARTS.some(p => p.layer === l))` — Engineering mode now only renders layer checkboxes for layers that actually have parts; `Connections`/`Accessories` no longer appear as inert controls there (they still show correctly in Realistic, where `LAYERS` is used unfiltered). |

**UX-03 in detail — reopen, not a duplicate.** Live-tested against the running app (not just code reading), identical to the original repro:
- Engineering mode, filter `B2–C2` (a real grid ref, `docs/ui-audit/06-ux03-gridref-search-engineering-0rows.png`) → **"0 rows / No matches for "B2–C2""**.
- Engineering mode, filter `UB 406` (a real section string) → **0 rows** (`docs/ui-audit/07-...png`).
- Realistic mode, filter `C1-C2` → **93 rows** (`docs/ui-audit/08-...png`), still only because the GLB mesh name happens to embed the grid ref — an accident of data, not a searched field.
- Root cause unchanged: `ObjectTree.tsx:35` — `const match = !filter || node.label.toLowerCase().includes(filter)` — only ever checks `label`. `model.ts:311` already carries `detail: p.gridRef` and `Part.section` (`model.ts:33`) exists on every part but neither is wired into `flatten()`'s match. Placeholder text "Mark, type or level" (current copy, `ObjectTree.tsx` — wording has changed since the original audit but the promise is the same) still implies grid ref/type are searchable fields.
- **This contradicts the fixed-list in this task's brief.** Flagging directly rather than silently dropping it: UX-03 is open on master at `4a3ed1a`, same severity (P1) and same fix as originally recommended — search `label`, `detail`, `section` in one matcher.

---

## 2. New findings

### UI-01 — Left panel has zero responsive breakpoint; 3D viewport is unusable below ~475px (P0)
**Evidence**: `App.module.css:4-14` sets `grid-template-columns: var(--panel-left-w) minmax(0, 1fr) var(--panel-right-w)`; `tokens.css:96` fixes `--panel-left-w: 300px`. The only responsive rule for the shell (`App.module.css:67`, `@media (max-width: 1280px)`) drops the *right* column into an overlay but never touches the left column or its width. At 375px viewport (`docs/ui-audit/03-engineering-375-viewport-crushed.png`, `05-realistic-375-viewport-crushed.png`) the fixed 300px sidebar leaves `minmax(0, 1fr)` ≈ 75px for the entire 3D canvas — the model renders as an unusable ~70px-wide sliver at the right edge of the screen in both modes.
**User impact**: any user on a phone or a narrow split-screen/tablet window cannot see the model at all — the one thing the app exists to show. This isn't a squeeze, it's a functional dead end for the primary content.
**Recommendation**: CURRENT: `.left` has a fixed px width with no media query. PROBLEM: below the point where `300px + minimum-usable-viewport` no longer fits, the model area collapses to near-zero instead of the sidebar adapting. WHY: violates the same "content must survive the viewport" principle already applied to the right panel — that panel got a collapse-to-overlay treatment, the left one got none. CHANGE: give `.left` the same overlay/drawer treatment as `.right` below a breakpoint (a toggle button in TopBar to open/close Model Explorer + Layers as a full-screen or slide-over panel), or at minimum switch `--panel-left-w` to a `clamp()`/percentage below ~600px so the split never goes below a usable minimum (e.g. `clamp(200px, 60vw, 300px)` is still not enough alone — an overlay is the correct fix, matching the existing right-panel pattern). EFFORT: Medium. PRIORITY: **P0**.

### UI-02 — TopBar title/revision text wraps and overflows the fixed-height bar below ~420px (P1)
**Evidence**: `TopBar.module.css:4` sets `height: var(--appbar-h)` (`tokens.css:94` → `34px`) with no `min-height`/`overflow` handling; the only responsive rule (`:50`, `@media max-width: 1100px`) hides `.meta` and `.rule` but does nothing for `.name`/`.revision`. At 375px (`docs/ui-audit/03-...png`) "Northgate Plant Extension" wraps to 2 lines and "REV C · ISSUED FOR REVIEW" wraps to 2 lines beneath it, inside a bar that stays 34px tall — text visibly overlaps/clips against the bar edge and the "Export view" button, which never gets its own narrow-width treatment, wraps its label onto two lines and is partly cut off at the right edge.
**User impact**: the top bar is the project-identity chrome present on every screen; at phone width it becomes visually broken on first load, before the viewport-crush issue (UI-01) is even noticed.
**Recommendation**: CURRENT: fixed-height bar, only `.meta`/`.rule` responsive. PROBLEM: `.name` and `.revision` have no fallback (truncation or smaller type) below ~420px, and `--appbar-h` doesn't grow to match wrapped content. CHANGE: add a `<420px` (or match whatever breakpoint UI-01's sidebar fix lands on) rule that truncates `.name`/`.revision` with `text-overflow: ellipsis; white-space: nowrap` instead of wrapping, and gives `.export` a fixed min-width or icon-only fallback. EFFORT: Low. PRIORITY: P1.

### UI-03 — Engineering and Realistic left-panel section order differs, pushing Tools further down in Realistic (context, not a new finding)
**Evidence**: at 1280×900, Engineering's left column goes Tree → Structure Layers (visible without scrolling, `docs/ui-audit/01-...png`). Realistic's left column goes Tree → **Display Mode** → **Quality** → Tools/Measure/Isolate (`docs/ui-audit/04-...png`) — two extra sections inserted before Tools, with no compensating collapse. This is the same root cause as the already-documented UX-10 (Viewpoints/Quality stacking pushes Tools below the fold) — confirmed still present, not re-scored as a new ID per the no-duplication instruction.

### UI-04 — Model Explorer's flex-grow floor starves Tools/Measure to invisible at short window heights (P0) — **fixed, master 20d6cb5**
**Evidence**: `panels.module.css:15-17` — `.grow { flex: 1 1 auto; min-height: 200px }`, applied to the Model Explorer `<section>` (`ObjectTree.tsx:122`). Its sibling `.controls` (Structure Layers → Display Mode → Quality → Tools → Viewpoints → Section, `App.module.css:31-34`) was `flex: 0 1 auto; min-height: 0` — shrink-only, no floor. Measured live at 1280×600 (a realistic laptop-with-browser-chrome height, not a contrived edge case): tree section rendered 378px tall (well past its own 200px floor, since it was the only side with `flex-grow`), controls region only 96px, with the "Tools" heading measured at `top: 934px` — fully off-screen below a 600px viewport, no scroll affordance visible. Structure Layers itself was cut off after Foundation/Columns; Measure, Isolate, Viewpoints, Section were all unreachable without scrolling blind.
**User impact**: Measure — one of the app's core actions — becomes undiscoverable on any short window, with zero visual cue more controls exist below.
**Status**: fixed by the implementor alongside UX-10 — `.growTree` given a 120px floor, `.controls` given a matching floor (master `20d6cb5`), per solutioner. Left in the record as the reason the L13 check below exists.
**Fed back into the skill**: this pattern (an unbounded `flex-grow` sibling with only a `min-height` floor, next to a `flex: 0 1 auto; min-height: 0` sibling — the floored one freezes, the floorless one gets pushed to zero, invisible at desktop heights and only obvious once you shrink the window) is now a permanent audit check in `ui-ux-audit-playbook` (ch03 L13, fix recipe #9, `evidence.md` step 6b: resize to the shortest realistic window height as a standard evidence-collection step, not just narrow widths).

---

## 4. Structural / placement addendum

User asked for an opinion on how components are positioned and organised, not just isolated bugs. Four points, in order of how load-bearing each one is:

**1. Left panel is one undifferentiated stack, no frequency ordering.** Model Explorer, Structure Layers, Display Mode, Quality, Tools, Viewpoints, Section all get identical visual weight and sit in build order, not use-frequency order (`App.tsx:48-53`, `panels.module.css`). Tools (Measure, Isolate — used constantly) sat *below* Display Mode/Quality (set once per session) before the reorder. Same root cause as UX-10, and the same structural weakness that let UI-04 happen: nothing in the layout encoded "this must stay visible," only flex math that happened to hold at tall windows.
→ **Actioned**: implementor reordering Tools above Display Mode/Quality/Viewpoints, folded into the UX-10/UI-04 commit — frequency-first ordering makes the failure mode benign even if the flex math goes wrong again later.

**2. Mode is shown twice, disconnected.** The Display Mode radio-cards in the left panel are the actual control; `Viewport.tsx:39-45` also floats a read-only status chip (confirmed non-interactive — plain `<span>`, no cursor/click, `Chip.tsx`) in the top-left corner of the 3D canvas echoing the same value. Same fact, two places, different visual language (pill vs. card), no link between them.
→ **Logged, not actioned yet** — a copy/IA decision, deferred until the Present-mode work (about to change what the viewport chrome is for) so it's settled once rather than twice.

**3. Right panel does progressive disclosure correctly; left panel doesn't, despite doing a structurally similar job.** Right panel (Properties/Measure) only mounts when there's something to show it for (`selected || measuring`, `App.tsx:24`) and collapses to an overlay below 1280px. Left panel has no equivalent — everything is always mounted, always taking space, regardless of mode or task. This asymmetry is the actual explanation for why only the left column turned out fragile enough to starve itself (UI-04): it's the one region doing "contextual tools bound to viewport state" without the disclosure pattern that would have made that safe.
→ Root-cause note for UI-04/UX-10, not a separate action item — captured here for the record.

**4. Bottom Timeline is a permanent 92px strip on every screen, regardless of mode/task.** Defensible since construction sequencing is a named core workflow — but it's a standing cost against the one region already shown to be scarce (UI-01), not a neutral default.
→ **Logged as a trade-off**, not a bug. Timeline phases are about to be derived from the GLB clip (researcher's upcoming work) which will change what's actually in that strip — re-raise after that lands if it still reads as a standing cost.

---

## 5. Summary

- Confirmed fixed: UX-01, UX-02, UX-04, UX-07, and **UI-04** (fixed same pass, master `20d6cb5`).
- **Reopened, not fixed**: UX-03 (search still label-only in Engineering; grid ref/section unsearchable) — flagged above as a discrepancy against this task's brief rather than silently accepted. Held pending the GLB migration (tree-node shape and grid-ref location both change with it).
- **New findings this pass**: UI-01 (P0, left panel no responsive breakpoint, viewport crushed below ~475px), UI-02 (P1, TopBar text wraps/overflows below ~420px), UI-04 (P0, flex-starvation of Tools/Measure at short heights — fixed).
- UI-03 is context confirming an already-tracked issue (UX-10) persists, not a new ID; addressed by the same reorder as the structural addendum's point 1.
- **Structural addendum** (section 4): left-panel section order now frequency-first (actioned); mode-chip duplication logged for the Present-mode work; right-vs-left disclosure asymmetry named as UI-04/UX-10's root cause; Timeline's permanent footprint logged as a trade-off pending the GLB-driven timeline work.
- **Panel-internal findings** (section 6, live-verified via Playwright): UI-05 (P1, ungrouped View-section grid), UI-06 (P1, inconsistent tooltip/shortcut convention — Isolate/Statistics/Measure/Reset all silent on hover, `I` bound to Focus not Isolate), UI-07 (P2, Display Mode vs Quality style mismatch), UI-08 (P2, 3 header-toggle-links with 3 label conventions), UI-09 (P1, scrim dims viewport at exactly 1280px on selection).
- Accessibility and i18n were out of scope this pass per instruction; not scored.
- GLB/measure-visual migration note: none of the findings above touch 3D rendering internals (StructureGlb mesh drawing, measure line/label rendering) — they're shell-layout (grid/CSS) and data-wiring (search matcher) issues that persist unchanged through the in-flight GLB migration on `worktree-3d-realism`, except UX-03 (held) and the Timeline trade-off (point 4), both explicitly tied to that migration above.

---

## 6. Panel-internal ease-of-use (per user request — focused pass on the docked panels themselves)

Not shell/layout this time — how each panel's own controls are organised, labelled and exposed. All 6 findings below verified live with Playwright (`browser.newPage` + `page.evaluate` reading `title` attributes off every panel button, not inferred from source alone) at 1280×900, both display modes.

### UI-05 — "View" section mixes camera actions, a visual toggle and a debug overlay in one undifferentiated grid (P1)
**Evidence**: `ViewControls.tsx:92-139` — one `cols2` button grid holds Fit model / Focus selected (camera framing), Explode (visual toggle), Statistics (debug overlay), Reset view (camera) — five buttons, identical size and style, three unrelated jobs, no divider or sub-label.
**User impact**: a user looking for "how do I see the part count" has no visual cue it's sitting between two camera buttons — every function in this grid reads as equally important and equally unrelated to its neighbours.
**Recommendation**: CURRENT: one flat grid. PROBLEM: camera/view/debug functions carry equal visual weight with no grouping. CHANGE: split into two rows or two mini-sections — camera actions (Fit, Focus, Reset) vs. view toggles (Explode, Statistics) — matching the pattern already used elsewhere in this same file (Tools vs. Viewpoints are already separate sections). EFFORT: Low. PRIORITY: P1.

### UI-06 — Tooltip/shortcut-hint convention is inconsistent within the same component, live-confirmed (P1)
**Evidence**: live `title` attribute extraction across every panel button (script output, not inferred):
| Button | Location | `title` |
|---|---|---|
| Statistics | View | `null` |
| Isolate | View → Tools *and* Model Explorer header | `null` (both locations) |
| Measure | View → Tools | `null` — despite `Distance` in the Measure panel showing `"Distance (M)"`, the *same* registered shortcut |
| Reset | Timeline | `null` |
| Focus selected | View | `"Focus selected (I)"` — confirms `I` is bound to Focus, not Isolate; a user guessing `I` for Isolate gets a silent, different action |
| Horizontal / Vertical / Area | Measure panel | `"Horizontal"` etc. — plain label shown even with **no** shortcut (`MeasurePanel.tsx:88`, `title={shortcut ? ... : m.label}`) |

**User impact**: hovering teaches the user nothing consistent — some buttons explain themselves (shortcut or plain label), others are silent, with no visual difference between the two classes and no pattern a user could learn to predict which is which.
**Recommendation**: CURRENT: `title` is set ad hoc, per-button, with two different conventions in the same codebase (omit entirely vs. always show, MeasurePanel's `shortcut ? ... : m.label` pattern). CHANGE: adopt MeasurePanel's fallback convention everywhere — every actionable button gets a `title`, shortcut-qualified when one exists, plain label otherwise. Also: wire Measure's own registered `M` shortcut into its Tools-row button's title, and register + surface a shortcut for Isolate given it's a named brief workflow (Workflow 4). EFFORT: Low. PRIORITY: P1.

### UI-07 — Same "pick one of N" interaction rendered two different ways, adjacent sections (P2)
**Evidence**: `ViewControls.tsx:143-182` — Display Mode renders as two-line label+hint cards (`local.mode`, `docs/ui-audit/04-realistic-1280.png`); Quality, immediately below it, renders as plain compact pills (`styles.pick`) — same job (mutually exclusive choice among a handful of options), adjacent sections, two visual languages with nothing to justify the switch.
**Recommendation**: pick one pattern for "choose one of a small fixed set" and use it for both, or reserve the card+hint treatment specifically for choices that need the extra explanatory line (arguably true for Display Mode, not for Quality) and say so with a comment, so it reads as a deliberate exception rather than an inconsistency. EFFORT: Low. PRIORITY: P2.

### UI-08 — Three panels each have a header-link toggling bulk visibility, three different label conventions (P2)
**Evidence**: Layers: `"Hide layers"` / `"Show layers"` (`Layers.tsx:32-34`); Model Explorer: `"Isolate"` / `"Show all"` (`ObjectTree.tsx:126-134`); Section: `"Enable"` / `"Disable"` (`ViewControls.tsx:269-277`). Same interaction shape — small link, top-right of a panel header, flips a panel-wide state — three different label vocabularies.
**Recommendation**: a shared header-toggle-link component/convention so learning one panel's bulk-toggle language transfers to the others. EFFORT: Low. PRIORITY: P2.

### UI-09 — At exactly 1280px, selecting a part scrims/dims the entire 3D viewport (P1)
**Evidence**: `App.module.css:67`, `@media (max-width: 1280px)` — inclusive of 1280 itself, a common laptop width. Live test at 1280×900: clicking a tree row opens the right panel as a fixed overlay and drops a full-height scrim over the viewport (`.scrim`, `inset: var(--appbar-h) 0 var(--bottombar-h) 0; background: var(--scrim)`), screenshot `docs/ui-audit/09-scrim-dims-viewport-at-1280.png` — the model is visibly greyed out behind the Measure/Properties panel the instant something is selected.
**User impact**: exactly at the width where a user most wants to see the selected member and its properties side by side, selecting it visually removes the model from view instead — the opposite of what inspecting a component in context needs.
**Recommendation**: CURRENT: overlay+scrim below/at 1280px, side-by-side above it. PROBLEM: breakpoint is inclusive at a width common enough to hit routinely, and the scrim (designed for narrow screens where there's no room to show both) also fires at a width with plenty of room. CHANGE: raise the breakpoint slightly past 1280 (e.g. `1281px` or a dedicated token) so the exact 1280 case gets the side-by-side treatment, or make the scrim itself lighter/click-through at the top of its range instead of full-opacity. EFFORT: Low. PRIORITY: P1.

*Screenshots: `docs/ui-audit/*.png`. This file and the screenshots are intentionally left uncommitted in the scratch worktree `.claude/worktrees/ui-audit`.*
