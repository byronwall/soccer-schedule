import { resolvePositions, SEGMENT_SECONDS, type PositionKey, type PositionLabels } from "./fixed-game";
import type { Availability, Game, Player, Schedule } from "./schemas";

type ProfileSnapshot = {
  players: Player[];
  games: Game[];
  availability: Availability[];
  schedules: Schedule[];
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
};

const summarizePositions = (assignments: Pick<Schedule["assignments"][number], "positionKey">[], positionLabels: PositionLabels): PlayerPositionSummary[] =>
  resolvePositions(positionLabels).map((position) => {
    const segments = assignments.filter((item) => item.positionKey === position.key).length;
    return {
      key: position.key,
      label: position.label,
      short: position.short,
      segments,
      minutes: segments * SEGMENT_SECONDS / 60,
    };
  }).filter((position) => position.segments > 0)
    .sort((left, right) => right.segments - left.segments || left.label.localeCompare(right.label));

const latestSchedule = (schedules: Schedule[], gameId: string, completed: boolean) => {
  const candidates = schedules.filter((schedule) =>
    schedule.gameId === gameId && schedule.status !== "superseded" && (!completed || schedule.status === "published"),
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
  return {
    game,
    availability: snapshot.availability.find((item) => item.gameId === game.id && item.playerId === playerId)?.status ?? "unknown",
    scheduleStatus: schedule?.status,
    assignmentCount: assignments.length,
    minutes: assignments.length * SEGMENT_SECONDS / 60,
    positions: summarizePositions(assignments, snapshot.positionLabels),
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

  return {
    player,
    completedGames,
    upcomingGames,
    positionTotals,
    appearances: completedGames.filter((game) => game.assignmentCount > 0).length,
    completedMinutes: completedGames.reduce((total, game) => total + game.minutes, 0),
    upcomingMinutes: upcomingGames.reduce((total, game) => total + game.minutes, 0),
  };
};
