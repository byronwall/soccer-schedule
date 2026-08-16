import { POSITIONS, type PositionKey, type SegmentKey } from "./fixed-game";
import { crossQuarterPositionRepeatScore } from "./schedule-position-repeats";
import { playerPreferenceLookup, positionDisposition } from "./player-preferences";
import type { Assignment, Player, PlayerPreference } from "./schemas";

export type Lineup = Map<PositionKey, Player>;

const permutations = <T>(values: T[]): T[][] => {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [
      value,
      ...rest,
    ]),
  );
};

const assignmentsForLineup = (lineup: Lineup, segmentKey: SegmentKey): Assignment[] =>
  POSITIONS.map((position) => ({
    segmentKey,
    positionKey: position.key,
    playerId: lineup.get(position.key)?.id ?? "",
    source: "generated",
    locked: false,
  }));

export const chooseLowestRepeatLineup = (options: {
  lineup: Lineup;
  positionKeys: PositionKey[];
  assignments: Assignment[];
  segmentKey: SegmentKey;
  preferences?: PlayerPreference[];
}) => {
  const { lineup, positionKeys, assignments, segmentKey } = options;
  const players = positionKeys.map((positionKey) => lineup.get(positionKey));
  if (players.some((player) => !player)) throw new Error("Could not fill every position.");

  const preferences = playerPreferenceLookup(options.preferences ?? []);
  const preferenceRank = (lineup: Lineup, disposition: "avoid" | "prefer") =>
    options.positionKeys.reduce(
      (total, positionKey) =>
        total +
        Number(
          positionDisposition(preferences, lineup.get(positionKey)?.id ?? "", positionKey) ===
            disposition,
        ),
      0,
    );
  return permutations(players as Player[])
    .map((permutation) => {
      const candidate = new Map(lineup);
      positionKeys.forEach((positionKey, index) => candidate.set(positionKey, permutation[index]));
      return candidate;
    })
    .sort(
      (left, right) =>
        preferenceRank(left, "avoid") - preferenceRank(right, "avoid") ||
        preferenceRank(right, "prefer") - preferenceRank(left, "prefer") ||
        crossQuarterPositionRepeatScore([
          ...assignments,
          ...assignmentsForLineup(left, segmentKey),
        ]) -
          crossQuarterPositionRepeatScore([
            ...assignments,
            ...assignmentsForLineup(right, segmentKey),
          ]),
    )[0];
};

export const minimumIncomingPositionRepeatScore = (options: {
  assignments: Assignment[];
  incomingPlayers: Player[];
  positionKeys: PositionKey[];
  segmentKey: SegmentKey;
  preferences?: PlayerPreference[];
}) =>
  Math.min(
    ...permutations(options.incomingPlayers).map((permutation) =>
      crossQuarterPositionRepeatScore([
        ...options.assignments,
        ...options.positionKeys.map(
          (positionKey, index): Assignment => ({
            segmentKey: options.segmentKey,
            positionKey,
            playerId: permutation[index].id,
            source: "generated",
            locked: false,
          }),
        ),
      ]),
    ),
  );
