# States, Safety, Accessibility, And Anti-Patterns

Use this reference for loading, empty, partial, error, feedback, disabled, notification, safety, accessibility, labeling, final review, and anti-pattern checks.

## State Coverage

Every application UI should account for the states relevant to the workflow:

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

## Loading, Empty, Partial, and Error States

- Prefer skeleton rows, inline button spinners, small local loading text, and fixed-height placeholders.
- Avoid full-page spinners for local updates and avoid layout shift as nested content loads.
- Reserve predictable space where possible when expanding menus, panels, rows, or drawers.
- Keep compact empty states useful: `No results match these filters. [Clear filters]`.
- Explain whether empty state is due to filters, permissions, or no data.
- Show errors near the failed interaction: row save inline, export toast with retry, filter field error, permission explanation on disabled action.
- Treat incomplete setup as partial state, not generic failure.
- Keep the main work surface stable during loading, preview updates, and validation.

Compact empty-state examples:

```txt
No results match these filters. [Clear filters]
```

```txt
No rules yet. [Create rule]
```

Builder partial-state example:

```txt
Choose an X field to preview the chart.
[Add field]
```

Preview error example:

```txt
Could not load preview.
The selected file has 2 columns with duplicate names.
[View columns] [Retry]
```

## Feedback and Notifications

Use local feedback near the thing that changed:

- `Saved`
- `Saved at 10:42 AM`
- `3 filters active`
- `Field added`
- `Chart updated`
- `12 rows updated`
- `Retrying...`
- `Copied`
- `Draft autosaved`

Use toasts for global results like export started, import complete, bulk update complete, background job failure, workflow published, and permission change saved.

Avoid toast spam for every field edit, hover, autosave, or polling update. Prefer inline feedback for row-level update status, field validation, per-record sync status, and small saved indicators in panel footers.

## Disabled Controls

Disabled controls should explain why when possible.

Examples:

```txt
Export disabled: load a dataset first.
```

```txt
Publish disabled: resolve 2 validation errors first.
```

## Safety

- Put dangerous actions last, separated, clearly labeled, and distinct when appropriate.
- Confirm actions that delete data, affect many records, trigger external side effects, modify permissions, publish content, change billing, run automation, or cannot be easily undone.
- Prefer undo for low-risk reversible actions: `Item archived. Undo`.
- Disable unavailable actions with an explanation and suggested requirement when possible.

Danger-zone menu example:

```txt
Duplicate
Export
Archive
---
Delete permanently
```

## Accessibility

Requirements:

- Icon buttons have accessible names and tooltips when useful.
- Menus are keyboard navigable.
- Focus order matches visual order and focus is visible.
- Escape closes overlays.
- State is not color-only.
- Tooltips are not the only access to critical information.
- Touch targets are large enough on touch devices.
- Error messages are associated with fields.
- Disabled actions explain why when possible.
- Drag-and-drop has keyboard alternatives.
- Important state changes are announced where appropriate.
- Modal and drawer focus is trapped only while the overlay is open, then restored to the trigger.

## Labeling and Icons

Prefer specific verbs:

- Create rule
- Export CSV
- Duplicate view
- Retry failed jobs
- Assign selected
- Hide archived
- Schedule run
- View audit log

Avoid vague labels: manage, configure, advanced, options, tools, more stuff.

Use icons as accelerators, not replacements. Important actions usually need text labels. Icon-only controls need accessible labels and tooltips. Do not reuse the same icon for unrelated concepts.

Use plain user-facing language. Hide implementation details such as payloads, pipeline stages, node ids, internal statuses, and debug terms unless the target user explicitly needs technical control.

## Final Review Checklist

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
- Are dangerous actions separated or confirmed?
- Is the UI keyboard-accessible?
- Does it still work with long names and narrow widths?

## Anti-Patterns

Avoid:

- Starting with components before hierarchy.
- Equal-weight everything.
- Too many bordered panels.
- Multiple stacked metadata bars.
- Debug/internal terminology in user workflows.
- Large cards for small controls.
- Badges everywhere.
- Hidden primary actions.
- Toolbars that wrap into two rows by accident.
- Vague buttons like Manage, Configure, Options.
- Empty states that do not say what to do.
- Giant unstructured More menus.
- Primary actions hidden in overflow.
- Ambiguous icon-only toolbars.
- Critical multi-level nested menus.
- Full-page spinners for local loading.
- Huge empty-state illustrations inside compact tools.
- Modals for routine configuration.
- Compact forms with no grouping.
- Tables where long text breaks layout.
- Hover-only actions with no keyboard alternative.
- Destructive actions next to frequent safe actions.
- Advanced features that cannot be searched.
- Toolbars that wrap unpredictably.
- Drawers that lose context.
- Layouts that fail with localized or long labels.
- Complex screens with no visual grouping.
- Pretty screens with poor workflow support.
- Overusing accent color.
- Showing advanced settings before the basic task works.
