# Stephen feedback final action plan

## Purpose and source

This plan decomposes two product-feedback sources:

- Stephen Turchyn's July 28, 2026 email reply in the “Mystics Fall 2026
  Glendale Soccer season!” thread;
- Byron's July 28, 2026 follow-up proposing that schedule construction become a
  multi-step process rather than a one-shot generation problem;
- Byron's subsequent direction that game mode remain a minimal factual tracker
  with direct substitution, position-swap, and own-team goal-recording
  controls—not a live fairness or substitution-advice engine;
- Byron's final approval of the hybrid scheduling workflow and every proposed
  answer in the product-decision section.

The sources are treated as product-feedback memos: coaching outcomes,
observations, proposed rules, interaction ideas, and questions are separated
rather than treated as one committed feature list.

Repository behavior was audited against the product documentation and the
relevant player, scheduling, and live-game code on July 28, 2026. This is a
planning artifact only; no runtime behavior was changed.

**Plan status:** Final product direction approved July 28, 2026. Remaining
gates in this document validate implementation behavior; they do not reopen the
approved product decisions.

## Executive synthesis

Stephen validated the core planning model, especially full-quarter goalkeeper
assignments, manual schedule adjustment, and season-long visibility. His
feedback exposes one immediate extension and one larger product boundary:

1. The generator needs bounded coaching preferences. A coach should be able to
   express that a player prefers or avoids a role, and optionally favor that
   player among otherwise fair playing-time choices, without assigning a
   general ability rank.
2. The game-day feature currently shows a changed lineup but does not record
   what actually happened. Durable substitution and on-field position-change
   events are required before the app can truthfully report actual minutes,
   actual position history, or goals scored by the team.

The game-day product boundary is now decided: live mode should do very little
processing. A coach chooses a bench player and a position, swaps field players
when needed, or records which player scored for the team. Those actions are
logged against the game clock. Live mode does not recommend the next
substitute, protect planned totals, rebalance minutes, track opponent goals, or
display a score.

The current player profile already provides the requested player-by-player
position and time drill-down, but its completed-game values come from the
published plan. Labels such as “Minutes played” therefore overstate the
evidence. Correcting that language is the smallest safe change.

Byron's follow-up identifies a separate scheduling-workflow problem: even when
one-shot generation produces a good result, changing one coaching decision can
cause many unrelated assignments to move. Three models were compared:

1. progressively fill and lock selected positions or players;
2. keep a complete valid schedule and regenerate only a selected scope;
3. define a coaching-goal recipe, compare several complete candidates, and
   refine the chosen one.

The approved direction is a hybrid of the second and third models: make
coaching intent explicit, start from a complete valid candidate, and let the
coach regenerate a selected scope while previewing the smallest necessary set
of changes. Progressive blank-cell construction is deferred and is not part of
this plan.

The final delivery sequence is:

1. Correct planned-versus-actual language.
2. Implement the hybrid schedule-refinement foundation with existing
   scheduling goals.
3. Add player position preferences and a bounded field-time tie-breaker through
   the chosen workflow.
4. Add full-quarter defensive continuity as a schedule option or optimization.
5. Add a minimal actual-game event ledger, direct substitution/position-swap
   controls, and own-team goal recording.
6. Derive post-game actual history from that ledger without adding live
   recommendations.

## Jobs and desired outcomes

### J01 — Encode coaching judgment without ranking children

**Actor:** Coach

**When** preparing a rotation for a team with different position preferences,
stamina, and experience,  
**I want to** express limited player-specific preferences,  
**so I can** generate a useful first draft without reducing each player to an
ability rank.

**Success looks like**

- A coach can mark a position as preferred, neutral, or avoided for a player.
- Avoidance is treated as a strong preference, not an absolute prohibition;
  the schedule remains possible when roster constraints require the position.
- A bounded field-time preference can decide which player receives an extra
  segment when a mathematically even schedule already requires unequal totals.
- The editor explains when a generated schedule relaxes a preference.

**Evidence**

- Email item 2: “favor” or “disfavor” a position without wanting to “rank” the
  players.
- Email item 2: a player dislikes goalkeeper; a player can play midfield; two
  players are stronger there.
- Email item 2: willingness to trade some time parity for
  endurance/skills/commitment.

**Implications, not commitments**

- Position preferences should be modeled separately from field-time
  preferences.
- Free-form notes can preserve context without making sensitive rationale part
  of the scheduling algorithm.

**Confidence:** Explicit

### J02 — Create a predictable, low-cognitive-load rotation plan

**Actor:** Coach preparing the game plan

**When** planning seven-minute rotations,  
**I want to** keep stable defensive anchors and rotate the high-movement roles
and bench in a predictable order,  
**so I can** arrive at the match with a plan that is easy to execute.

**Success looks like**

- Goalkeeper continuity remains a full-quarter preference.
- The coach can prefer left and right defense continuity for a full quarter.
- Midfield and forward rotations remain easy to identify.
- Every player receives both an attacking and defending role within the
  intended evaluation window unless the coach accepts a named exception.

**Evidence**

- Email item 1: goalkeeper, left defense, and right defense can stay for the
  quarter while midfield and forwards swap.
- “Rules” list: defense/forward swaps were most likely.
- “Rules” list: at least one offense and one defense position per game,
  grouping forward/midfield and defense/goalkeeper.
- “Rules” list: a player benched four times should be ahead of one benched
  three times.

**Implications, not commitments**

- “Attack” and “defend” are role groups for evaluation; the canonical seven
  position IDs should remain unchanged.
- Stephen's bench-order rule is useful planning evidence, but Byron's later
  direction rejects automatic next-sub logic in game mode.

**Confidence:** Explicit

### J03 — Adjust for game-specific arrival uncertainty

**Actor:** Coach preparing the starting lineup

**When** some players may arrive late,  
**I want to** start players I know are present and adjust quickly when others
arrive,  
**so I can** begin the match with a complete, credible lineup.

**Success looks like**

- The coach can manually swap and lock first-segment assignments.
- A late arrival can be introduced during live play without rewriting the
  published plan.
- The system does not turn punctuality history into a permanent child ranking.

**Evidence**

- Email item 3: Stephen commonly started a player he knew would be present.
- Email item 3: asks whether this is handled by drag/swap.

**Implications, not commitments**

- Existing schedule drag/swap and cell locking cover the planning case.
- A per-game “expected late” or availability note may be useful later, but a
  permanent reliability score is not justified by this email.

**Confidence:** Explicit

### J04 — Preserve what actually happened during the match

**Actor:** Coach on the sideline and reviewing afterward

**When** the live lineup departs from the published plan,  
**I want to** record substitutions and on-field position changes against the
game clock,  
**so I can** distinguish the plan from actual participation and review honest
minutes and positions later.

**Success looks like**

- A coach can select a bench player and put that player into a field position.
- A coach can swap two on-field players' positions.
- Each change is durable, ordered, and timestamped in game-clock terms.
- The current lineup can be reconstructed after refresh and at game
  completion.
- A coach can record which team player scored without entering an opponent
  goal or displaying a running score.
- A goal action becomes disabled immediately while its write is pending,
  provides unmistakable success feedback, and cannot create a duplicate event
  from a double click.
- Player and game summaries clearly separate planned and actual values.
- An incomplete or unconfirmed live record never masquerades as exact actual
  time.
- Live mode does not calculate fairness, recommend the next substitute, or try
  to repair the planned totals after an unplanned change.

**Evidence**

- Email: asks whether players can be swapped on the field.
- Email: asks whether the plan can reflect actual gameplay at the end.
- Email: values season-long time tracking but notes prior fairness was based on
  intuition rather than reviewed data.
- Byron follow-up: game mode should be a simple tracker with simple player-swap
  controls and minimal processing.
- Byron follow-up: record only the team's goal scorer, prevent double
  submission, and do not visibly show the score.

**Confidence:** Explicit

### J05 — Check season experiences, not only total minutes

**Actor:** Coach

**When** reviewing the season,  
**I want to** drill into each player's time and roles,  
**so I can** see whether each player received a fair and varied experience.

**Success looks like**

- The player profile shows per-game and season totals by position.
- Planned and actual totals are both available when an actual ledger exists.
- Role-group coverage can answer whether a player experienced attack,
  defense, and goalkeeper.
- The team's goal events can answer which players scored, without presenting a
  live or opponent-inclusive score.

**Evidence**

- Email: asks to drill down into a player's positions and time.
- Email: goal of having everyone play goalkeeper.
- Email: goal of helping everyone score at least once.

**Implications, not commitments**

- Goalkeeper coverage can be derived from position history.
- Scoring uses an own-team player goal event in the same actual-game ledger.
- Goal history belongs in post-game/player review, not as a visible game-mode
  score.

**Confidence:** Explicit

### J06 — Refine one scheduling decision without losing good work

**Actor:** Coach building a game plan

**When** most of a generated schedule is acceptable but one role, player, or
rotation rule needs work,  
**I want to** change that bounded part of the schedule and preserve the
decisions I already trust,  
**so I can** converge on a usable plan without repeatedly reviewing a
completely rearranged grid.

**Success looks like**

- The coach can express a refinement scope by position, player, time range, or
  explicit cells.
- Accepted assignments remain stable unless the requested change cannot be
  made without expanding the scope.
- Regeneration identifies what changed and why.
- The coach can reject or undo an alternative without reconstructing the prior
  plan.
- An impossible refinement produces useful choices, such as relaxing a goal or
  allowing a small number of additional cells to move.

**Evidence**

- Byron follow-up: one-shot generation is acceptable when it works, but each
  change currently requires moving many things at once.
- Byron follow-up: solve goalkeepers, forwards, a player, or the remaining
  schedule in separate generation passes.
- Byron follow-up: accepted spots become locked; an unsatisfactory pass can be
  undone and regenerated with new random placements.

**Implications, not commitments**

- Multi-step construction could operate on an incomplete grid, on a complete
  schedule with scoped variation, or on a sequence of goal decisions.
- Persistent coach locks and assignments temporarily frozen for one
  regeneration request are different concepts and should not share ambiguous
  behavior.

**Confidence:** Explicit

## Themes and work streams

## Theme: Coaching preferences

**Why it matters:** The current generator can make a valid and mathematically
fair plan, but the coach must manually encode player comfort, stamina, and
team-balance judgment after every generation.

**Related jobs:** J01, J02, J03

**What the feedback describes**

- Prefer/avoid individual positions.
- Allow some players to receive an extra opportunity based on stamina or
  readiness.
- Keep goalkeeper and possibly both defenders stable for a quarter.
- Ensure attack and defense exposure.

**Current baseline**

- Player records contain identity, jersey, color, and active state only.
- Generation optimizes minute spread before midfield rotation, goalkeeper
  continuity, and exact-position variety.
- Manual drag/swap, the accessible replacement picker, locks, undo, redo, and
  regeneration are implemented.
- Generated schedules preserve retained field positions within a quarter and
  keep the goalkeeper for the full quarter where feasible. Full-quarter
  defense is not an explicit rule.

**Tensions and unknowns**

- A single ability score would conflict with Stephen's explicit desire not to
  rank players.
- “More time” could mean choosing who receives the unavoidable extra segment,
  or it could mean allowing a larger minute spread. Those are materially
  different fairness policies.
- “Each position” and “one offense and one defense” describe different
  coverage standards.

**Strongest next move**

Add explicit position dispositions and use field-time preference only as a
tie-breaker among schedules that preserve the current fairness bound. Evaluate
larger time disparities only after coaches see the bounded behavior in real
games.

## Theme: Schedule construction and refinement

**Why it matters:** One-shot generation optimizes the entire grid at once.
That produces a coherent starting point, but a coach who dislikes one detail
must either make several manual swaps or regenerate a broadly different
schedule. The product needs a way to preserve trusted work while exploring a
bounded alternative.

**Related jobs:** J01, J02, J03, J06

**What the follow-up describes**

- Generate one position family at a time.
- Generate all assignments for one player.
- Accept and lock a completed pass.
- Undo and try a newly randomized pass.
- Finish the remaining schedule by position, player, or all at once.

**Current baseline**

- A first generation always creates a complete 56-assignment schedule.
- Regeneration creates complete candidates and reconciles explicit locked
  cells into them.
- Locks are cell-level and persistent on the draft.
- Regeneration preserves locked cells, but unlocked cells across the entire
  game may move.
- Repair preserves unaffected work when availability or hard validity changes,
  but it is not a goal-directed refinement tool.
- Undo and redo operate on complete assignment snapshots.

**Tensions and unknowns**

- Filling positions or players independently can consume minutes and players
  needed by later passes, making the final remainder impossible or poor.
- Freezing every accepted generated cell can make locks numerous and difficult
  to understand.
- A complete schedule is easier to evaluate for fairness; an incomplete grid
  makes some quality measures provisional.
- A narrowly selected scope may have no valid alternative unless the system is
  allowed to move adjacent assignments.
- Random variation is useful for exploration but insufficient without a clear
  before/after quality explanation.

**Strongest next move**

Prototype scoped regeneration on a complete schedule before committing to
partial-grid persistence. It is closest to the existing architecture and can
test the core outcome—change one bounded decision without losing good
work—using the current scheduling rules. Add coaching-goal recipes and
preference-aware candidates once the refinement interaction is understood.

## Theme: Sideline execution and actual history

**Why it matters:** The product currently helps the coach return to the plan;
Stephen wants it also to preserve deviations from the plan. Byron has now
bounded that extension: game mode records direct actions and does not make
coaching decisions.

**Related jobs:** J02, J03, J04, J05

**What the feedback describes**

- Swap a bench player onto the field.
- Swap two field players' positions.
- Record which team player scored.
- Review actual time and positions after the game.

**Current baseline**

- Live mode has a shared clock, current lineup, bench, and temporary
  position-level overrides.
- A bench player can replace a player at a selected position.
- An on-field player cannot currently be chosen as the replacement, so
  field-to-field swaps are absent.
- Overrides store only the latest replacement per position and are cleared
  when the quarter advances. They are not an event history and never affect
  statistics.
- The live bench is an unranked roster-order list.
- No goal event or goal-recording action exists.

**Tensions and unknowns**

- Exact actual minutes require a trusted clock and explicit handling for missed
  or late-entered events.
- Two coaches can act concurrently; events need the same serialized,
  revisioned command semantics used by the live clock.
- A coach may want to correct a mistaken event without rewriting the
  published plan.
- Goal confirmation must be obvious without creating a running score display.
- A player may score more than once, so double-submit protection should cover
  the in-flight action rather than permanently disabling future goal entries.

**Strongest next move**

Introduce a small durable event model and three direct interactions:
bench-to-position replacement, field-position swap, and own-team goal
recording. Derive the current lineup from those factual events. Keep fairness,
bench ordering, and planned-versus-actual analysis out of the live interaction
path.

## Theme: Player and season review

**Why it matters:** Coaches need evidence that their intended fairness and
variety happened, not just confidence that the pregame plan looked fair.

**Related jobs:** J04, J05

**What the feedback describes**

- Player drill-down by time and position.
- Season-long fairness review.
- Goalkeeper and scoring experiences for every player.

**Current baseline**

- Player profiles already show upcoming schedules, completed game rows, total
  positions, and per-position minutes.
- Completed values are calculated from published schedule assignments, not
  live changes.
- The UI uses “Minutes played” and “Positions played” even though the data is
  planned.
- No goal events or season goal coverage exist.

**Tensions and unknowns**

- Relabeling the existing profile is necessary for truthfulness but may make
  the feature look less complete.
- Goal history should be reviewable without presenting a live score or
  inviting opponent-score tracking.

**Strongest next move**

Relabel existing values as planned now. After the event ledger ships, add a
planned/actual comparison and own-team goal history to the existing profile
rather than creating a parallel reporting area.

## Schedule construction options

These options serve J06 in materially different ways. They can share solver
primitives, but they should be evaluated as product workflows rather than
collapsed into one large interface.

### Option A — Progressive fill and lock

**Core interaction**

1. Begin with an empty or partially filled schedule.
2. Select a target such as goalkeeper, forwards, a player, one quarter, or the
   entire remainder.
3. Generate assignments only for that target.
4. Accept the pass, which locks or freezes its assignments.
5. Undo and regenerate the pass if it is unsatisfactory.
6. Continue until the grid is complete, then run final validation.

**How it incorporates Stephen's feedback**

- Solve full-quarter goalkeepers first.
- Solve left/right defense continuity next.
- Generate midfield or forward assignments around player preferences.
- Generate for a player to inspect that player's position variety and
  field-time allocation directly.
- Complete the remaining cells after the coach's important judgments are
  established.

**Strengths**

- Highest sense of authorship and direct control.
- Mirrors how some coaches reason: secure anchors, place key player needs, then
  fill the rotation.
- Accepted passes are visibly stable.
- Naturally supports “try that part again.”

**Costs and risks**

- Early locally good choices can make later scopes infeasible.
- Fairness, attack/defense coverage, and bench exposure are difficult to judge
  until the grid is nearly complete.
- “Generate for a player” affects other players even if their cells are still
  blank because it consumes that player's available time and positions.
- Automatic locking can create dozens of locks whose origin and purpose are
  unclear.
- Publishing, quality scoring, print, and live mode all assume a complete
  schedule; the product needs an explicit incomplete-draft state.
- The current generator cannot fill arbitrary partial scopes. This requires a
  constraint solver or a backtracking partial-assignment generator with
  conflict explanations.

**Needed safeguards**

- Show provisional totals and future feasibility after every pass.
- Group generated locks by pass so one pass can be unlocked or replaced.
- Before accepting a pass, prove that at least one valid completion exists.
- When no completion exists, identify the smallest earlier pass that must be
  relaxed.
- Distinguish an accepted generated pass from a deliberate hard coach lock.

**Best fit**

An advanced construction mode for coaches who want to author the schedule in a
specific order and are comfortable resolving constraints.

### Option B — Complete schedule with scoped regeneration

**Core interaction**

1. Generate or retain one complete, valid schedule.
2. Select the assignments allowed to vary:
   - a position or role group;
   - one or more players;
   - a quarter or segment range;
   - explicit cells.
3. Request a new alternative for that scope or a goal such as “improve a
   player's roles.”
4. Treat everything outside the scope as temporarily frozen while preserving
   explicit coach locks everywhere.
5. Preview changed cells and quality differences.
6. Accept, reject, undo, or allow the solver to expand the scope slightly.

**How it incorporates Stephen's feedback**

- Regenerate only goalkeeper assignments while preserving the rest.
- Regenerate goalkeeper plus defense to seek full-quarter anchors.
- Improve midfield preferences for a player without scrambling all quarters.
- Rework one player's assignments while showing which counterpart assignments
  must move.
- Preserve arrival-driven starting-lineup choices as explicit locks.

**Strengths**

- The schedule remains complete and valid at every accepted state.
- Fairness and experience coverage remain measurable throughout editing.
- The before/after difference is bounded and reviewable.
- Closely matches the current complete schedule, locks, history, repair, and
  regeneration architecture.
- Can be introduced incrementally with existing rules before player
  preferences are persisted.

**Costs and risks**

- Some selected scopes have no valid alternative.
- A player-scoped change necessarily moves other players; the UI must make
  those secondary changes explicit.
- Strictly freezing everything outside a small scope can create local minima.
- “Allow the solver to expand” needs a predictable change budget so it does not
  become disguised full regeneration.

**Needed safeguards**

- Return `no alternative in this scope` rather than silently moving unrelated
  assignments.
- Offer explicit expansion choices such as “allow up to 2 additional cells” or
  “include Q3.”
- Optimize first for minimum changed cells, then for the requested coaching
  goal and existing schedule quality.
- Highlight every changed cell and show before/after quality deltas.
- Keep persistent coach locks separate from operation-scoped frozen cells.

**Best fit**

The approved refinement foundation and the lowest-risk way to solve the
preserve-good-work problem.

### Option C — Coaching recipe with candidate comparison

**Core interaction**

1. Before generation, review a compact set of coaching goals:
   - playing-time fairness bound;
   - goalkeeper continuity;
   - optional defensive continuity;
   - attack/defense coverage;
   - player position dispositions;
   - bounded extra-time preferences.
2. Generate two or three complete candidates with different tradeoff profiles.
3. Compare named outcomes and exceptions rather than scanning raw random
   schedules unaided.
4. Choose a candidate, lock trusted decisions, and refine it.

**Possible candidate labels**

- **Most balanced:** minimizes minute and bench-time spread.
- **Best preference fit:** minimizes avoided roles and maximizes preferred
  roles within the fairness bound.
- **Simplest sideline rotation:** prioritizes full-quarter anchors and fewer
  position changes.

**How it incorporates Stephen's feedback**

- Turns his informal rules into visible coaching intent instead of hidden
  generator weights.
- Shows the tradeoff between stronger midfield assignments, equal minutes, and
  simpler substitutions.
- Avoids creating a general player ranking: candidates compare schedules, not
  children.
- Makes relaxed preferences and missing role coverage visible before the coach
  chooses a plan.

**Strengths**

- Keeps the grid complete and valid.
- Helps coaches understand unavoidable tradeoffs.
- Makes preferences reusable from game to game.
- Reduces trial-and-error randomness.
- Provides a natural home for Stephen's feedback without crowding the schedule
  grid with controls.

**Costs and risks**

- Comparing several 56-cell schedules can create cognitive overload.
- Candidate labels are only trustworthy if each one has a genuinely distinct,
  explainable objective.
- It may still feel like one-shot generation when the coach wants to fix one
  detail.
- Generating and scoring several candidates increases implementation and
  testing complexity.

**Needed safeguards**

- Show a concise difference summary before offering full-grid comparison.
- Keep the candidate count small.
- Hold hard validity and the chosen fairness bound constant across candidates.
- State every relaxed goal and avoid claims such as “best” without a defined
  metric.
- Pair candidate selection with Option B's scoped refinement.

**Best fit**

The strongest model for setting intent and choosing a starting point, but not a
complete replacement for targeted editing.

### Comparison

| Dimension                             | Option A: progressive fill  | Option B: scoped regeneration     | Option C: recipe + candidates     |
| ------------------------------------- | --------------------------- | --------------------------------- | --------------------------------- |
| Valid complete plan at each step      | No                          | Yes                               | Yes                               |
| Coach control over construction order | Highest                     | High                              | Medium                            |
| Preserves unrelated accepted work     | Yes, through pass locks     | Yes, through scoped freezing      | Yes after candidate selection     |
| Fairness visible throughout           | Provisional                 | Yes                               | Yes                               |
| Handles player/position preferences   | Direct placement            | Targeted improvement              | Explicit generation goals         |
| Handles Stephen's rotation rules      | Sequentially                | As selected refinement goals      | As recipe objectives              |
| Fit with current architecture         | Lowest                      | Highest                           | Medium                            |
| Main technical challenge              | Feasible partial completion | Minimal-change constrained search | Distinct explainable candidates   |
| Main UX risk                          | Dead ends and lock overload | Scope expansion surprises         | Comparison overload               |
| Final role                            | Deferred outside plan       | Approved refinement foundation    | Approved starting-point companion |

### Approved product direction

Use a hybrid of Options B and C:

1. Set durable team/player intent in a compact coaching recipe.
2. Generate one complete valid default, with two additional candidates
   available on demand rather than shown every time.
3. Refine by selected position, player, quarter, or cells.
4. Preserve explicit coach locks and temporarily freeze everything outside the
   selected scope.
5. Preview the smallest valid change set and its quality deltas.
6. Require permission to expand the scope when no bounded alternative exists.

Option A is deferred outside this plan. Reconsidering partial-grid construction
requires a new product decision after the approved hybrid has been used in
real schedule-building work.

## Scope and commitment levels

| Idea or capability                       | Related jobs       | Commitment        | Current state                     | Final treatment                                                       |
| ---------------------------------------- | ------------------ | ----------------- | --------------------------------- | --------------------------------------------------------------------- |
| Truthful planned-time labels             | J04, J05           | Decided direction | Partial/proxy                     | First change                                                          |
| Progressive position/player fill         | J01, J02, J06      | Parked/cautioned  | Absent                            | Deferred outside the final plan                                       |
| Scoped regeneration                      | J01, J02, J03, J06 | Decided direction | Partial/proxy                     | Implement as the refinement foundation                                |
| Coaching recipe and candidate comparison | J01, J02, J06      | Decided direction | Partial/proxy                     | Pair a compact recipe and on-demand candidates with scoped refinement |
| Change preview and quality delta         | J06                | Decided direction | Absent                            | Required before applying automated refinement                         |
| Manual pregame drag/swap and lock        | J03                | Current baseline  | Implemented                       | Keep; document in help text                                           |
| Preferred/neutral/avoided positions      | J01                | Decided direction | Absent                            | Store per exact position with role-group editing shortcuts            |
| Bounded field-time preference            | J01                | Decided direction | Absent                            | Tie-break only; do not widen the fairness bound                       |
| Full-quarter left/right defense          | J02                | Decided direction | Partial/proxy                     | Add as team default with per-game override                            |
| Attack/defense coverage warning          | J02, J05           | Decided direction | Partial/proxy                     | Warn per game; track exact-position variety across the season         |
| Direct bench-to-position substitution    | J04                | Decided direction | Implemented as temporary snapshot | Preserve simple interaction and make it durable                       |
| On-field position swap                   | J04                | Decided direction | Absent                            | Include with event-ledger slice                                       |
| Durable actual-game events               | J04, J05           | Decided direction | Absent                            | Keep event types and processing minimal                               |
| Automatic next-sub ordering              | J02, J04           | Parked/cautioned  | Absent                            | Do not build in game mode                                             |
| Habitual-punctuality score               | J03                | Parked/cautioned  | Absent                            | Do not build                                                          |
| Own-team goal-scorer event               | J04, J05           | Decided direction | Absent                            | Add to the minimal event ledger                                       |
| Opponent goals or visible scoreboard     | —                  | Parked/cautioned  | Absent                            | Explicit non-goal                                                     |
| Team-name/calendar workflow              | —                  | Parked/cautioned  | Team names exist; calendar absent | Separate discovery; not part of this feedback slice                   |

## Current-state and gap audit

| Capability needed by a job              | Status                 | Evidence                                                                    | Gap or caution                                                                             |
| --------------------------------------- | ---------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Complete schedule generation            | Implemented            | `schedule-generator.ts` and `store-schedule-actions.ts`                     | Always fills all 56 field assignments                                                      |
| Cell-level persistent locks             | Implemented            | Assignment schema, `toggleLock`, and `schedule-regenerator.ts`              | Locks have no reason or generation-pass grouping                                           |
| Regeneration around locks               | Partial/proxy          | `regenerateSchedule` reconciles locked assignments into complete candidates | Every unlocked cell may move; no player/position/time scope                                |
| Minimal-change repair                   | Partial/proxy          | `repairSchedule` preserves unaffected assignments                           | Repairs eligibility/validity, not a selected coaching goal                                 |
| Partial-grid persistence and completion | Absent                 | Schedule schema and publish workflow assume complete assignments            | Option A requires an incomplete-draft model and feasibility checks                         |
| Candidate comparison                    | Absent                 | Regeneration chooses one candidate server-side                              | No quality-delta or side-by-side selection contract                                        |
| Undo/redo of complete snapshots         | Implemented            | Schedule history/future and store actions                                   | Can support accepting/rejecting a scoped alternative                                       |
| Player preference storage               | Absent                 | `app/src/lib/soccer/schemas.ts` player schema                               | Requires schema evolution and persisted-store migration                                    |
| Preference-aware generation             | Absent                 | `app/src/lib/soccer/schedule-generator.ts`                                  | Current choices use counts, repeat penalties, position groups, and stable random rank only |
| Fair minute calculation                 | Implemented            | `scoreSchedule` in `app/src/lib/soccer/scheduling.ts`                       | Does not express a coach-approved target or preference                                     |
| Full-quarter goalkeeper                 | Implemented preference | Generator and goalkeeper continuity warnings                                | Feasibility can still require a named exception                                            |
| Full-quarter defense                    | Partial/proxy          | Generator preserves retained positions within a quarter                     | No explicit defensive-continuity objective or option                                       |
| Pregame drag/swap                       | Implemented            | `ScheduleGrids.tsx` and `SchedulePage.tsx`                                  | Swap is limited to one seven-minute segment, as intended                                   |
| Bench ordering by time sat              | Absent                 | `orderSubstitutesForDisplay` and `LivePage.tsx`                             | Schedule bench is alphabetical; live bench is roster order                                 |
| Temporary bench-to-field change         | Implemented            | `store-live-actions.ts` and `LivePage.tsx`                                  | Snapshot only; not historical                                                              |
| On-field position swap                  | Absent                 | Live replacement rejects a player already on the field                      | Needs an atomic two-position command                                                       |
| Actual event/history ledger             | Absent                 | `liveStateSchema` stores only current overrides                             | Requires durable events and correction semantics                                           |
| Player position/time drill-down         | Partial/proxy          | `player-profile.ts` and `PlayerDetailsPage.tsx`                             | Exists, but derives completed values from the published plan                               |
| Planned/actual comparison               | Absent                 | Player profile has one schedule-derived total                               | Must wait for trustworthy actual events                                                    |
| Own-team goal recording                 | Absent                 | No goal schema or action                                                    | Add a typed event and duplicate-resistant write control                                    |
| Scoreboard/opponent scoring             | Absent                 | No goal or score model                                                      | Intentionally remain absent                                                                |

## Tensions, assumptions, and non-goals

### Product tensions

- **Judgment versus ranking:** Preferences must help generation without
  becoming a general child ability score.
- **Fairness versus optimization:** The first version should decide who gets
  unavoidable extra minutes, not silently widen the minute spread.
- **Plan versus truth:** A published plan remains immutable; actual events must
  be a separate record.
- **Planning intelligence versus live simplicity:** Schedule construction may
  optimize many goals; game mode should only record direct coach actions.
- **Goal record versus scoreboard:** The app may preserve who scored for the
  team without calculating or presenting the game's true score.
- **Local control versus global feasibility:** Position- or player-specific
  generation feels bounded, but every placement consumes a globally shared
  minute and lineup budget.
- **Stable work versus hidden compromise:** Preserving more cells can force a
  worse preference outcome; expanding the change scope can violate the coach's
  expectation that accepted work is stable.

### Working assumptions

- “Offense” means forward or midfield; “defense” means defense or goalkeeper.
- Position avoidance is soft because a small available roster can make every
  preference impossible.
- Preferences persist with the player across the season; availability and late
  arrival remain game-specific.
- Actual time is considered trustworthy only for a game whose live record is
  explicitly completed or confirmed.
- A goal action disables immediately while its server command is pending,
  closes or resets after confirmed success, and may be used again later if the
  same player scores another goal.
- Persistent locks mean “the coach explicitly requires this assignment.”
  Temporary scope freezes mean “do not move this assignment for this
  operation.” They are not interchangeable.

### Non-goals for the approved slices

- A numerical player skill, stamina, commitment, or punctuality rank.
- Automatic decisions about who deserves less playing time.
- Formation editing, multi-team support, calendar automation, or team-name
  import.
- Parent-facing statistics.
- Live next-sub recommendations, fairness alerts, or automatic playing-time
  repair.
- Opponent goal entry, a running score, score differential, or winner/loser
  display.
- Assists, shots, or broader match statistics.
- Rewriting published schedules from live events.
- Silently moving assignments outside a selected refinement scope.
- Claiming that an incomplete schedule is globally fair before a feasible
  completion has been found.

## Actionable delivery plan

### Slice 0 — Make the existing record truthful

**Outcome proved:** A coach can understand exactly what the existing history
does and does not represent.

**Changes**

1. Rename “Minutes played” to “Planned minutes” and “Positions played” to
   “Planned positions” on completed player summaries.
2. Change completed-history descriptions to say they are based on the
   published plan.
3. Audit dashboard, roster, game history, and empty-state copy for unqualified
   “played” language.
4. Add a small explanation that actual game-day changes are not yet included.

**Acceptance scenario**

- Given a completed game with a published plan and a temporary live change,
  the player profile shows the published assignment as planned and never calls
  it actual or played time.

### Slice 1 — Scheduling-refinement workflow proof

**Outcome proved:** A coach can improve one bounded part of a complete schedule
without losing unrelated good work.

**Implementation proof**

Implement the scoped-refinement half of the approved hybrid using current
scheduling goals before adding new preference data:

1. Start from a complete draft.
2. Support one position-based scope, one player-based scope, and explicit
   cells. Keep quarter/range selection out of the first proof unless needed.
3. Treat cells outside the selected scope as operation-frozen; preserve all
   persistent locks.
4. Search for a complete valid alternative that minimizes changed cells before
   applying existing quality objectives.
5. Return:
   - changed assignments;
   - before/after quality values;
   - requested scope;
   - any additional cells required to change;
   - relaxed preferences or a no-alternative reason.
6. Preview changes before accepting them.
7. Keep acceptance as one undoable history step.
8. If no alternative exists, offer a bounded scope expansion rather than
   falling back to whole-schedule regeneration.
9. Add quarter-based refinement before the slice is complete; the first proof
   may validate position, player, and explicit-cell scopes first.

**Validation checkpoint**

Test the proof with three tasks:

- regenerate goalkeepers only;
- improve one player's assignments;
- preserve a chosen starting lineup while changing later rotations.

All three tasks must work without starting from an empty grid. If they do not,
revise the scoped-refinement search, scope controls, or preview behavior within
the approved hybrid. Do not add partial-grid persistence without a separate
future product decision.

**Acceptance scenario**

- A valid schedule has acceptable first-quarter assignments but poor
  goalkeeper variety later.
- The coach selects goalkeeper as the allowed scope and requests an
  alternative.
- The preview either changes only goalkeeper-related swaps, names the small
  number of counterpart cells that must move, or reports that no valid bounded
  alternative exists.
- Rejecting the preview changes nothing. Accepting it creates one undoable
  revision and preserves unrelated explicit locks.

### Slice 2 — Player preferences and preference-aware generation

**Outcome proved:** The generated first draft reflects position comfort and
bounded playing-time judgment while remaining explainably fair.

**Required primitives**

1. Add a versioned persisted preference model separate from core player
   identity:
   - position disposition for each canonical position:
     `prefer | neutral | avoid`;
   - field-time preference: `standard | favor-extra-when-needed`;
   - optional private coach note that is never interpreted by the generator.
2. Add an explicit store migration rather than changing the existing
   `schemaVersion: 2` parser in place.
3. Add preference editing to the existing player profile or roster edit flow,
   including shortcuts that apply one disposition across a role group while
   persisting exact-position values.
4. Add the preferences to both the coaching recipe and scoped-refinement
   requests.
5. Extend generation scoring lexicographically:
   - hard validity;
   - current minute-spread bound;
   - avoid-position penalties;
   - field-time tie-break among unavoidable unequal totals;
   - preferred-position rewards;
   - existing midfield, goalkeeper, and exact-position variety objectives.
6. Add quality output that names relaxed avoids and unmet strong preferences.
7. Offer complete candidates with distinct, defined profiles only when their
   quality differences are meaningful.
8. Preserve manual swap, lock, undo/redo, scoped refinement, and whole-schedule
   regenerate behavior.
9. Add deterministic tests for contradictory preferences, all-goalkeeper
   avoids, seven-player rosters, unavailable players, regeneration, and
   migration.

**Approved fairness boundary**

Field-time preference is a tie-breaker only among schedules that preserve the
current fairness bound. This plan does not include a game-level switch that
permits an extra seven-minute spread.

**Acceptance scenario**

- A player is marked `avoid` for goalkeeper, other players are marked `prefer`
  for midfield, and a player is `favor-extra-when-needed`.
- With enough feasible alternatives, a generated schedule keeps the
  goalkeeper-avoid player out of goal, gives a preferred player midfield
  opportunities, and awards the favored player an unavoidable extra segment
  before a standard player.
- If roster constraints force the goalkeeper-avoid player into goal,
  generation succeeds and shows a named preference exception.
- No screen displays a general ordered player ranking.

### Slice 3 — Rotation policy and experience coverage

**Outcome proved:** A coach can generate a rotation that matches the team's
sideline substitution pattern and see who lacks a broad game experience.

**Changes**

1. Add a team default with an optional per-game override for defensive
   continuity:
   - goalkeeper only;
   - goalkeeper plus left/right defense.
2. Treat the policy as an optimization with a named exception, not a hard
   invariant.
3. Add attack/defense role-group coverage to schedule quality:
   - attack: midfield or forward;
   - defense: goalkeeper or defense.
4. Warn when a player lacks broad attack or defense coverage within a game,
   then show exact-position variety across the season on the player profile.
5. Keep the canonical seven positions and editable labels unchanged.

**Acceptance scenario**

- With eleven available players and defensive continuity enabled, a generated
  quarter retains goalkeeper and both defenders where feasible while bench,
  midfield, and forward changes bring all available players into the game.
- A player scheduled only in attack receives a non-blocking experience
  warning.

### Slice 4 — Minimal game-mode tracker

**Outcome proved:** The app can reconstruct what happened on the field without
mutating the plan or turning game mode into a coaching engine.

**Required primitives**

1. Replace historical reliance on `overrides` with a small set of versioned
   live events:
   - game started/paused/resumed;
   - quarter advanced;
   - bench player replaced field player;
   - two field players swapped positions;
   - team player scored a goal;
   - lineup reset to the published plan;
   - game completed and actual record confirmed;
   - correction or void of an erroneous event.
2. Give every event an ID, server timestamp, quarter, elapsed game-clock
   offset, actor, type, and typed payload.
3. Continue applying semantic commands under the serialized store lock and
   expected revision.
4. Derive current lineup from the published segment plus ordered events.
5. Preserve old live-state migration and make incomplete legacy games clearly
   “actual history unavailable.”
6. Keep the substitution control literal and short:
   - tap a field position;
   - choose a player currently on the bench;
   - immediately record and display the resulting lineup.
7. Add an atomic field-to-field position swap with similarly direct controls.
8. Add own-team goal recording:
   - choose the scorer from the team;
   - disable the submit control immediately while the command is pending;
   - show an unmistakable success acknowledgement such as “Goal recorded for
     a player” and close or reset the control;
   - do not show an aggregate score, opponent goals, score differential, or
     game result;
   - allow the same player to record another later goal after the first command
     has completed.
9. Provide a compact recent-events list and one simple correction path so a
   mistaken substitution, swap, or goal can be voided.
10. Define quarter-boundary behavior explicitly; do not erase events when the
    displayed override clears.
11. Do not calculate suggested substitutions, fairness warnings, minute
    corrections, or compensating future moves in game mode. The coach handles
    any resulting imbalance manually.
12. Require an explicit “Complete and confirm” action before the ledger may
    contribute trusted actual statistics. Until then, label it incomplete and
    keep it separate from confirmed actual totals.

**Acceptance scenario**

- A player begins at left midfield, swaps with the right forward at 03:00, goes
  to the bench at 07:00, and returns at right defense at 10:00.
- The player scores at 12:00. The coach records the goal once; the control
  disables during the write, confirms success clearly, and no running score
  appears.
- A rapid double click creates exactly one goal event. The same player can
  record a separate later goal.
- A refresh and a second coach's device reconstruct the same lineup and event
  order.
- Correcting the 07:00 event recomputes the lineup without touching the
  published schedule.
- At no point does live mode suggest who should substitute next or attempt to
  restore the planned minute totals.

### Slice 5 — Post-game actual and goal history

**Outcome proved:** A coach can review real participation and the team's goal
scorers after the game without adding live coaching logic or a scoreboard.

**Changes**

1. Derive actual position intervals, field minutes, bench minutes, and
   per-position totals from a confirmed event ledger.
2. Add planned versus actual views to the existing player profile and completed
   game summary.
3. Label incomplete records as estimates or unavailable; never silently fall
   back from actual to planned.
4. Include a game in trusted actual summaries only after the explicit
   “Complete and confirm” action.
5. Show each player's recorded own-team goal events in post-game/player
   history. Do not add opponent goals or convert the record into a displayed
   match score.
6. Surface attack, defense, goalkeeper, and “scored this season” coverage.
7. Keep all derived totals and coverage calculations out of the live action
   path.
8. Add interval and boundary tests for pause/resume, halftime, simultaneous
   commands, event correction, duplicate goal submission, and incomplete
   games.

**Acceptance scenario**

- After the Slice 4 example is completed and confirmed, a player's actual
  profile shows the derived minutes for midfield, forward, defense, and bench
  beside the original plan.
- The player's post-game history includes the recorded goal event.
- Reopening game mode shows the current lineup and factual event history but no
  score or substitution recommendation.

## Opportunity backlog

### Explore after actual-time field validation

- A game-level late-arrival note that excludes the player from the starting
  segment until confirmed present.
- Coach-entered reason tags for deviations such as injury, rest, or late
  arrival.
- Planned-versus-actual team-level fairness trends.
- Optional non-live season review for the “everyone has scored” coaching goal,
  using only recorded own-team goal events.

### Preserve but do not mix into this plan

- Glendale schedule import or parsing by team name.
- Google Calendar creation or synchronization.
- Team-name setup and league-specific naming.

## Final product decisions

These decisions were approved by Byron on July 28, 2026. Implementation should
not silently substitute one of the rejected alternatives.

### FD1 — Hybrid schedule workflow

Use a coaching recipe to establish intent and generate a complete valid
default. Offer up to two additional meaningfully distinct candidates on
demand. Refine the selected schedule by position, player, quarter, or explicit
cells.

Implement scoped regeneration first because it is the foundation for targeted
editing. Progressive partial-grid construction is deferred outside this plan.

### FD2 — Previewed scope expansion

Try the coach's selected refinement scope first. If no valid alternative
exists, show the exact counterpart cells or bounded additional scope required
and ask the coach to approve that expansion. Never move assignments outside
the selected scope silently.

### FD3 — Temporary freezes are not locks

During scoped regeneration, assignments outside the selected scope are frozen
for that operation only. Persistent locks are created only by an explicit
coach action. Accepting generated work does not automatically convert every
accepted cell into a hard requirement.

### FD4 — No partial-grid mode in this plan

Do not add incomplete-schedule persistence or progressive fill-and-lock mode.
Reconsidering that workflow requires a separate future product decision after
the hybrid has been exercised in real schedule-building work.

### FD5 — Bounded field-time preference

`favor-extra-when-needed` only decides which player receives a mathematically
unavoidable extra segment among otherwise fair schedules. It does not widen
the current minute-spread bound. There is no wider-spread switch in this plan.

### FD6 — Exact-position preferences with group shortcuts

Persist `prefer | neutral | avoid` against the seven canonical positions.
Provide editing shortcuts that apply a value across a role group such as
attack, midfield, defense, or goalkeeper. The stored source of truth remains
exact-position dispositions.

### FD7 — Game and season coverage windows

Within each game, evaluate broad attack and defense exposure. Across the
season, evaluate exact-position variety, including goalkeeper. Per-game exact
position coverage is not required.

### FD8 — Explicit actual-history trust boundary

An actual-game ledger contributes trusted actual minutes, positions, and goal
history only after a coach uses “Complete and confirm.” Incomplete or
abandoned tracking remains visibly separate and never silently substitutes for
confirmed actual history.

## Verification strategy

For each implementation slice:

1. Add focused schema, migration, scheduling, live-event, and summary tests
   appropriate to that slice.
2. Run `pnpm -C app verify`.
3. Reuse the server advertised by `live-server-details.json`.
4. Walk through the realistic acceptance scenario in the browser.
5. Include a mobile viewport for preference editing if it is used on game day,
   and always for live substitution, swap, goal, and correction flows.
6. For shared live changes, verify ordering and reconstruction in two browser
   tabs.
7. Confirm published assignments and planned totals remain immutable throughout
   actual-game recording.
8. Stress the goal control with rapid repeated activation and verify one
   server event, immediate disabled/pending feedback, clear success feedback,
   and no visible aggregate score.

## Traceability and completeness notes

- Email items 1–3 map to J01–J03.
- The informal “rules” list maps primarily to J02.
- The season-time and player drill-down paragraph maps to J04–J05.
- The actual-gameplay and on-field-swap questions map to J04.
- The goalkeeper/scoring aspiration maps to J05 and the opportunity backlog.
- The team-name and calendar paragraph is preserved as separate discovery work
  because it does not depend on the scheduling or live-history slices.
- Praise, contact details, and offer-to-help language were intentionally
  omitted because they do not change product scope.
- Byron's follow-up maps to J06, the schedule-construction theme, Options A–C,
  the former decision questions D1–D4, and Slice 1.
- The exact interaction “goalkeepers, then forwards, then a player, then the
  remainder” is preserved as Option A rather than recorded as a decided
  workflow.
- Options B and C were inferred alternatives created to serve the same
  preserve-good-work outcome; Byron approved their hybrid as the final
  direction.
- Byron's game-mode follow-up supersedes the earlier near-term candidate for
  automatic next-sub ordering and makes minimal live processing a decided
  product boundary.
- Own-team goal events move from the exploratory backlog into Slice 4. Opponent
  goal tracking and every form of visible scoreboard are explicit non-goals.
- Byron's final approval resolves former decision questions D1–D4 and Q1–Q4
  into final decisions FD1–FD8.
