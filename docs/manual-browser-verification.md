# Manual browser verification

Use this checklist selectively with Browser or Playwright MCP after a change affects a user workflow. Reuse the server advertised by `live-server-details.json`; do not start a second server or create a committed E2E suite.

`app/data` is disposable development state. Manual checks may create games, edit schedules, and change settings directly against it.

## Core checks

- Open the affected route directly, then reload it after any persisted write.
- Perform the real interaction—click, pointer drag, keyboard fallback, or timer action—instead of calling the underlying function.
- Confirm both accepted and rejected states when the change has validity rules.
- Check visible error, loading, empty, and disabled states that the change can reach.
- Inspect accessible labels, focus behavior, and keyboard cancellation for changed interactive controls.
- Use DOM geometry or computed styles when exact overflow, position, or spacing matters; screenshots are supporting evidence.

## Mobile-sensitive workflows

At a phone-sized viewport, prioritize:

- game-day current segment, next segment, timer controls, bench, and live substitutions;
- schedule readability and the click-based editing fallback;
- Games-page primary content position and horizontal overflow;
- dialogs, popovers, and tooltips that may extend beyond the viewport.

Physical touch hardware is optional. When it is unavailable, verify pointer behavior and the accessible click/keyboard fallback, then state that physical touch was not exercised.

## Workflow-specific checks

### Schedule editing

- Complete an accepted same-segment move.
- Attempt an invalid cross-segment move.
- Cancel an active interaction with Escape.
- Confirm undo/redo and reload persistence when those paths changed.

### Published revisions

- Confirm “Edit again” preserves the published schedule.
- Confirm the cloned draft starts with the same assignments.
- Confirm the published version remains active until the draft is published.

### Settings and games

- Direct-load the settings route, save a change, and reload.
- On mobile, confirm the Games work surface appears near the top and does not overflow horizontally.

Run only the sections relevant to the change and record what was and was not checked in the changelog or final handoff.
