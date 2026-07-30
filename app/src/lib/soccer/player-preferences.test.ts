import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION_LABELS, POSITIONS } from "./fixed-game";
import {
  applyRoleGroupDisposition,
  assertPositionDispositionLimits,
  createDefaultPlayerPreference,
  neutralPositionDispositions,
  updatePositionDisposition,
} from "./player-preferences";
import {
  generateSchedule,
  scoreSchedule,
} from "./scheduling";
import type { Player, PlayerPreference } from "./schemas";
import { migrateSoccerStore } from "./store-migrations";

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
  values: Partial<PlayerPreference> & {
    positions?: Partial<PlayerPreference["positionDispositions"]>;
  } = {},
): PlayerPreference => {
  const { positions, ...overrides } = values;
  return {
    ...createDefaultPlayerPreference(player.id, stamp),
    ...overrides,
    positionDispositions: {
      ...neutralPositionDispositions(),
      ...positions,
    },
  };
};

describe("player scheduling preferences", () => {
  it("migrates a v2 store deterministically into a separate v1 preference model", () => {
    const roster = players(2);
    const v2 = {
      schemaVersion: 2,
      teamDisplayName: "Mystics",
      seasonName: "Fall 2026",
      positionLabels: DEFAULT_POSITION_LABELS,
      players: roster,
      games: [],
      availability: [],
      schedules: [],
      liveGames: [],
      users: [],
      sessions: [],
    };

    const first = migrateSoccerStore(v2);
    const second = migrateSoccerStore(v2);

    expect(first).toEqual(second);
    expect(first.schemaVersion).toBe(6);
    expect(first).not.toHaveProperty("defensiveContinuityDefault");
    expect(first.playerPreferences).toEqual({
      schemaVersion: 1,
      entries: roster.map((player) =>
        createDefaultPlayerPreference(player.id, stamp)),
    });
  });

  it("migrates v3 stores without exposing a continuity setting", () => {
    const roster = players(1);
    const migrated = migrateSoccerStore({
      schemaVersion: 3,
      teamDisplayName: "Mystics",
      seasonName: "Fall 2026",
      positionLabels: DEFAULT_POSITION_LABELS,
      players: roster,
      games: [],
      availability: [],
      schedules: [],
      liveGames: [],
      users: [],
      sessions: [],
      playerPreferences: {
        schemaVersion: 1,
        entries: roster.map((player) =>
          createDefaultPlayerPreference(player.id, stamp)),
      },
    });

    expect(migrated.schemaVersion).toBe(6);
    expect(migrated).not.toHaveProperty("defensiveContinuityDefault");
  });

  it("allows two preferred positions and rejects a third", () => {
    const initial = neutralPositionDispositions();
    const first = updatePositionDisposition(initial, "leftMidfield", "prefer");
    const second = updatePositionDisposition(first, "rightMidfield", "prefer");

    expect(second.leftMidfield).toBe("prefer");
    expect(second.rightMidfield).toBe("prefer");
    expect(() =>
      updatePositionDisposition(second, "leftForward", "prefer"),
    ).toThrow(/Prefer is limited to 2 positions/);
  });

  it("counts Prefer and Avoid independently", () => {
    const dispositions = {
      ...neutralPositionDispositions(),
      leftMidfield: "prefer" as const,
      rightMidfield: "prefer" as const,
      leftDefense: "avoid" as const,
      rightDefense: "avoid" as const,
    };

    expect(assertPositionDispositionLimits(dispositions)).toEqual(dispositions);
    expect(() =>
      updatePositionDisposition(dispositions, "goalkeeper", "avoid"),
    ).toThrow(/Avoid is limited to 2 positions/);
  });

  it("applies valid role shortcuts and rejects groups that exceed the cap", () => {
    const initial = neutralPositionDispositions();
    const midfield = applyRoleGroupDisposition(initial, "midfield", "prefer");
    const defense = applyRoleGroupDisposition(midfield, "defense", "avoid");

    expect(midfield).toMatchObject({
      leftMidfield: "prefer",
      rightMidfield: "prefer",
    });
    expect(defense).toMatchObject({
      leftDefense: "avoid",
      rightDefense: "avoid",
      leftMidfield: "prefer",
      rightMidfield: "prefer",
    });
    expect(() =>
      applyRoleGroupDisposition(initial, "attack", "prefer"),
    ).toThrow(/Prefer is limited to 2 positions/);
    expect(initial).toEqual({
      ...neutralPositionDispositions(),
    });
  });

  it("honors the approved Amelia, Maya, and Violet acceptance scenario", () => {
    const roster = players(11).map((player, index) => ({
      ...player,
      displayName: [
        "Amelia",
        "Maya",
        "Violet",
        "Ben",
        "Nora",
        "Pearl",
        "Avery",
        "Sofia",
        "Emma",
        "Zoe",
        "Lily",
      ][index],
    }));
    const amelia = roster.find((player) => player.displayName === "Amelia")!;
    const maya = roster.find((player) => player.displayName === "Maya")!;
    const violet = roster.find((player) => player.displayName === "Violet")!;
    const preferences = [
      preference(amelia, { positions: { goalkeeper: "avoid" } }),
      preference(maya, {
        positions: { leftMidfield: "prefer", rightMidfield: "prefer" },
      }),
      preference(violet, {
        fieldTimePreference: "favor-extra-when-needed",
        positions: { leftMidfield: "prefer", rightMidfield: "prefer" },
      }),
    ];

    const assignments = generateSchedule(roster, {
      seed: "stephen-acceptance",
      preferences,
    });
    const quality = scoreSchedule(
      assignments,
      roster.map((player) => player.id),
      preferences,
    );
    const violetTotal = quality.totals.find(
      (total) => total.playerId === violet.id,
    )!;

    expect(quality.valid).toBe(true);
    expect(quality.minuteSpread).toBeLessThanOrEqual(7);
    expect(assignments.some(
      (assignment) =>
        assignment.playerId === amelia.id &&
        assignment.positionKey === "goalkeeper",
    )).toBe(false);
    expect(assignments.some(
      (assignment) =>
        (assignment.playerId === maya.id ||
          assignment.playerId === violet.id) &&
        assignment.positionKey.includes("Midfield"),
    )).toBe(true);
    expect(violetTotal.segments).toBe(
      Math.max(...quality.totals.map((total) => total.segments)),
    );
    expect(quality.favoredExtraMisses).toBe(0);
  });

  it("keeps seven-player fairness exact even when one player favors extra", () => {
    const roster = players(7);
    const preferences = [
      preference(roster[0], {
        fieldTimePreference: "favor-extra-when-needed",
      }),
    ];
    const quality = scoreSchedule(
      generateSchedule(roster, { preferences }),
      roster.map((player) => player.id),
      preferences,
    );

    expect(quality.minuteSpread).toBe(0);
    expect(quality.favoredExtraMisses).toBe(0);
    expect(new Set(quality.totals.map((total) => total.segments))).toEqual(
      new Set([8]),
    );
  });

  it("relaxes contradictory all-goalkeeper avoids without failing generation", () => {
    const roster = players(11);
    const preferences = roster.map((player) =>
      preference(player, { positions: { goalkeeper: "avoid" } }));
    const quality = scoreSchedule(
      generateSchedule(roster, {
        seed: "all-goalkeeper-avoids",
        preferences,
      }),
      roster.map((player) => player.id),
      preferences,
    );

    expect(quality.valid).toBe(true);
    expect(quality.avoidAssignmentCount).toBe(8);
    expect(quality.relaxedAvoids.length).toBeGreaterThan(0);
  });

  it("ignores unavailable-player preferences during generation", () => {
    const fullRoster = players(8);
    const available = fullRoster.slice(0, 7);
    const unavailable = fullRoster[7];
    const preferences = [
      preference(unavailable, {
        fieldTimePreference: "favor-extra-when-needed",
        positions: Object.fromEntries(
          POSITIONS.map((position) => [position.key, "prefer"]),
        ),
      }),
    ];
    const assignments = generateSchedule(available, { preferences });
    const quality = scoreSchedule(
      assignments,
      available.map((player) => player.id),
      preferences,
    );

    expect(quality.valid).toBe(true);
    expect(assignments.some(
      (assignment) => assignment.playerId === unavailable.id,
    )).toBe(false);
    expect(quality.unmetPreferences).toEqual([]);
  });

  it("never interprets the private coach note", () => {
    const roster = players(11);
    const base = preference(roster[0], {
      positions: { goalkeeper: "avoid" },
      coachNote: "Do not use this rationale in generation.",
    });
    const changedNote = {
      ...base,
      coachNote: "Completely different private context.",
    };

    expect(generateSchedule(roster, {
      seed: "private-note",
      preferences: [base],
    })).toEqual(generateSchedule(roster, {
      seed: "private-note",
      preferences: [changedNote],
    }));
  });
});
