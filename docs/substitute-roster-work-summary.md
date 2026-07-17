# Dynamic Substitute Roster Work Summary

## 1) Scope and context

The schedule-by-position grid showed only three substitute rows for an 11-player active roster when one player was unavailable for the game. The request was to derive substitute capacity from the roster (`11 - 7 = 4`), keep every active roster member visible in each segment, and present game-inactive players as disabled substitute entries with a warning. A follow-up identified that alphabetical per-segment ordering placed the inactive player in a zigzag pattern, so inactive substitutes also needed to align at the bottom with a gray background.

The change was limited to schedule display and interaction eligibility. Schedule generation, repair, scoring, the accessible assignment picker, and the player-oriented schedule view continue to use game-available players.

## 2) Major changes delivered

- `app/src/components/soccer/SchedulePage.tsx`
  - Separates the active team roster from the game-available player list.
  - Passes the full active roster and the game-inactive player IDs to the position grid.
- `app/src/components/soccer/ScheduleGrids.tsx`
  - Creates substitute rows from full active-roster size instead of available-player count.
  - Keeps inactive players in per-segment substitute lists.
  - Orders active substitutes first and inactive substitutes last in every segment, eliminating the cross-column zigzag.
  - Renders inactive names with a strike-through and a tooltip warning: “Player is inactive for this game.”
  - Prevents inactive players from starting a drag or becoming a drag/drop swap target.
  - Preserves click-to-replace behavior for a stale field assignment so a coach can correct it.
- `app/src/components/soccer/ScheduleGridCells.tsx`
  - Applies the tokenized `bg.muted` color as the inactive-cell background while preserving warning and emphasis outlines.
- `app/src/lib/soccer/scheduling.ts`
  - Adds `substituteCountForRoster` as the domain-level calculation for dynamic substitute capacity.
  - Adds `orderSubstitutesForDisplay`, which sorts by game activity before display name.
- `app/src/lib/soccer/scheduling.test.ts`
  - Covers 11, 8, 7, and 6-player roster boundaries.
  - Verifies that active players sort ahead of inactive players and that each group remains alphabetical.

## 3) Design decisions and tradeoffs

- The displayed roster is `players.filter(player => player.active)`, while game eligibility remains availability-driven. This matches the product distinction between an active team member and whether that player is in for a particular game.
- Inactive substitute cells remain visible but non-draggable. Hiding them would recreate the original row-count bug; allowing swaps would permit an ineligible field assignment.
- Inactive field assignments are not made fully inert. They cannot be dragged, but their field cell can still open the replacement picker, which supports repairing stale schedules.
- The warning is attached to the existing shared warning-icon/tooltip treatment rather than introducing a separate visual language.
- Activity status is the primary substitute-row sort key and display name is the secondary key. Sorting inactive players only by name was rejected because each segment has a different active-substitute set, producing the reported zigzag.
- The inactive fill uses `var(--colors-bg-muted)` through the existing runtime cell-style helper. A hard-coded gray was rejected because it would not follow the application theme.

## 4) Problems encountered and resolutions

- `pnpm -C app verify` failed before project checks ran because the pnpm launcher could not fetch and verify the signed pnpm 11.7.0 release. The equivalent installed binaries were run directly from `app/node_modules` instead.
- The worktree contained concurrent edits in the same scheduling files for substitute-overuse warnings. The dynamic-roster changes were reviewed against the final file state and retained those warning additions; TypeScript and tests confirmed that the combined behavior compiles.
- The soccer feature directory is currently untracked as a whole, so `git diff` could not provide a useful per-file patch. Evidence was collected from the final file contents and verification output without modifying unrelated worktree changes.

## 5) Verification and validation

- `./node_modules/.bin/tsc --noEmit`: passed.
- `./node_modules/.bin/vitest run`: passed, 7 files and 36 tests.
- Follow-up focused test: `./node_modules/.bin/vitest run src/lib/soccer/scheduling.test.ts` passed with 17 tests.
- Follow-up focused lint: `./node_modules/.bin/eslint src/components/soccer/ScheduleGrids.tsx src/components/soccer/ScheduleGridCells.tsx src/lib/soccer/scheduling.ts src/lib/soccer/scheduling.test.ts` passed with no findings.
- Initial `./node_modules/.bin/eslint .`: passed with zero errors and pre-existing warnings. After the schedule-cell extraction landed, the follow-up focused lint for all touched schedule files was clean.
- `git diff --check`: passed.
- The running Vite server accepted the changed modules through HMR without a compile error in `live-server-details.json`.
- A signed-in browser smoke test used the Eastside Falcons schedule with 11 roster members and Harper Reed unavailable. All eight inactive cells rendered in `sub-3` (the visible Sub 4 row), each exposed the inactive warning label, and each resolved to the same muted background color (`rgb(248, 250, 248)`). Visual inspection confirmed a continuous gray bottom row instead of a zigzag.

## 6) Process improvements

- Current pain: the standard `pnpm verify` gate can fail at the package-manager launcher even when dependencies are already installed. Proposed change: document direct local-binary equivalents for type-check, tests, and lint as an approved fallback. Expected benefit: separates project failures from package-manager bootstrap failures. Suggested owner: repository `AGENTS.md` verification section.
- Current pain: concurrent edits in an untracked feature directory are difficult to audit with Git. Proposed change: establish a commit or staging baseline before parallel work on the soccer feature. Expected benefit: reliable diffs and easier conflict detection. Suggested owner: repository workflow/checklist.

## 7) Agent/system prompt or skill improvements

- Current pain: the UI guidance says to preserve unrelated dirty-worktree changes but does not call out that an entire untracked feature directory makes `git diff` empty. Proposed change: add a fallback evidence step using targeted file inspection plus `git status --short` when changed targets are untracked. Expected benefit: more reliable final reviews without staging user files. Suggested owner: `post-work-doc-playbook` evidence collection guidance.
- No new Solid-specific rule was needed; the existing static Panda prop and interaction-state guidance covered this implementation.

## 8) Follow-ups and open risks

- Low risk: players with unresolved (`unknown`) availability are treated as inactive in an existing schedule because they are not in the available-ID set. This is conservative and consistent with assignment eligibility, but product copy could distinguish “unresolved” from “inactive” in a later refinement.
- Low risk: the smoke test covered one inactive player. The ordering helper has unit coverage for multiple inactive players, but a browser fixture with two or more unavailable players would provide additional visual assurance that all inactive rows remain grouped at the bottom.
