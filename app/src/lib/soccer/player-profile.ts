import {
  resolvePositions,
  SEGMENT_SECONDS,
  type PositionKey,
  type PositionLabels,
} from "./fixed-game";
import {
  deriveActualGameSummary,
  type ActualGoal,
  type ActualPlayerGameSummary,
} from "./post-game-history";
import type { Availability, Game, LiveState, Player, Schedule } from "./schemas";

type ProfileSnapshot = {
  players: Player[];
  games: Game[];
  availability: Availability[];
  schedules: Schedule[];
  liveGames: LiveState[];
  positionLabels: PositionLabels;
};

export type PlayerPositionSummary = {
  key: PositionKey;
  label: string;
  short: string;
  segments: number;
  minutes: number;
};

export type PlayerGameSummary = {
  game: Game;
  availability: Availability["status"];
  scheduleStatus?: Schedule["status"];
  assignmentCount: number;
  minutes: number;
  positions: PlayerPositionSummary[];
  actualStatus: "confirmed" | "incomplete" | "unavailable";
  actualReason?: "not-confirmed" | "not-recorded" | "legacy" | "invalid-confirmation";
  actual?: ActualPlayerGameSummary;
};

export type SeasonCoverage = {
  attack: boolean;
  defense: boolean;
  goalkeeper: boolean;
  source: "confirmed actual" | "mixed actual and planned" | "planned only";
  scoredThisSeason: boolean;
  confirmedGoalCount: number;
  gamesWithoutTrustedActual: number;
};

const summarizePositions = (
  assignments: Pick<Schedule["assignments"][number], "positionKey">[],
  positionLabels: PositionLabels,
): PlayerPositionSummary[] =>
  resolvePositions(positionLabels)
    .map((position) => {
      const segments = assignments.filter((item) => item.positionKey === position.key).length;
      return {
        key: position.key,
        label: position.label,
        short: position.short,
        segments,
        minutes: (segments * SEGMENT_SECONDS) / 60,
      };
    })
    .filter((position) => position.segments > 0)
    .sort((left, right) => right.segments - left.segments || left.label.localeCompare(right.label));

const latestSchedule = (schedules: Schedule[], gameId: string, completed: boolean) => {
  const candidates = schedules.filter(
    (schedule) =>
      schedule.gameId === gameId &&
      schedule.status !== "superseded" &&
      (!completed || schedule.status === "published"),
  );
  return [...candidates].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
};

const summarizeGame = (
  snapshot: ProfileSnapshot,
  playerId: string,
  game: Game,
): PlayerGameSummary => {
  const schedule = latestSchedule(snapshot.schedules, game.id, game.status === "completed");
  const assignments = schedule?.assignments.filter((item) => item.playerId === playerId) ?? [];
  const availablePlayerIds = snapshot.availability
    .filter((item) => item.gameId === game.id && item.status === "available")
    .map((item) => item.playerId);
  const actualSummary = deriveActualGameSummary({
    schedule,
    live: snapshot.liveGames.find((item) => item.gameId === game.id),
    availablePlayerIds,
  });
  const actual =
    actualSummary.status === "confirmed"
      ? actualSummary.players.find((item) => item.playerId === playerId)
      : undefined;
  return {
    game,
    availability:
      snapshot.availability.find((item) => item.gameId === game.id && item.playerId === playerId)
        ?.status ?? "unknown",
    scheduleStatus: schedule?.status,
    assignmentCount: assignments.length,
    minutes: (assignments.length * SEGMENT_SECONDS) / 60,
    positions: summarizePositions(assignments, snapshot.positionLabels),
    actualStatus: actualSummary.status,
    actualReason: actualSummary.status === "confirmed" ? undefined : actualSummary.reason,
    actual,
  };
};

const coveragePositions = (game: PlayerGameSummary) =>
  game.actualStatus === "confirmed"
    ? (Object.keys(game.actual?.positionSeconds ?? {}) as PositionKey[])
    : game.positions.map((position) => position.key);

const seasonCoverage = (games: PlayerGameSummary[]): SeasonCoverage => {
  const positions = new Set(games.flatMap(coveragePositions));
  const confirmedGames = games.filter((game) => game.actualStatus === "confirmed");
  const gamesWithoutTrustedActual = games.length - confirmedGames.length;
  const goals = confirmedGames.flatMap((game) => game.actual?.goals ?? []) as ActualGoal[];
  return {
    attack: [...positions].some(
      (position) =>
        position === "leftMidfield" ||
        position === "rightMidfield" ||
        position === "leftForward" ||
        position === "rightForward",
    ),
    defense: [...positions].some(
      (position) =>
        position === "goalkeeper" || position === "leftDefense" || position === "rightDefense",
    ),
    goalkeeper: positions.has("goalkeeper"),
    source:
      games.length === 0
        ? "planned only"
        : gamesWithoutTrustedActual === 0
          ? "confirmed actual"
          : confirmedGames.length > 0
            ? "mixed actual and planned"
            : "planned only",
    scoredThisSeason: goals.length > 0,
    confirmedGoalCount: goals.length,
    gamesWithoutTrustedActual,
  };
};

export const buildPlayerProfile = (snapshot: ProfileSnapshot, playerId: string) => {
  const player = snapshot.players.find((item) => item.id === playerId);
  if (!player) return undefined;

  const completedGames = snapshot.games
    .filter((game) => game.status === "completed")
    .map((game) => summarizeGame(snapshot, playerId, game))
    .sort((left, right) => right.game.startsAt.localeCompare(left.game.startsAt));
  const upcomingGames = snapshot.games
    .filter((game) => game.status === "scheduled")
    .map((game) => summarizeGame(snapshot, playerId, game))
    .sort((left, right) => left.game.startsAt.localeCompare(right.game.startsAt));
  const positionTotals = summarizePositions(
    completedGames.flatMap((game) =>
      game.positions.flatMap((position) =>
        Array.from({ length: position.segments }, () => ({ positionKey: position.key })),
      ),
    ),
    snapshot.positionLabels,
  );
  const totalByPosition = new Map(positionTotals.map((position) => [position.key, position]));
  const positionVariety = resolvePositions(snapshot.positionLabels).map((position) => ({
    ...position,
    segments: totalByPosition.get(position.key)?.segments ?? 0,
    minutes: totalByPosition.get(position.key)?.minutes ?? 0,
  }));

  return {
    player,
    completedGames,
    upcomingGames,
    positionTotals,
    positionVariety,
    appearances: completedGames.filter((game) => game.assignmentCount > 0).length,
    completedMinutes: completedGames.reduce((total, game) => total + game.minutes, 0),
    confirmedActualFieldSeconds: completedGames.reduce(
      (total, game) => total + (game.actual?.fieldSeconds ?? 0),
      0,
    ),
    confirmedActualAppearances: completedGames.filter(
      (game) => (game.actual?.fieldSeconds ?? 0) > 0,
    ).length,
    seasonCoverage: seasonCoverage(completedGames),
    upcomingMinutes: upcomingGames.reduce((total, game) => total + game.minutes, 0),
  };
};
