import type { PositionKey } from "./fixed-game";
import type { LiveEvent, LiveState } from "./live-event-schemas";
import type { Schedule } from "./schemas";

export type LiveLineup = Partial<Record<PositionKey, string>>;

export const elapsedLiveSecondsAt = (
  live: Pick<LiveState, "accumulatedQuarterSeconds" | "runningSince" | "status">,
  timestamp: string,
) => {
  if (live.status !== "running" || !live.runningSince) {
    return live.accumulatedQuarterSeconds;
  }
  const runningSeconds = Math.max(
    0,
    Math.floor((new Date(timestamp).getTime() - new Date(live.runningSince).getTime()) / 1000),
  );
  return Math.min(840, live.accumulatedQuarterSeconds + runningSeconds);
};

export const segmentKeyForLiveState = (quarter: number, elapsedQuarterSeconds: number) =>
  `q${quarter}${elapsedQuarterSeconds < 420 ? "a" : "b"}` as const;

export const voidedLiveEventIds = (events: LiveEvent[]) =>
  new Set(
    events
      .filter((event) => event.type === "event_voided")
      .map((event) => event.payload.targetEventId),
  );

export const activeLiveEvents = (events: LiveEvent[]) => {
  const voidedIds = voidedLiveEventIds(events);
  return events.filter((event) => event.type === "event_voided" || !voidedIds.has(event.id));
};

const plannedLineup = (schedule: Schedule, segmentKey: ReturnType<typeof segmentKeyForLiveState>) =>
  Object.fromEntries(
    schedule.assignments
      .filter((assignment) => assignment.segmentKey === segmentKey)
      .map((assignment) => [assignment.positionKey, assignment.playerId]),
  ) as LiveLineup;

const replaceFieldPlayer = (
  lineup: LiveLineup,
  payload: Extract<LiveEvent, { type: "bench_replaced_field_player" }>["payload"],
) => {
  const incomingPosition = Object.entries(lineup).find(
    ([, playerId]) => playerId === payload.incomingPlayerId,
  )?.[0] as PositionKey | undefined;
  lineup[payload.positionKey] = payload.incomingPlayerId;
  if (incomingPosition && incomingPosition !== payload.positionKey) {
    lineup[incomingPosition] = payload.outgoingPlayerId;
  }
};

export const reconstructLiveLineup = (
  schedule: Schedule,
  live: Pick<
    LiveState,
    "quarter" | "accumulatedQuarterSeconds" | "runningSince" | "status" | "events"
  >,
  _timestamp = new Date().toISOString(),
) => {
  const quarterEvents = activeLiveEvents(live.events).filter(
    (event) => event.quarter === live.quarter,
  );
  const segmentAdvanceIndex = quarterEvents.findLastIndex(
    (event) => event.type === "segment_advanced",
  );
  const segmentKey = segmentKeyForLiveState(live.quarter, segmentAdvanceIndex >= 0 ? 420 : 0);
  let lineup = plannedLineup(schedule, segmentKey);
  const events = quarterEvents.slice(segmentAdvanceIndex + 1);

  for (const event of events) {
    if (event.type === "quarter_advanced") {
      lineup = plannedLineup(schedule, segmentKey);
    }
    if (event.type === "lineup_reset_to_published_plan") {
      lineup = plannedLineup(schedule, segmentKey);
    }
    if (event.type === "bench_replaced_field_player") {
      replaceFieldPlayer(lineup, event.payload);
    }
    if (event.type === "field_players_swapped") {
      const firstPlayer = lineup[event.payload.firstPositionKey];
      const secondPlayer = lineup[event.payload.secondPositionKey];
      lineup[event.payload.firstPositionKey] = secondPlayer;
      lineup[event.payload.secondPositionKey] = firstPlayer;
    }
  }
  return lineup;
};

export const isCorrectableLiveEvent = (
  event: LiveEvent,
): event is Extract<
  LiveEvent,
  {
    type: "bench_replaced_field_player" | "field_players_swapped" | "own_team_goal_scored";
  }
> =>
  event.type === "bench_replaced_field_player" ||
  event.type === "field_players_swapped" ||
  event.type === "own_team_goal_scored";

export const correctableLiveEvents = (events: LiveEvent[]) => {
  const voidedIds = voidedLiveEventIds(events);
  return events.filter((event) => isCorrectableLiveEvent(event) && !voidedIds.has(event.id));
};
