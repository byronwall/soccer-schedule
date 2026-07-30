import { POSITIONS, SEGMENTS } from "./fixed-game";
import type { PlayerPreferenceLookup } from "./player-preferences";
import {
  favoredPlayersRemainingOnField,
} from "./schedule-preference-ordering";
import {
  minimumIncomingPositionRepeatScore,
  type Lineup,
} from "./schedule-position-optimizer";
import type { Assignment, Player } from "./schemas";
import type { DefensiveContinuityPolicy } from "./schemas";
import { continuityPositionKeys } from "./schedule-experience-quality";

const combinations = <T>(values: T[], count: number): T[][] => {
  if (count === 0) return [[]];
  if (values.length < count) return [];
  return values.flatMap((value, index) =>
    combinations(values.slice(index + 1), count - 1).map(
      (rest) => [value, ...rest],
    ),
  );
};

const previousFieldHasPlayer = (lineup: Lineup, playerId: string) =>
  [...lineup.values()].some((player) => player.id === playerId);

export const chooseOptionalOutgoing = (options: {
  players: Player[];
  previous: Lineup;
  substitutes: Player[];
  fieldCounts: Map<string, number>;
  goalkeeperCounts: Map<string, number>;
  segmentIndex: number;
  count: number;
  quarterStart: boolean;
  assignments: Assignment[];
  incomingPlayers: Player[];
  rotationRank: (playerId: string) => number;
  preferences: PlayerPreferenceLookup;
  continuityPolicy: DefensiveContinuityPolicy;
  prioritizeContinuity: boolean;
}) => {
  const candidates = POSITIONS.filter(
    (position) => position.key !== "goalkeeper",
  );
  return (combinations(candidates, options.count).sort((left, right) => {
    if (!options.quarterStart && options.prioritizeContinuity) {
      const continuityKeys = new Set(
        continuityPositionKeys(options.continuityPolicy),
      );
      const continuityDifference =
        left.filter((position) => continuityKeys.has(position.key)).length -
        right.filter((position) => continuityKeys.has(position.key)).length;
      if (continuityDifference !== 0) return continuityDifference;
    }
    const projectedSpread = (positions: typeof left) => {
      const outgoingIds = new Set(
        positions.map(
          (position) => options.previous.get(position.key)?.id,
        ),
      );
      const nextCounts = options.players.map((player) =>
        (options.fieldCounts.get(player.id) ?? 0) +
        Number(
          options.substitutes.some(
            (substitute) => substitute.id === player.id,
          ) ||
          (
            previousFieldHasPlayer(options.previous, player.id) &&
            !outgoingIds.has(player.id) &&
            !(
              options.quarterStart &&
              options.previous.get("goalkeeper")?.id === player.id
            )
          ),
        ),
      );
      return Math.max(...nextCounts) - Math.min(...nextCounts);
    };
    const spreadDifference = projectedSpread(left) - projectedSpread(right);
    if (spreadDifference !== 0) return spreadDifference;
    const favoredFieldCount = (positions: typeof left) =>
      favoredPlayersRemainingOnField({
        players: options.players,
        substitutes: options.substitutes,
        outgoingPlayerIds: new Set(
          positions.map(
            (position) => options.previous.get(position.key)?.id,
          ),
        ),
        previousFieldHasPlayer: (playerId) =>
          previousFieldHasPlayer(options.previous, playerId),
        preferences: options.preferences,
      });
    const favoredDifference =
      favoredFieldCount(right) - favoredFieldCount(left);
    if (favoredDifference !== 0) return favoredDifference;
    const incomingRepeatScore = (positions: typeof left) =>
      minimumIncomingPositionRepeatScore({
        assignments: options.assignments,
        incomingPlayers: options.incomingPlayers,
        positionKeys: positions.map((position) => position.key),
        segmentKey: SEGMENTS[options.segmentIndex].key,
      });
    const repeatDifference =
      incomingRepeatScore(left) - incomingRepeatScore(right);
    if (repeatDifference !== 0) return repeatDifference;
    const midfieldDifference =
      right.filter((position) => position.group === "midfield").length -
      left.filter((position) => position.group === "midfield").length;
    if (midfieldDifference !== 0) return midfieldDifference;
    if (SEGMENTS[options.segmentIndex].half === "b") {
      const goalkeeperOpportunity = (positions: typeof left) =>
        positions.reduce(
          (total, position) =>
            total +
            (
              options.goalkeeperCounts.get(
                options.previous.get(position.key)?.id ?? "",
              ) ?? 0
            ),
          0,
        );
      const goalkeeperDifference =
        goalkeeperOpportunity(left) - goalkeeperOpportunity(right);
      if (goalkeeperDifference !== 0) return goalkeeperDifference;
    }
    const rotationScore = (positions: typeof left) =>
      positions.reduce(
        (total, position) =>
          total +
          options.rotationRank(
            options.previous.get(position.key)?.id ?? "",
          ),
        0,
      );
    return rotationScore(left) - rotationScore(right);
  })[0] ?? []);
};
