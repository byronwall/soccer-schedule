import {
  POSITIONS,
  SEGMENT_SECONDS,
  type PositionGroup,
} from "./fixed-game";
import { deriveActualGameSummary } from "./post-game-history";
import type {
  Assignment,
  Game,
  LiveState,
  Player,
  Schedule,
} from "./schemas";

export const SEASON_ROLE_GROUPS = [
  "goalkeeper",
  "defense",
  "midfield",
  "forward",
] as const;

export type SeasonRoleTotals = Record<PositionGroup, number>;

export type SeasonImpactRow = {
  playerId: string;
  beforeSeconds: SeasonRoleTotals;
  draftSeconds: SeasonRoleTotals;
  afterSeconds: SeasonRoleTotals;
};

export type SeasonImpact = {
  rows: SeasonImpactRow[];
  actualGameCount: number;
  plannedGameCount: number;
  draftSeconds: number;
};

const emptyTotals = (): SeasonRoleTotals => ({
  goalkeeper: 0,
  defense: 0,
  midfield: 0,
  forward: 0,
});

const positionGroup = (positionKey: Assignment["positionKey"]) =>
  POSITIONS.find((position) => position.key === positionKey)?.group;

const addAssignments = (
  totals: Map<string, SeasonRoleTotals>,
  assignments: Assignment[],
) => {
  for (const assignment of assignments) {
    const group = positionGroup(assignment.positionKey);
    if (!group) continue;
    const player = totals.get(assignment.playerId);
    if (player) player[group] += SEGMENT_SECONDS;
  }
};

const latestPublishedSchedule = (
  schedules: Schedule[],
  gameId: string,
) => schedules
  .filter((schedule) =>
    schedule.gameId === gameId &&
    !!schedule.publishedAt &&
    (schedule.status === "published" || schedule.status === "superseded"))
  .sort((left, right) =>
    (right.publishedAt ?? right.updatedAt).localeCompare(
      left.publishedAt ?? left.updatedAt,
    ))[0];

export const buildSeasonImpact = (options: {
  currentGame: Game;
  currentAssignments: Assignment[];
  games: Game[];
  schedules: Schedule[];
  liveGames: LiveState[];
  players: Player[];
}): SeasonImpact => {
  const before = new Map(
    options.players.map((player) => [player.id, emptyTotals()]),
  );
  let actualGameCount = 0;
  let plannedGameCount = 0;
  const earlierGames = options.games
    .filter((game) =>
      game.id !== options.currentGame.id &&
      game.startsAt < options.currentGame.startsAt)
    .sort((left, right) =>
      left.startsAt.localeCompare(right.startsAt) ||
      left.id.localeCompare(right.id));

  for (const game of earlierGames) {
    const published = latestPublishedSchedule(options.schedules, game.id);
    if (!published) continue;
    const actual = deriveActualGameSummary({
      schedule: published,
      live: options.liveGames.find((live) => live.gameId === game.id),
      availablePlayerIds: options.players.map((player) => player.id),
    });
    if (actual.status === "confirmed") {
      actualGameCount += 1;
      for (const player of actual.players) {
        const totals = before.get(player.playerId);
        if (!totals) continue;
        for (const position of POSITIONS) {
          totals[position.group] += player.positionSeconds[position.key] ?? 0;
        }
      }
    } else {
      plannedGameCount += 1;
      addAssignments(before, published.assignments);
    }
  }

  const draft = new Map(
    options.players.map((player) => [player.id, emptyTotals()]),
  );
  addAssignments(draft, options.currentAssignments);
  return {
    rows: options.players.map((player) => {
      const beforeSeconds = before.get(player.id) ?? emptyTotals();
      const draftSeconds = draft.get(player.id) ?? emptyTotals();
      return {
        playerId: player.id,
        beforeSeconds,
        draftSeconds,
        afterSeconds: Object.fromEntries(
          SEASON_ROLE_GROUPS.map((group) => [
            group,
            beforeSeconds[group] + draftSeconds[group],
          ]),
        ) as SeasonRoleTotals,
      };
    }),
    actualGameCount,
    plannedGameCount,
    draftSeconds: options.currentAssignments.length * SEGMENT_SECONDS,
  };
};

export const totalRoleSeconds = (totals: SeasonRoleTotals) =>
  SEASON_ROLE_GROUPS.reduce((sum, group) => sum + totals[group], 0);

export const rolePercentage = (
  seconds: number,
  totalSeconds: number,
) => totalSeconds === 0 ? 0 : Math.round(seconds / totalSeconds * 100);

export const formatPlanningMinutes = (seconds: number) => {
  const minutes = seconds / 60;
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
};
