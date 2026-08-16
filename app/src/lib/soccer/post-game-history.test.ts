import { describe, expect, it } from "vitest";
import { POSITIONS, SEGMENTS } from "./fixed-game";
import { liveStateSchema, type LiveEvent } from "./live-event-schemas";
import { deriveActualGameSummary } from "./post-game-history";
import type { Schedule } from "./schemas";

const stamp = "2026-07-28T16:00:00.000Z";
const ids = Array.from(
  { length: 9 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const scheduleId = "10000000-0000-4000-8000-000000000001";
const gameId = "20000000-0000-4000-8000-000000000001";
const actor = { id: "coach-1", displayName: "Coach Stephen" };

const schedule = (q1bOffset = 0, laterOffset = 0): Schedule => ({
  id: scheduleId,
  gameId,
  revision: 1,
  status: "published",
  assignments: SEGMENTS.flatMap((segment) =>
    POSITIONS.map((position, positionIndex) => ({
      segmentKey: segment.key,
      positionKey: position.key,
      playerId:
        ids[
          (positionIndex +
            (segment.key === "q1b" ? q1bOffset : segment.quarter > 1 ? laterOffset : 0)) %
            ids.length
        ],
      source: "generated" as const,
      locked: false,
    })),
  ),
  history: [],
  future: [],
  generatedAt: stamp,
  updatedAt: stamp,
  publishedAt: stamp,
});

let eventNumber = 0;
const event = (
  type: LiveEvent["type"],
  quarter: number,
  elapsedGameClockSeconds: number,
  payload: Record<string, unknown> = {},
) =>
  ({
    id: `30000000-0000-4000-8000-${String(++eventNumber).padStart(12, "0")}`,
    serverTimestamp: new Date(new Date(stamp).getTime() + eventNumber * 1000).toISOString(),
    quarter,
    elapsedGameClockSeconds,
    actor,
    type,
    payload,
  }) as LiveEvent;

const confirmedLive = (events: LiveEvent[], quarter = 1) => {
  eventNumber = Math.max(eventNumber, events.length);
  return liveStateSchema.parse({
    schemaVersion: 1,
    gameId,
    revision: events.length,
    status: "completed",
    quarter,
    accumulatedQuarterSeconds:
      events.findLast((item) => item.type === "game_completed")?.elapsedGameClockSeconds ?? 0,
    events,
    actualHistoryStatus: "confirmed",
    updatedAt: stamp,
  });
};

const closeLedger = (preceding: LiveEvent[], quarter: number, seconds: number) =>
  confirmedLive(
    [
      ...preceding,
      event("game_completed", quarter, seconds),
      event("actual_record_confirmed", quarter, seconds),
    ],
    quarter,
  );

const playerSummary = (result: ReturnType<typeof deriveActualGameSummary>, playerId: string) => {
  if (result.status !== "confirmed") {
    throw new Error("Expected confirmed actual summary.");
  }
  return result.players.find((player) => player.playerId === playerId);
};

describe("post-game actual history", () => {
  it("uses game-clock time across pause and resume without counting wall-clock delay", () => {
    eventNumber = 0;
    const live = closeLedger(
      [event("game_started", 1, 0), event("game_paused", 1, 180), event("game_resumed", 1, 180)],
      1,
      600,
    );
    const result = deriveActualGameSummary({
      schedule: schedule(),
      live,
      availablePlayerIds: ids,
    });

    expect(result).toMatchObject({ status: "confirmed", totalGameSeconds: 600 });
    expect(playerSummary(result, ids[3])).toMatchObject({
      fieldSeconds: 600,
      benchSeconds: 0,
      positionSeconds: { leftMidfield: 600 },
    });
  });

  it("changes to the published second-half lineup at exactly 07:00", () => {
    eventNumber = 0;
    const result = deriveActualGameSummary({
      schedule: schedule(1),
      live: closeLedger([event("game_started", 1, 0)], 1, 840),
      availablePlayerIds: ids,
    });

    expect(playerSummary(result, ids[3])).toMatchObject({
      fieldSeconds: 840,
      positionSeconds: {
        leftMidfield: 420,
        rightDefense: 420,
      },
    });
    expect(playerSummary(result, ids[0])?.benchSeconds).toBe(420);
  });

  it("closes each quarter at its own boundary and loads the next quarter plan", () => {
    eventNumber = 0;
    const result = deriveActualGameSummary({
      schedule: schedule(0, 2),
      live: closeLedger(
        [
          event("game_started", 1, 0),
          event("quarter_advanced", 1, 720, {
            fromQuarter: 1,
            toQuarter: 2,
          }),
          event("game_started", 2, 0),
        ],
        2,
        300,
      ),
      availablePlayerIds: ids,
    });

    expect(result).toMatchObject({
      status: "confirmed",
      totalGameSeconds: 1020,
    });
    expect(playerSummary(result, ids[3])).toMatchObject({
      fieldSeconds: 1020,
      positionSeconds: {
        leftMidfield: 720,
        leftDefense: 300,
      },
    });
  });

  it("applies simultaneous swaps and substitutions in ledger revision order", () => {
    eventNumber = 0;
    const result = deriveActualGameSummary({
      schedule: schedule(),
      live: closeLedger(
        [
          event("game_started", 1, 0),
          event("field_players_swapped", 1, 180, {
            firstPositionKey: "leftMidfield",
            secondPositionKey: "rightForward",
            firstPlayerId: ids[3],
            secondPlayerId: ids[6],
          }),
          event("bench_replaced_field_player", 1, 180, {
            positionKey: "rightForward",
            outgoingPlayerId: ids[3],
            incomingPlayerId: ids[7],
          }),
        ],
        1,
        600,
      ),
      availablePlayerIds: ids,
    });

    expect(playerSummary(result, ids[3])).toMatchObject({
      fieldSeconds: 180,
      benchSeconds: 420,
      positionSeconds: { leftMidfield: 180 },
    });
    expect(playerSummary(result, ids[7])?.positionSeconds).toEqual({
      rightForward: 420,
    });
  });

  it("derives substitutions, swaps, reset-to-plan, and retroactive void corrections", () => {
    eventNumber = 0;
    const substitution = event("bench_replaced_field_player", 1, 100, {
      positionKey: "leftMidfield",
      outgoingPlayerId: ids[3],
      incomingPlayerId: ids[7],
    });
    const resetResult = deriveActualGameSummary({
      schedule: schedule(),
      live: closeLedger(
        [
          event("game_started", 1, 0),
          substitution,
          event("lineup_reset_to_published_plan", 1, 200),
        ],
        1,
        300,
      ),
      availablePlayerIds: ids,
    });
    expect(playerSummary(resetResult, ids[3])).toMatchObject({
      fieldSeconds: 200,
      benchSeconds: 100,
    });

    const voidedResult = deriveActualGameSummary({
      schedule: schedule(),
      live: closeLedger(
        [
          event("game_started", 1, 0),
          substitution,
          event("event_voided", 1, 250, {
            targetEventId: substitution.id,
            reason: "Correction",
          }),
        ],
        1,
        300,
      ),
      availablePlayerIds: ids,
    });
    expect(playerSummary(voidedResult, ids[3])).toMatchObject({
      fieldSeconds: 300,
      benchSeconds: 0,
      positionSeconds: { leftMidfield: 300 },
    });
  });

  it("deduplicates repeated goal submissions but preserves a later separate goal", () => {
    eventNumber = 0;
    const repeatedSubmission = "40000000-0000-4000-8000-000000000001";
    const result = deriveActualGameSummary({
      schedule: schedule(),
      live: closeLedger(
        [
          event("game_started", 1, 0),
          event("own_team_goal_scored", 1, 300, {
            playerId: ids[3],
            submissionId: repeatedSubmission,
          }),
          event("own_team_goal_scored", 1, 300, {
            playerId: ids[3],
            submissionId: repeatedSubmission,
          }),
          event("own_team_goal_scored", 1, 360, {
            playerId: ids[3],
            submissionId: "40000000-0000-4000-8000-000000000002",
          }),
        ],
        1,
        600,
      ),
      availablePlayerIds: ids,
    });

    expect(playerSummary(result, ids[3])?.goals).toHaveLength(2);
    expect(
      playerSummary(result, ids[3])?.goals.map((goal) => goal.elapsedGameClockSeconds),
    ).toEqual([300, 360]);
  });

  it("requires explicit active completion and confirmation before returning actuals", () => {
    eventNumber = 0;
    const incomplete = liveStateSchema.parse({
      schemaVersion: 1,
      gameId,
      revision: 2,
      status: "paused",
      quarter: 1,
      accumulatedQuarterSeconds: 300,
      events: [event("game_started", 1, 0), event("game_paused", 1, 300)],
      actualHistoryStatus: "incomplete",
      updatedAt: stamp,
    });
    expect(
      deriveActualGameSummary({
        schedule: schedule(),
        live: incomplete,
        availablePlayerIds: ids,
      }),
    ).toEqual({ status: "incomplete", reason: "not-confirmed" });

    const invalid = liveStateSchema.parse({
      ...incomplete,
      status: "completed",
      actualHistoryStatus: "confirmed",
    });
    expect(
      deriveActualGameSummary({
        schedule: schedule(),
        live: invalid,
        availablePlayerIds: ids,
      }),
    ).toEqual({ status: "unavailable", reason: "invalid-confirmation" });
  });

  it("keeps missing and legacy records visibly unavailable", () => {
    expect(
      deriveActualGameSummary({
        schedule: schedule(),
        availablePlayerIds: ids,
      }),
    ).toEqual({ status: "unavailable", reason: "not-recorded" });

    const legacy = liveStateSchema.parse({
      schemaVersion: 1,
      gameId,
      revision: 3,
      status: "completed",
      quarter: 2,
      accumulatedQuarterSeconds: 120,
      events: [],
      actualHistoryStatus: "legacy_unavailable",
      updatedAt: stamp,
    });
    expect(
      deriveActualGameSummary({
        schedule: schedule(),
        live: legacy,
        availablePlayerIds: ids,
      }),
    ).toEqual({ status: "unavailable", reason: "legacy" });
  });

  it("derives the full Violet acceptance scenario exactly", () => {
    eventNumber = 0;
    const violet = ids[3];
    const result = deriveActualGameSummary({
      schedule: schedule(),
      live: closeLedger(
        [
          event("game_started", 1, 0),
          event("field_players_swapped", 1, 180, {
            firstPositionKey: "leftMidfield",
            secondPositionKey: "rightForward",
            firstPlayerId: violet,
            secondPlayerId: ids[6],
          }),
          event("bench_replaced_field_player", 1, 420, {
            positionKey: "rightForward",
            outgoingPlayerId: violet,
            incomingPlayerId: ids[7],
          }),
          event("bench_replaced_field_player", 1, 600, {
            positionKey: "rightDefense",
            outgoingPlayerId: ids[2],
            incomingPlayerId: violet,
          }),
          event("own_team_goal_scored", 1, 720, {
            playerId: violet,
            submissionId: "40000000-0000-4000-8000-000000000003",
          }),
        ],
        1,
        840,
      ),
      availablePlayerIds: ids,
    });

    expect(playerSummary(result, violet)).toMatchObject({
      fieldSeconds: 660,
      benchSeconds: 180,
      positionSeconds: {
        leftMidfield: 180,
        rightForward: 240,
        rightDefense: 240,
      },
    });
    expect(playerSummary(result, violet)?.goals).toHaveLength(1);
  });
});
