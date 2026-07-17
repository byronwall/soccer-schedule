# Soccer Coach Companion implementation status

Status as of 2026-07-16, compared with the [detailed product and implementation plan](./plans/soccer-coach-companion-app-detailed-product-and-implementation-plan.md).

## Summary

- [x] The planned core release is implemented.
- [x] The shared game-day follow-up is implemented and verified across two browser tabs.
- [x] The installable PWA shell is implemented without an offline data layer, as planned.
- [x] The interrupted hardening and acceptance-test pass is complete.
- [x] Production build, type-check, domain/integration tests, and lint complete successfully.
- [ ] Production deployment and real club credentials are intentionally left to the operator.
- [ ] A real-device sideline trial remains useful field validation, but is not an implementation blocker.

## Original delivery plan

### Phase 0 — starter conversion and fixed fixtures

- [x] Replaced the generic starter product surface with Coach Companion.
- [x] Removed the starter account, billing, Stripe, analytics, admin, email, and websocket-job features.
- [x] Added fixed game timing, segment, formation, and position constants.
- [x] Added an 11-player seed fixture.
- [x] Added desktop position/player schedule views and compact live-game views.

### Phase 1 — scheduling proof

- [x] Added Zod schemas for soccer data and persisted state.
- [x] Added deterministic generation, validation, repair, and quality scoring.
- [x] Preserved the planned priority order: playing-time fairness, midfield rotation, then goalkeeper continuity.
- [x] Added hard-invariant and deterministic scheduling tests.
- [x] Added replace, swap, lock, undo, redo, repair, and regenerate operations.
- [x] Split large scheduling, store, schedule-grid, and live-page responsibilities into focused modules below the repository's 400-line source limit.

### Phase 2 — private authentication and persistence

- [x] Requires exactly two server-only coaches in `COACH_CREDENTIALS_JSON`; there is no production demo-password fallback.
- [x] Supports login, opaque session cookies, logout, expiry, and credential-version invalidation.
- [x] Uses a Zod-validated file store with atomic temporary-file replacement and serialized lock-protected writes.
- [x] Persists roster, game, availability, schedule, and live-state changes.
- [x] Rejects unauthenticated product routes.
- [x] Documents configuration placeholders in `app/.env.example`.

### Phase 3 — schedule workflow and print

- [x] Supports draft, stale, and published schedules as distinct versions.
- [x] Protects published assignments from direct editing.
- [x] Preserves a published schedule when availability changes and creates or updates a stale working copy.
- [x] Prevents stale schedules from being published until repaired or regenerated.
- [x] Detects optimistic revision conflicts instead of overwriting another coach's work.
- [x] Persists manual edits and undo/redo history through reloads.
- [x] Shows next-game and planned season summaries on the dashboard.
- [x] Provides a dedicated print route with lineup, bench, totals, and revision information.
- [x] Visually verified schedule, conflict, recovery, and print states.

### Phase 4 — shared game-day mode

- [x] Supports a shared clock, pause/resume, quarter transitions, current lineup, bench, and next-change callouts.
- [x] Uses semantic, serialized, revisioned live commands.
- [x] Polls shared state every two seconds and refreshes on focus.
- [x] Supports temporary lineup overrides without changing the published plan or planned statistics.
- [x] Clears temporary overrides at quarter transitions.
- [x] Keeps open dialogs and the active page mounted during background revalidation.
- [x] Verified start-clock propagation in 2.80 seconds and override propagation in 2.85 seconds.

### Phase 5 — PWA and hardening

- [x] Added a web app manifest, icon, standalone display mode, and theme metadata.
- [x] Kept offline reads and writes out of scope.
- [x] Completed desktop preparation, schedule recovery, print, and two-tab live-mode walkthroughs.
- [x] Verified the compact live layout in the earlier phone-viewport pass.
- [x] Completed production compilation.

## Important fixes from the final hardening pass

- [x] Fixed availability changes that could replace or mutate the published schedule instead of preserving it.
- [x] Disabled assignment editing on published schedules and added explicit regenerate confirmation.
- [x] Fixed background polling that unmounted the live page and closed an in-progress substitution dialog.
- [x] Refactored high-complexity action dispatch and schedule repair code into named handlers/helpers.
- [x] Removed the visible demo password and the server-side credential fallback.

## Design decisions retained

- The product stays single-team and two-coach; no tenant, membership, billing, or public-sharing model was added.
- Game structure and positions remain fixed domain constants rather than administrator settings.
- Generation remains deterministic domain code rather than an AI feature.
- Published planning data remains separate from temporary live overrides.
- Polling remains the synchronization mechanism because the required two-device latency is met without adding realtime infrastructure.
- The implementation uses narrow authenticated JSON routes around the file-backed domain store. This differs from the plan's preferred SolidStart query/action shape, but keeps all validation and writes server-side and does not change product behavior.

## Problems encountered and resolutions

- The previous task stopped midway through the second browser-hardening pass. Existing screenshots and its task transcript were used to resume at the exact acceptance-test stage.
- A stale-schedule test exposed that published data was not immutable. Schedule mutation rules and regression tests now enforce the lifecycle.
- A two-tab substitution test exposed that `resource.loading` replaced the entire feature tree on each poll. The provider now shows a full loader only when no previous snapshot exists.
- The `pnpm` launcher hung silently in this environment even after the machine/network reset. The same quality-gate binaries were run directly from `app/node_modules/.bin`.
- The in-app browser ignored a late viewport override in the resumed session. The earlier task's successful phone-layout evidence was retained; the invalid late screenshot is not part of the report.

## Verification results

- [x] TypeScript: `tsc --noEmit` — passed.
- [x] Tests: Vitest — 4 files, 20 tests passed.
- [x] Lint: ESLint — 0 errors.
- [x] Soccer feature lint — 0 warnings.
- [x] Production: Vinxi/Nitro build — passed.
- [x] Authentication: successful login and rejected wrong password.
- [x] Persistence: game edits, schedule edits, undo/redo, publish, and reload verified.
- [x] Recovery: stale availability, repair, regenerate, and revision-conflict paths verified.
- [x] Print: lineup, bench, totals, and revision stamp visually verified.
- [x] Collaboration: two-tab clock and temporary override propagation completed within three seconds.
- [x] Live transition: pause and next-quarter state propagated and cleared the temporary override.

Build output still reports non-blocking dependency/tooling notices: stale Browserslist data, Panda-generated pure-annotation notices, and large chunks belonging mainly to the retained component explorer. ESLint reports 10 pre-existing warnings in the component explorer; none are in the soccer feature.

## Workflow assessment

- Keeping screenshots and browser evidence under `tmp/evals/` made the interrupted pass resumable.
- The acceptance walkthrough found lifecycle and revalidation defects that unit tests alone did not reveal.
- The store and live-mode regression tests now cover the two highest-risk failures discovered in testing.
- Future runs should establish environment credentials before starting a production server and should execute the direct binaries if the local `pnpm` shim again stalls.

## Remaining operator and follow-up work

- [ ] Set two strong, unique production passwords in `COACH_CREDENTIALS_JSON`.
- [ ] Set and increment `COACH_CREDENTIAL_VERSION` whenever credentials should invalidate existing sessions.
- [ ] Configure a persistent production `APP_DATA_DIR` and include it in backups.
- [ ] Deploy behind HTTPS and confirm secure-cookie behavior at the final hostname.
- [ ] Run one real-device, real-match sideline trial and record any workflow friction.
- [ ] Optional: clean the 10 pre-existing component-explorer lint warnings and split its oversized bundles; this is outside the soccer product scope.

No core product implementation item from the original plan remains open.
