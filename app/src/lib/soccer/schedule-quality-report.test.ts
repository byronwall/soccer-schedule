import { describe, expect, it } from "vitest";
import { buildScheduleQualityReport } from "./schedule-quality-report";
import {
  compareGenerationRanks,
  generationHardErrors,
  generationPriorityRank,
  type ScheduleGenerationQuality,
} from "./schedule-generation-quality";
import { generateSchedule, scoreSchedule } from "./scheduling";
import type { Player } from "./schemas";

const stamp = "2026-07-01T12:00:00.000Z";
const players: Player[] = Array.from({ length: 8 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  displayName: `Player ${index + 1}`,
  color: "#2563EB",
  active: true,
  createdAt: stamp,
  updatedAt: stamp,
}));

describe("partial-aware quality report", () => {
  it("reports 14 of 56 and leaves whole-game rules not assessable", () => {
    const assignments = generateSchedule(players).slice(0, 14);
    const report = buildScheduleQualityReport({
      assignments,
      eligibleIds: players.map((player) => player.id),
      quality: scoreSchedule(
        assignments,
        players.map((player) => player.id),
      ),
    });

    expect(report.find((rule) => rule.id === "completeness")?.summary).toBe(
      "14 of 56 assignments filled",
    );
    expect(report.find((rule) => rule.id === "game-balance")?.status).toBe("not-assessable");
    expect(report.find((rule) => rule.id === "whole-game-variety")?.status).toBe("not-assessable");
    expect(report.slice(0, 3).map((rule) => rule.id)).toEqual([
      "locks",
      "validity",
      "completeness",
    ]);
    expect(report.every((rule) => rule.help.length > 20 && rule.priority > 0)).toBe(true);
    expect(
      generationHardErrors({
        assignments,
        currentAssignments: assignments,
        players,
      }),
    ).toEqual([]);
  });

  it("orders season balance and preferences above goalkeeper then defender continuity", () => {
    const base: ScheduleGenerationQuality = {
      assignedCount: 56,
      hardErrorCount: 0,
      gameMinuteSpread: 0,
      seasonMinuteSpread: 0,
      seasonRoleImbalance: 0,
      avoidAssignmentCount: 0,
      preferredAssignmentCount: 0,
      favoredExtraMisses: 0,
      goalkeeperOveruse: 0,
      goalkeeperChanges: 0,
      defenderChanges: 0,
      midfieldRepeats: 0,
      crossQuarterPositionRepeats: 0,
      varietyGaps: 0,
    };
    const compare = (
      left: Partial<ScheduleGenerationQuality>,
      right: Partial<ScheduleGenerationQuality>,
    ) =>
      compareGenerationRanks(
        generationPriorityRank({ ...base, ...left }),
        generationPriorityRank({ ...base, ...right }),
      );

    expect(compare({ seasonMinuteSpread: 1 }, { avoidAssignmentCount: 1 })).toBeGreaterThan(0);
    expect(compare({ avoidAssignmentCount: 1 }, { goalkeeperChanges: 1 })).toBeGreaterThan(0);
    expect(compare({ goalkeeperOveruse: 1 }, { goalkeeperChanges: 1 })).toBeGreaterThan(0);
    expect(compare({ goalkeeperChanges: 1 }, { defenderChanges: 1 })).toBeGreaterThan(0);
    expect(compare({ defenderChanges: 1 }, { midfieldRepeats: 1 })).toBeGreaterThan(0);
    expect(compare({ midfieldRepeats: 1 }, { crossQuarterPositionRepeats: 1 })).toBeGreaterThan(0);
    expect(compare({ crossQuarterPositionRepeats: 1 }, { varietyGaps: 1 })).toBeGreaterThan(0);
    expect(compare({ varietyGaps: 1 }, { favoredExtraMisses: 1 })).toBeGreaterThan(0);
  });

  it("evaluates whole-game rules only when all cells are filled", () => {
    const assignments = generateSchedule(players);
    const quality = scoreSchedule(
      assignments,
      players.map((player) => player.id),
    );
    const report = buildScheduleQualityReport({
      assignments,
      eligibleIds: players.map((player) => player.id),
      quality,
    });

    expect(report.find((rule) => rule.id === "game-balance")?.status).not.toBe("not-assessable");
    expect(report.find((rule) => rule.id === "whole-game-variety")?.status).not.toBe(
      "not-assessable",
    );
  });
});
