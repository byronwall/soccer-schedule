# Changelog

This file records user-visible changes, important development workflow changes, and unresolved follow-ups for Soccer Coach Companion. Historical implementation detail remains in `docs/*work-summary.md`.

## Unreleased

### Changed

- Development tooling now coordinates around one shared hot-reloading server and provides a direct verification launcher when pnpm bootstrap cannot start repository scripts.
  - Problem: duplicate wrappers hot-reload the same checkout and can mutate the same development data.
- Repository guidance now treats `app/data` as disposable local state and uses targeted manual browser checks instead of a committed end-to-end test suite.
- The soccer store is split into focused persistence, authentication, action, and domain-helper modules.
- Routine work records a concise changelog entry; full implementation retrospectives are created only when explicitly requested.

### Verification

- `node app/scripts/verify.mjs` passed TypeScript, 37 Vitest tests, and ESLint with 10 pre-existing warnings. `pnpm -C app verify` reproduced the package-manager launcher stall and was stopped before the project script emitted output.
- A duplicate `pnpm -C app dev` reused the advertised server instead of spawning another Vinxi process.
- Manual Browser/Playwright MCP checks covered dashboard loading, direct-loaded position settings, the published schedule, and the game-day view at 390 × 844 with no horizontal overflow or browser-console errors.
- `docker compose config`, `git diff --check`, and validation of the updated post-work skill passed.

### Follow-ups

- Revisit authentication and deployment credential behavior before the first production deployment.
