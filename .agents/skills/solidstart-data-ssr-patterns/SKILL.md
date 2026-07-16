---
name: solidstart-data-ssr-patterns
description: SolidStart data loading, server actions, createResource usage, Suspense boundaries, route metadata, 404 handling, and SSR/hydration-safe first render patterns.
---

# SolidStart Data and SSR Patterns

Use this when work touches route data, async boundaries, server actions, route metadata, 404s, overlays on SSR pages, or any component that can hydrate after server render.

## Data Flow

- Reads: prefer server `query()` plus client `createResource()`.
- Writes: prefer server actions and `useAction(...)` in TypeScript.
- Do not use raw UI-component `fetch()` for app data.
- Prefer typed object inputs for new or substantially touched actions when Solid Router/server-action constraints allow it.
- Parse route and server-action input at the boundary with Zod before calling store/domain logic.
- Use shared helpers from `app/src/lib/zod-utils.ts`, especially `parseJsonRequest(request, schema)` and `zodErrorMessage(...)`; avoid `await request.json() as Type`.
- Keep editable form drafts string-friendly, then normalize with Zod-backed helpers when values enter domain logic.
- Build `FormData` in TypeScript only for existing actions that still require it.
- Do not render hidden forms or call `requestSubmit()` as an action transport for new UI.
- Keep provider/model calls on the server. Never expose API keys to client code.

## Resource Consumption

- Prefer `resource.latest` by default to avoid transient empty/loading blips during revalidation.
- Use `resource()` only when an intentional pending/loading transition should replace current content.
- Wrap resource-backed UI in `Suspense` with a stable fallback.
- Prefer stable-height result panes with `overflow: auto` for streaming or dynamic content.
- Handle empty states inside resolved content rather than using broad resource-level branch forks.
- Use separate `Suspense` islands for independent async resources.
- Avoid mixing multiple unrelated async accessors inside one shared list/render gate.

## Routes, Metadata, and Missing Data

- Detail routes should set `<Title>` and OG title/description from loaded data.
- Missing resources must return real 404 semantics via `HttpStatusCode`.
- Provide a clear recovery action such as a root-relative route link back home or to the relevant list.
- Use Solid Router navigation primitives (`useNavigate`, `<A>`, router-aware `Link`) with root-relative paths.

## Hydration Safety

Core rule: server DOM and first client hydration DOM must have the same node existence and hierarchy. Change attributes, text, or enhancements after mount when needed.

- Keep JSX structure identical between SSR and initial client render.
- Avoid render-time branches based on `window`, `document`, viewport size, time, random values, locale-sensitive comparisons, or client-only APIs.
- Keep list ordering deterministic across server and client. Prefer stable lexical comparisons over locale-sensitive sort behavior when hydration stability matters.
- Preserve stable wrapper nodes when adding buttons, overlays, or progressive controls; hide/show after hydration with attributes/CSS when needed.
- Treat select/menu/popover portal behavior as hydration-sensitive.
- Prefer in-tree/non-portalled overlay rendering on SSR route surfaces unless clipping or stacking requires a portal.
- If a portal is required, hard-refresh verify hydration parity.
- Avoid derived "effective" selectors that can switch entire route subtrees before hydration completes, such as `selected || firstItem`, unless the selected value is serialized or otherwise stable for the first render.
- If SSR errors mention `@zag-js/splitter` cleanup (`removeGlobalCursor` / `clearGlobalCursor`), treat Splitter as a first suspect and contain with a static CSS split while debugging.

## Safe Change Workflow

1. Identify which JSX renders on the server.
2. Keep a minimal hydration-safe baseline.
3. Add client-only enhancements in `onMount`.
4. Keep fallback and empty markup local to each async section.
5. Hard refresh the touched route and check direct deep-link loading when hydration risk is present.
6. Run `pnpm -C app type-check`.

## Escalate to Debug Playbook

Use `solid-ssr-hydration-debug-playbook` when you see:

- `Hydration Mismatch`
- `template2 is not a function`
- hard-refresh crashes that disappear during client navigation
- failures fixed by removing one async section, one list row subtree, or one portal
- SSR-only `document is not defined` stack traces from UI machines
