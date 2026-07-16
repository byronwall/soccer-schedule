---
name: solid-ui-system-patterns
description: UI composition, Panda/ParkUI wrapper usage, minimal DOM structure, layout stability, overflow behavior, shared component extraction, and route-versus-component boundaries for Solid UI work.
---

# Solid UI System Patterns

Use this when Solid work changes visible UI, layout, wrappers, styling, or reusable component structure.

## System Defaults

- Prefer `~/components/ui/*` wrappers over route-level raw Ark/Park composition.
- Prefer ParkUI wrappers for interactive controls when a wrapper exists.
- Use Panda primitives, recipes, and tokens. Avoid raw hex, ad-hoc spacing, and dynamic helper-prop generation.
- Keep Panda helper props static. Use inline `style` for runtime-computed geometry, percentages, transforms, and SVG/chart layout values.
- Reusable UI belongs in `app/src/components/*`, not `app/src/routes/*`.
- Keep route/page components as shells for data wiring and feature composition.
- Split files before they become hard to review; roughly 200-300 LOC is the practical ceiling for TS/TSX in this repo.

## Wrapper and Overlay Rules

- Prefer simplified wrappers first: `SimpleDialog`, `SimplePopover`, `SimpleSelect`, `PanelPopover`, `ConfirmDialog`.
- Use `ClearButton` and `CloseButton` for standard clear/dismiss affordances.
- Use `IconButton` for icon-only actions and provide accessible labels.
- Use `~/components/ui/tooltip` for hover/focus help; avoid `title`.
- For Ark Solid `asChild`, callback props are getters. Spread `...props()`.
- Forward wrapper props (`class`, `style`, etc.) to the slot that actually owns DOM/styling.
- Import derived UI components with namespace imports when that is the local pattern, for example `import * as Popover from "./popover"`.
- Add derived component names to recipe `jsx` keys when needed.
- Avoid nested popovers for one interaction flow unless clearly justified.
- Keep overlay/select first-render DOM stable on SSR route surfaces. Prefer non-portalled/in-tree rendering unless clipping or stacking requires a portal.

## Minimal DOM and Layout

Before extracting or restructuring, map required elements:

- semantic elements: button, form control, list item, heading, table, dialog
- layout constraints: width, height, min/max, positioning context
- overflow ownership: scroll viewport versus constrained container

Rules:

- Remove wrappers that do not own semantics, styling, layout, or overflow.
- Prefer `Box`, `Stack`, `HStack`, `Flex`, and shared structural primitives over ad-hoc nested `div` trees.
- Do not create pass-through wrapper components just to forward shared state/actions.
- If extracted siblings need the same model, introduce a feature provider/hook.
- Keep leaf components prop-driven when their inputs are small and specific.
- Put persistent dialog actions in the footer when body content can scroll.
- Keep dynamic list/panel heights stable to prevent layout shift.
- For floating edge controls, anchor inside a local `position: relative` container with `overflow: visible`; put scrolling on an inner wrapper.

## Overflow Pattern

- Constraint container: `w="full"`, `maxW="100%"`, `minW="0"`, `overflow="hidden"`.
- Scroll container: explicit `overflowX`/`overflowY`.
- Content container: intrinsic sizing only when isolated inside a scroll viewport.
- Avoid `min-width: fit-content` unless an ancestor intentionally provides horizontal scrolling.
- Verify long labels, long unbroken content, and narrow/mobile widths.

## Feature Extraction Workflow

1. List which props, labels, actions, and visual states actually vary.
2. Extract the smallest component or hook that removes real duplication.
3. If extraction requires broad pass-through props, add a feature provider first.
4. Migrate at least two call sites when possible to prove the API.
5. Confirm call sites became simpler.
6. Check accessibility labels for icon-only or custom controls.
7. Run `pnpm -C app type-check`.

## Related Local Patterns

- Search highlighting: reuse `renderHighlighted`.
- Hover previews: reuse `DocHoverPreviewLink`, `useDocPreviewMap`, and preview text helpers.
- TOC/minimap rail layout bugs: use the dedicated `toc-rail-layout-playbook` if present.
