# Interaction And Composition Patterns

Use this reference for composition, layout, hierarchy, panels, badges, buttons, menus, keyboard behavior, layering, and responsive decisions.

## Composition First

Most weak app UIs fail because they begin with components instead of composition. Before choosing cards, panels, tabs, or badges, decide:

- What is the hero element or center of gravity?
- What is the primary object?
- What is the next action?
- What supports the work?
- What should be visually quiet?
- What should be hidden?

The layout should make that ranking obvious without explanation.

## Main Work Surface

The main work surface should usually be:

- Largest
- Most central
- Least cluttered
- Closest to the primary controls
- Stable during loading and updates

Examples:

- Chart canvas in a chart builder
- Table in a work queue
- Preview pane in a report builder
- Editor in a content tool
- Form sections in a setup flow
- Object detail in a CRM page

Do not let metadata, filters, setup controls, debug output, or secondary navigation compete with the main work surface.

## Header Pattern

Headers orient; they should not dominate.

Good:

```txt
Create chart                           [Explore data] [Load example]
EV models · 311 rows · 7 fields
```

Bad:

```txt
Scatter chart builder
Create
[Explore data] [1 staged sources] [ready] [TSV] [source chip] [debug badge]
```

Rules:

- Keep the title short.
- Put primary global actions on the right.
- Move metadata into one compact summary line.
- Hide internal status unless actionable.
- Avoid multiple stacked bars unless the workflow truly needs them.

## Panels And Cards

Use panels when they create meaningful grouping. Do not use panels to compensate for weak hierarchy.

Avoid:

- Card inside card inside card
- Borders around every control
- Equal-weight boxes for unequal-priority content
- Large cards for tiny controls
- Repeated section headers that say obvious things

Prefer:

- One strong container around the main work area
- Light separators
- Subtle backgrounds
- Compact grouped controls
- Inspector panels only when they add depth

## Badges

Badges should be scarce.

Use badges for:

- Status
- Count
- Type
- Validation state
- Mapped or selected state

Avoid badges for:

- Every piece of metadata
- Internal pipeline state
- Redundant labels
- Decorative emphasis

## Button Hierarchy

Use:

- One primary button per region
- Secondary buttons for common alternatives
- Tertiary or icon buttons for low-emphasis actions
- Menus for rare actions

Rules:

- The primary action must not be hidden.
- Dangerous actions must not sit next to common safe actions.
- Icon-only buttons need accessible names and tooltips.
- Do not make every button visually equal.
- Prefer specific labels like `Create rule`, `Export CSV`, or `Retry failed jobs`.
- Avoid vague labels like `Manage`, `Configure`, `Options`, or `Tools`.

## Progressive Disclosure

Common actions are visible. Occasional actions are nearby. Advanced actions are in drawers, inspectors, popovers, menus, or command palettes. Debug/internal state is hidden unless requested.

| Surface | Use for | Avoid for |
| --- | --- | --- |
| Dropdown menu | Simple action lists | Forms or complex configuration |
| Split button | Default action plus variants | Unrelated actions |
| Popover | Small configuration | Long workflows |
| Side inspector | Object details and contextual actions | Full-screen tasks |
| Drawer | Advanced configuration | Tiny one-click actions |
| Modal | Blocking confirmation or focused decision | Routine settings |
| Command palette | Large action sets and expert navigation | Visual browsing |
| Context menu | Target-specific actions | Global app actions |
| Full page | Deep workflows requiring focus | Quick edits |

## Toolbar Pattern

Use toolbars when actions need to stay near the work. Keep them compact and grouped by intent.

```txt
[Primary Action] [Secondary] | [Search...] [Filter] [Sort] | [View v] [More v]
```

Rules:

- Keep the primary action visible.
- Keep search visible when it is central to the task.
- Show active filters as compact chips.
- Collapse lower-frequency actions into overflow.
- Do not allow chaotic wrapping.
- Make toolbar and filter rows sticky for large datasets.

Adaptive collapse order:

1. Keep the primary action visible.
2. Keep search or current view visible.
3. Collapse secondary actions into overflow.
4. Collapse labels to icons only when icons are obvious.
5. Move advanced controls into a drawer or sheet.
6. Avoid accidental two-row toolbars.

## Menus And Split Buttons

Menus should be structured by intent, not dumped into `More`.

```txt
More
|- View
|  |- Customize columns
|  |- Density
|  `- Show archived
|- Data
|  |- Import
|  |- Export CSV
|  `- Refresh
`- Danger zone
   |- Archive selected
   `- Delete selected
```

Rules:

- Use sections, dividers, direct verbs, and scannable labels.
- Put destructive actions last and visually separated.
- Prefer one level of nesting.
- Use nested menus only for obvious categories with many children and strong keyboard support.
- Use split buttons only for one safe default action plus related variants.

## Keyboard And Power Users

Application UIs should support:

- Logical tab order
- Visible focus state
- Arrow-key menus
- Escape to close overlays
- Enter to activate focused controls
- `Cmd/Ctrl+K` for command palette when the app has broad actions
- `/` for search when search is central
- `?` for shortcut help in expert tools
- Shift-click range selection when bulk selection exists
- Focus restoration after overlays close

Do not rely on hover-only critical controls.

## Layering

Define a consistent layering model:

| Layer | Example | Priority |
| --- | --- | --- |
| Base | Page content | Lowest |
| Sticky | Headers, toolbars, frozen columns | Above content |
| Dropdown | Menus, selects | Above sticky |
| Popover | Filters, column pickers | Above dropdown |
| Drawer | Side workflows | Above popovers |
| Modal | Confirmations, blocking decisions | Above drawers |
| Toast | Global notifications | Near top |
| Command palette | Global command UI | Highest or modal-level |
| Tooltip | Local helper text | Above local surface, below blocking modal if needed |

Rules:

- Do not let menus render under sticky headers or be clipped by table containers.
- Use portals for overlays when necessary.
- Avoid multiple competing overlays.
- Close lower-priority overlays when opening a higher-priority one.

## Responsive Behavior

Responsiveness should change the workflow shape, not simply squish the desktop layout.

- Desktop can support dense toolbars, data grids, split panes, side inspectors, hover affordances, keyboard shortcuts, multi-select, and resizable panes.
- Tablet should reduce toolbar density, use larger controls, collapse side panels, show fewer columns, and use drawers instead of permanent inspectors.
- Mobile should use bottom sheets, sticky primary actions, larger touch targets, simplified menus, fewer simultaneous panels, and step-based flows for complex tasks.

Never port a desktop toolbar cluster directly to mobile.
