import { randomUUID } from "node:crypto";
import { POSITIONS, type PositionKey } from "./fixed-game";
import {
  liveCommandSchemas,
  liveGoalCommandSchema,
  liveSubstituteCommandSchema,
  liveSwapCommandSchema,
  liveVoidCommandSchema,
  type LiveGoalCommand,
  type LiveSubstituteCommand,
  type LiveSwapCommand,
  type LiveVoidCommand,
} from "./live-command-schemas";
import {
  correctableLiveEvents,
  elapsedLiveSecondsAt,
  reconstructLiveLineup,
} from "./live-game";
import {
  liveActorSchema,
  liveEventSchema,
  type LiveActor,
  type LiveEvent,
} from "./live-event-schemas";
import type { SoccerStore } from "./schemas";
import { requireGame, requirePlayer } from "./store-action-helpers";

type ActionPayload = Record<string, unknown>;
type LiveRecord = SoccerStore["liveGames"][number];

const requirePublishedSchedule = (store: SoccerStore, gameId: string) => {
  const schedule = store.schedules.find(
    (candidate) =>
      candidate.gameId === gameId && candidate.status === "published",
  );
  if (!schedule) throw new Error("Publish a schedule before using live mode.");
  return schedule;
};

const getOrCreateLiveState = (
  store: SoccerStore,
  gameId: string,
  stamp: string,
) => {
  const existing = store.liveGames.find((item) => item.gameId === gameId);
  if (existing) return existing;
  const created: LiveRecord = {
    schemaVersion: 1,
    gameId,
    revision: 0,
    status: "not_started",
    quarter: 1,
    accumulatedQuarterSeconds: 0,
    events: [],
    actualHistoryStatus: "incomplete",
    updatedAt: stamp,
  };
  store.liveGames.push(created);
  return created;
};

const appendEvent = (
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
  event: Pick<LiveEvent, "type" | "payload">,
) => {
  const created = liveEventSchema.parse({
    id: randomUUID(),
    serverTimestamp: stamp,
    quarter: live.quarter,
    elapsedGameClockSeconds: elapsedLiveSecondsAt(live, stamp),
    actor,
    ...event,
  });
  live.events.push(created);
  return created;
};

const assertTrackingAvailable = (live: LiveRecord) => {
  if (live.actualHistoryStatus === "legacy_unavailable") {
    throw new Error(
      "Actual history is unavailable for this legacy live record.",
    );
  }
  if (live.status === "completed") {
    throw new Error("This game has already been completed and confirmed.");
  }
};

const assertGameStarted = (live: LiveRecord) => {
  assertTrackingAvailable(live);
  if (live.status === "not_started") {
    throw new Error("Start the game clock before recording game events.");
  }
};

const assertLiveRevision = (
  live: LiveRecord,
  payload: { expectedRevision: number },
) => {
  if (payload.expectedRevision !== live.revision) {
    throw new Error(
      "Version conflict: this live record changed on another device. Refresh and reapply the action.",
    );
  }
};

const availablePlayers = (store: SoccerStore, gameId: string) => {
  const availableIds = new Set(
    store.availability
      .filter(
        (item) => item.gameId === gameId && item.status === "available",
      )
      .map((item) => item.playerId),
  );
  return store.players.filter(
    (player) => player.active && availableIds.has(player.id),
  );
};

const requireAvailablePlayer = (
  store: SoccerStore,
  gameId: string,
  playerId: string,
) => {
  const player = requirePlayer(store, playerId);
  if (!availablePlayers(store, gameId).some((item) => item.id === player.id)) {
    throw new Error("That player is unavailable for this game.");
  }
  return player;
};

const currentLineup = (
  store: SoccerStore,
  live: LiveRecord,
  stamp: string,
) =>
  reconstructLiveLineup(
    requirePublishedSchedule(store, live.gameId),
    live,
    stamp,
  );

const requirePosition = (positionKey: PositionKey) => {
  const position = POSITIONS.find((candidate) => candidate.key === positionKey);
  if (!position) throw new Error("Unknown position.");
  return position;
};

const startOrResume = (
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
) => {
  assertTrackingAvailable(live);
  if (live.status === "running") throw new Error("The clock is already running.");
  const type = live.status === "paused" ? "game_resumed" : "game_started";
  live.status = "running";
  live.runningSince = stamp;
  return appendEvent(live, actor, stamp, { type, payload: {} });
};

const pause = (live: LiveRecord, actor: LiveActor, stamp: string) => {
  assertTrackingAvailable(live);
  if (live.status !== "running") throw new Error("The clock is not running.");
  const event = appendEvent(live, actor, stamp, {
    type: "game_paused",
    payload: {},
  });
  live.accumulatedQuarterSeconds = event.elapsedGameClockSeconds;
  live.status = "paused";
  live.runningSince = undefined;
  return event;
};

const advanceQuarter = (
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
) => {
  assertGameStarted(live);
  if (live.quarter === 4) {
    throw new Error('Use "Complete and confirm" after the fourth quarter.');
  }
  const fromQuarter = live.quarter;
  const event = appendEvent(live, actor, stamp, {
    type: "quarter_advanced",
    payload: { fromQuarter, toQuarter: fromQuarter + 1 },
  });
  live.quarter += 1;
  live.status = "not_started";
  live.accumulatedQuarterSeconds = 0;
  live.runningSince = undefined;
  return event;
};

const substitute = (
  store: SoccerStore,
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
  payload: LiveSubstituteCommand,
) => {
  assertGameStarted(live);
  requirePosition(payload.positionKey);
  requireAvailablePlayer(store, live.gameId, payload.playerId);
  const lineup = currentLineup(store, live, stamp);
  const outgoingPlayerId = lineup[payload.positionKey];
  if (!outgoingPlayerId) throw new Error("That field position is empty.");
  if (Object.values(lineup).includes(payload.playerId)) {
    throw new Error("Choose a player currently on the bench.");
  }
  return appendEvent(live, actor, stamp, {
    type: "bench_replaced_field_player",
    payload: {
      positionKey: payload.positionKey,
      outgoingPlayerId,
      incomingPlayerId: payload.playerId,
    },
  });
};

const swapPositions = (
  store: SoccerStore,
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
  payload: LiveSwapCommand,
) => {
  assertGameStarted(live);
  if (payload.firstPositionKey === payload.secondPositionKey) {
    throw new Error("Choose two different field positions.");
  }
  requirePosition(payload.firstPositionKey);
  requirePosition(payload.secondPositionKey);
  const lineup = currentLineup(store, live, stamp);
  const firstPlayerId = lineup[payload.firstPositionKey];
  const secondPlayerId = lineup[payload.secondPositionKey];
  if (!firstPlayerId || !secondPlayerId) {
    throw new Error("Both field positions must have assigned players.");
  }
  return appendEvent(live, actor, stamp, {
    type: "field_players_swapped",
    payload: {
      firstPositionKey: payload.firstPositionKey,
      secondPositionKey: payload.secondPositionKey,
      firstPlayerId,
      secondPlayerId,
    },
  });
};

const recordGoal = (
  store: SoccerStore,
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
  payload: LiveGoalCommand,
) => {
  assertGameStarted(live);
  requireAvailablePlayer(store, live.gameId, payload.playerId);
  return appendEvent(live, actor, stamp, {
    type: "own_team_goal_scored",
    payload: {
      playerId: payload.playerId,
      submissionId: payload.submissionId,
    },
  });
};

const resetLineup = (
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
) => {
  assertGameStarted(live);
  return appendEvent(live, actor, stamp, {
    type: "lineup_reset_to_published_plan",
    payload: {},
  });
};

const voidEvent = (
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
  payload: LiveVoidCommand,
) => {
  assertGameStarted(live);
  const target = correctableLiveEvents(live.events).find(
    (event) => event.id === payload.targetEventId,
  );
  if (!target) throw new Error("That event cannot be voided.");
  return appendEvent(live, actor, stamp, {
    type: "event_voided",
    payload: {
      targetEventId: target.id,
      reason: payload.reason,
    },
  });
};

const completeAndConfirm = (
  store: SoccerStore,
  live: LiveRecord,
  actor: LiveActor,
  stamp: string,
) => {
  assertGameStarted(live);
  const completion = appendEvent(live, actor, stamp, {
    type: "game_completed",
    payload: {},
  });
  live.accumulatedQuarterSeconds = completion.elapsedGameClockSeconds;
  live.status = "completed";
  live.runningSince = undefined;
  const confirmation = appendEvent(live, actor, stamp, {
    type: "actual_record_confirmed",
    payload: {},
  });
  live.actualHistoryStatus = "confirmed";
  requireGame(store, live.gameId).status = "completed";
  requireGame(store, live.gameId).updatedAt = stamp;
  return confirmation;
};

export const applyLiveAction = (
  store: SoccerStore,
  action: string,
  rawPayload: ActionPayload,
  stamp: string,
  rawActor: LiveActor,
) => {
  const schema = liveCommandSchemas[action as keyof typeof liveCommandSchemas];
  if (!schema) throw new Error(`Unknown soccer action: ${action}`);
  const payload = schema.parse(rawPayload);
  const actor = liveActorSchema.parse(rawActor);
  requireGame(store, payload.gameId);
  requirePublishedSchedule(store, payload.gameId);
  const live = getOrCreateLiveState(store, payload.gameId, stamp);

  if (action === "liveRecordGoal") {
    const goalPayload = liveGoalCommandSchema.parse(payload);
    const duplicate = live.events.find(
      (event) =>
        event.type === "own_team_goal_scored" &&
        event.payload.submissionId === goalPayload.submissionId,
    );
    if (duplicate) return duplicate;
  }

  assertLiveRevision(live, payload);
  let result: LiveEvent;
  if (action === "liveStart") result = startOrResume(live, actor, stamp);
  else if (action === "livePause") result = pause(live, actor, stamp);
  else if (action === "liveAdvanceQuarter") {
    result = advanceQuarter(live, actor, stamp);
  } else if (action === "liveSubstitute") {
    result = substitute(
      store,
      live,
      actor,
      stamp,
      liveSubstituteCommandSchema.parse(payload),
    );
  } else if (action === "liveSwapPositions") {
    result = swapPositions(
      store,
      live,
      actor,
      stamp,
      liveSwapCommandSchema.parse(payload),
    );
  } else if (action === "liveRecordGoal") {
    result = recordGoal(
      store,
      live,
      actor,
      stamp,
      liveGoalCommandSchema.parse(payload),
    );
  } else if (action === "liveResetLineup") {
    result = resetLineup(live, actor, stamp);
  } else if (action === "liveVoidEvent") {
    result = voidEvent(
      live,
      actor,
      stamp,
      liveVoidCommandSchema.parse(payload),
    );
  } else {
    result = completeAndConfirm(store, live, actor, stamp);
  }

  live.revision += 1;
  live.updatedAt = stamp;
  return result;
};
