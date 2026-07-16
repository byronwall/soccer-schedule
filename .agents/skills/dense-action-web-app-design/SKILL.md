---
name: high-quality-application-ui-design
description: Design or implement polished, space-efficient, general-purpose application UIs for SaaS apps, admin panels, dashboards, builders, editors, settings pages, data tools, workflow tools, and internal applications. Use when the goal is strong visual hierarchy, clear composition, efficient layout, useful interaction states, and low clutter.
---

# High Quality Application UI Design

Use this skill for application screens that need to look polished, use space well, and support real workflows.

Core rule: decide the hierarchy before choosing components.

A good app UI makes the primary object obvious, places the next action near the work, hides unnecessary detail, and uses visual weight intentionally. It should feel calm, efficient, and interactive, not like a pile of cards, badges, panels, and controls.

## Required Design Process

Before designing or coding, perform this analysis and let it shape the layout:

1. Classify the screen type.
2. Define the primary task, primary object, center of gravity, and next likely action.
3. Rank visible information by priority.
4. Choose one dominant layout pattern.
5. Decide what is visible, contextual, disclosed, rare, dangerous, or internal.
6. Define relevant loading, empty, partial, success, error, and responsive states.
7. Choose visual system rules for spacing, control height, typography, panels, icon usage, color, borders, and shadows.

Do not start by placing components. Start by deciding what matters.

## Product Principles

1. One screen, one center of gravity.
   - Every screen needs a dominant object or task.
   - The largest or most prominent area should match the user's main goal.
   - Do not let metadata, navigation, badges, or setup controls compete with the core work.

2. High signal per pixel.
   - Density means useful information per pixel, not more boxes.
   - Remove repeated labels, redundant badges, decorative panels, and internal status.
   - Prefer compact, scannable controls over large generic cards.

3. Workflow beats component inventory.
   - Design the path the user follows, then choose components.
   - Common actions should be visible near the work.
   - Occasional actions should be nearby but quieter.
   - Advanced, rare, and internal details should be behind disclosure.

4. Components stay visually quiet until needed.
   - Borders, shadows, badges, and colors should communicate meaning.
   - Do not wrap every element in a heavy card.
   - Do not use accent colors for decoration.
   - Avoid equal-weight panels for unequal-priority content.

5. Interaction states are part of the design.
   - Important controls need default, hover, focus, active, disabled, loading, success, error, and empty states.
   - Builder/editor UIs need partial, invalid, preview loading, preview failed, dragging/selecting, and unsaved states.
   - Drag/drop needs valid target, invalid target, dragging, accepted, rejected, and keyboard alternatives.

6. Use plain user-facing language.
   - Use words from the user's task.
   - Hide implementation details.
   - Avoid labels like config, payload, node, panel, spec, staged, or debug unless the product is explicitly technical.

7. Optimize for first use and repeated use.
   - First use needs guidance and obvious next steps.
   - Repeated use needs speed, compactness, keyboard support, and remembered preferences.
   - Do not make expert workflows feel like onboarding forever.

8. Responsiveness is a redesign, not a squish.
   - Desktop can show multiple panes.
   - Tablet collapses secondary panes.
   - Mobile becomes task-based with sheets and sticky actions.
   - Never shrink a complex desktop toolbar into accidental wrapped rows.

## Screen Classification

Pick the closest screen type:

- Create flow
- Editor or builder
- Data table or work queue
- Dashboard
- Detail page
- Settings/configuration
- Review/approval flow
- Monitoring/operations view
- Search/browse interface
- Empty/onboarding state

## Information Priority

Answer these before layout work:

- What is the primary task?
- What is the primary object?
- What should the user look at first?
- What is the next most likely action?
- What information is supporting context?
- What information is advanced, rare, or internal?
- What can be hidden, collapsed, moved to a drawer, or moved to a menu?

Rank visible elements:

```txt
Priority 1: Main work surface
Priority 2: Current state and primary action
Priority 3: Supporting inputs/context
Priority 4: Secondary actions
Priority 5: Advanced actions
Priority 6: Debug/internal details
```

The final layout must visually match this ranking.

## Layout Patterns

Choose one dominant pattern. Do not mix patterns without a clear reason.

| Pattern | Use when | Structure |
| --- | --- | --- |
| Canvas + inspector | User creates, edits, previews, or configures an object | Main canvas with side inspector |
| List + detail | User scans many objects and inspects one | List/table with detail pane |
| Work queue | User processes many similar items | Toolbar + filters + table + inspector |
| Wizard/stepper | User must complete ordered setup | Step list + focused content + footer actions |
| Dashboard | User monitors metrics and follows up | KPI row + charts + exception lists |
| Settings page | User configures grouped options | Left nav + sections + sticky save |
| Search/browse | User finds an item | Search/filter shell + results + preview |
| Split editor | User writes/configures and previews output | Editor pane + preview pane |
| Command center | User needs fast cross-system actions | Search/command + grouped action surfaces |

## Visible vs Disclosed

Classify every control and data element:

| Layer | Treatment |
| --- | --- |
| Primary | Always visible near the work |
| Secondary | Visible but visually quieter |
| Contextual | Appears near selected object |
| Advanced | Drawer, popover, inspector, accordion, or command palette |
| Rare | Menu or command palette |
| Dangerous | Separated and confirmed |
| Internal/debug | Hidden by default |

## Visual Defaults

Use these defaults unless the product has a stronger reason:

| Element | Desktop size |
| --- | ---: |
| Header height | 48-64px |
| Toolbar height | 36-44px |
| Button height | 32-36px |
| Input height | 32-36px |
| Compact chip height | 24-30px |
| Table row height | 32-40px |
| Inspector width | 320-420px |
| Left nav width | 56 collapsed / 200-260 expanded |

Spacing scale:

```txt
4px  tiny internal gap
8px  compact related gap
12px standard control gap
16px section internal padding
24px region gap
32px large page rhythm
```

Rules:

- Use whitespace as grouping before adding boxes.
- Use fewer borders and scarce badges.
- Use subtle backgrounds for regions.
- Use color for state and meaning, not decoration.
- Use one primary accent color plus neutral surfaces.
- Keep button labels short and specific.
- Use tabular numbers for metrics, money, dates, counts, and IDs.
- Align major left edges and keep control heights consistent.
- Do not let toolbars wrap accidentally.
- Truncate long text with tooltip, details panel, or inspector.

## Required States

Include the relevant states in designs and implementations:

- Loading
- Empty
- First-use guidance
- Partial/incomplete
- Ready
- Success feedback
- Error
- Disabled with reason
- Long-running operation
- No results
- Permission denied
- Responsive collapsed state

Builder/editor UIs also need:

- Unsaved changes
- Invalid configuration
- Preview loading
- Preview failed
- Dragging or selecting
- Undo/redo where useful

## Required Output For Design Requests

When asked to design a UI, produce:

1. Screen classification
2. Primary workflow
3. Information priority ranking
4. Layout pattern choice
5. Visible vs disclosed controls
6. Structural wireframe
7. Key states
8. Visual hierarchy notes
9. Interaction notes
10. Accessibility notes
11. Implementation notes

Keep the output concise unless the user asks for a full spec.

## Required Output For Mockup Requests

When asked for mockups, create or describe at least these states:

1. Empty or first-use state
2. Happy path / configured state
3. In-progress interaction state
4. Error, warning, or edge-case state

Each mockup should demonstrate a different design decision, not just rearranged clutter.

## Required Output For Implementation Requests

When producing code:

- Start with component boundaries.
- Keep state names explicit.
- Implement the visual hierarchy from the design analysis.
- Use compact, consistent sizing.
- Avoid excessive wrapper components.
- Prefer semantic layout regions.
- Keep primary controls close to the work.
- Include empty, loading, error, success, disabled, and partial states.
- Include keyboard and accessibility affordances.
- Do not expose debug/internal state unless requested.

Suggested component names:

```txt
PageShell
ScreenHeader
PrimaryWorkspace
Toolbar
FieldShelf / ItemList / ControlShelf
InspectorPanel
EmptyState
StatusNotice
ActionMenu
SettingsDrawer
ConfirmDialog
```

## Final Review Checklist

Before finalizing, check:

- Can the user tell what the screen is for in 3 seconds?
- Is there one obvious center of gravity?
- Is the next action obvious?
- Are common actions visible?
- Are rare actions disclosed?
- Are internal details hidden?
- Does the layout use space efficiently?
- Are repeated borders and badges removed?
- Does every visible element earn its space?
- Are empty/loading/error states useful?
- Is the UI keyboard-accessible?
- Does it still work with long names and narrow widths?

## Reference Files

Read only the reference files needed for the task:

- [interaction-patterns.md](references/interaction-patterns.md): composition, layout patterns, headers, panels, badges, buttons, toolbar behavior, menus, and responsive behavior.
- [data-and-forms.md](references/data-and-forms.md): data grids, tables, selection, bulk actions, compact forms, inspectors, drawers, and panes.
- [states-safety-accessibility.md](references/states-safety-accessibility.md): loading, empty, error, feedback, safety, disabled states, accessibility, language, final review checklist, and anti-patterns.
- [failed-payment-jobs-example.md](references/failed-payment-jobs-example.md): worked example for a work queue output using the composition-first process.
