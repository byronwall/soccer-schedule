# Position color coding implementation summary

## 1. Scope and context

The request was to give each field position a color, use those colors in the schedule editor's **By player** view, and add a legend. The supplied screenshot showed a dense comparison grid, so the implementation kept the table as the dominant work surface and used compact colored code chips rather than coloring entire rows or cells.

The existing seven position IDs, editable labels, ordering, short codes, and scheduling behavior remain unchanged.

After visual review, the original role palette was judged too saturated for repeated use across the grid. The seven colors were subsequently shifted to quieter, earthier hues while retaining unique role identities and readable white badge labels.

## 2. Major changes delivered

- Added one stable hex color to every position definition in `app/src/lib/soccer/fixed-game.ts`.
- Refined the original high-saturation palette to muted purple, blue, teal, olive, ochre, and red values. The lightest revised badge color retains a 4.67:1 contrast ratio against white text.
- Added a compact position legend above the player schedule grid. It includes all seven short codes with their current editable labels plus a neutral Bench entry.
- Replaced plain position text in the By player grid with filled, color-coded position badges. Bench remains a neutral gray badge.
- Retained the position short code and accessible name on every badge so assignments are not communicated by color alone.
- Kept player identity colors limited to the small dot beside each player's name; assignment cells now communicate position rather than player color.
- Extracted the player-oriented grid and legend to `app/src/components/soccer/PlayerScheduleGrid.tsx`; `app/src/components/soccer/ScheduleGrids.tsx` returned below the repository's 400-line lint threshold.
- Added a scheduling-domain test that verifies all position colors are valid uppercase six-digit hex values and unique.

## 3. Design decisions and tradeoffs

### Stable colors belong to stable position definitions

- Decision: define colors beside position IDs, short codes, and groups in `fixed-game.ts`.
- Alternative: persist editable colors in the soccer store or derive colors from array order at render time.
- Reason: the request required consistent color coding, not color customization. Stable definitions guarantee the same role always receives the same color without a data migration or additional settings state.
- Tradeoff: coaches cannot currently customize the palette.

### Use chips instead of full-cell backgrounds

- Decision: render a compact filled badge centered in each assignment cell.
- Alternative: tint the entire cell or row.
- Reason: chips preserve row and column gridlines, keep Bench visually quiet, and make repeated position patterns easy to scan without overwhelming the table.
- Tradeoff: the colored target is smaller than a full cell, but the visible code keeps it readily identifiable.

### Desaturate without making the roles indistinct

- Decision: replace the original bright palette with individually selected muted hex colors rather than applying opacity or a runtime CSS filter.
- Alternative: reduce opacity on the existing colors or tint the full badge surface against the page background.
- Reason: explicit opaque colors render consistently, preserve the existing white-label treatment, and keep every role visually distinct.
- Tradeoff: the revised colors are less vivid, but all seven remain unique and meet at least 4.5:1 contrast against white text.

### Keep the legend attached to the grid

- Decision: place an unboxed, wrapping legend immediately above the table inside the same horizontally scrollable work region.
- Alternative: use a separate card, popover, or page-level legend.
- Reason: the legend is supporting context and should stay near the codes without competing with the schedule editor toolbar.
- Tradeoff: unusually long customized position labels may wrap the legend to a second line.

## 4. Problems encountered and resolutions

### Schedule grid exceeded the source-file size guardrail

- Symptom: full lint reported `ScheduleGrids.tsx` at 403 effective lines, above the 400-line limit.
- Root cause: the new player grid, legend, and badge helpers were initially added to an already large shared grid file.
- Resolution: extracted the complete By player feature island to `PlayerScheduleGrid.tsx` and updated `SchedulePage.tsx` to import it directly.
- Preventative action: treat the By position and By player grids as separate component boundaries for future enhancements.

### pnpm wrapper attempted an offline signature lookup

- Symptom: `pnpm -C app type-check` stopped before TypeScript with an npm-registry signature verification/fetch error.
- Root cause: the package-manager wrapper attempted to verify or switch the pinned pnpm release while network access was unavailable.
- Resolution: ran the installed local binaries directly for TypeScript, Vitest, and ESLint.
- Preventative action: use the repository-installed binaries as the fallback when package-manager bootstrap fails before invoking a script.

The same pnpm/Corepack bootstrap issue recurred during the palette refinement: `pnpm -C app verify` produced no script output and was stopped. The installed binaries were used again and completed successfully.

## 5. Verification and validation

- `./node_modules/.bin/tsc --noEmit --pretty false` from `app/`: passed.
- `./node_modules/.bin/vitest run` from `app/`: passed, 7 files and 31 tests.
- `./node_modules/.bin/eslint .` from `app/`: passed with no errors. Existing warnings remain in unrelated component-explorer files, `ScheduleQualityPopover.tsx`, and the soccer store.
- Focused lint over `ScheduleGrids.tsx`, `PlayerScheduleGrid.tsx`, `SchedulePage.tsx`, `fixed-game.ts`, and `scheduling.test.ts`: passed with no warnings.
- Size check: `ScheduleGrids.tsx` is 344 physical lines; `PlayerScheduleGrid.tsx` is 81 physical lines.
- Browser validation against the running schedule route:
  - Opened the By player view.
  - Confirmed a single accessible `Position color legend` region.
  - Confirmed all seven position codes and Bench appear in the legend.
  - Confirmed repeated grid assignments expose both short code and full label to accessibility tooling.
  - Visually confirmed distinct colors, neutral Bench chips, compact rows, and aligned minute totals after extraction.
- Not run: production build, because the change does not affect deployment or build configuration.

Palette refinement verification:

- `./node_modules/.bin/tsc --noEmit --pretty false` from `app/`: passed.
- `./node_modules/.bin/vitest run` from `app/`: passed, 7 files and 34 tests. The expected missing-coach-credentials error was exercised by its API test and did not fail the suite.
- `./node_modules/.bin/eslint .` from `app/`: passed with 0 errors and 12 pre-existing warnings in unrelated files.
- Contrast calculation for the seven revised colors: passed; white-text ratios range from 4.67:1 to 5.56:1.
- Browser smoke check: the app loaded successfully at the advertised local server. The local dataset contained no scheduled game or roster, so a populated-grid visual comparison was not available in that environment; the user-provided populated screenshot remains the visual reference.

## 6. Process improvements

- Run full lint—not only focused lint—before visual handoff so source-size guardrails catch feature files that need extraction.
- Use the rendered grid to validate color density. Static code review cannot reliably show whether seven repeated colors overwhelm the table.
- Include a seeded populated schedule in local visual-test data so palette refinements can be compared in the actual repeated grid without depending on a user session.
- Keep legends adjacent to their visualization and validate them with both a screenshot and an accessible region query.

## 7. Agent/skill improvements

- Current pain: a focused UI addition can cross the 400-line guardrail late in the task even when the new component itself is small.
- Proposed change: add a pre-edit line-count checkpoint to the component-trim refactor trigger guidance for files already above roughly 320 lines.
- Expected benefit: natural feature islands can be extracted before implementation, reducing move-only churn at the end.
- Suggested owner/place: `component-trim-refactor/SKILL.md` or the repository's UI component checklist.

- Current pain: the advertised local server can be healthy while its dataset is too sparse to validate schedule-specific visuals.
- Proposed change: add a documented fixture or seed command for the representative roster and eight-segment schedule.
- Expected benefit: agents can validate palette density and grid readability after small visual changes.
- Suggested owner/place: repository `AGENTS.md` development/visual-verification guidance or a soccer fixture script.

## 8. Follow-ups and open risks

- Low priority: add editable position colors to the position settings page only if coaches need palette customization; the current palette is intentionally fixed.
- Low priority: add automated browser assertions for computed badge background colors if visual regression coverage is introduced.
- Known limitation: the legend may wrap when customized position names are substantially longer than the defaults, but it remains usable inside the existing horizontal schedule viewport.
- Residual risk: the revised palette has been contrast-checked but was not re-captured in a populated browser grid because the available local dataset was empty.
