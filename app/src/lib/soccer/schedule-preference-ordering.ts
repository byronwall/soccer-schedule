import {
  favorsExtraTime,
  positionDisposition,
  type PlayerPreferenceLookup,
} from "./player-preferences";
import type { Player } from "./schemas";

export const choosePreferredGoalkeeper = (options: {
  candidates: Player[];
  goalkeeperCounts: Map<string, number>;
  fieldCounts: Map<string, number>;
  preferences: PlayerPreferenceLookup;
  fallback: (left: Player, right: Player) => number;
}) => [...options.candidates].sort((left, right) =>
  (options.fieldCounts.get(left.id) ?? 0) -
    (options.fieldCounts.get(right.id) ?? 0) ||
  Number(
    positionDisposition(options.preferences, left.id, "goalkeeper") ===
      "avoid",
  ) -
    Number(
      positionDisposition(options.preferences, right.id, "goalkeeper") ===
        "avoid",
    ) ||
  Number(favorsExtraTime(options.preferences, right.id)) -
    Number(favorsExtraTime(options.preferences, left.id)) ||
  Number(
    positionDisposition(options.preferences, right.id, "goalkeeper") ===
      "prefer",
  ) -
    Number(
      positionDisposition(options.preferences, left.id, "goalkeeper") ===
        "prefer",
    ) ||
  (options.goalkeeperCounts.get(left.id) ?? 0) -
    (options.goalkeeperCounts.get(right.id) ?? 0) ||
  options.fallback(left, right),
)[0];

export const favoredPlayersRemainingOnField = (options: {
  players: Player[];
  substitutes: Player[];
  outgoingPlayerIds: Set<string | undefined>;
  previousFieldHasPlayer: (playerId: string) => boolean;
  preferences: PlayerPreferenceLookup;
}) => options.players.filter(
  (player) =>
    favorsExtraTime(options.preferences, player.id) &&
    (
      options.substitutes.some((substitute) => substitute.id === player.id) ||
      (
        options.previousFieldHasPlayer(player.id) &&
        !options.outgoingPlayerIds.has(player.id)
      )
    ),
).length;
