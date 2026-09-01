# Core user flows

These diagrams describe the implemented Soccer Coach Companion workflows, reviewed on 2026-08-30.
They document current behavior, not proposed features. Each file contains one base graph with no variants.

Start with [Core coaching cycle](00-coaching-cycle.diagram). Use the detailed diagrams for specific workflows.

| Diagram                                                             | Scope                                                             | Main routes                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| [Core coaching cycle](00-coaching-cycle.diagram)                    | Team setup through confirmed history                              | All core routes                                              |
| [Coach access](01-coach-access.diagram)                             | Sign-in, shared access, and failure guidance                      | `/login`                                                     |
| [Roster and preferences](02-roster-and-preferences.diagram)         | Player records, preferences, inactive status, and safe removal    | `/roster`, `/roster/:playerId`                               |
| [Game and availability](03-game-and-availability.diagram)           | Match logistics, responses, readiness, and game status            | `/games`, `/games/new`, `/games/:gameId`                     |
| [Schedule planning](04-schedule-planning.diagram)                   | Draft generation, manual edits, locks, and quality review         | `/games/:gameId/schedule`                                    |
| [Publish, print, and revise](05-publish-print-and-revise.diagram)   | Publication, paper copies, game mode, and replacement drafts      | `/games/:gameId/schedule`, `/games/:gameId/print`            |
| [Position settings](06-position-settings.diagram)                   | Position names and reusable field guide                           | `/settings/positions`                                        |
| [Live game](07-live-game.diagram)                                   | Reference timer, lineups, substitutions, goals, and event review  | `/games/:gameId/live`                                        |
| [Confirm and review history](08-confirm-and-review-history.diagram) | Permanent confirmation, participation history, and later planning | `/games/:gameId/live`, `/games/:gameId`, `/roster/:playerId` |

## Read the diagrams

Follow operational arrows from left to right. Branches represent real choices or outcomes; they are not variants.
Repeated actions, such as tracking quarters, stay within one process rather than creating backward arrows.

Open a node to read its body. Bodies contain prerequisites, limitations, route names, and references to other graph IDs.
Need and UX records describe intent and interface requirements. They appear in the inspector, outside the operational canvas.
A terminal deliverable marks an outcome. A deliverable with another outgoing flow is an intermediate artifact.

## Important boundaries

- Active roster membership and game availability are separate decisions.
- The game page requires resolved responses and at least seven available players before enabling schedule building.
- Publication checks completeness, validity, draft status, and revision. Advisory quality warnings do not block publication.
- Published assignments remain unchanged during draft edits and live tracking. Explicit publication replaces the active plan.
- Position names and print-guide coordinates remain shared settings. Published assignments do not freeze these presentation settings.
- The timer is a reference. Coaches select lineups independently of its displayed time.
- Confirmation assumes full 14-minute quarters and published changes at seven minutes, except where recorded events change participation.
- Confirmation is permanent. Marking a game Completed from Games does not confirm its event ledger.
- Actual-history panels require a trusted ledger. Season Impact can use labeled published-plan coverage for earlier unconfirmed games.

## Source map

Use current implementation and [domain invariants](../soccer-domain-invariants.md) when these diagrams need updates.
Older product plans and screenshots can describe superseded behavior, especially actual-history tracking.

| Flow                              | Primary implementation sources                                                                                                                                                                                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coach access                      | [LoginPage](../../app/src/components/soccer/LoginPage.tsx), [coach login endpoint](../../app/src/routes/api/auth/coach-login.ts)                                                                                                                                                              |
| Roster and preferences            | [RosterPage](../../app/src/components/soccer/RosterPage.tsx), [PlayerPreferencesCard](../../app/src/components/soccer/PlayerPreferencesCard.tsx), [roster and game actions](../../app/src/lib/soccer/store-roster-game-actions.ts)                                                            |
| Game and availability             | [GamePages](../../app/src/components/soccer/GamePages.tsx), [ScheduledGamePlanningDetails](../../app/src/components/soccer/ScheduledGamePlanningDetails.tsx), [GamesPage](../../app/src/components/soccer/GamesPage.tsx)                                                                      |
| Schedule planning and publication | [SchedulePage](../../app/src/components/soccer/SchedulePage.tsx), [schedule actions](../../app/src/lib/soccer/store-schedule-actions.ts), [schedule readiness](../../app/src/lib/soccer/schedule-readiness.ts), [PrintPage](../../app/src/components/soccer/PrintPage.tsx)                    |
| Position settings                 | [PositionSettingsPage](../../app/src/components/soccer/PositionSettingsPage.tsx), [SoccerFieldDiagram](../../app/src/components/soccer/SoccerFieldDiagram.tsx)                                                                                                                                |
| Live game and confirmation        | [LiveGameStatusPanel](../../app/src/components/soccer/LiveGameStatusPanel.tsx), [LiveTrackerDialogs](../../app/src/components/soccer/LiveTrackerDialogs.tsx), [live actions](../../app/src/lib/soccer/store-live-actions.ts)                                                                  |
| History and planning evidence     | [CompletedGameSummary](../../app/src/components/soccer/CompletedGameSummary.tsx), [PlayerDetailsPage](../../app/src/components/soccer/PlayerDetailsPage.tsx), [history derivation](../../app/src/lib/soccer/post-game-history.ts), [Season Impact](../../app/src/lib/soccer/season-impact.ts) |

## Check and view

Run from the repository root with the globally installed Flow CLI:

```sh
flow check docs/flows
flow format --check docs/flows
flow view docs/flows
```

Open the local URL printed by the viewer. The viewer searches this directory for `.diagram` files.
Browser edits do not change these source files. Keep durable changes in the `.diagram` files, then check them again.

## Maintain the source

Update the affected diagram when a user workflow or its data boundary changes.
Preserve graph, node, and edge IDs unless their meaning changes.
Keep qualifications in node bodies and titles short enough to scan.
Use layout hints only for stage order. Do not add exact positions unless preserving intentional manual placement.
Do not maintain parallel JSON exports as source. Add variants only when separately requested.

These diagrams omit deployment, credential administration, inherited integrations, and internal component references.
