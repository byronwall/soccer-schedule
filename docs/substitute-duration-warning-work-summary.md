# Substitute Duration Warning Work Summary

## 1) Scope and Context

- Requested behavior: warn when a player is planned as a substitute for more than one full 14-minute quarter.
- The schedule uses 7-minute segments, so two substitute segments are allowed and the third substitute segment triggers the warning.
- This extends the existing non-blocking schedule-warning system. Publishing rules and hard validation remain unchanged.

## 2) Major Changes Delivered

- `app/src/lib/soccer/scheduling.ts`
  - Added chronological substitute-duration warnings for the third and later substitute segments.
  - Added `ScheduleQuality.substituteOveruse`, counting unique available players above the limit.
- `app/src/components/soccer/ScheduleGrids.tsx`
  - Added warning lookup for derived substitute cells.
  - Excluded unavailable players from substitute-duration warnings because they already have a distinct inactive-player warning.
- `app/src/components/soccer/ScheduleGridCells.tsx`
  - Extracted field and substitute cell rendering from the oversized schedule-grid file.
  - Preserved drag/drop, inactive-player, tooltip, keyboard, and visual warning behavior.
- `app/src/components/soccer/ScheduleQualityPopover.tsx`
  - Added substitute overuse to the orange quality-warning state and added a `Players over 14 min as sub` metric.
- `app/src/lib/soccer/scheduling.test.ts`
  - Added coverage proving two consecutive substitute segments are accepted and the third segment warns.

## 3) Design Decisions and Tradeoffs

- Substitute time is totaled across the full game, whether consecutive or separated. This follows the stated three-segment threshold while explicitly allowing two consecutive segments.
- Warning icons appear only on the third and later substitute cells. Earlier cells remain unmarked because they are within the allowed quarter.
- The quality summary counts affected players rather than excess cells, while the grid can show several excess cells for one player.
- The rule remains advisory so a coach can publish an intentional schedule.

## 4) Problems Encountered and Resolutions

- Targeted lint reported `ScheduleGrids.tsx` at 438 effective lines, above the repository's 400-line limit. Cell rendering was extracted into `ScheduleGridCells.tsx`, reducing the parent to 297 physical lines.
- The first extraction passed reactive props as one object to a style helper, which triggered Solid reactivity lint warnings. The helper was changed back to scalar arguments evaluated from JSX, preserving reactivity and clearing the warnings.

## 5) Verification and Validation

- `./node_modules/.bin/eslint src/lib/soccer/scheduling.ts src/lib/soccer/scheduling.test.ts src/components/soccer/ScheduleQualityPopover.tsx src/components/soccer/ScheduleGrids.tsx src/components/soccer/ScheduleGridCells.tsx` — passed without warnings or errors.
- `./node_modules/.bin/tsc --noEmit` — passed.
- `./node_modules/.bin/vitest run` — passed: 7 test files and 36 tests.
- Manual browser verification was not run. The new indicator uses the existing warning tooltip rendering, but an optional visual smoke test would confirm the substitute-row presentation.

## 6) Process Improvements

- Current pain: adding small warning behavior to a large interaction component can cross lint size limits late in verification.
- Proposed change: check effective line count before editing a file already near 400 lines and plan an extraction boundary up front.
- Expected benefit: fewer cleanup iterations and clearer ownership of presentational cells.
- Suggested owner/place: `AGENTS.md` component-edit checklist or the component-trim skill.

## 7) Agent/Skill Improvements

- Current pain: the Solid reactivity rule rejects prop-object style helpers even when the helper is called directly from a JSX attribute.
- Proposed change: document scalar style-helper arguments as the preferred pattern for reactive Solid props.
- Expected benefit: avoids a predictable lint/refactor loop during component extraction.
- Suggested owner/place: `.agents/skills/solid-app-patterns/SKILL.md`.

## 8) Follow-ups and Open Risks

- Optional: visually smoke-test a player who is a substitute in three segments and confirm the third cell tooltip and orange quality metric are clear.
- Known limitation: substitute duration is based on planned schedule segments, not actual game-day playing time.
- No required follow-up remains for the requested warning.
