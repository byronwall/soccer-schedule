import { describe, expect, it } from "vitest";
import { POSITIONS, SEGMENTS } from "./fixed-game";
import { createDefaultPlayerPreference, neutralPositionDispositions } from "./player-preferences";
import { generateSchedule } from "./schedule-generator";
import {
  generateScheduleTarget,
  type ScheduleGenerationTarget,
} from "./schedule-targeted-generation";
import {
  compareGenerationRanks,
  evaluateGenerationQuality,
  generationPriorityRank,
} from "./schedule-generation-quality";
import type { Assignment, Player, PlayerPreference } from "./schemas";
import { validateAssignments } from "./scheduling";

const stamp = "2026-07-28T12:00:00.000Z";
const players = (count = 11): Player[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    displayName: index === 2 ? "Violet" : `Player ${index + 1}`,
    color: "#2563EB",
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  }));

const cell = (assignment: Assignment) => `${assignment.segmentKey}:${assignment.positionKey}`;

const expectLocksPreserved = (before: Assignment[], after: Assignment[]) => {
  for (const locked of before.filter((assignment) => assignment.locked)) {
    expect(after.find((assignment) => cell(assignment) === cell(locked))).toEqual(locked);
  }
};

describe("targeted schedule generation", () => {
  it("fills a partial draft while preserving four manually locked goalkeeper cells", () => {
    const roster = players();
    const source = generateSchedule(roster, { seed: "locked-goalkeepers" });
    const current = source
      .filter(
        (assignment) =>
          assignment.positionKey === "goalkeeper" && assignment.segmentKey.endsWith("a"),
      )
      .map((assignment) => ({ ...assignment, locked: true }));

    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: current,
      target: { kind: "all" },
    });

    expect(generated.result.changed).toBe(true);
    expect(generated.assignments).toHaveLength(56);
    expect(
      validateAssignments(
        generated.assignments,
        roster.map((player) => player.id),
      ),
    ).toEqual([]);
    expectLocksPreserved(current, generated.assignments);
  });

  it("extends locked first-half goalkeeper assignments through the adjacent segment", () => {
    const roster = players();
    const source = generateSchedule(roster, { seed: "locked-goalkeeper-continuity" });
    const current = source
      .filter(
        (assignment) =>
          assignment.positionKey === "goalkeeper" && assignment.segmentKey.endsWith("a"),
      )
      .map((assignment) => ({ ...assignment, locked: true }));

    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: current,
      target: { kind: "all" },
      continuityPolicy: "goalkeeper-and-defense",
    });

    for (const quarter of [1, 2, 3, 4]) {
      const first = generated.assignments.find(
        (assignment) =>
          assignment.segmentKey === `q${quarter}a` && assignment.positionKey === "goalkeeper",
      );
      const second = generated.assignments.find(
        (assignment) =>
          assignment.segmentKey === `q${quarter}b` && assignment.positionKey === "goalkeeper",
      );
      expect(second?.playerId).toBe(first?.playerId);
    }
  });

  it("generates fair, preferred full-quarter goalkeeper pairs from an empty draft", () => {
    const roster = players();
    const preferred = roster[2];
    const avoided = roster[3];
    const preferences: PlayerPreference[] = [
      {
        ...createDefaultPlayerPreference(preferred.id, stamp),
        positionDispositions: {
          ...neutralPositionDispositions(),
          goalkeeper: "prefer",
        },
      },
      {
        ...createDefaultPlayerPreference(avoided.id, stamp),
        positionDispositions: {
          ...neutralPositionDispositions(),
          goalkeeper: "avoid",
        },
      },
    ];
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: [],
      preferences,
      target: { kind: "position", positionKey: "goalkeeper" },
    });
    const goalkeepers = generated.assignments.filter(
      (assignment) => assignment.positionKey === "goalkeeper",
    );

    expect(goalkeepers).toHaveLength(8);
    expect(new Set(goalkeepers.map((assignment) => assignment.playerId)).size).toBe(4);
    expect(goalkeepers.filter((assignment) => assignment.playerId === preferred.id)).toHaveLength(
      2,
    );
    expect(goalkeepers.some((assignment) => assignment.playerId === avoided.id)).toBe(false);
    for (const quarter of [1, 2, 3, 4]) {
      expect(
        goalkeepers.find((assignment) => assignment.segmentKey === `q${quarter}a`)?.playerId,
      ).toBe(goalkeepers.find((assignment) => assignment.segmentKey === `q${quarter}b`)?.playerId);
    }
  });

  it("extends a locked defensive position through its paired segment", () => {
    const roster = players();
    const current: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: roster[0].id,
        source: "manual",
        locked: true,
      },
    ];
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: current,
      target: { kind: "position", positionKey: "leftDefense" },
      continuityPolicy: "goalkeeper-and-defense",
    });

    expect(
      generated.assignments.find(
        (assignment) => assignment.segmentKey === "q1b" && assignment.positionKey === "leftDefense",
      )?.playerId,
    ).toBe(roster[0].id);
    expectLocksPreserved(current, generated.assignments);
  });

  it("preserves an impossible split goalkeeper lock and fills the other quarters", () => {
    const roster = players();
    const current: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: roster[0].id,
        source: "manual",
        locked: true,
      },
      {
        segmentKey: "q1b",
        positionKey: "goalkeeper",
        playerId: roster[1].id,
        source: "manual",
        locked: true,
      },
    ];
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: current,
      target: { kind: "position", positionKey: "goalkeeper" },
    });

    expectLocksPreserved(current, generated.assignments);
    expect(
      generated.assignments.filter((assignment) => assignment.positionKey === "goalkeeper"),
    ).toHaveLength(8);
    expect(generated.result.afterQuality.goalkeeperChanges).toBe(1);
  });

  it("does not apply goalkeeper-style pairing to midfield targets", () => {
    const roster = players(8);
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: [],
      target: { kind: "position", positionKey: "leftMidfield" },
    });
    const midfield = generated.assignments.filter(
      (assignment) => assignment.positionKey === "leftMidfield",
    );

    expect(midfield).toHaveLength(8);
    for (const quarter of [1, 2, 3, 4]) {
      expect(
        midfield.find((assignment) => assignment.segmentKey === `q${quarter}a`)?.playerId,
      ).not.toBe(midfield.find((assignment) => assignment.segmentKey === `q${quarter}b`)?.playerId);
    }
    expect(generated.result.afterQuality.midfieldRepeats).toBe(0);
    expect(generated.result.afterQuality.crossQuarterPositionRepeats).toBe(0);
  });

  it("lets season fairness outrank a goalkeeper preference", () => {
    const roster = players(8);
    const preferred = roster[0];
    const preference: PlayerPreference = {
      ...createDefaultPlayerPreference(preferred.id, stamp),
      positionDispositions: {
        ...neutralPositionDispositions(),
        goalkeeper: "prefer",
      },
    };
    const seasonAssignments = Array.from({ length: 12 }, (_, index) => ({
      segmentKey: SEGMENTS[index % SEGMENTS.length].key,
      positionKey: POSITIONS[index % POSITIONS.length].key,
      playerId: preferred.id,
      source: "generated" as const,
      locked: false,
    }));
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: [],
      seasonAssignments,
      preferences: [preference],
      target: { kind: "position", positionKey: "goalkeeper" },
    });

    expect(generated.assignments.some((assignment) => assignment.playerId === preferred.id)).toBe(
      false,
    );
    expect(generated.result.afterQuality.goalkeeperOveruse).toBe(0);
  });

  it("is deterministic for equal input", () => {
    const roster = players();
    const current = generateSchedule(roster, { seed: "deterministic-target" }).filter(
      (_, index) => index % 4 !== 0,
    );
    const options = {
      players: roster,
      currentAssignments: current,
      target: {
        kind: "position",
        positionKey: "rightForward",
      } as const,
    };

    expect(generateScheduleTarget(options)).toEqual(generateScheduleTarget(options));
  });

  it.each([
    { kind: "player", playerId: players()[2].id },
    { kind: "position", positionKey: "leftDefense" },
    { kind: "segment", segmentKey: "q2a" },
  ] satisfies ScheduleGenerationTarget[])(
    "generates the $kind target from a partial draft",
    (target) => {
      const roster = players();
      const complete = generateSchedule(roster, { seed: "partial-targets" });
      const current = complete.filter((assignment, index) =>
        target.kind === "player" ? assignment.playerId !== target.playerId : index % 3 !== 0,
      );
      const generated = generateScheduleTarget({
        players: roster,
        currentAssignments: current,
        target,
      });

      expect(generated.result.changed).toBe(true);
      expect(generated.assignments.length).toBeGreaterThan(current.length);
      expectLocksPreserved(current, generated.assignments);
    },
  );

  it("keeps player, row, and segment locks through every target kind", () => {
    const roster = players();
    const complete = generateSchedule(roster, { seed: "mixed-locks" });
    const locked = complete.map((assignment) => ({
      ...assignment,
      locked:
        assignment.playerId === roster[0].id ||
        assignment.positionKey === "rightDefense" ||
        assignment.segmentKey === "q4b",
    }));
    const targets: ScheduleGenerationTarget[] = [
      { kind: "all" },
      { kind: "player", playerId: roster[2].id },
      { kind: "position", positionKey: "leftForward" },
      { kind: "segment", segmentKey: "q2b" },
    ];

    for (const target of targets) {
      const generated = generateScheduleTarget({
        players: roster,
        currentAssignments: locked,
        target,
      });
      expectLocksPreserved(locked, generated.assignments);
    }
  });

  it("returns a filled-as-possible invalid result and names an unavailable locked cell", () => {
    const fullRoster = players(12);
    const available = fullRoster.slice(0, 11);
    const unavailable = fullRoster[11];
    const current: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: unavailable.id,
        source: "manual",
        locked: true,
      },
    ];
    const generated = generateScheduleTarget({
      players: available,
      currentAssignments: current,
      target: { kind: "all" },
    });

    expect(generated.assignments).toHaveLength(56);
    expectLocksPreserved(current, generated.assignments);
    expect(generated.result.hardErrors).toContainEqual(
      expect.stringMatching(/Locked Q1A Goalkeeper assigns an unavailable player/),
    );
  });

  it("does not reshuffle when no higher-priority improvement is possible", () => {
    const roster = players();
    const current = generateSchedule(roster, { seed: "no-op" }).map((assignment) => ({
      ...assignment,
      locked: true,
    }));
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: current,
      target: { kind: "all" },
    });

    expect(generated.result).toMatchObject({
      changed: false,
      changedCellIds: [],
      noChangeReason: expect.stringMatching(/locked assignment/),
    });
    expect(generated.assignments).toEqual(current);
  });

  it("limits a position operation to target cells and necessary counterparts", () => {
    const roster = players();
    const current = generateSchedule(roster, { seed: "minimal-before" });
    const generated = generateScheduleTarget({
      players: roster,
      currentAssignments: current,
      target: { kind: "position", positionKey: "leftMidfield" },
    });

    expect(generated.result.changedCellIds.length).toBeLessThanOrEqual(16);
    for (const changedId of generated.result.changedCellIds) {
      const [segmentKey, positionKey] = changedId.split(":");
      expect(
        positionKey === "leftMidfield" ||
          generated.result.changedCellIds.includes(`${segmentKey}:leftMidfield`),
      ).toBe(true);
    }
  });

  it("keeps current-cell validity ahead of filling additional cells", () => {
    const roster = players();
    const validPartial: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: roster[0].id,
        source: "manual",
        locked: false,
      },
    ];
    const invalidLargerPartial: Assignment[] = [
      ...validPartial,
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: roster[0].id,
        source: "manual",
        locked: false,
      },
    ];

    const validRank = generationPriorityRank(
      evaluateGenerationQuality(validPartial, { players: roster }),
    );
    const invalidRank = generationPriorityRank(
      evaluateGenerationQuality(invalidLargerPartial, { players: roster }),
    );

    expect(compareGenerationRanks(validRank, invalidRank)).toBeLessThan(0);
  });
});
