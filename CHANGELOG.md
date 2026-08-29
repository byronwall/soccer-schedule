# Changelog

This file records user-visible changes, important development workflow changes, and unresolved follow-ups for Soccer Coach Companion. Historical implementation detail remains in `docs/*work-summary.md`.

## Unreleased

- Schedule cells now use larger player names and smaller, quieter lock and warning icons.
- Position name settings now keep compact IDs and inputs side by side at every
  screen width, with less empty space between them.
- Position settings now include a scalable soccer field guide with draggable,
  keyboard-movable position labels and dashed build-out lines. The black-and-white
  guide prints as a separate landscape page after each published schedule for
  double-sided use.
- Game mode now exposes each planned seven-minute lineup independently from its
  reference timer, assumes the published positions were played unless a coach
  records a change, records full 14-minute quarters, and ends from the
  fourth-quarter clock controls. It also uses a compact lineup, leads swap
  choices with player names, and records scorers with direct short-name
  buttons. Schedule and print views now show first names without jersey numbers.
  New data uses Mystics as the team name, and stores that retain the old default
  team name update automatically.
- Scheduled games that lack an initial schedule now recover a persistent blank
  draft automatically, so the editor shows its assignment grid instead of an
  unusable empty state.
- Added pinned Prettier checks, a staged-content pre-commit hook, and agent guidance for consistent formatting.
- Removed the unused internal component-explorer routes and their prerender entries.
- The schedule editor now keeps Clear all and Remove all locks directly in the
  main toolbar instead of hiding them in a More menu.
- Schedule row and segment headers now offer scoped clear actions that remove
  only their assignments and locks, with an immediate Undo that restores the
  exact prior scope.
- Hardened the replacement schedule-generation workflow so future published
  games cannot influence a current draft's season balance, successful
  generation recovers stale schedules back to editable drafts, partial
  current-cell validity outranks filling more cells, and group-lock writes
  require the current schedule revision.

### Changed

- Season Impact position-group cells now offer a compact click-or-keyboard shortcut to add an available player into the best compatible empty slot. The action preserves locks and segment rules, explains unavailable cells accessibly, and uses the normal undoable draft history.
- The assignment picker can now clear one unlocked cell without swapping another player. This removes its assignment lock with the cell and is undoable.
- Tightened both schedule views with compact two-line headers and cells, icon-only
  lock/generation controls, full by-player position names, accurate cell-state
  legends, unclipped warning tooltips, delta-first Season Impact minutes, and
  non-blocking generation toasts. Schedule drafts can now be cleared with
  confirmation as one undoable change that removes assignments and their locks.
- Schedule planning now keeps a persistent season-impact table beneath the
  grid. It aggregates exact seconds by goalkeeper, defense, midfield, and
  forward; uses confirmed actuals for earlier games when trustworthy and
  otherwise labels published-plan coverage; excludes future games; and shows
  Before, After, percentages, and the exact current-draft delta without
  projecting empty cells. Assignment cells now show source-independent green
  preferred-position and orange avoided-position fit with icon/text semantics,
  a concise legend, and explicit error, drag-target, selection, change, lock,
  and preference precedence. Quality checks now report assignments filled,
  keep whole-schedule rules Not yet assessable on partial drafts, and give
  every priority-ordered rule tap/focus help. Continuity is now an internal
  goalkeeper-first, defender-second soft generator rule; version 6 migration
  removes the retired team/game settings and actions while loading older
  stores safely.
- Schedule generation is now one direct, typed operation with all, player,
  position-row, and seven-minute-segment targets. It accepts blank, partial, or
  complete drafts; preserves every lock absolutely; fills target blanks;
  reconsiders unlocked target assignments with only necessary counterparts;
  and ranks validity, current-game minutes, cumulative season minutes,
  season role balance, preferences, continuity, variety, and minimal changes
  in the approved order. Results apply immediately as one undoable revision,
  temporarily highlight every changed cell, summarize the highest-priority
  improvement, report named lock/availability errors, and leave the draft
  untouched with an explanation when nothing improves. The old refinement
  dialog, bounded-expansion flow, candidate comparison, and whole-schedule
  regenerate contracts and controls have been removed.
- New games now begin with a persisted blank schedule draft instead of an
  automatically generated 56-cell rotation. Partial drafts retain real empty
  cells across refresh, availability changes, and undo/redo; distinguish
  incomplete, complete-but-invalid, valid-draft, and published readiness; and
  block publishing, final printing, and game-day tracking with direct recovery
  guidance until a complete valid plan is published. Clicking an empty cell
  assigns a player directly and automatically locks only that coach-targeted
  destination, including during swaps. Coaches can also lock every currently
  filled assignment for a player, position row, or seven-minute segment, see
  none/some/all lock states in text and accessible pressed states, toggle
  individual cell locks, and remove all locks after confirmation without ever
  turning blank cells into placeholder assignments.
- Final Stephen-feedback hardening keeps the live clock/lineup render deterministic until the
  tracker mounts to avoid SSR hydration drift. A new game with no rotation now
  prompts generation instead of incorrectly describing a published schedule.
- Completed games now derive exact second-level field, bench, and per-position
  intervals from explicitly confirmed live ledgers, including pause/resume,
  half- and quarter-boundary plan changes, substitutions, field swaps,
  same-clock command order, published-lineup resets, and retroactive void
  corrections. Completed-game and player-history views compare those trusted
  actuals directly with the immutable published plan, show individual
  own-team goal events without a score or result, and keep incomplete,
  unrecorded, and migrated legacy actuals visibly unavailable rather than
  substituting planned values. Player profiles now also show season attack,
  defense, goalkeeper, and confirmed-scoring coverage while retaining
  published-plan exact-position variety.
- Game mode now persists a versioned, actor-attributed event ledger instead of
  transient lineup overrides. It records clock start/pause/resume, quarter
  advances, bench substitutions, atomic field-position swaps, own-team player
  goals, published-lineup resets, event voids, and explicit completion and
  confirmation under expected live revisions. The mobile-first tracker
  reconstructs the lineup after refresh, keeps quarter history while loading
  the next published segment, resists duplicate goal submissions, provides
  clear success feedback and recent-event correction, and keeps every
  incomplete or migrated legacy record outside trusted actual history.
- Player profiles now store scheduling preferences separately from core player
  identity in an explicitly migrated, versioned model. Coaches can prefer,
  neutralize, or avoid each exact position, apply the same disposition through
  attack/midfield/defense/goalkeeper shortcuts, favor a player for a
  mathematically unavoidable extra segment without widening the seven-minute
  fairness bound, and keep a private note that generation never interprets.
  Initial generation, targeted generation, and repair now apply those
  preferences lexicographically after hard validity and minute fairness.
  Schedule quality names relaxed
  avoids, unmet preferred positions, and favored-extra misses.
- Player profiles now distinguish completed-game published-plan minutes and
  positions from confirmed actual game-day history.
- Added a code-grounded action plan for Stephen Turchyn's coaching feedback
  and the follow-up multi-step scheduling proposal. It compares progressive
  fill-and-lock, scoped regeneration, and coaching-recipe candidate workflows,
  locks in a hybrid recipe-plus-scoped-refinement workflow, and integrates
  exact-position preferences, bounded field-time tie-breaking, substitution
  policy, minimal actual-game tracking, own-team goal recording without a
  scoreboard, truthful reporting, and later calendar opportunities into
  sequenced delivery slices with acceptance scenarios and validation
  checkpoints. Game mode is explicitly limited to direct substitutions,
  position swaps, factual event logging, and duplicate-resistant goal entry
  rather than live fairness or next-sub logic; actual statistics require
  explicit game completion and confirmation.
- Schedule generation now strongly avoids assigning a player the same exact position in different quarters while preserving validity and playing-time fairness. Remaining cross-quarter role repeats appear as non-blocking quality warnings on every affected cell and identify the player, position, and quarters in the quality panel. Substitute overuse now starts at 4 substitute segments; 3 is considered normal.
- Game availability now repairs missing active-player records and upserts individual or bulk “All in” changes, including for players added or reactivated after a game was created. Bulk updates affect only the active roster, and stale client writes refresh team data and show a normal in-app error instead of causing an uncaught client exception.
- SolidStart server base paths now avoid a trailing slash and remain enforced in the resolved client configuration so generated query/action requests use the intended `/_server` endpoint.
- Automatic schedules now use the minimum substitutions needed to bring the full four-player bench onto the field, rotate midfielders out first, preserve retained players in their positions within each quarter, and keep the goalkeeper stable within each quarter.
- Passwords now require only a non-empty value instead of a 12-character minimum.
- Authentication now uses one environment-configured master sign-in plus persisted user accounts managed by the super user. User passwords are individually salted and hashed with scrypt, and removing a user revokes their active sessions.
  - Problem: production's `COACH_CREDENTIALS_JSON` was truncated and invalid, so the login page could not load its credential list.
- Development tooling now coordinates around one shared hot-reloading server and provides a direct verification launcher when pnpm bootstrap cannot start repository scripts.
  - Problem: duplicate wrappers hot-reload the same checkout and can mutate the same development data.
- Repository guidance now treats `app/data` as disposable local state and uses targeted manual browser checks instead of a committed end-to-end test suite.
- The soccer store is split into focused persistence, authentication, action, and domain-helper modules.
- Routine work records a concise changelog entry; full implementation retrospectives are created only when explicitly requested.

### Verification

- Independent replacement-plan audit: `pnpm -C app verify` again stalled in
  the pnpm launcher, while `node app/scripts/verify.mjs` passed TypeScript, all
  132 Vitest tests, and ESLint with only the 10 pre-existing
  component-explorer warnings. Desktop and 390 × 844 browser checks covered a
  persisted blank game; four manually assigned and locked goalkeepers; a
  14-cell / +98-minute partial; player, position, segment, and Fill all
  generation; changed-cell feedback and Undo/Redo; named impossible-lock
  failure and Remove-all recovery; publishing; live-game and player-history
  regressions; 44px schedule actions; and a clean hard-load console.
- Delivery 5–6 verification: `pnpm -C app verify` again stalled in the pnpm
  launcher, while `node app/scripts/verify.mjs` passed TypeScript, all 127
  Vitest tests, and ESLint with only the 10 pre-existing component-explorer
  warnings. Desktop and 390 × 844 browser checks covered an exact 14-cell /
  +98-minute partial draft, Not yet assessable whole-game rules, all ten
  tap/keyboard help controls, a full valid draft, named continuity exceptions,
  manual locked preferred placement, avoided-position and error precedence,
  the responsive Before/After table, removal of both continuity settings,
  contrast above 14:1 in assignment cells, owned table overflow, and a clean
  console.
- Delivery 3–4 targeted-generation verification: `pnpm -C app verify` again
  stalled before the project script emitted output, so the documented direct
  verifier passed TypeScript, all 121 Vitest tests, and ESLint with only the 10
  pre-existing component-explorer warnings. Desktop and 390 × 844 browser
  checks covered partial Fill all with locked goalkeeper cells; player,
  position, and segment targets; accurate temporary highlights; persistent
  immediate Undo and exact restoration; no-change feedback; a named
  unavailable locked-player error with blocked publish; unlock-and-refill
  recovery to a valid draft; 44px direct-action touch targets; main-content
  mobile fit; and a clean console.
- Delivery 1–2 partial-draft and lock verification: the pnpm launcher again
  exposed no project output, so the documented direct checks passed TypeScript,
  all 126 Vitest tests, and ESLint with only the 10 pre-existing
  component-explorer warnings. Desktop and 390 × 844 browser checks created a
  new blank game, assigned empty cells, exercised cell/player/position/segment
  locks and accessible none/some/all states, confirmed Remove all locks,
  reloaded the partial draft, verified publish/print/game-day blocking, and
  found no console warnings or errors. The schedule main content fits 390px;
  the previously documented 440px super-user header overflow remains.
- Final implementation audit: the required `pnpm -C app verify` launcher again
  emitted no project output and was stopped after 30 seconds; the documented
  direct verifier passed TypeScript, all 116 Vitest tests, and ESLint with only
  the 10 pre-existing component-explorer warnings. Desktop and 390 × 844
  browser checks covered preference-aware generation; scoped
  preview/reject/accept/undo; candidate preview/accept/undo; continuity and
  coverage; live substitution, swap, duplicate-resistant goal entry, void,
  reload, later goal, and confirmation; planned-versus-actual and goal
  history; main-content mobile fit; and a clean console.
- `pnpm -C app verify` again did not reach the project script or emit output
  and was stopped after 30 seconds. The documented direct verifier passed
  TypeScript, all 115 Vitest tests, and ESLint with only the 10 pre-existing
  component-explorer warnings. Desktop and 390 × 844 browser checks covered
  Violet's confirmed planned-versus-actual game summary and player history,
  exact field/bench/position totals, repeated own-team goal events, season
  coverage, the legacy-unavailable state, the quality-distinct candidate
  preview, mobile main-content fit, and live mode with no score, result,
  substitution advice, or console warnings/errors. The known super-user header
  remains the only 440px-wide element at the 390px viewport.
- `pnpm -C app verify` again did not reach the project script or emit output;
  the documented direct verification passed TypeScript, 103 Vitest tests, and
  ESLint with only the 10 pre-existing component-explorer warnings. Desktop
  and 390 × 844 browser checks covered the full Violet event sequence,
  double-click goal resistance, a later separate goal, reload and second-tab
  reconstruction, recent-event void/recomputation, quarter history,
  pause/resume, immutable published assignments, explicit confirmation, and a
  clean console. The tracker content fits 390px; the previously documented
  super-user header remains the only 440px mobile overflow.
- `pnpm -C app verify` did not start the project script or emit output because
  the pnpm launcher failed before execution. The documented direct checks
  passed TypeScript, 93 Vitest tests, and ESLint with only the 10 pre-existing
  component-explorer warnings. Desktop and 390 × 844 browser checks covered
  team-default persistence, per-game override persistence and inheritance,
  regeneration with defensive anchors, named continuity exceptions,
  non-blocking attack/defense warnings, all-seven-position player season
  variety including goalkeeper, responsive policy/quality surfaces, and a
  clean browser console.
- `pnpm -C app verify` did not start because the pnpm 11 launcher could not
  verify its registry signature. The documented direct fallback,
  `node app/scripts/verify.mjs`, passed TypeScript, 83 Vitest tests, and ESLint
  with only 10 pre-existing component-explorer warnings. Manual desktop and
  390 × 844 checks covered group and exact-position editing, private-note and
  preference persistence after reload, whole-schedule regeneration, favored
  extra time, avoided goalkeeper removal, preferred midfield placement,
  seven-minute fairness, quality explanations, and a clean browser console.
- `node app/scripts/verify.mjs` and direct fallback checks passed TypeScript,
  73 Vitest tests, and ESLint with 10 pre-existing component-explorer warnings;
  `pnpm -C app verify` again did not start the project script or emit output.
  Manual desktop and 390 × 844 checks covered scoped goalkeeper expansion,
  quality and assignment preview, reject, accept, undo, and planned-history
  language.
- `node app/scripts/verify.mjs` passed TypeScript, 47 Vitest tests, and ESLint with 10 pre-existing warnings for the availability repair and bulk “All in” workflow. `pnpm -C app verify` again stalled in the package-manager launcher before the project script emitted output.
- `node app/scripts/verify.mjs` passed TypeScript, 37 Vitest tests, and ESLint with 10 pre-existing warnings. `pnpm -C app verify` reproduced the package-manager launcher stall and was stopped before the project script emitted output.
- A duplicate `pnpm -C app dev` reused the advertised server instead of spawning another Vinxi process.
- Manual Browser/Playwright MCP checks covered dashboard loading, direct-loaded position settings, the published schedule, and the game-day view at 390 × 844 with no horizontal overflow or browser-console errors.
- `docker compose config`, `git diff --check`, and validation of the updated post-work skill passed.

### Follow-ups

- The super-user-only fifth mobile header item makes the existing header
  440px wide at a 390px viewport; the new preference editor's main content
  itself fits the viewport.
- Revisit authentication and deployment credential behavior before the first production deployment.
