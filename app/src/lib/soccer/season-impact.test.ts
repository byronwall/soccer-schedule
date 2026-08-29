import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION_LABELS, POSITIONS, SEGMENTS } from "./fixed-game";
import { createDefaultPlayerPreference } from "./player-preferences";
import {
  buildSeasonImpact,
  formatPlanningMinutes,
  rolePercentage,
  totalRoleSeconds,
} from "./season-impact";
import { generateSchedule } from "./scheduling";
import { soccerStoreSchema, type Player } from "./schemas";
import { applyLiveAction } from "./store-live-actions";
import { scheduleActionHandlers } from "./store-schedule-actions";

const stamp = "2026-07-01T12:00:00.000Z";
const ids = Array.from(
  { length: 12 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const players: Player[] = ids.slice(0, 8).map((id, index) => ({
  id,
  displayName: `Player ${index + 1}`,
  color: "#2563EB",
  active: true,
  createdAt: stamp,
  updatedAt: stamp,
}));
const priorGameId = ids[8];
const currentGameId = ids[9];
const futureGameId = ids[10];
const currentScheduleId = "20000000-0000-4000-8000-000000000001";
const publishedAssignments = generateSchedule(players, { seed: "impact" });
const currentAssignments = generateSchedule(players, {
  seed: "current",
}).slice(0, 14);

const game = (id: string, startsAt: string) => ({
  id,
  opponentName: "Comets",
  venueName: "Test Field",
  startsAt,
  status: "scheduled" as const,
  createdAt: stamp,
  updatedAt: stamp,
});

const schedule = (id: string, gameId: string) => ({
  id,
  gameId,
  revision: 1,
  status: "published" as const,
  assignments: publishedAssignments,
  history: [],
  future: [],
  generatedAt: stamp,
  updatedAt: stamp,
  publishedAt: stamp,
});

const createStore = () =>
  soccerStoreSchema.parse({
    schemaVersion: 7,
    teamDisplayName: "Test",
    seasonName: "Fall",
    positionLabels: DEFAULT_POSITION_LABELS,
    players,
    games: [
      game(priorGameId, "2026-07-10T12:00:00.000Z"),
      game(currentGameId, "2026-07-20T12:00:00.000Z"),
      game(futureGameId, "2026-07-30T12:00:00.000Z"),
    ],
    availability: [priorGameId, currentGameId, futureGameId].flatMap((gameId) =>
      players.map((player) => ({
        gameId,
        playerId: player.id,
        status: "available" as const,
        updatedAt: stamp,
      })),
    ),
    schedules: [
      schedule(ids[11], priorGameId),
      schedule("10000000-0000-4000-8000-000000000001", futureGameId),
      {
        id: currentScheduleId,
        gameId: currentGameId,
        revision: 1,
        status: "draft",
        assignments: [],
        history: [],
        future: [],
        generatedAt: stamp,
        updatedAt: stamp,
      },
    ],
    liveGames: [],
    playerPreferences: {
      schemaVersion: 1,
      entries: players.map((player) => createDefaultPlayerPreference(player.id, stamp)),
    },
    users: [],
    sessions: [],
  });

describe("season impact", () => {
  it("adds exactly the current partial draft and excludes future games", () => {
    const store = createStore();
    const impact = buildSeasonImpact({
      currentGame: store.games[1],
      currentAssignments,
      games: store.games,
      schedules: store.schedules,
      liveGames: store.liveGames,
      players,
    });

    expect(impact.plannedGameCount).toBe(1);
    expect(impact.actualGameCount).toBe(0);
    expect(impact.draftSeconds).toBe(98 * 60);
    expect(impact.rows.reduce((sum, row) => sum + totalRoleSeconds(row.draftSeconds), 0)).toBe(
      98 * 60,
    );
    expect(impact.rows.reduce((sum, row) => sum + totalRoleSeconds(row.beforeSeconds), 0)).toBe(
      392 * 60,
    );
  });

  it("prefers confirmed actual seconds over the published plan", () => {
    const store = createStore();
    const actor = { id: "coach", displayName: "Coach" };
    applyLiveAction(
      store,
      "liveStart",
      {
        gameId: priorGameId,
        expectedRevision: 0,
      },
      stamp,
      actor,
    );
    applyLiveAction(
      store,
      "liveCompleteAndConfirm",
      {
        gameId: priorGameId,
        expectedRevision: 1,
      },
      "2026-07-01T12:14:00.000Z",
      actor,
    );

    const impact = buildSeasonImpact({
      currentGame: store.games[1],
      currentAssignments,
      games: store.games,
      schedules: store.schedules,
      liveGames: store.liveGames,
      players,
    });

    expect(impact.actualGameCount).toBe(1);
    expect(impact.plannedGameCount).toBe(0);
    expect(impact.rows.reduce((sum, row) => sum + totalRoleSeconds(row.beforeSeconds), 0)).toBe(
      98 * 60,
    );
  });

  it("formats sub-minute totals and rounds percentages from exact seconds", () => {
    expect(formatPlanningMinutes(30)).toBe("0.5");
    expect(formatPlanningMinutes(90)).toBe("1.5");
    expect(rolePercentage(30, 90)).toBe(33);
    expect(rolePercentage(60, 90)).toBe(67);
  });

  it("does not let a future published schedule influence season balancing", () => {
    const withFuture = createStore();
    withFuture.schedules[1].assignments = Array.from(
      { length: POSITIONS.length * SEGMENTS.length },
      (_, index) => ({
        segmentKey: SEGMENTS[Math.floor(index / POSITIONS.length)].key,
        positionKey: POSITIONS[index % POSITIONS.length].key,
        playerId: players[0].id,
        source: "generated" as const,
        locked: false,
      }),
    );
    const withoutFuture = structuredClone(withFuture);
    withoutFuture.schedules.splice(1, 1);

    for (const store of [withFuture, withoutFuture]) {
      scheduleActionHandlers.generateScheduleTarget(
        store,
        {
          scheduleId: currentScheduleId,
          expectedRevision: 1,
          target: { kind: "all" },
        },
        stamp,
      );
    }

    expect(withFuture.schedules.at(-1)?.assignments).toEqual(
      withoutFuture.schedules.at(-1)?.assignments,
    );
  });

  it("schedules a player into the best available slot in the requested group", () => {
    const store = createStore();
    const result = scheduleActionHandlers.assignSeasonImpactSlot(
      store,
      {
        scheduleId: currentScheduleId,
        expectedRevision: 1,
        playerId: players[0].id,
        group: "defense",
      },
      stamp,
    ) as { changed: boolean };

    const draft = store.schedules.find((item) => item.id === currentScheduleId);
    expect(result.changed).toBe(true);
    expect(draft?.assignments).toEqual([
      expect.objectContaining({
        playerId: players[0].id,
        positionKey: expect.stringMatching(/Defense/),
        source: "manual",
        locked: true,
      }),
    ]);
    expect(draft?.history).toEqual([[]]);
  });

  it("does not schedule a player who already has time in that position group", () => {
    const store = createStore();
    scheduleActionHandlers.assignSeasonImpactSlot(
      store,
      {
        scheduleId: currentScheduleId,
        expectedRevision: 1,
        playerId: players[0].id,
        group: "defense",
      },
      stamp,
    );
    const draft = store.schedules.find((item) => item.id === currentScheduleId)!;
    const result = scheduleActionHandlers.assignSeasonImpactSlot(
      store,
      {
        scheduleId: currentScheduleId,
        expectedRevision: draft.revision,
        playerId: players[0].id,
        group: "defense",
      },
      stamp,
    ) as { changed: boolean };

    expect(result.changed).toBe(false);
    expect(draft.assignments).toHaveLength(1);
    expect(draft.history).toHaveLength(1);
  });

  it("leaves the draft unchanged when no compatible empty slot is available", () => {
    const store = createStore();
    const draft = store.schedules.find((item) => item.id === currentScheduleId)!;
    draft.assignments = SEGMENTS.map((segment) => ({
      segmentKey: segment.key,
      positionKey: "goalkeeper" as const,
      playerId: players[0].id,
      source: "manual" as const,
      locked: true,
    }));
    const before = structuredClone(draft.assignments);
    const result = scheduleActionHandlers.assignSeasonImpactSlot(
      store,
      {
        scheduleId: currentScheduleId,
        expectedRevision: draft.revision,
        playerId: players[0].id,
        group: "defense",
      },
      stamp,
    ) as { changed: boolean };

    expect(result.changed).toBe(false);
    expect(draft.assignments).toEqual(before);
    expect(draft.history).toEqual([]);
  });

  it("restores a Season Impact assignment with the existing schedule undo", () => {
    const store = createStore();
    scheduleActionHandlers.assignSeasonImpactSlot(
      store,
      {
        scheduleId: currentScheduleId,
        expectedRevision: 1,
        playerId: players[0].id,
        group: "forward",
      },
      stamp,
    );
    const draft = store.schedules.find((item) => item.id === currentScheduleId)!;
    scheduleActionHandlers.undoSchedule(
      store,
      {
        scheduleId: currentScheduleId,
        expectedRevision: draft.revision,
      },
      stamp,
    );

    expect(draft.assignments).toEqual([]);
    expect(draft.future).toHaveLength(1);
  });
});
