# Goalkeeper Duration Warning Work Summary

## 1) Scope and Context

- Requested behavior: warn during schedule review when one player is assigned more than a full 14-minute quarter as goalkeeper.
- Changed the existing non-blocking schedule quality and cell-warning flow. Publishing rules and hard schedule validation remain unchanged.
- The fixed game model uses 7-minute schedule segments, so the warning threshold is crossed on a player's third goalkeeper segment.

## 2) Major Changes Delivered

- `app/src/lib/soccer/scheduling.ts`
  - Added a `goalkeeper-overuse` cell warning for the third and each later goalkeeper segment assigned to the same player.
  - Added the player id to cell-warning records so quality scoring can count affected players without player-name data.
  - Added `ScheduleQuality.goalkeeperOveruse`, counting unique players scheduled for more than 14 minutes in goal.
- `app/src/components/soccer/ScheduleQualityPopover.tsx`
  - Added goalkeeper overuse to the orange warning state.
  - Added a `Players over 14 min in goal` quality metric.
  - Kept the popover below the repository complexity guardrail by extracting quality calculations and the metric group.
- `app/src/lib/soccer/scheduling.test.ts`
  - Added coverage proving the first two goalkeeper segments do not warn, later segments do warn, and one over-limit player is counted once.

## 3) Design Decisions and Tradeoffs

- The condition is a warning, not a blocking error. This matches the request and preserves a coach's ability to publish an intentional schedule.
- Warnings appear on the excess goalkeeper cells rather than every goalkeeper cell for that player. This identifies the assignments that push the total past 14 minutes and avoids marking valid time.
- The summary counts players, while cell warnings can appear more than once for a player with several excess segments. This keeps the quality metric aligned with the wording `Players over 14 min in goal`.
- Total goalkeeper time is game-wide, not limited to consecutive segments or one quarter. The request refers to the same player's total time in goal.

## 4) Problems Encountered and Resolutions

- `pnpm -C app verify` and the focused `pnpm` test command produced no output and did not complete in the command runner, despite `pnpm --version` succeeding.
- Verification was completed with the repository-local binaries that the script delegates to: TypeScript, Vitest, and ESLint. This avoided changing dependencies or relying on network access.
- The initial UI change left `ScheduleQualityPopover` over the configured complexity threshold. Derived warning, label, color, and metric logic were extracted; targeted lint then passed without warnings.

## 5) Verification and Validation

- `./node_modules/.bin/eslint src/components/soccer/ScheduleQualityPopover.tsx src/lib/soccer/scheduling.ts src/lib/soccer/scheduling.test.ts` — passed with no warnings or errors.
- `./node_modules/.bin/tsc --noEmit` — passed.
- `./node_modules/.bin/vitest run` — passed: 7 test files and 35 tests.
- `git diff --check` — passed.
- Manual browser verification was not run because the change uses the existing cell-warning and quality-popover rendering paths and the local dev server was not required for the domain behavior. A visual smoke test remains optional.

## 6) Process Improvements

- Current pain: package-script invocations can hang silently in the command runner.
- Proposed change: after one stalled package-script attempt, run the exact local binaries named by the script and record that substitution.
- Expected benefit: preserves the intended quality gates without losing time to an environment-specific wrapper issue.
- Suggested owner/place: repository verification checklist or `AGENTS.md` troubleshooting guidance.

## 7) Agent/Skill Improvements

- Current pain: the post-work playbook requires a full retrospective for very small, localized changes, which can create documentation disproportionate to the code change.
- Proposed change: add a lightweight report variant for changes limited to a few files, while retaining scope, decisions, verification, and open risks.
- Expected benefit: keeps maintenance notes useful and reduces repetitive documentation.
- Suggested owner/place: `.agents/skills/post-work-doc-playbook/SKILL.md`.

## 8) Follow-ups and Open Risks

- Optional: visually smoke-test a schedule containing three goalkeeper assignments for one player to confirm the warning icon tooltip and orange quality summary are clear at desktop and narrow widths.
- Known limitation: goalkeeper duration is based on planned 7-minute schedule segments, not actual game-day elapsed time. This is intentional for schedule-process validation.
- No required follow-up remains for the requested warning.
