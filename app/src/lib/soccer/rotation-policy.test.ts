import { describe, expect, it } from "vitest";
import {
  createDefaultPlayerPreference,
  neutralPositionDispositions,
} from "./player-preferences";
import { scheduleExperienceWarnings } from "./schedule-experience-quality";
import {
  generateSchedule,
  repairSchedule,
  scoreSchedule,
} from "./scheduling";
import type { Player, PlayerPreference } from "./schemas";

const stamp = "2026-07-28T12:00:00.000Z";
const players = (count: number): Player[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    displayName: `Player ${String(index + 1).padStart(2, "0")}`,
    color: "#2563EB",
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  }));

const preference = (
  player: Player,
  positions: Partial<PlayerPreference["positionDispositions"]>,
  fieldTimePreference: PlayerPreference["fieldTimePreference"] = "standard",
) => ({
  ...createDefaultPlayerPreference(player.id, stamp),
  positionDispositions: {
    ...neutralPositionDispositions(),
    ...positions,
  },
  fieldTimePreference,
});

describe("defensive continuity and game experience coverage", () => {
  it("meets the eleven-player defensive-continuity acceptance scenario", () => {
    const roster = players(11);
    const assignments = generateSchedule(roster, {
      seed: "slice-3-acceptance",
      continuityPolicy: "goalkeeper-and-defense",
    });
    const quality = scoreSchedule(
      assignments,
      roster.map((player) => player.id),
      [],
      "goalkeeper-and-defense",
    );

    expect(quality.valid).toBe(true);
    expect(quality.minuteSpread).toBeLessThanOrEqual(7);
    expect(quality.continuityExceptions).toEqual([]);
    expect(quality.experienceWarnings).toEqual([]);
    expect(quality.totals.every((total) => total.segments > 0)).toBe(true);
  });

  it("uses goalkeeper then defender continuity as the internal default", () => {
    const roster = players(11);
    const assignments = generateSchedule(roster, {
      seed: "policy-default",
    });
    const defaultQuality = scoreSchedule(
      assignments,
      roster.map((player) => player.id),
    );
    expect(defaultQuality.continuityExceptions).toEqual([]);
  });

  it("names continuity exceptions when a large bench makes the policy infeasible", () => {
    const roster = players(14);
    const assignments = generateSchedule(roster, {
      seed: "infeasible-continuity",
      continuityPolicy: "goalkeeper-and-defense",
    });
    const quality = scoreSchedule(
      assignments,
      roster.map((player) => player.id),
      [],
      "goalkeeper-and-defense",
    );

    expect(quality.valid).toBe(true);
    expect(quality.continuityExceptions.length).toBeGreaterThan(0);
    expect(quality.continuityExceptions[0]).toMatchObject({
      quarter: expect.any(Number),
      positionKey: expect.stringMatching(/Defense/),
      firstPlayerId: expect.any(String),
      secondPlayerId: expect.any(String),
    });
  });

  it("reports attack-only and defense-only players without blocking validity", () => {
    const roster = players(2);
    const warnings = scheduleExperienceWarnings([
      {
        segmentKey: "q1a",
        positionKey: "leftForward",
        playerId: roster[0].id,
        source: "generated",
        locked: false,
      },
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: roster[1].id,
        source: "generated",
        locked: false,
      },
    ], roster.map((player) => player.id));

    expect(warnings).toEqual([
      expect.objectContaining({
        playerId: roster[0].id,
        kind: "missing-defense",
      }),
      expect.objectContaining({
        playerId: roster[1].id,
        kind: "missing-attack",
      }),
    ]);
  });

  it("preserves preference and fairness boundaries ahead of continuity", () => {
    const roster = players(11);
    const preferences = [
      preference(roster[0], { goalkeeper: "avoid" }),
      preference(
        roster[1],
        { leftMidfield: "prefer", rightMidfield: "prefer" },
        "favor-extra-when-needed",
      ),
    ];
    const assignments = generateSchedule(roster, {
      seed: "policy-preferences",
      preferences,
      continuityPolicy: "goalkeeper-and-defense",
    });
    const quality = scoreSchedule(
      assignments,
      roster.map((player) => player.id),
      preferences,
      "goalkeeper-and-defense",
    );

    expect(quality.minuteSpread).toBeLessThanOrEqual(7);
    expect(quality.avoidAssignmentCount).toBe(0);
    expect(quality.favoredExtraMisses).toBe(0);
    expect(quality.preferredAssignmentCount).toBeGreaterThan(0);
  });

  it("applies the policy during repair", () => {
    const roster = players(11);
    const current = generateSchedule(roster, {
      seed: "before-policy",
      continuityPolicy: "goalkeeper-only",
    });
    const unavailableId = current.find(
      (assignment) =>
        assignment.segmentKey === "q1a" &&
        assignment.positionKey === "leftDefense",
    )!.playerId;
    const available = roster.filter((player) => player.id !== unavailableId);
    const repaired = repairSchedule(
      current,
      available,
      [],
      "goalkeeper-and-defense",
    );

    expect(scoreSchedule(
      repaired,
      available.map((player) => player.id),
      [],
      "goalkeeper-and-defense",
    )).toMatchObject({ valid: true, minuteSpread: 7 });
  });

});
