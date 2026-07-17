import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION_LABELS } from "./fixed-game";
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
      schedules: [schedule(completed.id, "published", ["leftForward", "leftForward"]), schedule(upcoming.id, "draft", ["rightMidfield"])],
    }, player.id);

    expect(profile?.appearances).toBe(1);
    expect(profile?.completedMinutes).toBe(14);
    expect(profile?.positionTotals[0]).toMatchObject({ label: "Left Forward", segments: 2, minutes: 14 });
    expect(profile?.upcomingGames[0]).toMatchObject({ minutes: 7, scheduleStatus: "draft" });
  });
});
