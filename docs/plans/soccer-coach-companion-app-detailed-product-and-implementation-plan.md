# Soccer Coach Companion: Detailed Product and Implementation Plan

Status: Product decisions resolved; ready for implementation planning  
Source: [requirements dictation](./soccer-coach-companion-app-requirements-and-workflow.md)  
Target repository: SolidStart + Panda CSS + Park UI starter in `app/`

## Resolved product decisions

1. **Deployment and audience:** This is a private, single-team tool. It runs as one file-backed application instance and is not designed for unrelated teams, self-service onboarding, billing, or multi-tenant operation.
2. **Primary success criterion:** Creating, reviewing, adjusting, and printing the next game's schedule is the release-defining workflow. Game-day mode is worthwhile but must not delay or destabilize schedule preparation.
3. **Scheduling priorities:** After basic validity, optimize goals in this order:
   1. Equal planned minutes within the game.
   2. Mid-quarter rotation away from high-exertion midfield positions.
   3. Keeping one goalkeeper for each complete quarter.
4. **Playing-time source:** Published planned assignments are sufficient for game and season totals. The app will not reconstruct actual playing time from game-day changes.
5. **Access:** Exactly two configured coaches use the application. There are no parent/public links. Each coach signs in with a named credential and long password supplied through environment configuration.
6. **Connectivity:** Assume internet access at the field. Offline loading, offline edits, synchronization queues, and conflict reconciliation are out of scope.
7. **Live collaboration:** Either coach may start, pause, advance, or change the live lineup. Updates must synchronize between devices, but there is no controller/owner lease.
8. **Game model:** The game format and field positions are fixed: four 14-minute quarters, each divided into two 7-minute segments, with seven fixed positions.
9. **Client platform:** A responsive installable PWA is sufficient. Do not build native iOS, widgets, or Live Activities.
10. **Secondary administration:** Calendar files, invitations, parent availability collection, reminders, opponent notes, scorekeeping, contact management, and sharing are out of scope.

No further product questions are required for this plan. New questions should only be raised if implementation reveals a contradiction that changes the primary schedule workflow.

## Product-risk review after the decisions

### 1. “Valid schedule” must remain distinct from “preferred schedule”

The dictation calls fast schedule creation the most important capability, but combines structural validity with fairness and position preferences ([source lines 137–165](./soccer-coach-companion-app-requirements-and-workflow.md#L137), [175–213](./soccer-coach-companion-app-requirements-and-workflow.md#L175)). The resolved priority order prevents the generator from failing merely because all preferences cannot be satisfied.

- Hard validity: every position is filled, no player appears twice in a segment, and only available active players are assigned.
- First optimization: minimize the spread in total planned segments/minutes.
- Second optimization: rotate a player out of midfield at the seven-minute boundary.
- Third optimization: keep the same goalkeeper for both segments in a quarter.
- If the second or third preference must be relaxed to maintain a valid, more equal schedule, generate the schedule and show a named warning.

### 2. Game-day changes must not corrupt published schedule statistics

The dictation wants emergency substitutions while preserving the original plan ([source lines 235–241](./soccer-coach-companion-app-requirements-and-workflow.md#L235)). Because planned time is the accepted reporting source, live mode should maintain only a synchronized current-lineup override. It must never mutate published assignments or feed season totals.

### 3. Fixed rules should be constants, not configurable records

The dictation explores multiple formations and generic slots ([source lines 109–121](./soccer-coach-companion-app-requirements-and-workflow.md#L109), [421–445](./soccer-coach-companion-app-requirements-and-workflow.md#L421)), but the product decision fixes the format and positions. Building formation editors, format schemas, and migration rules would add UI and data risk without user value. Fixed segments and positions belong in a typed domain constants module.

### 4. Two-coach collaboration should use semantic commands, not whole-state overwrites

Both coaches may update live mode. A naive last-write-wins save of the entire live object could erase another coach's substitution or clock action. The simplest safe design is a serialized file-store command handler: each action applies one semantic command to the latest state, increments a revision, and returns the new snapshot. Clients poll for that snapshot every two seconds.

### 5. The starter's account and SaaS surface is broader than this product

The repository contains magic-link, Stripe, email, analytics, and admin scaffolding. The private tool only needs two environment-configured credentials and file-backed sessions. Implementation should isolate or remove user-facing SaaS paths rather than accidentally exposing unused account/billing concepts.

## Product definition

### Product promise

A coach can mark attendance, generate a fair and structurally valid lineup for the next game, make a few clear adjustments, and print or open a phone-friendly schedule without maintaining an Excel grid.

### Primary user and moments

- Users: two equal-permission coaches for one team.
- Primary moment: the day before a game, after attendance is known.
- Primary job: produce and verify the next game's player-to-position rotation.
- Secondary moment: on the sideline, glance at the current lineup, time remaining, and next changes.
- Fallback: print the position-oriented schedule and run the game without live mode.

### Success measures

- With 11 active players, seven positions, and eight segments, a coach can mark availability and publish a candidate in under two minutes.
- Typical generation completes within two seconds on the server.
- A generated schedule always has zero hard validity errors or returns a specific explanation of why generation is impossible.
- When all players are available, planned time differs by at most one 7-minute segment unless fixed/limited attendance makes that impossible.
- The quality summary explicitly reports minute spread, midfield continuity exceptions, and goalkeeper continuity exceptions.
- A coach can replace or swap an assignment and immediately see updated quality results.
- The printed schedule fits legibly on letter and A4 paper without clipped names or browser zoom.
- On a phone, the current lineup and next changes are readable without zooming.
- A live update by one coach appears on the other coach's connected device within three seconds under normal conditions.

## Scope

### Core release

- Environment-configured login for two named coaches.
- One current team and season.
- Roster management: display name, jersey number, and active status.
- Game creation: opponent, date/time, arrival time, and venue.
- Per-game availability: available, unavailable, or unknown.
- Deterministic schedule generation against fixed segments and positions.
- Quality scoring using the resolved priority order.
- Schedule views by position and by player.
- Manual replace, swap, lock, undo, redo, repair, and regenerate operations.
- Published schedule versions and planned game/season totals.
- Print-friendly schedule.
- Responsive application shell and schedule editor.

### Follow immediately after the core release

- Game-day route with shared clock, current lineup, bench, next-change callouts, and temporary lineup overrides.
- Two-second polling for cross-device synchronization.
- Installable PWA manifest and icons; no offline guarantee.

### Explicit non-goals

- Multiple teams, organizations, tenants, roles, invitations, or billing.
- Public, parent, token, or emailed schedule sharing.
- Configurable periods, segment lengths, formations, or position definitions.
- Actual playing-time calculation or permanent substitution history.
- Offline loading or offline writes.
- Native iOS, widgets, lock-screen activities, or App Store distribution.
- Calendar downloads, reminders, parent responses, contacts, opponent notes, scores, or goals.
- League management, standings, messaging, or a team CRM.
- AI-generated schedules. Generation is deterministic domain logic.
- Player photos, birthdays, medical notes, or other unnecessary child data.
- Editing generated Panda files under `app/styled-system/`.

## Fixed soccer model

### Game timing

- Four quarters.
- Each quarter lasts 14 minutes.
- Each quarter contains two 7-minute schedule segments.
- Eight total schedule segments.
- Total regulation playing time: 56 minutes.
- Seven field positions per segment.
- Total assignment capacity: 56 player-segments, or 392 planned player-minutes.

### Position keys

The exact labels are fixed and stored in code:

| Key | Display label | Group | Mid-quarter rotation target | Quarter continuity target |
| --- | --- | --- | --- | --- |
| `goalkeeper` | Goalkeeper | Goalkeeper | No | Yes |
| `leftDefense` | Left Defense | Defense | No | No |
| `rightDefense` | Right Defense | Defense | No | No |
| `leftMidfield` | Left Midfield | Midfield | Yes | No |
| `rightMidfield` | Right Midfield | Midfield | Yes | No |
| `leftForward` | Left Forward | Forward | No | No |
| `rightForward` | Right Forward | Forward | No | No |

Put these values in `app/src/lib/soccer/fixed-game.ts` as readonly literal arrays. Derive `SegmentKey`, `PositionKey`, and `PositionGroup` from the arrays instead of maintaining duplicate unions.

### Segment keys

Use stable keys `q1a`, `q1b`, `q2a`, `q2b`, `q3a`, `q3b`, `q4a`, and `q4b`. Each segment constant includes:

- quarter index `1..4`;
- half-within-quarter `a | b`;
- start game second;
- end game second;
- short and display labels.

Breaks between quarters are not part of planned playing time. The live clock tracks one 14-minute quarter at a time and is explicitly advanced by either coach.

## Core workflows

### 1. Sign in

1. Coach opens `/login`.
2. Coach selects or enters the configured coach name and supplies the long password.
3. Server compares the credential against environment configuration using a timing-safe comparison.
4. On success, server creates an opaque file-backed session and sets an HttpOnly, SameSite cookie.
5. Coach is redirected to the dashboard.

No password reset, email delivery, registration, or invitation workflow is needed. Changing a password means changing the environment value and restarting/redeploying the app; existing sessions may be revoked from the data file or invalidated with a session-version environment value.

### 2. Maintain the roster

1. Coach opens `/roster`.
2. Coach adds players with display name and optional jersey number.
3. Coach marks departed/unavailable-for-season players inactive instead of deleting historical records.
4. Dashboard and new games use active players by default.

Roster setup must work with names only. There are no position-preference or contact forms in the core release.

### 3. Prepare the next game

1. Coach creates a game with opponent, start time, optional arrival time, and venue.
2. Every active player receives `unknown` availability.
3. Coach explicitly marks players available or unavailable.
4. The app shows capacity math: available players, 56 field assignments, and target segments/minutes per player.
5. Generation remains disabled while any active player's availability is unknown, with an action to mark all remaining players available.
6. Coach generates a deterministic candidate.
7. App shows the position grid and quality summary.
8. Coach switches to the player view to review total minutes and position distribution.
9. Coach replaces/swaps assignments and optionally locks deliberate choices.
10. Coach publishes the schedule, then prints it or opens live mode.

If the number of available players is below seven, generation fails before search and explains that all seven positions cannot be filled. A roster larger than seven is valid; the bench is the set of available players without an assignment in a segment.

### 4. Respond to a pre-game availability change

1. Changing availability marks an existing draft or published schedule stale.
2. The editor identifies assignments involving newly unavailable players.
3. `Repair` preserves all unaffected assignments and fills invalid cells while minimizing changes.
4. `Regenerate` creates a fresh draft after confirmation.
5. The last published schedule remains printable until a repaired draft is published.
6. Publishing supersedes the previous published version.

### 5. Run the game

1. Coach opens `/games/:gameId/live`; a published schedule is required.
2. The route loads the shared live snapshot and begins two-second polling.
3. Either coach may start or pause the current quarter clock.
4. The current segment derives from elapsed quarter seconds: `0–419` is `a`, `420–839` is `b`.
5. The page shows planned current positions, bench, time remaining, and next scheduled changes.
6. For an injury/rest, either coach replaces a current position with a bench player. This creates a temporary current-segment override only.
7. Either coach can clear one override or reset the current lineup to the published plan.
8. At the next segment/quarter, overrides clear automatically.
9. Either coach advances to the next quarter; the clock resets to 14:00 and waits to start.
10. Completing quarter four marks live mode complete. Published planned totals remain the only statistics.

Live actions apply as semantic server commands to the latest stored state. There is no controller lease and no actual-time event ledger.

### 6. Print and season review

1. Coach opens `/games/:gameId/print` or invokes print from the editor.
2. Position-oriented rows are the default because they are fastest to read during the game.
3. The page includes game details, segment labels, player names/numbers, bench per segment, and an abbreviation legend.
4. Dashboard season totals aggregate only published planned assignments.

## Information architecture and routes

| URL | Route file | Access | Purpose |
| --- | --- | --- | --- |
| `/login` | `app/src/routes/login.tsx` | Public | Named coach + environment password login. |
| `/` | `app/src/routes/index.tsx` | Coach | Single-team dashboard with next game, schedule status, planned season totals, and recent games. Replace all starter identity. |
| `/roster` | `app/src/routes/roster.tsx` | Coach | Add/edit/deactivate players for the current season. |
| `/games/new` | `app/src/routes/games/new.tsx` | Coach | Create a game using the fixed game model. |
| `/games/:gameId` | `app/src/routes/games/[gameId]/index.tsx` | Coach | Game logistics, availability, capacity, and schedule status. |
| `/games/:gameId/schedule` | `app/src/routes/games/[gameId]/schedule.tsx` | Coach | Generate, edit, validate, publish, and review planned totals. |
| `/games/:gameId/live` | `app/src/routes/games/[gameId]/live.tsx` | Coach | Shared clock, current/next lineup, bench, and temporary overrides. |
| `/games/:gameId/print` | `app/src/routes/games/[gameId]/print.tsx` | Coach | Print-only schedule with minimal chrome. |

Keep `/api/auth/logout`. Replace or retire the public magic-link request/consume flow so it is not exposed as a parallel login mechanism. Prefer SolidStart `query` + `createResource` for reads and typed server actions for writes. No new public JSON API is required.

### Navigation

- Desktop/tablet: compact header with `Dashboard`, `Roster`, `New game`, coach identity, and logout.
- Mobile: compact header; game pages surface `Schedule`, `Live`, and `Print` as local actions.
- Schedule editor: full eight-column grid on desktop/tablet; one quarter at a time on narrow screens, with totals always reachable.
- Live mode: minimal chrome, large clock, position-first current lineup, next changes, and bench.

## Data structures

All persisted JSON is parsed by Zod. Types are derived with `z.infer`. IDs are UUIDs; timestamps are ISO 8601 UTC strings.

### Environment-configured coach identities

```ts
type CoachCredential = {
  id: string;
  displayName: string;
  password: string;
};
```

Load credentials from a server-only `COACH_CREDENTIALS_JSON` environment value, for example a JSON array of exactly two objects. Validate it with Zod at startup. Never expose passwords to client bundles, persisted JSON, logs, or error responses. Document a long randomly generated password expectation in `app/.env.example` using non-secret placeholders.

### Session

```ts
type CoachSession = {
  id: string;
  tokenHash: string;
  coachId: string;
  coachDisplayName: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  credentialVersion: string;
};
```

Store only a hash of the opaque cookie token. `credentialVersion` comes from configuration and provides a simple way to invalidate sessions when credentials change.

### Single-team settings and season

```ts
type AppSettings = {
  teamDisplayName: string;
  currentSeasonId: string;
  timezone: string;
};

type Season = {
  id: string;
  name: string;
  startsOn?: string;
  endsOn?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};
```

The data model has no `teamId`, organization, membership, owner, or role fields. The app always operates on the single configured team. Supporting a later season does not imply supporting another team.

### Players and roster

```ts
type Player = {
  id: string;
  displayName: string;
  jerseyNumber?: string;
  createdAt: string;
  updatedAt: string;
};

type SeasonRosterEntry = {
  id: string;
  seasonId: string;
  playerId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Use a separate season roster entry so historical games continue to resolve a player's identity after the current roster changes.

### Games and availability

```ts
type Game = {
  id: string;
  seasonId: string;
  opponentName: string;
  venueName: string;
  venueAddress?: string;
  startsAt: string;
  arrivalAt?: string;
  status: "scheduled" | "completed" | "canceled";
  createdAt: string;
  updatedAt: string;
};

type GameAvailability = {
  id: string;
  gameId: string;
  playerId: string;
  status: "unknown" | "available" | "unavailable";
  updatedAt: string;
  updatedByCoachId: string;
};
```

Limited arrival/departure and per-segment eligibility are omitted. Add them only if real games demonstrate that binary game availability is insufficient.

### Planned schedules and assignments

```ts
type PlannedSchedule = {
  id: string;
  gameId: string;
  revision: number;
  status: "draft" | "published" | "stale" | "superseded";
  generationSeed: string;
  generatorVersion: string;
  generatedAt: string;
  publishedAt?: string;
  updatedAt: string;
  updatedByCoachId: string;
};

type PlannedAssignment = {
  id: string;
  scheduleId: string;
  segmentKey: SegmentKey;
  positionKey: PositionKey;
  playerId: string;
  source: "generated" | "manual";
  locked: boolean;
};
```

Enforce uniqueness for `(scheduleId, segmentKey, positionKey)` and `(scheduleId, segmentKey, playerId)`. A game may have at most one editable draft and one current published schedule. Publishing marks the previous published record `superseded`.

### Schedule quality

```ts
type ScheduleQuality = {
  valid: boolean;
  hardViolations: Array<{
    code:
      | "unfilled_position"
      | "duplicate_player"
      | "unavailable_player"
      | "inactive_player";
    message: string;
    segmentKey?: SegmentKey;
    positionKey?: PositionKey;
    playerId?: string;
  }>;
  minuteSpreadSeconds: number;
  midfieldRotationExceptions: Array<{
    quarter: 1 | 2 | 3 | 4;
    playerId: string;
  }>;
  goalkeeperContinuityExceptions: Array<{
    quarter: 1 | 2 | 3 | 4;
    firstPlayerId: string;
    secondPlayerId: string;
  }>;
  perPlayer: Array<{
    playerId: string;
    segmentCount: number;
    totalSeconds: number;
    secondsByGroup: Record<PositionGroup, number>;
  }>;
  scoreBreakdown: {
    equalityPenalty: number;
    midfieldPenalty: number;
    goalkeeperPenalty: number;
  };
};
```

Compute quality from assignments rather than persisting it. The UI shows named results and totals, not just a combined score.

### Shared live snapshot

```ts
type LiveLineupOverride = {
  positionKey: PositionKey;
  plannedPlayerId: string;
  replacementPlayerId: string;
  createdAt: string;
  createdByCoachId: string;
};

type LiveGameState = {
  gameId: string;
  publishedScheduleId: string;
  revision: number;
  status: "not_started" | "running" | "paused" | "completed";
  quarter: 1 | 2 | 3 | 4;
  accumulatedQuarterSeconds: number;
  runningSince?: string;
  overrides: LiveLineupOverride[];
  updatedAt: string;
  updatedByCoachId: string;
};
```

This is a synchronized convenience snapshot, not a historical event stream. Overrides apply only to the current segment and clear when the segment changes, the quarter advances, or a coach resets to plan. Do not derive actual minutes from it.

### Store root

```ts
type SoccerStore = {
  schemaVersion: 1;
  settings: AppSettings;
  seasons: Season[];
  players: Player[];
  rosterEntries: SeasonRosterEntry[];
  games: Game[];
  availability: GameAvailability[];
  schedules: PlannedSchedule[];
  assignments: PlannedAssignment[];
  liveGames: LiveGameState[];
  sessions: CoachSession[];
};
```

## Scheduling engine

### Hard constraints

- Every one of the seven positions is filled in every one of the eight segments.
- Each position has exactly one player per segment.
- A player appears at most once per segment.
- Only active players marked available for the game may be assigned.
- Locked assignments remain unchanged during repair/regeneration.
- Fewer than seven available players is infeasible.

### Ordered optimization goals

#### 1. Equal planned minutes

- Minimize the difference between the most- and least-used available players.
- With 56 assignments and 11 available players, target ten players at five segments and one player at six segments, subject to locked assignments.
- Prefer a maximum spread of one segment (seven minutes).
- If a larger spread is unavoidable, surface it prominently before publish.

#### 2. Midfield rotation

- A player assigned to `leftMidfield` or `rightMidfield` in segment `a` should not occupy either midfield position in segment `b` of the same quarter.
- Moving to forward/defense/goalkeeper or the bench satisfies the goal.
- Report each exception by quarter and player.

#### 3. Goalkeeper quarter continuity

- Prefer the same goalkeeper in both segments of a quarter.
- Report each quarter where the goalkeeper changes at the seven-minute boundary.

#### Tie-breakers

- Prefer a reasonable spread across position groups over the current season.
- Avoid repeating the exact same position in adjacent segments when candidates otherwise score equally.
- Keep generated output deterministic for the same input and seed.

Tie-breakers must never outweigh the three resolved priorities.

### Generation approach

1. Parse and normalize game, active roster, availability, published history, locked cells, and fixed constants.
2. Run feasibility checks before search.
3. Create 56 required assignment cells.
4. Apply locked assignments and reject contradictory locks with path-specific errors.
5. Use deterministic seeded backtracking, filling the most constrained cell first.
6. Score complete candidates lexicographically by:
   1. equality penalty;
   2. midfield rotation penalty;
   3. goalkeeper continuity penalty;
   4. tie-breaker score.
7. Keep the best candidate within a bounded time/iteration budget.
8. Run an independent validator before returning.
9. Persist the draft and assignments atomically.

Use lexicographic comparison rather than configurable numeric weights so the priority order cannot be accidentally reversed. Keep generation pure and persistence-free under `app/src/lib/scheduling/`.

### Manual editing

- `Replace`: choose a position cell, then choose an eligible player not already on the field in that segment. The displaced player goes to the bench.
- `Swap`: exchange the players in two cells, including cells in different segments.
- `Lock`: preserve an intentional assignment during repair/regeneration.
- `Undo/redo`: client-side command history until save.
- `Repair`: fix invalid cells while minimizing total changed assignments.
- `Regenerate`: create a new candidate after confirmation; the current published schedule remains available until publish.
- Every operation re-runs validation and quality calculation immediately.

Save the whole draft with an expected `revision`. If the other coach saved first, reload the newer draft and report a version conflict rather than overwriting it.

## Authentication and authorization

### Credential configuration

- Add `COACH_CREDENTIALS_JSON` and `COACH_CREDENTIAL_VERSION` to `app/.env.example` with safe placeholders.
- Require exactly two unique coach IDs and display names.
- Expect long random passwords; do not enforce consumer password-reset policies.
- Parse configuration once in a server-only module.
- Compare supplied passwords using `node:crypto.timingSafeEqual` over equal-length hashes.

### Sessions

- Generate a random opaque token after successful login.
- Store only its SHA-256 hash in `SoccerStore.sessions`.
- Set the raw value in an HttpOnly, SameSite=Lax cookie with `Secure` in production.
- Use a 30-day expiry unless the credential version changes.
- Every non-login query/action resolves a valid coach session first.
- Both coaches have identical permissions; authorization is binary: authenticated coach or not.

Do not use a shared browser-local password or expose the environment password to client code. Reuse safe cookie/session primitives from the scaffold where useful, but remove magic-link, credit, billing, and admin assumptions from the product-facing auth flow.

## Server and persistence architecture

### Recommended modules

```text
app/src/
  components/
    app-shell/
    games/
    roster/
    schedule/
    live-game/
    ui/
  features/
    schedule-editor/
      ScheduleEditorProvider.tsx
      schedule-editor.store.ts
      schedule-editor.commands.ts
    live-game/
      LiveGameProvider.tsx
      live-game.store.ts
      live-game.polling.ts
  lib/
    auth/
      coach-credentials.ts
      coach-session.ts
      schemas.ts
    soccer/
      fixed-game.ts
      schemas.ts
      store.ts
      migrations.ts
      queries.ts
      actions.ts
    scheduling/
      generate.ts
      validate.ts
      score.ts
      repair.ts
      statistics.ts
      fixtures/
    live-game/
      schemas.ts
      commands.ts
      clock.ts
  routes/
    ...
```

### File-backed store

- Persist to `APP_DATA_DIR/soccer/store.json`.
- Use a top-level schema version.
- Follow the existing account store's atomic temporary-write/rename and filesystem-lock pattern.
- Serialize all mutations through a process queue and lock.
- Parse critical persisted data with Zod and fail visibly on corruption.
- Validate domain invariants before commit.
- Add explicit migrations before accepting another schema version.
- Treat runtime `app/data/*` as state, not source.
- Back up the persistent volume before deployments that include migrations.

This is intentionally a single-instance design. Do not add a repository, ORM, tenant filter, or database abstraction solely for hypothetical scale.

### Queries and actions

Server queries:

- dashboard snapshot;
- current roster;
- game overview and availability;
- schedule editor snapshot;
- print snapshot;
- live snapshot.

Typed server actions:

- login/logout;
- add/update/deactivate player;
- create/update/cancel game;
- update availability and mark-all-available;
- generate/repair/save/publish schedule;
- start/pause/advance/complete live clock;
- set/clear/reset live lineup override.

Validate action inputs with Zod, authenticate before domain access, and return typed errors: `unauthenticated`, `not_found`, `version_conflict`, `invalid_schedule`, `generation_infeasible`, and `invalid_live_command`.

### Live synchronization

Use polling first; do not add a websocket handler unless observed behavior proves polling inadequate.

- Each client fetches the live snapshot every two seconds while the page is visible.
- Pause or reduce polling when the page is hidden; refetch immediately on visibility/focus.
- The local clock repaints every second but derives time from `runningSince` plus accumulated server seconds.
- A live action sends a semantic command, not the entire snapshot.
- The server loads the latest state inside the write lock, applies the command, increments `revision`, persists, and returns the new snapshot.
- The initiating client updates immediately; the other client sees it on the next poll.
- Commands are serialized, so two near-simultaneous actions do not erase unrelated fields.
- When a command is no longer valid against the latest state, reject it with a clear refresh/retry message.

## Shared UI and feature components

Routes remain data-loading/composition shells. Soccer-specific components live outside `routes/`. App code imports generic controls through `~/components/ui`.

### Application shell

- `AppShell`: compact authenticated layout and main landmark.
- `AppHeader`: team name, primary navigation, signed-in coach, logout.
- `PageHeader`: page context and primary action.
- `GameSummaryHeader`: opponent, time, arrival time, venue, status.
- `EmptyState`, `InlineError`, `StaleScheduleBanner`, and `VersionConflictBanner`.

### Roster and game setup

- `RosterTable` and `RosterCardList` for desktop/mobile.
- `PlayerEditorDialog` with explicit name/number labels.
- `GameEditorDialog` or route form for game logistics.
- `GameAvailabilityList` optimized for rapid available/unavailable changes.
- `AvailabilitySummary` with known/unknown/unavailable counts.
- `CapacitySummary` with 56 assignments and target minutes.
- `PlayerChip` with jersey number and active/availability state.

### Schedule editor

- `ScheduleWorkspace`: responsive editor composition.
- `ScheduleGrid`: position rows and eight segment columns; primary desktop view.
- `PlayerScheduleGrid`: player rows, segment positions, total minutes, group totals.
- `QuarterScheduleCard`: two-segment phone/tablet view.
- `AssignmentCell`: player, manual/locked/warning states; keyboard operable.
- `AssignmentPicker`: eligible players and current segment totals.
- `ScheduleViewToggle`: `By position` / `By player`.
- `ScheduleQualityPanel`: hard errors, minute spread, midfield exceptions, goalkeeper exceptions.
- `PlayerMinutesSummary`: current game and published season totals.
- `ScheduleToolbar`: generate, repair, undo, redo, validate, publish, and print.
- `PublishScheduleDialog`: confirms hard validity and acknowledged preference warnings.

Drag-and-drop is optional. Replace and swap must work by click/tap and keyboard; phones should not require precise dragging.

### Game-day mode

- `GameClock`: quarter, countdown, start/pause, advance, and complete actions.
- `LiveSyncStatus`: last refresh, updating/error state, and manual refresh.
- `CurrentLineupList`: position-first list with override indicator.
- `BenchList`: available players not in the derived current lineup.
- `NextChangePanel`: concise `off → on → position` scheduled changes.
- `QuarterProgress`: current segment and quarter.
- `LiveSubstitutionDialog`: current position and eligible bench replacement.
- `LineupOverrideBanner`: clear one or reset all to published plan.

No component should imply actual-time tracking. Use language such as `Temporary game-day change`, not `Recorded substitution` or `Actual minutes`.

### Print

- `PrintableSchedule`: shared position-grid rendering with print mode.
- `PrintGameHeader`: opponent, date/time, arrival, venue.
- `PrintBenchRows`: bench by segment.
- `PrintLegend`: position and segment abbreviations.
- `PublishedVersionStamp`: published timestamp and schedule revision.

## UI state ownership

- Use `createSignal` for isolated UI scalars such as dialog open, selected tab, or copy feedback.
- Use `createStore` in `ScheduleEditorProvider` for draft assignments, locks, selection, undo/redo history, quality, save status, and revision.
- Use `createStore` in `LiveGameProvider` for the latest snapshot, derived current lineup, polling status, and pending command.
- Keep generation, validation, statistics, clock math, and live commands in pure/server domain modules.
- Use `resource.latest` for route data so revalidation does not blank the schedule.
- Use inline styles or SVG attributes for runtime progress geometry; never computed percentages in Panda helper props.

## User-facing states and recovery

| Situation | Expected experience |
| --- | --- |
| Missing/invalid credential configuration | Server fails startup with a clear configuration error; no secrets included. |
| Wrong password | Generic login failure without identifying which credential field was wrong. |
| Expired/revoked session | Redirect to login and preserve a safe internal return path. |
| Empty roster | Guided add-player state; new game scheduling is disabled. |
| Unknown availability | Generation disabled with remaining names and `Mark remaining available`. |
| Fewer than seven available | Explain the seven-position minimum and block generation. |
| Generation cannot satisfy locks | Identify conflicting locked cells and offer unlock actions. |
| Preference exception | Generate valid schedule, name the exception, and allow publish after review. |
| Availability changed | Mark schedule stale and offer repair/regenerate. |
| Concurrent schedule save | Preserve local state, show newer revision, and require reload/reapply. |
| No published schedule | Live and print routes direct coach to publish a valid draft. |
| Live poll fails | Keep the last snapshot visible, label it stale, and offer retry; no offline-write queue. |
| Simultaneous live commands | Server serializes commands; reject only commands invalidated by the newer state. |
| Refresh during a running quarter | Restore server snapshot and derive current countdown from server timestamps. |

## Security and privacy baseline

- Keep credential parsing and password comparison server-only.
- Never store coach passwords in the JSON store.
- Hash session tokens at rest.
- Use HttpOnly, SameSite cookies and `Secure` in production.
- Authenticate every non-login route query and action.
- Return `404` for unknown game/player/schedule IDs after authentication.
- Do not add public schedule routes or include player names in unauthenticated metadata.
- Log coach ID and mutation type for debugging, but never passwords, cookie tokens, or full credential configuration.
- Keep player data to name, optional number, roster status, availability, and schedule assignments.
- Parse persisted files and all action inputs with Zod.

## Planned statistics

- `plannedSeconds`: count published assignment segments × 420 seconds.
- `plannedSecondsByGroup`: aggregate through the fixed position group's constant.
- Game totals use the current published schedule only.
- Season totals include published schedules for non-canceled games in the active season.
- Superseded drafts/published versions do not count.
- Live overrides never affect statistics.
- Label all totals `Planned minutes` to avoid implying actual tracking.

## Testing and verification

### Domain unit tests — highest priority

- Fixed constants contain exactly eight unique segments and seven unique positions.
- Fixed segment duration and total capacity math are correct.
- Zod store parsing, default creation, and migrations.
- Generator hard invariants for 7, 8, 10, 11, and larger active rosters.
- Failure for fewer than seven available players.
- Determinism for identical input and seed.
- Equality is lexicographically more important than midfield and goalkeeper preferences.
- Midfield rotation is more important than goalkeeper continuity.
- Expected 11-player distribution is ten players with five segments and one with six when unconstrained.
- Locks are preserved or rejected when contradictory.
- Repair removes unavailable players and minimizes changed cells.
- Independent validator catches empty slots, duplicates, unavailable players, and inactive players.
- Planned statistics include only the current published version.
- Live override derivation never changes planned assignments/statistics.
- Clock calculations survive refresh and pause/resume.

Use randomized fixtures to assert hard invariants across many availability/lock combinations without adding a property-testing dependency initially.

### Server and persistence tests

- Credential configuration rejects missing, malformed, duplicate, or non-two-user values.
- Password comparison succeeds/fails without leaking secrets.
- Session creation, hashing, expiry, revocation, and credential-version invalidation.
- Every query/action rejects unauthenticated access.
- Atomic store writes and stale-lock recovery.
- Two schedule saves produce a version conflict, not silent overwrite.
- Semantic live commands apply to the latest state and increment revision.
- Near-simultaneous clock and override commands preserve both valid changes.
- Invalid live commands return a recoverable error.

### Component and route tests

- Position and player views render the same assignments.
- Replace/swap work by pointer, touch-equivalent action, and keyboard.
- Quality panel updates after every edit.
- Publish is blocked by hard errors but not by reviewed preference exceptions.
- Game availability list clearly distinguishes unknown and unavailable.
- Mobile schedule and live views require no zoom.
- Print layout handles long names and missing jersey numbers on letter/A4.
- Route redirects preserve only safe internal paths.
- SSR/hydration is stable for dialogs, selectors, responsive views, and polling snapshot initialization.

### End-to-end acceptance walkthrough

1. Sign in as coach one using environment credentials.
2. Add an 11-player roster.
3. Create the next game and mark one player unavailable.
4. Generate a valid schedule and inspect minute/midfield/goalkeeper quality.
5. Swap two assignments, lock one, save, publish, and print.
6. Sign in as coach two in another browser context and verify the published schedule.
7. Open live mode in both contexts.
8. Start the clock in one, verify the other updates within three seconds.
9. Apply a temporary override in the second, verify the first updates.
10. Advance segments/quarters, ensure overrides clear, refresh, and verify clock continuity.
11. Confirm season totals still match the published plan and ignore live overrides.

Run `pnpm -C app verify` as the default final quality gate. Add `pnpm -C app build` for authentication/session and PWA changes. Keep any Playwright screenshots/reports under `tmp/evals/`.

## Delivery plan

### Phase 0: Starter conversion and fixed fixtures

- Replace `example-bare`, starter homepage copy, metadata, cookie names, and visible starter identity.
- Add fixed segment/position constants and their tests.
- Add a representative 11-player fixture with expected quality properties.
- Prototype the position grid and phone quarter view using fixture data.

Exit: both schedule views communicate the fixed game clearly and the coach can read the print-oriented layout.

### Phase 1: Scheduling proof — core product-risk gate

- Implement pure schemas, validation, quality calculation, generator, and repair.
- Implement lexicographic scoring in the resolved order.
- Add deterministic and randomized invariant tests.
- Build fixture-backed editor, player view, quality panel, replace/swap/lock, and undo/redo.

Exit: common 7–11+ player fixtures produce valid schedules or actionable failures, manual edits preserve hard rules, and priority-order tests pass.

### Phase 2: Private authentication and file persistence

- Add two-coach environment credential parsing and `.env.example` placeholders.
- Implement login, session cookie, logout, expiry, and credential-version invalidation.
- Add Zod soccer store, atomic writes, locks, and migrations.
- Add roster, game, and availability queries/actions/routes.
- Remove or hide starter magic-link, billing, credit, and admin product surfaces.

Exit: either configured coach can sign in and prepare roster/game inputs; unauthenticated access is rejected.

### Phase 3: Persisted schedule workflow and print

- Connect the editor to persisted draft/published versions.
- Add optimistic revision handling and stale schedule repair.
- Add dashboard next-game and planned season summaries.
- Add dedicated print route and visually verify letter/A4 output.
- Complete empty, infeasible, stale, and conflict recovery states.

Exit: a coach can prepare, generate, edit, publish, refresh, reopen, and print the next schedule without Excel.

This is the first release milestone. Do not hold it for live mode or PWA work.

### Phase 4: Shared game-day mode

- Implement `LiveGameState`, clock math, semantic commands, and revisioning.
- Add live query polling every two seconds with focus refresh.
- Build clock, current lineup, bench, next changes, override, reset, and sync status UI.
- Test both coaches acting near-simultaneously, refresh, stale polls, and quarter transitions.

Exit: two devices remain within three seconds of the same clock/lineup snapshot, either coach can act, and published statistics remain unchanged.

### Phase 5: PWA and focused hardening

- Add manifest, installable icons, theme metadata, and standalone display behavior.
- Do not add a service-worker offline data layer unless requirements change.
- Run realistic desktop preparation, print, and phone sideline usability evaluations.
- Measure time-to-publish, number of manual corrections, generator exceptions, and live update latency.
- Tune deterministic tie-breakers from observed schedule corrections without changing the resolved priority order.

Exit: the app installs cleanly as a PWA and the two coaches can use the core workflow in a simulated or real game.

## Implementation completion checklist

- Product routes are limited to login, dashboard, roster, games, schedule, live, and print.
- No multi-team, membership, public share, calendar, formation editor, or actual-time code is introduced.
- Exactly two environment-configured coaches can authenticate; secrets stay server-only.
- Fixed game constants are the single source of truth.
- Generation priority is equality, then midfield rotation, then goalkeeper continuity.
- Planned schedule versions are distinct from temporary live overrides.
- All schedule hard invariants have independent tests.
- The editor is usable by pointer, touch, and keyboard and does not rely on color alone.
- Print output is visually verified.
- Live actions are semantic, serialized, revisioned, and visible to the other coach within three seconds.
- Runtime geometry uses inline styles/SVG attributes; generated Panda files remain untouched.
- `pnpm -C app verify` passes; auth/PWA phases also pass production build verification.

## Most likely bad outcome

The most plausible product-wrong implementation is still an overbuilt administration platform: preserving the starter's account/billing concepts, modeling teams and configurable formations, adding realtime event history, and polishing PWA/game-day features before the generator is trustworthy. That would produce more code while leaving the coach correcting schedules manually. The release must be judged first by one outcome: after attendance is known, can either coach generate, understand, adjust, publish, and print a fair next-game schedule faster and more confidently than using Excel?
