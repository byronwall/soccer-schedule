import { describe, expect, it } from "vitest";
import { POSITIONS, SEGMENTS, TOTAL_ASSIGNMENTS } from "./fixed-game";
import { generateSchedule, orderSubstitutesForDisplay, repairSchedule, replaceAssignment, scheduleCellWarnings, scheduleSubstituteWarnings, scoreSchedule, substituteCountForRoster } from "./scheduling";
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
  it("rejects fewer than seven players", () => expect(() => generateSchedule(players(6))).toThrow(/seven/));
  it("keeps the eleven-player minute spread to one segment", () => { const roster = players(11); expect(scoreSchedule(generateSchedule(roster), roster.map((item) => item.id)).minuteSpread).toBeLessThanOrEqual(7); });
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
  it("warns on the third substitute segment but allows two in a row", () => {
    const roster = players(8);
    const playerId = roster[0].id;
    const changed = SEGMENTS.reduce((assignments, segment, index) => {
      const playerAssignment = assignments.find(
        (item) => item.segmentKey === segment.key && item.playerId === playerId,
      );
      if (index < 3 && playerAssignment) {
        const fieldIds = new Set(
          assignments
            .filter((item) => item.segmentKey === segment.key)
            .map((item) => item.playerId),
        );
        const substitute = roster.find((player) => !fieldIds.has(player.id))!;
        return replaceAssignment(assignments, segment.key, playerAssignment.positionKey, substitute.id);
      }
      if (index >= 3 && !playerAssignment) {
        return replaceAssignment(assignments, segment.key, "leftDefense", playerId);
      }
      return assignments;
    }, generateSchedule(roster));
    const warnings = scheduleSubstituteWarnings(changed, roster.map((player) => player.id));

    expect(warnings.filter((warning) => warning.playerId === playerId)).toEqual([
      expect.objectContaining({ segmentKey: "q2a", kind: "substitute-overuse" }),
    ]);
    expect(scoreSchedule(changed, roster.map((player) => player.id)).substituteOveruse).toBe(1);
  });
});
