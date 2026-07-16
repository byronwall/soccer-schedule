# Failed Payment Jobs Example

Use this worked example as a model for composition-first application UI output.

## User Request

Design a work queue for reviewing failed payment jobs. Users need to retry jobs, assign owners, inspect errors, filter by status, and bulk close resolved jobs.

## 1. Screen Classification

Work queue.

## 2. Primary Workflow

The user triages failed jobs: scan failures, inspect the likely cause, retry or assign, then close resolved items in bulk.

## 3. Information Priority

```txt
Priority 1: Failed jobs table
Priority 2: Selected job error summary and Retry action
Priority 3: Filters, search, owner/status context
Priority 4: Assign, export, customize view
Priority 5: Automation setup and diagnostics
Priority 6: Raw payload and internal job metadata
```

## 4. Layout Pattern

Work queue: toolbar + filters + table + side inspector.

The table is the center of gravity. The inspector supports the selected row without pulling attention away from scanning and acting.

## 5. Visible vs Disclosed Controls

| Element | Layer | Treatment |
| --- | --- | --- |
| Retry selected | Primary | Visible when rows are selected |
| Retry job | Primary/contextual | Inline row action and inspector action |
| Search and status filters | Secondary | Visible in toolbar |
| Assign owner | Secondary/contextual | Row menu and selection bar |
| Error details | Contextual | Inspector |
| Export CSV | Rare | More > Data |
| Create retry rule | Advanced | More > Automation or command palette |
| Raw payload | Internal/debug | Inspector accordion, collapsed by default |
| Close selected jobs | Dangerous | Bulk menu with confirmation |

## 6. Structural Wireframe

```txt
+--------------------------------------------------------------------+
| Failed payments                         Search... [Filter] [View v] |
| 42 failed · 18 unassigned · updated 2 min ago      [More v]         |
+--------------------------------------------------------------------+
| [Status: Failed x] [Owner: Any x] [+ Filter]                        |
+-----------------------------------------------+--------------------+
| Failed jobs                                   | Error summary      |
| [] Job ID     Customer   Owner   Last fail    | pay_1042           |
| [] pay_1042   Acme      -       10:41 AM Retry| Card declined      |
| [] pay_1043   Nova      Maya    10:32 AM Retry| [Retry] [Assign]   |
| [] pay_1044   Finch     -       10:12 AM Retry| Timeline           |
|                                               | Diagnostics        |
+-----------------------------------------------+--------------------+
```

Selection state:

```txt
3 selected | [Retry selected] [Assign] [Close...] [Clear]
```

## 7. Key States

- Loading: fixed-height skeleton table rows, inspector placeholder if a row was selected.
- Empty: `No failed jobs match these filters. [Clear filters]`
- First use: `No failed payments yet. Failed retries will appear here.`
- Partial: selected job has no diagnostic payload; show summary and available actions.
- Success: inline row status `Retry queued`; toast only when a bulk retry completes.
- Error: row-level retry failure with `Retry again`.
- Disabled: `Retry disabled: job is already running.`
- Long-running: selected row shows retry progress without blocking the whole queue.
- Permission denied: retry and close actions disabled with explanation.

## 8. Visual Hierarchy Notes

- Table owns most horizontal space.
- Header is compact; it summarizes count and freshness without becoming a metadata bar.
- Inspector is visually quieter than the table.
- Badges are limited to meaningful status/count chips.
- Raw payload and internal ids are collapsed by default.

## 9. Interaction Notes

- Row click selects and opens inspector.
- Retry action gives local feedback on the affected row.
- Bulk action bar appears only when rows are selected.
- `Cmd/Ctrl+K` exposes retry selected, assign owner, export CSV, and create retry rule.
- Close selected jobs requires an impact preview before confirmation.

## 10. Accessibility Notes

- Table selection is keyboard-accessible.
- Row actions have visible focus states.
- Icon-only controls have accessible names and tooltips.
- Escape closes menus/inspector drawers on narrow layouts.
- State is not color-only; status text is visible.

## 11. Implementation Notes

- Components: `PageShell`, `ScreenHeader`, `QueueToolbar`, `FilterChips`, `JobsTable`, `SelectionBar`, `JobInspector`, `ImpactConfirmDialog`.
- State: `selectedJobId`, `selectedJobIds`, `filters`, `sort`, `viewDensity`, `inspectorOpen`, `retryingJobIds`, `errorByJobId`.
- Use virtualization for very large queues; otherwise pagination is acceptable when audit navigation matters.
- Use tabular numbers for timestamps, counts, attempts, and ids.
- Preserve scroll position when the inspector opens or closes.
