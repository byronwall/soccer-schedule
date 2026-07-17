import { POSITIONS, type PositionKey } from "./fixed-game";
import { elapsedQuarterSeconds } from "./scheduling";
import type { SoccerStore } from "./schemas";

type ActionPayload = Record<string, unknown>;
type LiveRecord = SoccerStore["liveGames"][number];

const getOrCreateLiveState = (store: SoccerStore, gameId: string, stamp: string) => {
  const existing = store.liveGames.find((item) => item.gameId === gameId);
  if (existing) return existing;
  const created: LiveRecord = {
    gameId,
    revision: 0,
    status: "not_started",
    quarter: 1,
    accumulatedQuarterSeconds: 0,
    overrides: [],
    updatedAt: stamp,
  };
  store.liveGames.push(created);
  return created;
};

const startLiveClock = (live: LiveRecord, stamp: string) => {
  if (live.status === "completed") throw new Error("Completed games cannot be restarted.");
  if (live.status === "running") throw new Error("The clock is already running.");
  live.status = "running";
  live.runningSince = stamp;
};

const pauseLiveClock = (live: LiveRecord) => {
  if (live.status !== "running") throw new Error("The clock is not running.");
  live.accumulatedQuarterSeconds = elapsedQuarterSeconds(
    live.runningSince,
    live.accumulatedQuarterSeconds,
  );
  live.status = "paused";
  live.runningSince = undefined;
};

const advanceLiveClock = (live: LiveRecord) => {
  if (live.quarter === 4) {
    live.status = "completed";
  } else {
    live.quarter += 1;
    live.status = "not_started";
  }
  live.accumulatedQuarterSeconds = 0;
  live.runningSince = undefined;
  live.overrides = [];
};

const applyLiveOverride = (
  store: SoccerStore,
  live: LiveRecord,
  gameId: string,
  payload: ActionPayload,
) => {
  const positionKey = String(payload.positionKey) as PositionKey;
  const replacementPlayerId = String(payload.playerId);
  if (!POSITIONS.some((item) => item.key === positionKey)) throw new Error("Unknown position.");
  const available = store.availability.some(
    (item) =>
      item.gameId === gameId &&
      item.playerId === replacementPlayerId &&
      item.status === "available",
  );
  if (!available) throw new Error("The replacement player is unavailable.");
  const published = store.schedules.find(
    (item) => item.gameId === gameId && item.status === "published",
  );
  if (!published) throw new Error("Publish a schedule before using live mode.");
  const half =
    elapsedQuarterSeconds(live.runningSince, live.accumulatedQuarterSeconds) < 420 ? "a" : "b";
  const segmentKey = `q${live.quarter}${half}`;
  const occupied = published.assignments
    .filter((item) => item.segmentKey === segmentKey && item.positionKey !== positionKey)
    .map(
      (item) =>
        live.overrides.find((override) => override.positionKey === item.positionKey)
          ?.replacementPlayerId ?? item.playerId,
    );
  if (occupied.includes(replacementPlayerId)) {
    throw new Error("That player is already on the field.");
  }
  live.overrides = [
    ...live.overrides.filter((item) => item.positionKey !== positionKey),
    { positionKey, replacementPlayerId },
  ];
};

const liveHandlers: Record<
  string,
  (store: SoccerStore, live: LiveRecord, gameId: string, payload: ActionPayload, stamp: string) => void
> = {
  liveStart: (_store, live, _gameId, _payload, stamp) => startLiveClock(live, stamp),
  livePause: (_store, live) => pauseLiveClock(live),
  liveAdvance: (_store, live) => advanceLiveClock(live),
  liveOverride: (store, live, gameId, payload) =>
    applyLiveOverride(store, live, gameId, payload),
  liveReset: (_store, live) => {
    live.overrides = [];
  },
};

export const applyLiveAction = (
  store: SoccerStore,
  action: string,
  payload: ActionPayload,
  stamp: string,
) => {
  const handler = liveHandlers[action];
  if (!handler) throw new Error(`Unknown soccer action: ${action}`);
  const gameId = String(payload.gameId);
  const live = getOrCreateLiveState(store, gameId, stamp);
  handler(store, live, gameId, payload, stamp);
  live.revision += 1;
  live.updatedAt = stamp;
};
