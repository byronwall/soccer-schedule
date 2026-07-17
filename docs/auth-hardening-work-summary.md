# Authentication Hardening Work Summary

## 1. Scope and context

The login flow crashed with `Unexpected token '<'` because a server exception produced an HTML SolidStart error document and the client unconditionally parsed it as JSON. The requested outcome expanded to include frictionless development access while preserving real authentication in production.

Constraints:

- Production must continue to require exactly two server-configured coaches through `COACH_CREDENTIALS_JSON`.
- Development must not require credentials, cookies, or login interaction.
- API failures must remain JSON at the auth boundary and must not expose credential or exception details to the browser.

## 2. Major changes delivered

- Added development-only authentication bypass in `app/src/lib/auth/coach-session.ts`. Protected APIs receive a synthetic `Development Coach` only when `import.meta.env.DEV` is true.
- Redirected `/login` to `/` in development in `app/src/routes/login.tsx` and hid the non-functional development sign-out action in `app/src/components/soccer/AppShell.tsx`.
- Sanitized the successful login result in `app/src/lib/soccer/store.ts`. The returned coach now contains only `id` and `displayName`; the configured password never crosses the domain boundary.
- Added `app/src/lib/auth/coach-auth-response.ts` so missing or invalid credential configuration produces a JSON `503` response with a non-sensitive message.
- Hardened `app/src/routes/api/auth/coach-login.ts` against malformed JSON and server-side authentication/configuration failures.
- Hardened `app/src/components/soccer/LoginPage.tsx` by checking response content type, validating response shapes with Zod, catching request failures locally, and showing a sign-in-unavailable alert instead of triggering the global error overlay.
- Added regression coverage in `app/src/lib/auth/coach-session.test.ts`, `app/src/routes/api/auth/auth-routes.test.ts`, and `app/src/lib/soccer/store.test.ts`.

Production credential configuration and the 30-day opaque session-cookie design intentionally remain unchanged.

## 3. Design decisions and tradeoffs

### Compile-time development bypass

- Decision: gate bypass behavior with `import.meta.env.DEV` at the server authorization boundary.
- Alternative: add default/demo credentials or require developers to create `.env` files.
- Reason: the authorization boundary makes every protected development request work without teaching callers about a special token, while the production build compiles the bypass off.
- Tradeoff: development cannot exercise the normal login UI without running a production-mode build. This is intentional because normal development prioritizes frictionless access.

### Sanitize at the domain boundary

- Decision: make `loginCoach()` return a public coach projection rather than sanitizing only the HTTP response.
- Alternative: destructure the credential inside `coach-login.ts`.
- Reason: callers cannot accidentally serialize the password if the sensitive field is absent from the returned value.
- Tradeoff: future internal callers that genuinely need credential fields must use a separate server-only function rather than the login result.

### JSON failure contract plus defensive client parsing

- Decision: fix both the server response and client parser.
- Alternative: only catch `response.json()` failures in the UI.
- Reason: API consumers deserve a stable JSON contract, while client validation still protects against proxies, routing mistakes, and framework-generated HTML responses.
- Tradeoff: the login component contains a small amount of response-validation code; this is preferable to allowing an unhandled promise rejection to reach the global overlay.

## 4. Problems encountered and resolutions

### HTML parsed as JSON

- Symptom: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
- Root cause: missing `COACH_CREDENTIALS_JSON` caused the auth endpoint to throw; SolidStart returned HTML; the login UI always called `response.json()`.
- Resolution: auth routes now catch configuration/server failures and return JSON `503`; the client validates content type and JSON shape before use.
- Preventative action: API-route tests assert JSON content type for malformed requests and unavailable auth configuration.

### Credential leaked in successful login response

- Symptom: the black-box production smoke test showed the configured password inside `coach`.
- Root cause: `loginCoach()` returned the full object selected from `COACH_CREDENTIALS_JSON`, and the route serialized it.
- Resolution: `loginCoach()` now constructs `{ id, displayName }` explicitly.
- Preventative action: both store and route tests assert the exact public response shape.

### Development server wrapper race during additional starts

- Symptom: a second `pnpm -C app dev` failed renaming `live-server-details.json.tmp`.
- Root cause: an existing dev wrapper was still writing the same fixed temporary manifest filename while another wrapper started.
- Resolution for this work: reused the already advertised server for live verification and avoided replacing user-owned server state.
- Preventative action: follow-up recommended below for unique temporary manifest filenames or a single-instance guard.

### Sandboxed pnpm registry-signature check

- Symptom: verification/build attempts inside the sandbox could not verify the pnpm release because registry fetches failed.
- Resolution: reran the required commands outside the sandbox as prescribed by repository guidance.

## 5. Verification and validation

- `pnpm -C app verify`: passed. TypeScript passed; 26 tests passed; ESLint reported 0 errors and 11 unrelated pre-existing warnings.
- `pnpm -C app build`: passed and produced the Nitro node-server output.
- Live development HTTP check: `GET /api/soccer` returned `200` without a cookie and identified `Development Coach`.
- Live development configuration check: `GET /api/auth/coaches` returned JSON `503` when credentials were absent, not HTML.
- Rebuilt production black-box check with disposable credentials and temporary data:
  - anonymous `GET /api/soccer`: `401`;
  - valid `POST /api/auth/coach-login`: `200` with only coach ID and display name;
  - cookie-authenticated `GET /api/soccer`: `200`;
  - no password appeared in either successful response.
- Disposable production server, cookie files, responses, and temporary data were stopped and removed after verification.

Validation gap: no browser-driven visual walkthrough was run. The live HTTP checks covered the reported failure, authorization policy, and response secrecy; the UI change was covered by type/lint validation rather than browser automation.

## 6. Process improvements

- Current pain: a response-format fix alone would have left the password leak undiscovered.
- Proposed change: include a black-box production auth smoke test that inspects successful response bodies, not only status codes.
- Expected benefit: catches serialization leaks and confirms the development bypass is absent from production.
- Suggested owner/place: repository auth/deployment verification checklist or a reusable integration test script.

- Current pain: repeated dev-server starts can race on one manifest temp file.
- Proposed change: make `writeManifestAtomic()` use a PID/UUID-specific temporary file and add a single-instance check based on the advertised process.
- Expected benefit: prevents confusing startup failures for developers and agents.
- Suggested owner/place: `app/scripts/dev-server-manifest.mjs` and its tests.

## 7. Agent/system prompt or skill improvements

- Current pain: repository guidance covers server-only credentials but does not explicitly require public projections for authentication responses.
- Proposed change: add an AGENTS auth rule: never return or serialize objects sourced directly from credential configuration; construct an allowlisted public response and assert its exact shape.
- Expected benefit: prevents future accidental secret serialization.
- Suggested owner/place: `AGENTS.md` under AI SDK/auth or SaaS scaffold guidance.

- Current pain: ordinary dev-server verification can accidentally start a second wrapper even when `live-server-details.json` advertises one.
- Proposed change: strengthen the agent startup checklist to probe the advertised URL outside the sandbox before starting another wrapper.
- Expected benefit: avoids wrapper races and preserves the user's running process.
- Suggested owner/place: repository Development Commands guidance and the dev-server helper.

## 8. Follow-ups and open risks

- Medium priority: fix the fixed-name `live-server-details.json.tmp` race in the dev-server wrapper.
- Low priority: move the login response parsing helper into a shared API utility if additional client fetch flows need the same content-type and Zod validation behavior.
- Existing lint warnings in component-explorer files and `GamesPage.tsx` remain outside this authentication scope.
- No known open authentication regression remains after the production black-box verification.
