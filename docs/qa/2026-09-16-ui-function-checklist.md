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
Playwright MCP disconnected twice mid-pass (once ~partway through, once
right after triggering the Export-view download). Not an app bug — the
browser tool itself dropped. Re-run remaining unchecked items once it's
back.

## TopBar
- [ ] Model explorer toggle (mobile width) — not reached before disconnect
- [ ] Inspect toggle (opens right drawer with nothing selected) — not reached
- [ ] Present toggle (enter/exit) — not reached
- [x] Keyboard shortcuts toggle — click opened it; disconnected mid-check of
      close-via-X/Esc/scrim, re-verify those three
- [x] Export view — triggered a real `download` event before the disconnect

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
- [ ] In-viewport drag gizmo — not re-verified this pass (verified in an
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
- [ ] Play / Pause — not reached before disconnect
- [ ] Reset — not reached
- [ ] Scrubber drag — not reached

## Viewport chrome
- [x] Canvas click selects a member (used throughout as the click-select path)
- [ ] Corner axis gizmo (GizmoViewport) click snaps view — not reached
- [ ] Camera shortcuts: F, I, R, T, Y — not reached this pass (T/Y verified
      in an earlier session)

## Keyboard shortcuts (registry, commands.ts)
- [ ] Every shortcut with a mapped command fires — not reached this pass

## Present mode
- [ ] Enter Present (chrome hides) — not reached
- [ ] PresentStepper: previous — not reached
- [ ] PresentStepper: next — not reached
- [ ] PresentStepper: exit — not reached

## Drawers (narrow width)
- [ ] Left drawer opens/closes, scrim click closes it — not reached
- [ ] Right drawer close (X) button — not reached
- [ ] Right drawer scrim (where applicable) — not reached

## Cross-cutting
- [x] Zero console errors — checked after every single action up to the
      disconnect, all clean
