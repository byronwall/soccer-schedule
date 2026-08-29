import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION_LABELS, POSITIONS, SEGMENTS } from "./fixed-game";
import { correctableLiveEvents, reconstructLiveLineup } from "./live-game";
import { liveEventSchema } from "./live-event-schemas";
import { createDefaultPlayerPreference } from "./player-preferences";
import { soccerStoreSchema, type SoccerStore } from "./schemas";
import { applyLiveAction } from "./store-live-actions";
import { migrateSoccerStore } from "./store-migrations";

const actor = { id: "coach-1", displayName: "Coach Stephen" };
const startStamp = "2026-07-28T16:00:00.000Z";
const stampAt = (seconds: number) =>
  new Date(new Date(startStamp).getTime() + seconds * 1000).toISOString();

const createStore = () => {
  const gameId = randomUUID();
  const names = ["Amelia", "Maya", "Nora", "Violet", "Sofia", "Zoe", "Lily", "Chloe", "Riley"];
  const players = names.map((displayName, index) => ({
    id: randomUUID(),
    displayName,
    jerseyNumber: String(index + 1),
    color: `#${String(index + 1).padStart(6, "0")}`,
    active: true,
    createdAt: startStamp,
    updatedAt: startStamp,
  }));
  const assignments = SEGMENTS.flatMap((segment, segmentIndex) =>
    POSITIONS.map((position, positionIndex) => ({
      segmentKey: segment.key,
      positionKey: position.key,
      playerId:
        players[
          segment.quarter === 1 ? positionIndex : (positionIndex + segmentIndex) % players.length
        ].id,
      source: "generated" as const,
      locked: false,
    })),
  );
  const store = soccerStoreSchema.parse({
    schemaVersion: 7,
    teamDisplayName: "Violet Test Team",
    seasonName: "Fall 2026",
    positionLabels: DEFAULT_POSITION_LABELS,
    players,
    games: [
      {
        id: gameId,
        opponentName: "Comets",
        venueName: "Test Field",
        startsAt: startStamp,
        status: "scheduled",
        createdAt: startStamp,
        updatedAt: startStamp,
      },
    ],
    availability: players.map((player) => ({
      gameId,
      playerId: player.id,
      status: "available",
      updatedAt: startStamp,
    })),
    schedules: [
      {
        id: randomUUID(),
        gameId,
        revision: 1,
        status: "published",
        assignments,
        history: [],
        future: [],
        generatedAt: startStamp,
        updatedAt: startStamp,
        publishedAt: startStamp,
      },
    ],
    liveGames: [],
    playerPreferences: {
      schemaVersion: 1,
      entries: players.map((player) => createDefaultPlayerPreference(player.id, startStamp)),
    },
    users: [],
    sessions: [],
  });
  return { store, gameId, players };
};

const run = (
  store: SoccerStore,
  action: string,
  gameId: string,
  stamp: string,
  payload: Record<string, unknown> = {},
) =>
  applyLiveAction(
    store,
    action,
    {
      gameId,
      expectedRevision: store.liveGames.find((live) => live.gameId === gameId)?.revision ?? 0,
      ...payload,
    },
    stamp,
    actor,
  );

describe("minimal live-game event ledger", () => {
  it("records start, pause, and resume with complete server metadata and exact clock offsets", () => {
    const { store, gameId } = createStore();
    run(store, "liveStart", gameId, startStamp);
    run(store, "livePause", gameId, stampAt(180));
    run(store, "liveStart", gameId, stampAt(240));
    const live = store.liveGames[0];

    expect(live).toMatchObject({
      schemaVersion: 1,
      revision: 3,
      status: "running",
      accumulatedQuarterSeconds: 180,
      actualHistoryStatus: "incomplete",
    });
    expect(live.events.map((event) => [event.type, event.elapsedGameClockSeconds])).toEqual([
      ["game_started", 0],
      ["game_paused", 180],
      ["game_resumed", 180],
    ]);
    expect(
      live.events.every(
        (event) =>
          liveEventSchema.safeParse(event).success &&
          event.actor.displayName === "Coach Stephen" &&
          event.quarter === 1 &&
          event.id.length > 0 &&
          event.serverTimestamp.length > 0,
      ),
    ).toBe(true);
  });

  it("reconstructs substitutions and an atomic field-position swap after serialization", () => {
    const { store, gameId, players } = createStore();
    const published = store.schedules[0];
    const originalAssignments = structuredClone(published.assignments);
    run(store, "liveStart", gameId, startStamp);
    run(store, "liveSwapPositions", gameId, stampAt(180), {
      firstPositionKey: "leftMidfield",
      secondPositionKey: "rightForward",
    });
    run(store, "liveSubstitute", gameId, stampAt(420), {
      positionKey: "rightForward",
      playerId: players[7].id,
    });
    const live = store.liveGames[0];
    const reconstructed = reconstructLiveLineup(published, live, stampAt(600));
    const refreshed = soccerStoreSchema.parse(JSON.parse(JSON.stringify(store)));
    const refreshedLineup = reconstructLiveLineup(
      refreshed.schedules[0],
      refreshed.liveGames[0],
      stampAt(600),
    );

    expect(live.events.map((event) => event.type)).toEqual([
      "game_started",
      "field_players_swapped",
      "bench_replaced_field_player",
    ]);
    expect(reconstructed.leftMidfield).toBe(players[6].id);
    expect(reconstructed.rightForward).toBe(players[7].id);
    expect(new Set(Object.values(reconstructed)).size).toBe(7);
    expect(refreshedLineup).toEqual(reconstructed);
    expect(published.assignments).toEqual(originalAssignments);
  });

  it("rejects stale revisions and semantically invalid substitutions or swaps", () => {
    const { store, gameId, players } = createStore();
    run(store, "liveStart", gameId, startStamp);
    expect(() =>
      applyLiveAction(store, "livePause", { gameId, expectedRevision: 0 }, stampAt(10), actor),
    ).toThrow(/Version conflict/);
    expect(() =>
      run(store, "liveSubstitute", gameId, stampAt(20), {
        positionKey: "leftMidfield",
        playerId: players[0].id,
      }),
    ).toThrow(/bench/);
    expect(() =>
      run(store, "liveSwapPositions", gameId, stampAt(20), {
        firstPositionKey: "leftMidfield",
        secondPositionKey: "leftMidfield",
      }),
    ).toThrow(/different/);
  });

  it("deduplicates one goal submission while allowing a later goal by the same player", () => {
    const { store, gameId, players } = createStore();
    const submissionId = randomUUID();
    run(store, "liveStart", gameId, startStamp);
    const expectedRevision = store.liveGames[0].revision;
    run(store, "liveRecordGoal", gameId, stampAt(720), {
      playerId: players[3].id,
      submissionId,
    });
    const duplicate = applyLiveAction(
      store,
      "liveRecordGoal",
      {
        gameId,
        expectedRevision,
        playerId: players[3].id,
        submissionId,
      },
      stampAt(721),
      actor,
    );
    run(store, "liveRecordGoal", gameId, stampAt(780), {
      playerId: players[3].id,
      submissionId: randomUUID(),
    });
    const goals = store.liveGames[0].events.filter(
      (event) => event.type === "own_team_goal_scored",
    );

    expect(goals).toHaveLength(2);
    expect(duplicate.id).toBe(goals[0].id);
    expect(store.liveGames[0].revision).toBe(3);
  });

  it("retains quarter history while loading the next published lineup", () => {
    const { store, gameId, players } = createStore();
    const published = store.schedules[0];
    run(store, "liveStart", gameId, startStamp);
    run(store, "liveSubstitute", gameId, stampAt(300), {
      positionKey: "goalkeeper",
      playerId: players[7].id,
    });
    run(store, "liveAdvanceSegment", gameId, stampAt(420));
    run(store, "liveAdvanceQuarter", gameId, stampAt(840));
    const live = store.liveGames[0];
    const lineup = reconstructLiveLineup(published, live, stampAt(840));
    const q2Goalkeeper = published.assignments.find(
      (assignment) => assignment.segmentKey === "q2a" && assignment.positionKey === "goalkeeper",
    )?.playerId;

    expect(live).toMatchObject({
      quarter: 2,
      status: "not_started",
      accumulatedQuarterSeconds: 0,
    });
    expect(live.events.map((event) => event.type)).toEqual([
      "game_started",
      "bench_replaced_field_player",
      "segment_advanced",
      "quarter_advanced",
    ]);
    expect(lineup.goalkeeper).toBe(q2Goalkeeper);
  });

  it("changes the published lineup only when the coach advances the segment", () => {
    const { store, gameId } = createStore();
    const published = store.schedules[0];
    run(store, "liveStart", gameId, startStamp);

    const firstLineup = reconstructLiveLineup(published, store.liveGames[0], stampAt(600));
    run(store, "liveAdvanceSegment", gameId, stampAt(600));
    const secondLineup = reconstructLiveLineup(published, store.liveGames[0], stampAt(600));

    expect(firstLineup).toEqual(
      Object.fromEntries(
        published.assignments
          .filter((assignment) => assignment.segmentKey === "q1a")
          .map((assignment) => [assignment.positionKey, assignment.playerId]),
      ),
    );
    expect(secondLineup).toEqual(
      Object.fromEntries(
        published.assignments
          .filter((assignment) => assignment.segmentKey === "q1b")
          .map((assignment) => [assignment.positionKey, assignment.playerId]),
      ),
    );
  });

  it("voids a mistaken event and recomputes, then records a durable lineup reset", () => {
    const { store, gameId, players } = createStore();
    const published = store.schedules[0];
    run(store, "liveStart", gameId, startStamp);
    const substitution = run(store, "liveSubstitute", gameId, stampAt(420), {
      positionKey: "leftMidfield",
      playerId: players[7].id,
    });
    expect(reconstructLiveLineup(published, store.liveGames[0], stampAt(500)).leftMidfield).toBe(
      players[7].id,
    );

    run(store, "liveVoidEvent", gameId, stampAt(430), {
      targetEventId: substitution.id,
    });
    expect(reconstructLiveLineup(published, store.liveGames[0], stampAt(500)).leftMidfield).toBe(
      players[3].id,
    );
    expect(correctableLiveEvents(store.liveGames[0].events)).toHaveLength(0);

    run(store, "liveSubstitute", gameId, stampAt(440), {
      positionKey: "leftMidfield",
      playerId: players[7].id,
    });
    run(store, "liveResetLineup", gameId, stampAt(450));
    expect(reconstructLiveLineup(published, store.liveGames[0], stampAt(500)).leftMidfield).toBe(
      players[3].id,
    );
    expect(store.liveGames[0].events.at(-1)?.type).toBe("lineup_reset_to_published_plan");
  });

  it("reconstructs the full Violet acceptance sequence and correction without changing the plan", () => {
    const { store, gameId, players } = createStore();
    const published = store.schedules[0];
    const publishedBefore = structuredClone(published.assignments);
    const violet = players[3];
    run(store, "liveStart", gameId, startStamp);
    run(store, "liveSwapPositions", gameId, stampAt(180), {
      firstPositionKey: "leftMidfield",
      secondPositionKey: "rightForward",
    });
    const mistakenExit = run(store, "liveSubstitute", gameId, stampAt(420), {
      positionKey: "rightForward",
      playerId: players[7].id,
    });
    run(store, "liveSubstitute", gameId, stampAt(600), {
      positionKey: "rightDefense",
      playerId: violet.id,
    });
    run(store, "liveRecordGoal", gameId, stampAt(720), {
      playerId: violet.id,
      submissionId: randomUUID(),
    });

    expect(reconstructLiveLineup(published, store.liveGames[0], stampAt(720)).rightDefense).toBe(
      violet.id,
    );
    run(store, "liveVoidEvent", gameId, stampAt(730), {
      targetEventId: mistakenExit.id,
    });
    const corrected = reconstructLiveLineup(published, store.liveGames[0], stampAt(730));
    expect(corrected.rightDefense).toBe(violet.id);
    expect(new Set(Object.values(corrected)).size).toBe(7);
    expect(published.assignments).toEqual(publishedBefore);
  });

  it("keeps actual history incomplete until explicit completion and confirmation", () => {
    const { store, gameId } = createStore();
    run(store, "liveStart", gameId, startStamp);
    expect(store.liveGames[0].actualHistoryStatus).toBe("incomplete");
    run(store, "liveCompleteAndConfirm", gameId, stampAt(840));

    expect(store.liveGames[0]).toMatchObject({
      status: "completed",
      actualHistoryStatus: "confirmed",
    });
    expect(store.liveGames[0].events.slice(-2).map((event) => event.type)).toEqual([
      "game_completed",
      "actual_record_confirmed",
    ]);
    expect(store.games[0].status).toBe("completed");
    expect(() => run(store, "liveStart", gameId, stampAt(841))).toThrow(/completed/);
  });

  it("migrates old transient live state as explicitly unavailable actual history", () => {
    const { store, gameId, players } = createStore();
    const legacy = {
      ...store,
      schemaVersion: 4,
      defensiveContinuityDefault: "goalkeeper-and-defense",
      games: store.games.map((game) => ({
        ...game,
        defensiveContinuityOverride: "goalkeeper-only",
      })),
      liveGames: [
        {
          gameId,
          revision: 3,
          status: "paused",
          quarter: 2,
          accumulatedQuarterSeconds: 120,
          overrides: [
            {
              positionKey: "leftMidfield",
              replacementPlayerId: players[7].id,
            },
          ],
          updatedAt: stampAt(120),
        },
      ],
    };
    const migrated = migrateSoccerStore(legacy);

    expect(migrated.games[0]).not.toHaveProperty("defensiveContinuityOverride");
    expect(migrated.liveGames[0]).toMatchObject({
      schemaVersion: 1,
      revision: 3,
      events: [],
      actualHistoryStatus: "legacy_unavailable",
    });
    expect(() =>
      applyLiveAction(migrated, "liveStart", { gameId, expectedRevision: 3 }, stampAt(130), actor),
    ).toThrow(/unavailable/);
  });
});
