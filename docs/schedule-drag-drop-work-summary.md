# Schedule Drag-and-Drop Work Summary

## 1. Scope and Context

- Added direct drag-and-drop editing to the eight-segment schedule grid.
- Added durable, unique roster colors and backfilled the existing file-backed roster.
- Added every available substitute as a visible swap target in each segment.
- Moved quality checks into the schedule toolbar and planned minutes below the schedule.
- Added cell-level quality warning markers and tooltips for actionable goalkeeper and midfield exceptions.
- Preserved configurable position labels and the existing click-based assignment dialog.
- Followed the repository constraints for Solid reactivity, Panda runtime styles, shared UI wrappers, SSR-safe overlays, and the `pnpm -C app verify` final gate.

## 2. Major Changes Delivered

- `app/src/components/soccer/ScheduleGrids.tsx`
  - Renders seven field rows plus one substitute row per extra available player.
  - Implements pointer-driven swaps for field-to-field, substitute-to-field, and field-to-substitute moves.
  - Limits valid targets to the source segment, shows a dimmed/ringed source, outlines all valid targets, emphasizes the active target, and cancels with Escape.
  - Uses cursor changes instead of drag-handle icons.
  - Uses only a small color dot for player identity; player cell backgrounds remain neutral.
  - Tracks one hovered/focused player id and outlines every matching field and substitute cell across all eight segments.
  - Explicitly removes the Panda grid's default column gap so valid and active drag-target styling reaches every cell edge.
  - Places goalkeeper-change and midfield-repeat caution markers at the right-center of affected cells with shared `Tooltip` content.
  - Keeps the player-oriented grid and planned-minutes summary color treatment to dots only.
- `app/src/components/soccer/SchedulePage.tsx`
  - Wires pointer swaps through the existing revision-aware `replaceAssignment` action.
  - Gives the schedule the full content width and moves planned minutes below it.
  - Keeps the click-based assignment dialog as an accessible alternative.
- `app/src/components/soccer/ScheduleQualityPopover.tsx`
  - Moves blocking errors and quality metrics into a toolbar popover.
  - Shows concrete blocking-error text and warning metrics without occupying permanent side-panel width.
- `app/src/lib/soccer/scheduling.ts`
  - Adds `scheduleCellWarnings(...)` as the source of truth for cell-addressable midfield repeats and goalkeeper changes.
  - Derives aggregate warning counts from the same cell-warning records to prevent UI/metric drift.
- `app/src/lib/soccer/player-colors.ts`, `app/src/lib/soccer/schemas.ts`, and `app/src/lib/soccer/store.ts`
  - Add the persisted `Player.color` field and a reviewed palette.
  - Upgrade stored data to schema version 2.
  - Normalize both legacy and already-versioned stores so active roster records have unique colors, then persist the repair.
  - Automatically select an unused color for new players and reject duplicate colors on roster updates.
- `app/src/components/soccer/RosterPage.tsx`
  - Shows and edits the schedule color as part of roster details.
- `app/src/lib/soccer/scheduling.test.ts` and `app/src/lib/soccer/store.test.ts`
  - Cover field swaps, substitute insertion, cell warning location, generated colors, color persistence, and duplicate-color rejection.

Intentionally unchanged: schedule assignments still persist only the player id. Historical and current schedules resolve the player's current roster color rather than copying color values into every assignment.

## 3. Design Decisions and Tradeoffs

- Decision: use pointer events instead of native HTML drag events.
  - Alternative: keep `draggable`, `dragstart`, `dragover`, and `drop`.
  - Reason: real in-app browser gestures did not commit native drops. Pointer movement produced reliable mouse/touch behavior, deterministic target detection, and explicit Escape cancellation.
  - Tradeoff: the component owns hit testing with `elementFromPoint`; stable `data-segment`, `data-slot`, and `data-player-id` attributes are now part of the interaction contract.
- Decision: allow swaps only inside one segment column.
  - Reason: this matches the requested up/down mental model and guarantees a segment never gains a duplicate player through a cross-column move.
- Decision: derive the substitute list from players absent from that segment and sort it by display name.
  - Tradeoff: substitute row numbers can change after a swap. The player identity and color dot, rather than the row number, are the stable visual cue.
- Decision: keep colors to a dot rather than tinted cell backgrounds.
  - Reason: this preserves quick identity scanning without overwhelming the grid with eleven competing tints.
- Decision: reuse the player's persisted color for cross-schedule hover borders.
  - Reason: the emphasis reinforces identity without adding a second highlight language or permanent visual weight.
- Decision: use inset borders for hover and drag states.
  - Alternative: use CSS outlines with a negative offset.
  - Reason: inset borders occupy the complete grid item and do not leave exposed strips at track boundaries.
- Decision: keep minute spread in the quality popover only.
  - Reason: minute spread is a whole-schedule condition and cannot be truthfully assigned to one cell. Goalkeeper changes and midfield repeats receive cell markers because they have exact locations.
- Decision: use an in-tree quality popover.
  - Reason: it avoids taking schedule width and keeps the initial SSR/client structure stable.

## 4. Problems Encountered and Resolutions

- Symptom: native drag gestures produced no assignment changes in the in-app browser.
  - Root cause: the native HTML drag transport did not reliably emit the required drop sequence through physical browser automation.
  - Resolution: replaced native drag transport with thresholded pointer tracking, same-segment hit testing, pointer-up commit, and Escape cancellation.
  - Preventative action: browser-test at least one real gesture before treating native drag event wiring as complete.
- Symptom: the migrated real roster still contained two duplicate color pairs.
  - Root cause: schema-valid version-2 data bypassed the initial legacy-only normalization path.
  - Resolution: normalize uniqueness for both current and legacy store versions and persist when normalization changes any record.
  - Preventative action: migration tests and checks must cover semantically invalid but schema-valid current-version data.
- Symptom: the first caution icon placement shifted the player name.
  - Root cause: the icon participated in the inline name row.
  - Resolution: anchored the marker absolutely to the right edge and vertical center of the cell.
- Symptom: active drag targets left an exposed strip on the right side.
  - Root cause: Panda's `Grid` primitive supplied an 8px default column gap, and the earlier negative-offset outline made the spacing more visible.
  - Resolution: set `gap="0"` on every position-grid header and row, use a full-size grid item, and render valid/active target borders with inset box shadows.
  - Preventative action: measure the grid item's bounding box against adjacent tracks when validating full-cell interaction states.

## 5. Verification and Validation

- `pnpm -C app type-check`: passed during implementation.
- `pnpm -C app lint`: passed during implementation.
- `pnpm -C app test`: passed with focused swap and color coverage.
- `pnpm -C app verify`: passed as the final combined type-check, test, and lint gate.
- In-app browser validation against `http://localhost:3000/games/6574433a-36d5-4987-896f-de6a6eafc006/schedule`:
  - Field-to-field swap: passed; both player ids exchanged.
  - Substitute-to-field swap: passed; incoming substitute moved to the field and outgoing player remained present in the substitute set.
  - Field-to-substitute swap: passed.
  - Cross-segment drop: rejected with both assignments unchanged.
  - In-progress indicators: one source marker, ten valid targets, and one active target observed for an eleven-player segment.
  - Hover emphasis: hovering one occurrence emphasized and bordered all eight matching occurrences, with zero cells from other players emphasized.
  - Target geometry: active target measured 0px right gap, 0px bottom gap, and a 0px row column gap; active fill and inset border were both present.
  - Escape cancellation: passed; assignments remained unchanged and all drag/target markers cleared.
  - Click-based assignment dialog: still opens.
  - Cell warning: goalkeeper warning appeared on `q1b/goalkeeper`; tooltip opened with the expected explanation.
  - Warning layout: verified right-aligned and vertically centered within the cell.
  - Color treatment: zero colored player-cell backgrounds and no drag-handle icons.
  - Layout: zero page-level horizontal overflow at a 1280×720 viewport.
- Real store validation: `app/data/soccer/store.json` reports schema version 2, 11 players, and 11 unique colors.

## 6. Process Improvements

- Current pain: unit tests can validate swap math but not physical drag transport.
- Proposed change: add a reusable browser smoke test that performs one pointer drag, observes target markers, and cancels one drag with Escape.
- Expected benefit: catches interaction-transport failures before visual polish work is treated as complete.
- Suggested owner/place: `app/e2e/` or the repository verification checklist.

## 7. Agent/Skill Improvements

- Current pain: the UI-design skill requires drag states but does not distinguish domain swap tests from transport-level gesture tests.
- Proposed change: add a drag/drop verification checklist covering pointer/touch transport, source state, valid/invalid target state, accepted move, rejected move, Escape cancellation, and keyboard/click fallback.
- Expected benefit: prevents a correct swap function from being mistaken for a working drag-and-drop UI.
- Suggested owner/place: `.agents/skills/dense-action-web-app-design/references/states-safety-accessibility.md`.

## 8. Follow-ups and Open Risks

- Follow-up: add automated browser coverage for the manual drag matrix. Priority: medium.
- Known limitation: substitute rows are sorted after each accepted move, so the outgoing player's `Sub N` row may differ from the drop target row. Player identity remains unambiguous through name, jersey number, and color dot.
- Residual risk: touch dragging was implemented through pointer events but was not manually tested on physical mobile hardware in this session.
