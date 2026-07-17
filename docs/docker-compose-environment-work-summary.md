# Docker Compose Environment Work Summary

## 1. Scope and Context

The Docker Compose configuration was reviewed against `app/.env.example` and direct environment reads in the application. The goal was to make expected variables explicit, give local-safe defaults where practical, and ensure build-time configuration reaches the Docker build.

Constraints:

- Secrets must remain externally overridable and must not contain real credentials.
- `/app/data` must remain the default persisted data location.
- Existing image and volume names were left unchanged to avoid disrupting deployments or detaching existing data.

## 2. Major Changes Delivered

- Updated `docker-compose.yml` so runtime settings (`NODE_ENV`, `HOST`, `PORT`, and `APP_DATA_DIR`) have explicit, overridable defaults.
- Added the required `COACH_CREDENTIALS_JSON` declaration and the session-invalidating `COACH_CREDENTIAL_VERSION` setting.
- Replaced stale starter defaults with `Coach Companion` values for `PRODUCT_NAME` and `EMAIL_FROM`.
- Added a usable local default for `APP_BASE_URL` and made the container port mapping follow `PORT`.
- Declared `BASE_PATH` and `CI_SSG_PRERENDER` as build arguments in `docker-compose.yml`.
- Updated `Dockerfile` to expose those build arguments to `pnpm build`, where `app/app.config.ts` reads them.
- Preserved the optional OpenAI, email, admin, and Stripe declarations already represented by `app/.env.example`.

Intentionally unchanged:

- The `solid-start-panda-park-ui-app` image name and `starter-data` volume name were not renamed because doing so could change deployment behavior or make existing persisted data appear missing.

## 3. Design Decisions and Tradeoffs

### Overridable defaults

- Decision: Use Compose `${VARIABLE:-default}` interpolation consistently.
- Alternative: Hard-code runtime values or require every variable through `${VARIABLE:?message}`.
- Reason: Defaults keep local Compose startup predictable while allowing deployment environments to override every setting.
- Tradeoff: Placeholder coach passwords are not production-safe and must be replaced in deployed `.env` files.

### Build-time variables

- Decision: Pass `BASE_PATH` and `CI_SSG_PRERENDER` through Docker build arguments and `ENV` directives in the build stage.
- Alternative: Keep them only in the runtime container environment.
- Reason: `app/app.config.ts` evaluates these settings during `pnpm build`; runtime-only values cannot change the compiled output.
- Tradeoff: Changing either value requires rebuilding the image.

### Existing scaffold integrations

- Decision: Retain empty/default declarations for OpenAI, Resend, admin, and Stripe settings.
- Alternative: Remove settings not currently read by active application files.
- Reason: They remain part of the repository's documented deployment contract in `app/.env.example` and repository guidance.
- Tradeoff: The Compose file declares more variables than the current soccer feature directly consumes.

## 4. Problems Encountered and Resolutions

- Symptom: The coach API could start without the required Compose declaration and then fail when reading coaches.
  - Root cause: `app/src/lib/soccer/store.ts` reads `COACH_CREDENTIALS_JSON`, but the Compose environment did not pass it through.
  - Resolution: Added both coach credential variables with explicit defaults.
  - Preventative action: Compare Compose variables against both `.env.example` and direct environment reads during deployment reviews.
- Symptom: Changing `BASE_PATH` in the Compose runtime environment would not affect the built app.
  - Root cause: The setting is read by `app/app.config.ts` during the Docker build.
  - Resolution: Added Compose build arguments and corresponding Dockerfile build-stage variables.
  - Preventative action: Classify configuration as build-time or runtime before adding it to Compose.

## 5. Verification and Validation

- `docker compose config`: passed; Compose interpolation, JSON credential syntax, build arguments, port mapping, and the complete resolved environment rendered successfully.
- `git diff --check`: passed; no whitespace errors were reported.
- Manual comparison against `app/.env.example` and `process.env`/`import.meta.env` reads: completed; all deployment-relevant variables are declared, with build-only settings routed through build arguments.
- Full `docker compose build`: not run because the change was a configuration review and syntax/expansion validation did not require dependency installation or image creation. A deployment build remains the final end-to-end check.

## 6. Process Improvements

- Current pain: A runtime environment list alone can conceal variables that are actually consumed at build time.
- Proposed change: Add a deployment review checkpoint that separates build arguments from runtime environment variables before editing Compose.
- Expected benefit: Prevents overrides that render correctly in Compose but have no effect on the application.
- Suggested owner/place: Repository deployment checklist or `AGENTS.md` Docker guidance.

## 7. Agent/System Prompt or Skill Improvements

- Current pain: The repository guidance lists application environment variables but does not explicitly identify `BASE_PATH` and `CI_SSG_PRERENDER` as Docker build-time inputs.
- Proposed change: Document which variables require an image rebuild and which can change at container restart.
- Expected benefit: Reduces future misconfiguration and unnecessary debugging.
- Suggested owner/place: The Docker section of `AGENTS.md` or a focused deployment skill/checklist.

## 8. Follow-ups and Open Risks

- High priority: Override `COACH_CREDENTIALS_JSON` with two long, unique production passwords before deployment; the checked-in defaults are deliberate placeholders only.
- Medium priority: Set `APP_BASE_URL` or platform-provided `SERVICE_URL_APP` to the public HTTPS origin in deployment.
- Low priority: Consider renaming the legacy image and volume identifiers during a planned migration that explicitly preserves or transfers the existing volume data.
- Validation gap: Run `docker compose build app` in the deployment environment before release.
