---
name: solid-app-patterns
description: Default SolidJS correctness rules for component edits, props, state, reactivity, control flow, context providers, lifecycle cleanup, TypeScript hygiene, and final quality checks. Use for any non-trivial Solid component change.
---

# Solid App Patterns

Use this as the default quality skill for Solid component changes.

## Apply First

1. Read the edited component boundaries before changing code.
2. Identify state ownership: local, shared feature state, server data, or URL/router state.
3. Keep route/page files as composition shells once state or UI logic starts spreading.
4. Finish with the verification checklist.

## Props, State, and Context

- Do not destructure props in params or function bodies. Use `splitProps`; `mergeProps` is fine.
- Use `createSignal` for one independent scalar value.
- Use `createStore` for related state that resets, saves, validates, or updates together: drafts, filters, sorts, selected ids plus metadata, persistence state, table layout, nested records/maps.
- Treat several signals updated in one handler or `batch(...)` as a store candidate.
- Batch related writes that form one user-visible change.
- Guard `value` + `onChange` flows:
  - skip no-op emits
  - only sync prop-initialized draft state when the incoming prop actually changed
- Avoid prop drilling beyond two to three levels.
- Add a feature-scoped provider when siblings, repeated cards, toolbar/list/detail layouts, inspectors, or deep descendants need the same state/actions.
- Export a provider and safe `useX()` hook that throws outside the provider.
- Keep providers scoped to UI state, selectors, and named actions. Move non-UI business logic to `app/src/lib/*`.
- Pass leaf ids or narrow display props; do not forward broad state/action bundles through intermediate TSX.

## Reactivity and Render Flow

- Prefer `Show` over `&&` for conditional JSX.
- Use `Switch`/`Match` for multi-branch top-level forks.
- Do not use top-level signal-gated early returns for UI that must update later.
- Use `Show` function children when type narrowing matters.
- Use `createEffect` only for side effects, not pure derivation or signal mirroring.
- Prefer inline derived thunks for cheap derived values.
- Use `createMemo` for expensive filtering, sorting, grouping, or heavy mapping.
- Prefer `<For>` over `.map()` in JSX. Treat render locals as reactive functions when passing them downstream.
- Use `Suspense` for resource-backed UI. Do not rely on `Show` as the primary loading gate for resources.

## Lifecycle, Refs, and DOM Access

- Use `let ref` plus `ref={ref}` for component-owned nodes.
- Do not use `document.getElementById` for nodes the component owns.
- Put `onCleanup` inside the `onMount` callback when cleanup belongs to mounted browser behavior.
- Avoid render-time access to `window`, `document`, viewport size, time, random values, or other client-only APIs in SSR-rendered components.

## Structure and Types

- One component per file by default; small private helpers are fine when tightly coupled.
- Keep prop types beside their component. Promote reusable types only when reused.
- Use named exports by default.
- Keep imports at the top of the file.
- Prefer `import { type Foo } from "./foo"` over `typeof import("./foo").Foo`.
- Prefer `type` over `interface`.
- Avoid `any` and `as any`. If unavoidable, annotate `TODO:AS_ANY, <reason>`.
- Avoid mirror types. Derive from existing values/returns; if blocked, annotate `TODO:TYPE_MIRROR, <reason>`.
- Wrap major feature islands in `ErrorBoundary` with useful fallback behavior.
- Avoid noisy `console.log` in shipped UI.
- Avoid broad `try/catch` unless the recovery path is intentional.

## Escalate to Other Skills

- Use `solid-ui-system-patterns` when the work touches ParkUI/Panda wrappers, layout, overflow, component extraction, visual structure, or route-versus-component boundaries.
- Use `solidstart-data-ssr-patterns` when the work touches routes, resources, server actions, async loading, metadata, 404 behavior, overlays on SSR pages, or hydration-sensitive rendering.
- Use `solid-ssr-hydration-debug-playbook` only when there is an active hydration error or SSR/client mismatch to isolate.

## Verification Checklist

- No prop destructuring.
- Signal/store choice matches state cohesion.
- Related writes are batched or modeled as store actions.
- Shared feature state uses a scoped provider and safe hook.
- Branches use `Show`, `Switch`/`Match`, and `<For>` where appropriate.
- Effects are side-effect only.
- Resource-backed UI is inside `Suspense`.
- Refs and cleanup follow Solid conventions.
- TypeScript hygiene is clean; no unexplained `any`, `as any`, or mirror types.
- Run `pnpm -C app type-check` after code changes unless the user explicitly limits verification.
