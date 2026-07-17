# Site README Documentation Work Summary

## 1. Scope and context

The repository root README still described the original SolidStart/Park UI starter after the soccer-coach application had been implemented. The requested work was to replace that starter copy with an accurate product description, recover intent and terminology from the original transcript and implementation threads, add current screenshots of the major pages, and provide a complete Coolify deployment walkthrough.

The README needed to serve two audiences: someone trying to understand why the product exists, and a developer trying to run or deploy it. Claims were checked against the current UI, source, product plan, focused work summaries, and recent Codex threads.

## 2. Major changes delivered

- Replaced the root `README.md` with product-specific documentation covering the coaching problem, workflow, schedule model, editing and publishing rules, game-day behavior, roster and player history, position naming, authentication, technology, local setup, Coolify deployment, Docker, and project background.
- Preserved language from the original memo where it expressed the product boundary clearly, including the description of a companion application as a tool for the small administrative parts of coaching.
- Added current screenshots under `docs/images/readme/` for the dashboard, games list, game plan, schedule editor, game-day mode, roster, player profile, and position settings.
- Linked the original requirements transcript and detailed implementation plan so readers can inspect the full source material.
- Added a Coolify deployment sequence covering the Dockerfile source configuration, internal port, persistent `/app/data` mount, required secrets, public URL resolution, runtime defaults, build arguments, unused starter variables, and post-deployment checks.
- Left the application and concurrently edited `Dockerfile` and `docker-compose.yml` unchanged.

## 3. Design decisions and tradeoffs

### Explain the workflow instead of listing controls

- Decision: organize the README around the path from roster to game completion.
- Alternative: provide a flat route-by-route feature inventory.
- Reason: the original memo consistently judged features by whether they reduce the burden of preparing and running the next game.
- Tradeoff: some lower-level controls appear inside broader sections rather than receiving their own headings.

### Distinguish generated, published, and live state

- Decision: document drafts, immutable published snapshots, editable revisions, stale availability, and temporary live overrides explicitly.
- Alternative: describe all of these as generic schedule editing.
- Reason: this state model determines which plan powers print, game-day mode, and season totals; leaving it implicit would misrepresent important behavior.
- Tradeoff: the README carries more product detail than a typical short project introduction.

### Use current seeded data for screenshots

- Decision: capture the running local application with its existing demonstration team and schedules.
- Alternative: reuse older evaluation artifacts or create a new screenshot-only dataset.
- Reason: current captures verify the pages described in the README and avoid mutating the user’s local data.
- Tradeoff: dates and team names in the images are demonstration content rather than generic placeholders.

### Capture the schedule at its natural viewport

- Decision: use the browser's natural 1280 px desktop viewport and let the schedule's horizontal overflow remain visible as part of the real page behavior.
- Alternative: force a 1920 px viewport to show more time segments in one image.
- Reason: the screenshot backend cropped the forced-wide canvas at device-pixel scale, offsetting the centered application shell from the captured viewport. The natural viewport keeps the page chrome and schedule aligned exactly as rendered.
- Tradeoff: the README image shows the first portion of the eight-segment grid rather than every column at once.

### Give the dashboard enough horizontal canvas

- Decision: recapture the dashboard on a 1920 px-wide canvas while preserving the complete page height.
- Alternative: keep the original 1280 px capture.
- Reason: the original asset appeared zoomed in and cropped the right side of the header. The wider canvas presents the full navigation, page actions, summary cards, and season-minutes panel at a natural desktop scale.
- Tradeoff: the corrected image includes more outer whitespace, but the application shell is centered and readable rather than clipped.

### Separate required variables from declared variables

- Decision: classify deployment configuration into required application values, runtime defaults, build arguments, Compose-only settings, and unused starter integrations.
- Alternative: copy every variable from `app/.env.example` into one undifferentiated table.
- Reason: Coolify users need to know what must be supplied manually; declaring an optional integration in Compose does not make it a soccer-application requirement.
- Tradeoff: the deployment section is longer, but it prevents placeholder API keys and irrelevant Stripe or email configuration from looking mandatory.

### Map Coolify's application URL into the app contract

- Decision: document `APP_BASE_URL=$COOLIFY_URL` for the recommended Dockerfile build pack and reserve `SERVICE_URL_APP` for Coolify Docker Compose service stacks.
- Alternative: assume `SERVICE_URL_APP` is generated for every Coolify resource.
- Reason: current Coolify documentation distinguishes application predefined variables such as `COOLIFY_URL` from `SERVICE_URL_<ID>` magic variables used by service stacks. `app/src/lib/app/base-url.ts` reads `SERVICE_URL_APP` and `APP_BASE_URL`, but not `COOLIFY_URL` directly.
- Tradeoff: the Dockerfile deployment requires one explicit mapping in the Coolify environment UI.

## 4. Problems encountered and resolutions

### Screenshot bytes did not match the requested extension

- Symptom: the browser returned JPEG-encoded captures saved with `.png` names.
- Root cause: the browser capture backend selected JPEG encoding even though the repository path used a PNG extension.
- Resolution: converted every capture in place to true PNG with macOS `sips`, then confirmed the resulting file types.
- Preventative action: run `file` against generated README images before linking them.

### Forced-wide capture offset the schedule page

- Symptom: user review showed the page shell beginning far inside the image while the right side was cropped, so the screenshot was visibly misaligned to its viewport.
- Root cause: the forced 1920 px viewport interacted poorly with the screenshot backend's device-pixel scaling; the renderer centered the 1280 px application shell in a wider logical canvas, but the output cropped that canvas.
- Resolution: recaptured at the browser's natural desktop size. Browser metrics confirmed `innerWidth: 1280`, document width `1280`, `scrollX: 0`, and a main-shell rectangle from `0` to `1280` before the asset was replaced.
- Preventative action: capture README evidence at the natural browser viewport unless a forced size has been visually confirmed against the resulting image dimensions.

### Dashboard capture appeared zoomed and cropped

- Symptom: user review showed that the dashboard image was magnified enough to omit the right side of the page chrome.
- Root cause: the capture backend's logical viewport and output-pixel scaling produced a narrower-looking composition than the intended desktop page.
- Resolution: recaptured the full dashboard on a 1920 px-wide canvas, converted the returned JPEG bytes to a true PNG, and visually confirmed that the entire header and content shell are centered in-frame.
- Preventative action: visually inspect the full image—not only its nominal pixel dimensions—and verify that both ends of the global navigation are visible before accepting dashboard captures.

### Coolify and `.env` use different quoting contexts

- Symptom: copying the credential example literally from `.env.example` could store the surrounding single quotes as part of the Coolify value.
- Root cause: quotes are useful to protect JSON in an env file or shell, while Coolify's value field already stores one string.
- Resolution: the README shows raw one-line JSON for Coolify and explicitly says to omit the outer single quotes.
- Preventative action: deployment documentation should show platform-native secret values, not only shell-oriented examples.

## 5. Verification and validation

- Reviewed the original requirements transcript in `docs/plans/soccer-coach-companion-app-requirements-and-workflow.md`.
- Reviewed the detailed plan, implementation status, current route/component source, and focused work summaries for games, schedule editing, warnings, player colors, player details, authentication, and position labels.
- Reviewed recent Codex threads covering the initial plan and implementation plus later game management, drag-and-drop, player details, position labels, and published-schedule revision behavior.
- Loaded the existing server advertised by `live-server-details.json` and inspected all documented major pages through the browser.
- Captured and visually reviewed the dashboard, schedule editor, live-game view, and player profile; DOM snapshots confirmed the content of all eight captured routes.
- Recaptured the schedule editor after user review and confirmed its viewport/document alignment from browser layout metrics before visually inspecting the final PNG.
- Recaptured the dashboard after user review and confirmed that its full navigation, page actions, summary cards, and season-minutes panel are visible at a natural desktop scale.
- `file docs/images/readme/*.png`: confirmed the final image assets are PNG files.
- Compared the deployment tables against `app/.env.example`, `docker-compose.yml`, `Dockerfile`, direct `process.env` reads, and `app/src/lib/app/base-url.ts`.
- `docker compose config`: used to validate the current Compose variable interpolation and JSON credential default.
- `pnpm -C app verify`: not run because this change modifies documentation and static screenshots only; no application source or runtime behavior changed.

## 6. Process improvements

- Current pain: a repository can retain starter-facing documentation long after the product identity changes.
- Proposed change: add a README identity check to the first feature-complete milestone.
- Expected benefit: prevents deployment and handoff with incorrect starter copy.
- Suggested owner/place: repository project-completion checklist.

- Current pain: feature documentation can flatten distinct persisted and temporary states into one vague description.
- Proposed change: trace which record drives each downstream surface before documenting a workflow.
- Expected benefit: makes stateful product documentation accurate enough to guide future implementation.
- Suggested owner/place: `post-work-doc-playbook` evidence checklist.

- Current pain: copied environment-variable lists do not distinguish mandatory secrets from inactive scaffold configuration.
- Proposed change: classify every deployment variable by consumer, lifecycle (build or runtime), requirement level, and owning platform.
- Expected benefit: gives deployers a minimal safe configuration and reduces placeholder-secret mistakes.
- Suggested owner/place: repository deployment checklist.

## 7. Agent/system prompt or skill improvements

- Current pain: the browser screenshot guidance does not explicitly require checking that encoded image bytes match the chosen file extension.
- Proposed change: add a file-type validation step after saving browser screenshots to a repository.
- Expected benefit: avoids image rendering failures in Markdown hosts and asset pipelines.
- Suggested owner/place: Browser plugin screenshot guidance.

- Current pain: the post-work documentation skill assumes the requested artifact is itself a retrospective, while a README update needs a product-facing document plus the skill’s engineering handoff sections.
- Proposed change: allow a companion work summary when the requested public document should not contain internal process and agent-improvement sections.
- Expected benefit: preserves both user-facing clarity and complete implementation evidence.
- Suggested owner/place: `post-work-doc-playbook/SKILL.md` under document target selection.

- Current pain: deployment reviews can treat `.env.example`, Compose declarations, and direct application reads as equivalent sources of truth.
- Proposed change: add an environment reconciliation step that records whether each variable is read by active code, passed through infrastructure, or retained only for an optional scaffold.
- Expected benefit: produces accurate required-variable documentation and exposes missing Compose pass-throughs.
- Suggested owner/place: a deployment documentation skill or the post-work documentation evidence checklist.

## 8. Follow-ups and open risks

- The screenshots use the current demonstration team, opponents, and dates. Refresh them if the seeded dataset or visual design changes materially.
- The README describes the current fixed seven-position, eight-segment game model. If formation or duration configuration becomes dynamic, update the scheduling and workflow sections.
- The optional OpenAI, email, Stripe, and admin variables remain inherited scaffold capabilities rather than soccer-product features; the README calls out that boundary explicitly.
- For the recommended Dockerfile build pack, `APP_BASE_URL` must map to Coolify's generated `COOLIFY_URL` or contain the literal production origin. `SERVICE_URL_APP` applies only if the repository is deployed as a Compose service stack.
- Persistent storage at `/app/data` is operationally required even though the container can start without an attached volume.
