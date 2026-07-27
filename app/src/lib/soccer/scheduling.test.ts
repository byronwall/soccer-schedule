import { describe, expect, it } from "vitest";
import { POSITIONS, SEGMENTS, TOTAL_ASSIGNMENTS } from "./fixed-game";
import { detectCrossQuarterPositionRepeats, generateSchedule, orderSubstitutesForDisplay, regenerateSchedule, repairSchedule, replaceAssignment, scheduleCellWarnings, scheduleSubstituteWarnings, scoreSchedule, substituteCountForRoster } from "./scheduling";
import type { Player } from "./schemas";
const players = (count: number): Player[] => Array.from({ length: count }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, displayName: `Player ${String(index + 1).padStart(2, "0")}`, color: "#2563EB", active: true, createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z" }));
describe("fixed soccer schedule", () => {
  it("derives substitute slots from the full roster size", () => {
    expect(substituteCountForRoster(11)).toBe(4);
    expect(substituteCountForRoster(8)).toBe(1);
    expect(substituteCountForRoster(7)).toBe(0);
    expect(substituteCountForRoster(6)).toBe(0);
  });
  it("orders inactive substitutes after active substitutes", () => {
    const roster = players(4);
    const ordered = orderSubstitutesForDisplay(
      [roster[3], roster[1], roster[2], roster[0]],
      [roster[1].id, roster[3].id],
    );
    expect(ordered.map((player) => player.id)).toEqual([
      roster[0].id,
      roster[2].id,
      roster[1].id,
      roster[3].id,
    ]);
  });
  it("defines eight segments, seven positions, and 56 cells", () => { expect(SEGMENTS).toHaveLength(8); expect(POSITIONS).toHaveLength(7); expect(TOTAL_ASSIGNMENTS).toBe(56); });
  it("assigns every position a unique display color", () => {
    expect(new Set(POSITIONS.map((position) => position.color)).size).toBe(POSITIONS.length);
    expect(POSITIONS.every((position) => /^#[0-9A-F]{6}$/.test(position.color))).toBe(true);
  });
  it.each([7, 8, 10, 11, 14])("creates a valid deterministic schedule for %i players", (count) => { const roster = players(count); const first = generateSchedule(roster); expect(first).toEqual(generateSchedule(roster)); expect(scoreSchedule(first, roster.map((item) => item.id)).valid).toBe(true); expect(first).toHaveLength(56); });
  it("returns the same schedule for the same explicit seed", () => {
    const roster = players(11);
    expect(generateSchedule(roster, { seed: "repeatable-seed" })).toEqual(
      generateSchedule(roster, { seed: "repeatable-seed" }),
    );
  });
  it("returns different valid schedules for different explicit seeds", () => {
    const roster = players(11);
    const first = generateSchedule(roster, { seed: "variant-one" });
    const second = generateSchedule(roster, { seed: "variant-two" });

    expect(second).not.toEqual(first);
    expect(scoreSchedule(first, roster.map((player) => player.id)).valid).toBe(true);
    expect(scoreSchedule(second, roster.map((player) => player.id)).valid).toBe(true);
  });
  it("rejects fewer than seven players", () => expect(() => generateSchedule(players(6))).toThrow(/seven/));
  it("keeps the eleven-player minute spread to one segment", () => { const roster = players(11); expect(scoreSchedule(generateSchedule(roster), roster.map((item) => item.id)).minuteSpread).toBeLessThanOrEqual(7); });
  it("uses the minimum four swaps needed to bring every substitute in", () => {
    const roster = players(11);
    const schedule = generateSchedule(roster);
    for (let index = 1; index < SEGMENTS.length; index += 1) {
      const previousField = new Set(schedule.filter((item) => item.segmentKey === SEGMENTS[index - 1].key).map((item) => item.playerId));
      const nextField = new Set(schedule.filter((item) => item.segmentKey === SEGMENTS[index].key).map((item) => item.playerId));
      const previousSubstitutes = roster.filter((player) => !previousField.has(player.id));
      expect(previousSubstitutes.every((player) => nextField.has(player.id))).toBe(true);
      expect([...previousField].filter((playerId) => nextField.has(playerId))).toHaveLength(3);
    }
  });
  it("keeps retained players in position within a quarter and rotates midfielders most often", () => {
    const roster = players(11);
    const schedule = generateSchedule(roster);
    let midfieldersRotated = 0;
    for (let index = 1; index < SEGMENTS.length; index += 1) {
      const previous = schedule.filter((item) => item.segmentKey === SEGMENTS[index - 1].key);
      const next = schedule.filter((item) => item.segmentKey === SEGMENTS[index].key);
      const nextByPlayer = new Map(next.map((item) => [item.playerId, item.positionKey]));
      const previousMidfielders = previous.filter((item) => item.positionKey.includes("Midfield"));
      midfieldersRotated += previousMidfielders.filter((item) => !nextByPlayer.has(item.playerId)).length;
      for (const assignment of previous) {
        const nextPosition = nextByPlayer.get(assignment.playerId);
        if (nextPosition && SEGMENTS[index].quarter === SEGMENTS[index - 1].quarter) {
          expect(nextPosition).toBe(assignment.positionKey);
        }
      }
    }
    expect(midfieldersRotated).toBeGreaterThanOrEqual(10);
  });
  it("keeps one goalkeeper for each full quarter", () => {
    const schedule = generateSchedule(players(11));
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const first = schedule.find((item) => item.segmentKey === `q${quarter}a` && item.positionKey === "goalkeeper");
      const second = schedule.find((item) => item.segmentKey === `q${quarter}b` && item.positionKey === "goalkeeper");
      expect(first?.playerId).toBe(second?.playerId);
    }
  });
  it("allows the same exact position in both segments of one quarter", () => {
    const playerId = players(1)[0].id;
    const assignments = [
      { segmentKey: "q1a", positionKey: "leftDefense", playerId, source: "generated", locked: false },
      { segmentKey: "q1b", positionKey: "leftDefense", playerId, source: "generated", locked: false },
    ] as const;

    expect(detectCrossQuarterPositionRepeats([...assignments])).toEqual([]);
    expect(scheduleCellWarnings([...assignments]).filter(
      (warning) => warning.kind === "cross-quarter-position-repeat",
    )).toEqual([]);
  });
  it("warns every affected cell when an exact position repeats across quarters", () => {
    const playerId = players(1)[0].id;
    const assignments = [
      { segmentKey: "q1a", positionKey: "leftDefense", playerId, source: "generated", locked: false },
      { segmentKey: "q1b", positionKey: "leftDefense", playerId, source: "generated", locked: false },
      { segmentKey: "q3a", positionKey: "leftDefense", playerId, source: "manual", locked: false },
    ] as const;

    expect(detectCrossQuarterPositionRepeats([...assignments])).toEqual([{
      playerId,
      positionKey: "leftDefense",
      quarterNumbers: [1, 3],
      segmentKeys: ["q1a", "q1b", "q3a"],
    }]);
    expect(scheduleCellWarnings([...assignments]).filter(
      (warning) => warning.kind === "cross-quarter-position-repeat",
    )).toHaveLength(3);
  });
  it.each([7, 8, 10, 11, 14])(
    "avoids cross-quarter exact-position repeats for a generated %i-player rotation",
    (count) => {
    const roster = players(count);
    const schedule = generateSchedule(roster);

    expect(detectCrossQuarterPositionRepeats(schedule)).toEqual([]);
    },
  );
  it("recomputes cross-quarter warnings after manual swaps", () => {
    const roster = players(11);
    const original = generateSchedule(roster);
    const repeatedPlayerId = original.find(
      (item) => item.segmentKey === "q1a" && item.positionKey === "leftDefense",
    )!.playerId;
    const originalTargetPlayerId = original.find(
      (item) => item.segmentKey === "q2a" && item.positionKey === "leftDefense",
    )!.playerId;
    const changed = replaceAssignment(original, "q2a", "leftDefense", repeatedPlayerId);
    const restored = replaceAssignment(changed, "q2a", "leftDefense", originalTargetPlayerId);

    expect(scoreSchedule(
      changed,
      roster.map((player) => player.id),
    ).crossQuarterPositionRepeats).toContainEqual(expect.objectContaining({
      playerId: repeatedPlayerId,
      positionKey: "leftDefense",
      quarterNumbers: [1, 2],
    }));
    expect(scoreSchedule(
      restored,
      roster.map((player) => player.id),
    ).crossQuarterPositionRepeats).toEqual([]);
  });
  it("regeneration avoids the current assignment when another variant is feasible", () => {
    const roster = players(11);
    const current = generateSchedule(roster, { seed: "current" });
    const result = regenerateSchedule({
      players: roster,
      currentAssignments: current,
      seeds: ["next-one", "next-two", "next-three"],
    });

    expect(result.changed).toBe(true);
    expect(result.assignments).not.toEqual(current);
    expect(scoreSchedule(
      result.assignments,
      roster.map((player) => player.id),
    )).toMatchObject({ valid: true, minuteSpread: 7 });
    expect(detectCrossQuarterPositionRepeats(result.assignments)).toEqual([]);
  });
  it("optimizes away from the current schedule even when supplied seeds repeat it", () => {
    const roster = players(11);
    const current = generateSchedule(roster, { seed: "reused-seed" });
    const result = regenerateSchedule({
      players: roster,
      currentAssignments: current,
      seeds: ["reused-seed", "reused-seed"],
    });

    expect(result.changed).toBe(true);
    expect(result.assignments).not.toEqual(current);
    expect(scoreSchedule(
      result.assignments,
      roster.map((player) => player.id),
    ).valid).toBe(true);
  });
  it("keeps locked assignments fixed during regeneration", () => {
    const roster = players(7);
    const current = generateSchedule(roster, { seed: "locked-current" }).map(
      (assignment) => ({
        ...assignment,
        locked:
          assignment.segmentKey === "q2a" &&
          assignment.positionKey === "leftDefense",
      }),
    );
    const locked = current.find((assignment) => assignment.locked)!;
    const result = regenerateSchedule({
      players: roster,
      currentAssignments: current,
      seeds: ["locked-next-one", "locked-next-two", "locked-next-three"],
    });

    expect(result.changed).toBe(true);
    expect(result.assignments.find(
      (assignment) =>
        assignment.segmentKey === locked.segmentKey &&
        assignment.positionKey === locked.positionKey,
    )).toMatchObject({
      playerId: locked.playerId,
      locked: true,
    });
    expect(scoreSchedule(
      result.assignments,
      roster.map((player) => player.id),
    ).valid).toBe(true);
  });
  it("returns honest feedback when every assignment is locked", () => {
    const roster = players(7);
    const current = generateSchedule(roster, { seed: "only-solution" }).map(
      (assignment) => ({ ...assignment, locked: true }),
    );
    const result = regenerateSchedule({
      players: roster,
      currentAssignments: current,
      seeds: ["unused-one", "unused-two"],
    });

    expect(result).toEqual({
      assignments: current,
      changed: false,
      reason: "Every assignment is locked, so the schedule has only one allowed arrangement.",
    });
  });
  it("repairs an unavailable assignment while preserving unaffected cells", () => { const roster = players(11); const original = generateSchedule(roster); const unavailable = original[0].playerId; const eligible = roster.filter((item) => item.id !== unavailable); const repaired = repairSchedule(original, eligible); expect(scoreSchedule(repaired, eligible.map((item) => item.id)).valid).toBe(true); expect(repaired.filter((item, index) => item.playerId === original[index].playerId).length).toBeGreaterThan(45); });
  it("swaps two field players within a segment", () => {
    const original = generateSchedule(players(8));
    const first = original.find((item) => item.segmentKey === "q1a" && item.positionKey === "goalkeeper")!;
    const second = original.find((item) => item.segmentKey === "q1a" && item.positionKey === "leftDefense")!;
    const changed = replaceAssignment(original, "q1a", "goalkeeper", second.playerId);
    expect(changed.find((item) => item.segmentKey === "q1a" && item.positionKey === "goalkeeper")?.playerId).toBe(second.playerId);
    expect(changed.find((item) => item.segmentKey === "q1a" && item.positionKey === "leftDefense")?.playerId).toBe(first.playerId);
  });
  it("moves a substitute onto the field", () => {
    const roster = players(8);
    const original = generateSchedule(roster);
    const onField = new Set(original.filter((item) => item.segmentKey === "q1a").map((item) => item.playerId));
    const substitute = roster.find((player) => !onField.has(player.id))!;
    const changed = replaceAssignment(original, "q1a", "goalkeeper", substitute.id);
    expect(changed.find((item) => item.segmentKey === "q1a" && item.positionKey === "goalkeeper")?.playerId).toBe(substitute.id);
    expect(scoreSchedule(changed, roster.map((player) => player.id)).valid).toBe(true);
  });
  it("locates goalkeeper changes on the second-half cell", () => {
    const roster = players(8);
    const original = generateSchedule(roster);
    const replacement = original.find((item) => item.segmentKey === "q1b" && item.positionKey === "leftDefense")!;
    const changed = replaceAssignment(original, "q1b", "goalkeeper", replacement.playerId);
    expect(scheduleCellWarnings(changed)).toContainEqual(expect.objectContaining({
      segmentKey: "q1b",
      positionKey: "goalkeeper",
      kind: "goalkeeper-change",
    }));
    expect(scoreSchedule(changed, roster.map((player) => player.id)).goalkeeperExceptions).toBe(1);
  });
  it("warns on goalkeeper assignments beyond 14 minutes", () => {
    const roster = players(8);
    const original = generateSchedule(roster);
    const goalkeeperId = original.find(
      (item) => item.segmentKey === "q1a" && item.positionKey === "goalkeeper",
    )!.playerId;
    const changed = ["q2a", "q2b"].reduce(
      (assignments, segmentKey) =>
        replaceAssignment(assignments, segmentKey as (typeof SEGMENTS)[number]["key"], "goalkeeper", goalkeeperId),
      original,
    );
    const overuseWarnings = scheduleCellWarnings(changed).filter(
      (warning) => warning.kind === "goalkeeper-overuse" && warning.playerId === goalkeeperId,
    );

    expect(overuseWarnings.map((warning) => warning.segmentKey)).toEqual(["q2a", "q2b"]);
    expect(scoreSchedule(changed, roster.map((player) => player.id)).goalkeeperOveruse).toBe(1);
  });
  it("allows exactly three substitute segments", () => {
    const roster = players(8);
    const playerId = roster[0].id;
    const changed = SEGMENTS.slice(0, 3).reduce((assignments, segment) => {
      const playerAssignment = assignments.find(
        (item) => item.segmentKey === segment.key && item.playerId === playerId,
      );
      if (playerAssignment) {
        const fieldIds = new Set(
          assignments
            .filter((item) => item.segmentKey === segment.key)
            .map((item) => item.playerId),
        );
        const substitute = roster.find((player) => !fieldIds.has(player.id))!;
        return replaceAssignment(assignments, segment.key, playerAssignment.positionKey, substitute.id);
      }
      return assignments;
    }, generateSchedule(roster));

    expect(scheduleSubstituteWarnings(changed, roster.map((player) => player.id)).filter(
      (warning) => warning.playerId === playerId,
    )).toEqual([]);
  });
  it("warns on the fourth substitute segment", () => {
    const roster = players(8);
    const playerId = roster[0].id;
    const changed = SEGMENTS.slice(0, 4).reduce((assignments, segment) => {
      const playerAssignment = assignments.find(
        (item) => item.segmentKey === segment.key && item.playerId === playerId,
      );
      if (!playerAssignment) return assignments;
      const fieldIds = new Set(
        assignments
          .filter((item) => item.segmentKey === segment.key)
          .map((item) => item.playerId),
      );
      const substitute = roster.find((player) => !fieldIds.has(player.id))!;
      return replaceAssignment(assignments, segment.key, playerAssignment.positionKey, substitute.id);
    }, generateSchedule(roster));

    expect(scheduleSubstituteWarnings(changed, roster.map((player) => player.id)).filter(
      (warning) => warning.playerId === playerId,
    )).toEqual([
      expect.objectContaining({ segmentKey: "q2b", kind: "substitute-overuse" }),
    ]);
    expect(scoreSchedule(changed, roster.map((player) => player.id)).substituteOveruse).toBe(1);
  });
});
