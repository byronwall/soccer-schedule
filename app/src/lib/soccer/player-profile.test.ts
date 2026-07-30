import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION_LABELS } from "./fixed-game";
import { liveStateSchema } from "./live-event-schemas";
import { buildPlayerProfile } from "./player-profile";
import type { Availability, Game, Player, Schedule } from "./schemas";

const stamp = "2026-07-16T12:00:00.000Z";
const player: Player = { id: "00000000-0000-4000-8000-000000000001", displayName: "Maya Brooks", jerseyNumber: "7", color: "#2563EB", active: true, createdAt: stamp, updatedAt: stamp };
const completed: Game = { id: "00000000-0000-4000-8000-000000000002", opponentName: "Comets", venueName: "Home", startsAt: "2026-07-10T12:00:00.000Z", status: "completed", createdAt: stamp, updatedAt: stamp };
const upcoming: Game = { ...completed, id: "00000000-0000-4000-8000-000000000003", opponentName: "Strikers", startsAt: "2026-07-20T12:00:00.000Z", status: "scheduled" };
const availability: Availability[] = [
  { gameId: completed.id, playerId: player.id, status: "available", updatedAt: stamp },
  { gameId: upcoming.id, playerId: player.id, status: "available", updatedAt: stamp },
];
const schedule = (gameId: string, status: Schedule["status"], positions: Schedule["assignments"][number]["positionKey"][]): Schedule => ({
  id: gameId === completed.id ? "00000000-0000-4000-8000-000000000004" : "00000000-0000-4000-8000-000000000005",
  gameId,
  revision: 1,
  status,
  assignments: positions.map((positionKey, index) => ({ segmentKey: index === 0 ? "q1a" : "q1b", positionKey, playerId: player.id, source: "generated", locked: false })),
  history: [], future: [], generatedAt: stamp, updatedAt: stamp,
});

describe("buildPlayerProfile", () => {
  it("summarizes completed position history and future assignments", () => {
    const profile = buildPlayerProfile({
      players: [player], games: [upcoming, completed], availability,
      positionLabels: DEFAULT_POSITION_LABELS,
      liveGames: [],
      schedules: [schedule(completed.id, "published", ["leftForward", "goalkeeper"]), schedule(upcoming.id, "draft", ["rightMidfield"])],
    }, player.id);

    expect(profile?.appearances).toBe(1);
    expect(profile?.completedMinutes).toBe(14);
    expect(profile?.positionTotals).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Left Forward", segments: 1, minutes: 7 }),
      expect.objectContaining({ label: "Goalkeeper", segments: 1, minutes: 7 }),
    ]));
    expect(profile?.positionVariety).toHaveLength(7);
    expect(profile?.positionVariety.find(
      (position) => position.key === "goalkeeper",
    )).toMatchObject({ segments: 1, minutes: 7 });
    expect(profile?.upcomingGames[0]).toMatchObject({ minutes: 7, scheduleStatus: "draft" });
    expect(profile?.completedGames[0]).toMatchObject({
      actualStatus: "unavailable",
      actualReason: "not-recorded",
    });
    expect(profile?.seasonCoverage).toMatchObject({
      attack: true,
      defense: true,
      goalkeeper: true,
      source: "planned only",
      scoredThisSeason: false,
      gamesWithoutTrustedActual: 1,
    });
  });

  it("uses only explicitly confirmed actuals for minutes, roles, and goal history", () => {
    const published = schedule(
      completed.id,
      "published",
      ["leftForward", "goalkeeper"],
    );
    const goalId = "00000000-0000-4000-8000-000000000010";
    const live = liveStateSchema.parse({
      schemaVersion: 1,
      gameId: completed.id,
      revision: 4,
      status: "completed",
      quarter: 1,
      accumulatedQuarterSeconds: 840,
      actualHistoryStatus: "confirmed",
      updatedAt: stamp,
      events: [
        {
          id: "00000000-0000-4000-8000-000000000006",
          serverTimestamp: stamp,
          quarter: 1,
          elapsedGameClockSeconds: 0,
          actor: { id: "coach-1", displayName: "Coach" },
          type: "game_started",
          payload: {},
        },
        {
          id: goalId,
          serverTimestamp: stamp,
          quarter: 1,
          elapsedGameClockSeconds: 300,
          actor: { id: "coach-1", displayName: "Coach" },
          type: "own_team_goal_scored",
          payload: {
            playerId: player.id,
            submissionId: "00000000-0000-4000-8000-000000000011",
          },
        },
        {
          id: "00000000-0000-4000-8000-000000000012",
          serverTimestamp: stamp,
          quarter: 1,
          elapsedGameClockSeconds: 840,
          actor: { id: "coach-1", displayName: "Coach" },
          type: "game_completed",
          payload: {},
        },
        {
          id: "00000000-0000-4000-8000-000000000013",
          serverTimestamp: stamp,
          quarter: 1,
          elapsedGameClockSeconds: 840,
          actor: { id: "coach-1", displayName: "Coach" },
          type: "actual_record_confirmed",
          payload: {},
        },
      ],
    });
    const profile = buildPlayerProfile({
      players: [player],
      games: [completed],
      availability: [availability[0]],
      positionLabels: DEFAULT_POSITION_LABELS,
      schedules: [published],
      liveGames: [live],
    }, player.id);

    expect(profile?.confirmedActualFieldSeconds).toBe(840);
    expect(profile?.confirmedActualAppearances).toBe(1);
    expect(profile?.completedGames[0].actual).toMatchObject({
      fieldSeconds: 840,
      benchSeconds: 0,
      positionSeconds: { leftForward: 420, goalkeeper: 420 },
      goals: [{ eventId: goalId }],
    });
    expect(profile?.seasonCoverage).toMatchObject({
      source: "confirmed actual",
      scoredThisSeason: true,
      confirmedGoalCount: 1,
      gamesWithoutTrustedActual: 0,
    });
  });
});
