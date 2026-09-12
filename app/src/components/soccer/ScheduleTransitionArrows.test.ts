import { describe, expect, it } from "vitest";
import type { Assignment, Player } from "~/lib/soccer/schemas";
import { midQuarterMovements } from "./ScheduleTransitionArrows";

const player = (id: string, displayName: string, color: string): Player => ({
  id,
  displayName,
  color,
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const assignment = (
  segmentKey: Assignment["segmentKey"],
  positionKey: Assignment["positionKey"],
  playerId: string,
): Assignment => ({ segmentKey, positionKey, playerId, source: "generated", locked: false });

describe("mid-quarter movements", () => {
  it("includes only field-to-field position changes within one quarter", () => {
    const movers = [
      player("10000000-0000-4000-8000-000000000001", "Alex", "#112233"),
      player("10000000-0000-4000-8000-000000000002", "Blair", "#445566"),
      player("10000000-0000-4000-8000-000000000003", "Casey", "#778899"),
    ];
    const assignments = [
      assignment("q1a", "leftDefense", movers[0].id),
      assignment("q1b", "rightMidfield", movers[0].id),
      assignment("q1a", "goalkeeper", movers[1].id),
      assignment("q1b", "goalkeeper", movers[1].id),
      assignment("q1b", "leftForward", movers[2].id),
      assignment("q2a", "rightForward", movers[2].id),
    ];

    expect(midQuarterMovements(assignments, movers)).toEqual([
      {
        playerId: movers[0].id,
        playerColor: movers[0].color,
        playerName: movers[0].displayName,
        quarter: 1,
        from: "leftDefense",
        to: "rightMidfield",
      },
    ]);
  });
});
