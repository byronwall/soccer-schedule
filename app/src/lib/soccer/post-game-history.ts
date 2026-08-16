import { POSITIONS, type PositionKey, type SegmentKey } from "./fixed-game";
import { activeLiveEvents, type LiveLineup } from "./live-game";
import type { LiveEvent, LiveState } from "./live-event-schemas";
import type { Schedule } from "./schemas";

export type ActualPositionInterval = {
  playerId: string;
  positionKey?: PositionKey;
  quarter: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
};

export type ActualGoal = {
  eventId: string;
  playerId: string;
  quarter: number;
  elapsedGameClockSeconds: number;
  serverTimestamp: string;
};

export type ActualPlayerGameSummary = {
  playerId: string;
  fieldSeconds: number;
  benchSeconds: number;
  positionSeconds: Partial<Record<PositionKey, number>>;
  intervals: ActualPositionInterval[];
  goals: ActualGoal[];
};

export type ConfirmedActualGameSummary = {
  status: "confirmed";
  totalGameSeconds: number;
  intervals: ActualPositionInterval[];
  goals: ActualGoal[];
  players: ActualPlayerGameSummary[];
};

export type ActualGameSummary =
  | ConfirmedActualGameSummary
  | {
      status: "incomplete" | "unavailable";
      reason: "not-confirmed" | "not-recorded" | "legacy" | "invalid-confirmation";
    };

type IndexedEvent = { event: LiveEvent };

const segmentKey = (quarter: number, seconds: number) =>
  `q${quarter}${seconds < 420 ? "a" : "b"}` as SegmentKey;

const publishedLineup = (schedule: Schedule, quarter: number, seconds: number) =>
  Object.fromEntries(
    schedule.assignments
      .filter((assignment) => assignment.segmentKey === segmentKey(quarter, seconds))
      .map((assignment) => [assignment.positionKey, assignment.playerId]),
  ) as LiveLineup;

const mutationEventsThrough = (events: IndexedEvent[], quarter: number, seconds: number) =>
  events.filter(
    ({ event }) =>
      event.quarter === quarter &&
      event.elapsedGameClockSeconds <= seconds &&
      (event.type === "bench_replaced_field_player" ||
        event.type === "field_players_swapped" ||
        event.type === "lineup_reset_to_published_plan"),
  );

const lineupAt = (schedule: Schedule, events: IndexedEvent[], quarter: number, seconds: number) => {
  let lineup = publishedLineup(schedule, quarter, seconds);
  for (const { event } of mutationEventsThrough(events, quarter, seconds)) {
    if (event.type === "lineup_reset_to_published_plan") {
      lineup = publishedLineup(schedule, quarter, seconds);
    } else if (event.type === "bench_replaced_field_player") {
      const incomingPosition = POSITIONS.find(
        (position) => lineup[position.key] === event.payload.incomingPlayerId,
      )?.key;
      lineup[event.payload.positionKey] = event.payload.incomingPlayerId;
      if (incomingPosition && incomingPosition !== event.payload.positionKey) {
        lineup[incomingPosition] = event.payload.outgoingPlayerId;
      }
    } else if (event.type === "field_players_swapped") {
      const first = lineup[event.payload.firstPositionKey];
      const second = lineup[event.payload.secondPositionKey];
      lineup[event.payload.firstPositionKey] = second;
      lineup[event.payload.secondPositionKey] = first;
    }
  }
  return lineup;
};

const confirmedBoundary = (events: LiveEvent[]) => {
  const completionIndex = events.findIndex((event) => event.type === "game_completed");
  const confirmationIndex = events.findIndex(
    (event, index) => index > completionIndex && event.type === "actual_record_confirmed",
  );
  if (completionIndex < 0 || confirmationIndex < 0) return undefined;
  return { completionIndex, confirmationIndex, completion: events[completionIndex] };
};

const quarterEnds = (events: LiveEvent[], completion: LiveEvent) => {
  const ends = new Map<number, number>();
  for (const event of events) {
    if (event.type === "quarter_advanced") {
      ends.set(event.payload.fromQuarter, event.elapsedGameClockSeconds);
    }
  }
  ends.set(completion.quarter, completion.elapsedGameClockSeconds);
  return [...ends.entries()]
    .filter(([quarter]) => quarter <= completion.quarter)
    .sort(([left], [right]) => left - right);
};

const appendInterval = (intervals: ActualPositionInterval[], interval: ActualPositionInterval) => {
  if (interval.durationSeconds <= 0) return;
  const previous = intervals.at(-1);
  if (
    previous &&
    previous.playerId === interval.playerId &&
    previous.positionKey === interval.positionKey &&
    previous.quarter === interval.quarter &&
    previous.endSeconds === interval.startSeconds
  ) {
    previous.endSeconds = interval.endSeconds;
    previous.durationSeconds += interval.durationSeconds;
    return;
  }
  intervals.push(interval);
};

const deriveIntervals = (
  schedule: Schedule,
  events: IndexedEvent[],
  availablePlayerIds: string[],
  ends: [number, number][],
) => {
  const intervals: ActualPositionInterval[] = [];
  for (const [quarter, endSeconds] of ends) {
    const mutationTimes = events
      .filter(
        ({ event }) =>
          event.quarter === quarter &&
          event.elapsedGameClockSeconds > 0 &&
          event.elapsedGameClockSeconds < endSeconds &&
          (event.type === "bench_replaced_field_player" ||
            event.type === "field_players_swapped" ||
            event.type === "lineup_reset_to_published_plan"),
      )
      .map(({ event }) => event.elapsedGameClockSeconds);
    const points = [
      ...new Set([0, ...(endSeconds > 420 ? [420] : []), ...mutationTimes, endSeconds]),
    ].sort((left, right) => left - right);

    for (let index = 0; index < points.length - 1; index += 1) {
      const startSeconds = points[index];
      const end = points[index + 1];
      const durationSeconds = end - startSeconds;
      const lineup = lineupAt(schedule, events, quarter, startSeconds);
      const fieldIds = new Set(Object.values(lineup).filter(Boolean));
      for (const position of POSITIONS) {
        const playerId = lineup[position.key];
        if (!playerId) continue;
        appendInterval(intervals, {
          playerId,
          positionKey: position.key,
          quarter,
          startSeconds,
          endSeconds: end,
          durationSeconds,
        });
      }
      for (const playerId of availablePlayerIds) {
        if (fieldIds.has(playerId)) continue;
        appendInterval(intervals, {
          playerId,
          quarter,
          startSeconds,
          endSeconds: end,
          durationSeconds,
        });
      }
    }
  }
  return intervals;
};

const summarizePlayers = (
  playerIds: string[],
  intervals: ActualPositionInterval[],
  goals: ActualGoal[],
) =>
  playerIds.map((playerId) => {
    const playerIntervals = intervals.filter((interval) => interval.playerId === playerId);
    const positionSeconds: Partial<Record<PositionKey, number>> = {};
    for (const interval of playerIntervals) {
      if (!interval.positionKey) continue;
      positionSeconds[interval.positionKey] =
        (positionSeconds[interval.positionKey] ?? 0) + interval.durationSeconds;
    }
    return {
      playerId,
      fieldSeconds: playerIntervals
        .filter((interval) => interval.positionKey)
        .reduce((total, interval) => total + interval.durationSeconds, 0),
      benchSeconds: playerIntervals
        .filter((interval) => !interval.positionKey)
        .reduce((total, interval) => total + interval.durationSeconds, 0),
      positionSeconds,
      intervals: playerIntervals,
      goals: goals.filter((goal) => goal.playerId === playerId),
    };
  });

export const deriveActualGameSummary = (options: {
  schedule?: Schedule;
  live?: LiveState;
  availablePlayerIds: string[];
}): ActualGameSummary => {
  const { schedule, live, availablePlayerIds } = options;
  if (!live) return { status: "unavailable", reason: "not-recorded" };
  if (live.actualHistoryStatus === "legacy_unavailable") {
    return { status: "unavailable", reason: "legacy" };
  }
  if (live.actualHistoryStatus !== "confirmed") {
    return { status: "incomplete", reason: "not-confirmed" };
  }
  if (!schedule) {
    return { status: "unavailable", reason: "not-recorded" };
  }

  const active = activeLiveEvents(live.events);
  const boundary = confirmedBoundary(active);
  if (!boundary) {
    return { status: "unavailable", reason: "invalid-confirmation" };
  }
  const trustedEvents = active.slice(0, boundary.confirmationIndex + 1);
  const indexed = trustedEvents.map((event) => ({ event }));
  const seenGoalSubmissions = new Set<string>();
  const goals = trustedEvents.flatMap((event) => {
    if (
      event.type !== "own_team_goal_scored" ||
      seenGoalSubmissions.has(event.payload.submissionId)
    ) {
      return [];
    }
    seenGoalSubmissions.add(event.payload.submissionId);
    return [
      {
        eventId: event.id,
        playerId: event.payload.playerId,
        quarter: event.quarter,
        elapsedGameClockSeconds: event.elapsedGameClockSeconds,
        serverTimestamp: event.serverTimestamp,
      },
    ];
  });
  const ends = quarterEnds(trustedEvents, boundary.completion);
  const intervals = deriveIntervals(schedule, indexed, availablePlayerIds, ends);
  const playerIds = [
    ...new Set([
      ...availablePlayerIds,
      ...intervals.map((interval) => interval.playerId),
      ...goals.map((goal) => goal.playerId),
    ]),
  ];

  return {
    status: "confirmed",
    totalGameSeconds: ends.reduce((total, [, seconds]) => total + seconds, 0),
    intervals,
    goals,
    players: summarizePlayers(playerIds, intervals, goals),
  };
};

export const formatExactDuration = (seconds: number) => {
  const wholeMinutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0
    ? `${wholeMinutes} min`
    : `${wholeMinutes}:${String(remainder).padStart(2, "0")}`;
};

export const formatGameClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
