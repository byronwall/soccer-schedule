# Soccer domain invariants

These rules define the current Soccer Coach Companion model. The application has not been deployed yet, so persisted development data may be reset when the schema changes; this document describes current behavior, not a backward-compatibility contract.

## Positions and players

- Position IDs, codes, formation membership, and ordering are stable domain identifiers.
- Position labels are editable presentation and may change without changing stored position identity.
- Player colors belong to player records. Schedule assignments store player IDs, not copied colors or labels.
- Active roster membership and per-game availability are separate decisions. A player can remain active while unavailable for one game.
- A player referenced by schedule history must be made inactive instead of deleted.

## Games and schedules

- Game lifecycle is explicit: `scheduled`, `completed`, or `canceled`. Do not infer completion from the clock or calendar.
- A published schedule is an immutable snapshot used by print, game-day mode, and completed-game history.
- “Edit again” clones the published assignments into a new draft. The published schedule remains active until the draft is deliberately published.
- Availability changes mark an existing working schedule stale or create a stale copy from the published schedule; they do not rewrite the published snapshot.
- Schedule revisions protect against concurrent edits. A stale expected revision must fail rather than overwrite newer work.
- Schedule-quality warnings are advisory unless a rule is explicitly promoted to a blocking validity error.
- Live-game substitutions are temporary overrides and do not rewrite published assignments or planned-minute totals.

## Data boundaries

- Parse the current persisted shape through `soccerStoreSchema` before use.
- Until first deployment, obsolete local persisted shapes do not require migrations; reset `app/data` after an intentional schema break.
- Keep file locking and atomic writes inside the persistence module so actions cannot bypass serialization.
- Construct public coach/session projections explicitly. Never return credential configuration objects from an API boundary.
