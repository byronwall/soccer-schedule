# Position names implementation summary

## 1. Scope and context

The request was to make position names editable without changing source code. The scheduler already used seven stable position keys, so the work preserved those keys and the existing formation, short codes, groups, and scheduling behavior while making only the user-facing names configurable.

The feature uses the existing file-backed soccer store and authenticated `/api/soccer` action flow. No dependency changes or installation steps were required.

## 2. Major changes delivered

- Added a persisted `positionLabels` record to `app/src/lib/soccer/schemas.ts` and seeded defaults in `app/src/lib/soccer/store.ts`. Existing version-2 stores receive the standard labels through the schema default.
- Added the validated `updatePositionLabels` store action. Every position must retain a non-empty name of at most 40 characters.
- Added shared label resolution in `app/src/lib/soccer/fixed-game.ts` and exposed resolved positions through `app/src/features/soccer/SoccerDataProvider.tsx`.
- Added `/settings/positions` through `app/src/routes/settings/positions.tsx` and `app/src/components/soccer/PositionSettingsPage.tsx`. The page presents immutable IDs and one editable display-name field per position, with dirty-state, validation, pending, and saved feedback.
- Added a Positions navigation entry in `app/src/components/soccer/AppShell.tsx`.
- Replaced hard-coded display labels in schedule grids, live-game controls, print output, and player profiles with resolved persisted labels. Scheduling rules continue to use the stable position keys.
- Added persistence coverage in `app/src/lib/soccer/store.test.ts` and supplied default labels to the player-profile fixture.

## 3. Design decisions and tradeoffs

### Persist labels, not position definitions

- Decision: store a complete ID-to-name record and keep position IDs, short codes, groups, and ordering in source.
- Alternative: persist the full position collection or permit arbitrary position creation.
- Reason: the scheduling algorithm and runtime schemas depend on the seven known IDs. Labels can safely vary without migrating assignments or changing formation rules.
- Tradeoff: coaches cannot add, remove, reorder, or change short codes from this page.

### Reuse the existing soccer action boundary

- Decision: save through `data.run("updatePositionLabels", ...)` and the current `/api/soccer` endpoint.
- Alternative: add a separate settings endpoint or a new Solid Router server action.
- Reason: this keeps authentication, error handling, refetching, store locking, and atomic persistence consistent with the rest of the current feature.
- Tradeoff: the generic action endpoint remains the write boundary until the broader app migrates to typed server actions.

### Default old stores in schema version 2

- Decision: use a Zod default for `positionLabels` instead of incrementing the store schema version.
- Reason: the new field has a lossless default derived from the prior hard-coded behavior.
- Tradeoff: an old store file is not rewritten merely by reading it; the field is written on the next mutation, including the first label save.

## 4. Problems encountered and resolutions

### First render accessed data before loading

- Symptom: direct navigation to `/settings/positions` showed the global error overlay with `Cannot read properties of undefined (reading 'positionLabels')`.
- Root cause: Solid evaluates the child component before the client-loaded soccer snapshot is available, even though `AppShell` visually gates loaded content.
- Resolution: initialize the editable draft from `DEFAULT_POSITION_LABELS`, then hydrate it exactly once from the first available snapshot in an effect.
- Preventative action: editable route drafts in this app should tolerate an undefined initial soccer snapshot rather than relying on the shell's visual loading gate.

### Project scripts produced delayed buffered output

- Symptom: the combined verification command appeared idle while TypeScript was running.
- Resolution: verification was split into direct TypeScript, Vitest, and ESLint invocations so outcomes could be observed independently.

## 5. Verification and validation

- `./node_modules/.bin/tsc --noEmit --pretty false` from `app/`: passed.
- `./app/node_modules/.bin/vitest run --config app/vitest.config.ts`: passed, 7 files and 30 tests.
- ESLint over all touched implementation files: passed with no errors. `app/src/lib/soccer/store.ts` retains its existing max-lines warning (423 effective lines versus the 400-line guardrail).
- In-app browser check against `http://localhost:3000/settings/positions`: passed.
  - Confirmed direct route loading and final visual layout.
  - Changed `leftDefense` from `Left Defense` to `Left Back`.
  - Confirmed save feedback and disabled clean-state save button.
  - Reloaded the page and confirmed `Left Back` persisted.
  - Restored `Left Defense` and saved it.
- Not run: a production build, because this change does not modify build or deployment behavior and the repository default quality gate is type-check, tests, and lint.

## 6. Process improvements

- Add direct-route browser loading early for new client-data-backed pages. This caught a lifecycle failure that static checks and unit tests did not expose.
- Test persistence as a complete edit-save-reload-restore sequence. This validates UI state, the API action, file persistence, and refetch behavior without leaving test data behind.
- Keep configurable presentation values separate from stable domain identifiers when existing records reference those identifiers.

## 7. Agent/skill improvements

- Current pain: the route shell's loading gate can suggest that child components may safely read `snapshot()!`, but eager child evaluation makes that assumption unsafe.
- Proposed change: add an explicit rule to the SolidStart data/SSR skill or repository `AGENTS.md`: route components created under `SoccerPage` must tolerate an undefined initial snapshot, including editable draft initialization.
- Expected benefit: prevents direct-load crashes on future settings and editor pages.
- Suggested owner/place: `solidstart-data-ssr-patterns` and the repository's Solid data-loading guidance.

## 8. Follow-ups and open risks

- Low priority: extract store action groups if `app/src/lib/soccer/store.ts` continues growing; it is already over the repository's 400-line lint guideline.
- Low priority: add an automated browser test for edit-save-reload behavior if position settings becomes a critical operational workflow.
- Known limitation: names are configurable, but short codes, formation membership, ordering, and the number of positions remain intentionally fixed.
