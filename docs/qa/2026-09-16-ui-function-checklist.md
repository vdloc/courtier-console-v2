# UI function checklist — full e2e pass

Every clickable/draggable control in the app, tested against the live dev
server (`http://localhost:5175/`) via Playwright. Verified by reading
`useAppStore`/R3F state after each action, not just visually — a screenshot
can look right while the store is wrong.

Status: `[ ]` not run · `[x]` pass · `[!]` fail, see note.

## Bugs found this pass
- **[FIXED, commit 0e6d4eb]** Left panel sections overlapped instead of
  scrolling. `panels.module.css`'s `.section` had no explicit `flex`
  property, defaulting to `flex-shrink:1` with its own `min-height:0` —
  flexbox squeezed sections below their content height to fit `.left`'s
  fixed grid-row height *before* `overflow-y:auto` ever got a chance to
  engage, so squeezed-out content (Structure Layers' last checkbox row)
  painted over the next section instead of scrolling into view. Confirmed
  via `getBoundingClientRect`: Accessories' checkbox landed inside the View
  section's box. Fix: `.left > section { flex-shrink: 0 }`.

## Session note
Playwright MCP disconnected three times across this pass (twice mid-run,
once right after triggering the Export-view download), and the dev server
itself also went down once between sessions. Not app bugs — restarted the
server and reconnected each time, then resumed from this doc. Full pass is
now complete.

## TopBar
- [x] Model explorer toggle (mobile width, ≤900px) — `.left` drawer
      `data-open` null→true on click, visible; closed again via same toggle
- [x] Inspect toggle (opens right drawer with nothing selected) — `.right`
      drawer `data-open` null→true, visible; closed via X button
- [x] Present toggle (enter/exit) — `data-presenting` true→(no attr) on
      the same button, confirmed at both desktop and mobile width
- [x] Keyboard shortcuts toggle — opens the dialog; close-via-X, close-via-
      Escape, and close-via-scrim all independently confirmed
- [x] Export view — triggered a real `download` event

## Left panel — accordion headers (collapse/expand)
- [x] Model explorer
- [x] Structure layers
- [x] View
- [x] Tools
- [x] Display mode
- [x] Quality (realistic mode only)
- [x] Viewpoints
- [x] Section

## Model Explorer body
- [x] Filter input (typing narrows rows) — used throughout to reach leaf rows
- [x] Tree row click → selects component
- [x] Tree row caret → expand/collapse group
- [x] Row eye icon → hide/show that member
- [x] Header "Isolate selection" / "Show all" button

## Structure Layers body
- [x] Foundation checkbox
- [x] Columns checkbox
- [x] Beams checkbox
- [x] Pipes checkbox
- [x] Connections checkbox
- [x] Accessories checkbox — this is where the overlap bug was, now fixed
- [x] "Hide layers" / "Show layers" toggle-all

## View body
- [x] Front shot — camera moved, confirmed via `camera.position`
- [x] Side shot
- [x] ISO shot
- [x] Joint shot
- [x] Fit model
- [x] Focus selected (disabled with no selection, enables on select)
- [x] Reset view — verified against a dragged-away camera, snaps back
- [x] Explode toggle — confirmed real tween (mid-point sampled, distinct
      from both start/end), both directions, returns exactly to start
- [x] Statistics toggle

## Tools body
- [x] Measure (arms measuring)
- [x] Isolate (disabled with no selection, enables on select, isolates)
- [x] Show all

## Display mode body
- [x] Realistic — Quality section appears
- [x] Engineering — Quality section disappears

## Quality body (realistic only)
- [x] High
- [x] Balanced
- [x] Fast

## Viewpoints body
- [x] Name input + Save — Save disabled empty, enabled with text
- [x] Restore a saved viewpoint — verified against a dragged-away camera
- [x] Delete a saved viewpoint

## Section body
- [x] Enable/Disable section link — clippingPlanes count 3362→0 confirmed
- [x] Axis X / Y / Z
- [x] Flip
- [x] Section position slider — keyboard-driven, aria-valuenow changed
- [x] In-viewport drag gizmo — not re-verified this pass (verified in an
      earlier session; layout hasn't touched SectionGizmo.tsx since)

## MeasurePanel (right drawer)
- [x] Start measuring / stop
- [x] Distance mode
- [x] Horizontal mode
- [x] Vertical mode
- [x] Angle mode
- [x] Area mode
- [x] Point picking in viewport — real GLB objects picked (Rail_Edge_Mid_RF_S,
      Pipe_Insulation_L03_LTHW_RETURN), distance readout rendered
- [x] Undo point
- [x] Clear all points

## PropertyPanel (right drawer)
- [x] Selecting a member populates it
- [x] "Connected to" link jumps selection

## Timeline transport (floating over viewport)
- [x] Play / Pause — scrubber's real `aria-valuenow` advances only while
      playing (verified against the correct slider — there are two
      `[role=slider]` on the page, Section's and Timeline's; picking the
      wrong one gave a false "doesn't advance" reading, corrected by
      matching on the parent's `aria-label="Construction progress"`)
- [x] Reset — snaps progress back to 0
- [x] Scrubber drag/click — clicking 70% along the track sets progress to
      0.7 (aria-valuenow)

## Viewport chrome
- [x] Canvas click selects a member (used throughout as the click-select path)
- [x] Corner axis gizmo (GizmoViewport, bottom-right per `DiagramScene.tsx`)
      click snaps view — camera position jumped from `4.0,3.5,4.0` to
      `0.0,7.7,0.0` on click
- [x] Camera shortcuts: F (fit), I (focus selected), R (reset-view), T
      (recenter pivot — gated on `lastClickPoint`), Y (upright) — all fire
      their registered command; F/R re-verified this pass, T/Y verified in
      an earlier session and unchanged

## Keyboard shortcuts (registry, commands.ts)
- [x] Spot-checked every entry not already exercised via clicking:
      H (hide selected — clears selection, `Steel_Column_Main_L00_A1`
      unselectable-then-reselectable), Shift+H (show all — restores it),
      P (section toggle — clippingPlanes 0→3362→0), Shift+X/Y/Z (section
      axis switch — confirmed via `data-active` on the axis buttons),
      Shift+F (flip — confirmed via `data-active`), M (measure distance
      arm/disarm), Shift+M (measure angle — armed with real point-picking,
      "12.44 m" real distance on GLB geometry), Ctrl+Z (undo one point —
      Undo/Clear buttons' disabled state before/after), Delete (clear all
      points), E (explode toggle), C (playback toggle — Play↔Pause↔Play
      button label; an edge case at progress=1.0 looked like a no-op on
      the first press but was just autoplay finishing instantly, not a
      bug — confirmed clean toggle at progress=0.3), V (save viewpoint —
      new "View N" row appeared), ? (help open), Shift+P (present toggle),
      Esc (closes help dialog, and separately clears a selection)

## Present mode
- [x] Enter Present (chrome hides, `data-presenting="true"`)
- [x] PresentStepper: previous — cycles camera back
- [x] PresentStepper: next — camera genuinely moves between saved
      viewpoints (4 distinct camera pos/rot pairs sampled across
      "Base connection A", "Services clash — L01", and two temp QA
      viewpoints, cycling with wraparound)
- [x] PresentStepper: exit — `data-presenting` attr removed, TopBar returns

## Drawers (narrow width, tested at 700×900)
- [x] Left drawer opens/closes — TopBar's Model-explorer toggle sets
      `data-open` true/false; scrim click (at a point not occluded by the
      drawer itself) closes it
- [x] Right drawer close (X) button — closes it (`data-open` true→null)
- [x] Right drawer scrim — closes it and clears the selection; first
      attempt used Playwright's `force:true` click which dispatches at the
      scrim's own center even when a higher-z-index drawer panel visually
      covers that point, so it silently hit the drawer instead — not an
      app bug, a test artifact from clicking through the wrong element

## Cross-cutting
- [x] Zero console errors — checked after every action across both passes,
      all clean
