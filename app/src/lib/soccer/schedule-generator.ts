import { POSITIONS, SEGMENTS, type PositionKey } from "./fixed-game";
import type { Assignment, Player } from "./schemas";

type Lineup = Map<PositionKey, Player>;

const stableRotationRank = (playerId: string, segmentIndex: number) => {
  let hash = segmentIndex + 1;
  for (const character of playerId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash;
};

const byRotationRank = (segmentIndex: number) => (left: Player, right: Player) =>
  stableRotationRank(left.id, segmentIndex) - stableRotationRank(right.id, segmentIndex) ||
  left.id.localeCompare(right.id);

const chooseGoalkeeper = (
  candidates: Player[],
  goalkeeperCounts: Map<string, number>,
  fieldCounts: Map<string, number>,
  segmentIndex: number,
) => [...candidates].sort((left, right) =>
  (goalkeeperCounts.get(left.id) ?? 0) - (goalkeeperCounts.get(right.id) ?? 0) ||
  (fieldCounts.get(left.id) ?? 0) - (fieldCounts.get(right.id) ?? 0) ||
  byRotationRank(segmentIndex)(left, right),
)[0];

const recordLineup = (
  result: Assignment[],
  lineup: Lineup,
  segment: (typeof SEGMENTS)[number],
  fieldCounts: Map<string, number>,
  goalkeeperCounts: Map<string, number>,
) => {
  for (const position of POSITIONS) {
    const player = lineup.get(position.key);
    if (!player) throw new Error(`Could not fill ${segment.label} ${position.label}.`);
    fieldCounts.set(player.id, (fieldCounts.get(player.id) ?? 0) + 1);
    if (position.key === "goalkeeper") {
      goalkeeperCounts.set(player.id, (goalkeeperCounts.get(player.id) ?? 0) + 1);
    }
    result.push({
      segmentKey: segment.key,
      positionKey: position.key,
      playerId: player.id,
      source: "generated",
      locked: false,
    });
  }
};

const createInitialLineup = (
  players: Player[],
  fieldCounts: Map<string, number>,
  goalkeeperCounts: Map<string, number>,
) => {
  const goalkeeper = chooseGoalkeeper(players, goalkeeperCounts, fieldCounts, 0);
  const remaining = players
    .filter((player) => player.id !== goalkeeper.id)
    .sort(byRotationRank(0))
    .slice(0, POSITIONS.length - 1);
  const lineup: Lineup = new Map([["goalkeeper", goalkeeper]]);
  POSITIONS.filter((position) => position.key !== "goalkeeper").forEach((position, index) => {
    lineup.set(position.key, remaining[index]);
  });
  return lineup;
};

const rotateSevenPlayerGoalkeeper = (
  previous: Lineup,
  players: Player[],
  goalkeeperCounts: Map<string, number>,
  fieldCounts: Map<string, number>,
  segmentIndex: number,
) => {
  const previousGoalkeeper = previous.get("goalkeeper");
  if (!previousGoalkeeper) throw new Error("Previous lineup has no goalkeeper.");
  const goalkeeper = chooseGoalkeeper(
    players.filter((player) => player.id !== previousGoalkeeper.id),
    goalkeeperCounts,
    fieldCounts,
    segmentIndex,
  );
  const goalkeeperPosition = POSITIONS.find(
    (position) => previous.get(position.key)?.id === goalkeeper.id,
  );
  if (!goalkeeperPosition) throw new Error("Could not rotate goalkeeper.");
  const lineup = new Map(previous);
  lineup.set("goalkeeper", goalkeeper);
  lineup.set(goalkeeperPosition.key, previousGoalkeeper);
  return lineup;
};

const combinations = <T>(values: T[], count: number): T[][] => {
  if (count === 0) return [[]];
  if (values.length < count) return [];
  return values.flatMap((value, index) =>
    combinations(values.slice(index + 1), count - 1).map((rest) => [value, ...rest]),
  );
};

const chooseOptionalOutgoing = (options: {
  players: Player[];
  previous: Lineup;
  substitutes: Player[];
  fieldCounts: Map<string, number>;
  goalkeeperCounts: Map<string, number>;
  segmentIndex: number;
  count: number;
  quarterStart: boolean;
}) => {
  const { players, previous, substitutes, fieldCounts, goalkeeperCounts, segmentIndex, count, quarterStart } = options;
  const candidates = POSITIONS.filter((position) => position.key !== "goalkeeper");
  const choices = combinations(candidates, count);
  return choices.sort((left, right) => {
    const projectedSpread = (positions: typeof left) => {
      const outgoingIds = new Set(positions.map((position) => previous.get(position.key)?.id));
      const nextCounts = players.map((player) =>
        (fieldCounts.get(player.id) ?? 0) +
        Number(substitutes.some((substitute) => substitute.id === player.id) ||
          (previousFieldHasPlayer(previous, player.id) &&
            !outgoingIds.has(player.id) &&
            !(quarterStart && previous.get("goalkeeper")?.id === player.id))),
      );
      return Math.max(...nextCounts) - Math.min(...nextCounts);
    };
    const spreadDifference = projectedSpread(left) - projectedSpread(right);
    if (spreadDifference !== 0) return spreadDifference;
    const midfieldDifference = right.filter((position) => position.group === "midfield").length -
      left.filter((position) => position.group === "midfield").length;
    if (midfieldDifference !== 0) return midfieldDifference;
    if (SEGMENTS[segmentIndex].half === "b") {
      const goalkeeperOpportunity = (positions: typeof left) => positions.reduce(
        (total, position) => total + (goalkeeperCounts.get(previous.get(position.key)?.id ?? "") ?? 0),
        0,
      );
      const goalkeeperDifference = goalkeeperOpportunity(left) - goalkeeperOpportunity(right);
      if (goalkeeperDifference !== 0) return goalkeeperDifference;
    }
    const rotationScore = (positions: typeof left) => positions.reduce(
      (total, position) => total + stableRotationRank(previous.get(position.key)?.id ?? "", segmentIndex),
      0,
    );
    return rotationScore(left) - rotationScore(right);
  })[0] ?? [];
};

const previousFieldHasPlayer = (lineup: Lineup, playerId: string) =>
  [...lineup.values()].some((player) => player.id === playerId);

const createNextLineup = (options: {
  players: Player[];
  previous: Lineup;
  fieldCounts: Map<string, number>;
  goalkeeperCounts: Map<string, number>;
  segmentIndex: number;
}) => {
  const { players, previous, fieldCounts, goalkeeperCounts, segmentIndex } = options;
  const segment = SEGMENTS[segmentIndex];
  const quarterStart = segment.half === "a";
  const previousFieldIds = new Set([...previous.values()].map((player) => player.id));
  const substitutes = players.filter((player) => !previousFieldIds.has(player.id));

  if (substitutes.length === 0) {
    return quarterStart
      ? rotateSevenPlayerGoalkeeper(previous, players, goalkeeperCounts, fieldCounts, segmentIndex)
      : new Map(previous);
  }

  const incomingGoalkeeper = quarterStart
    ? chooseGoalkeeper(substitutes, goalkeeperCounts, fieldCounts, segmentIndex)
    : undefined;
  const protectedGoalkeeper = !quarterStart;
  const swapCount = Math.min(
    substitutes.length,
    protectedGoalkeeper ? POSITIONS.length - 1 : POSITIONS.length,
  );
  const requiredOutgoing = quarterStart ? ["goalkeeper" as const] : [];
  const optionalOutgoing = chooseOptionalOutgoing({
    players,
    previous,
    substitutes,
    fieldCounts,
    goalkeeperCounts,
    segmentIndex,
    count: swapCount - requiredOutgoing.length,
    quarterStart,
  }).map((position) => position.key);
  const outgoingPositions = [...requiredOutgoing, ...optionalOutgoing];
  const incomingPlayers = substitutes
    .filter((player) => player.id !== incomingGoalkeeper?.id)
    .sort((left, right) =>
      (fieldCounts.get(left.id) ?? 0) - (fieldCounts.get(right.id) ?? 0) ||
      byRotationRank(segmentIndex)(left, right),
    );
  const lineup = new Map(previous);

  if (incomingGoalkeeper) lineup.set("goalkeeper", incomingGoalkeeper);
  outgoingPositions
    .filter((positionKey) => positionKey !== "goalkeeper")
    .forEach((positionKey, index) => lineup.set(positionKey, incomingPlayers[index]));
  return lineup;
};

export const generateSchedule = (players: Player[]): Assignment[] => {
  if (players.length < POSITIONS.length) {
    throw new Error("At least seven available players are required.");
  }
  const ordered = [...players].sort((left, right) =>
    left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id),
  );
  const fieldCounts = new Map(ordered.map((player) => [player.id, 0]));
  const goalkeeperCounts = new Map(ordered.map((player) => [player.id, 0]));
  const result: Assignment[] = [];
  let lineup = createInitialLineup(ordered, fieldCounts, goalkeeperCounts);

  SEGMENTS.forEach((segment, segmentIndex) => {
    if (segmentIndex > 0) {
      lineup = createNextLineup({
        players: ordered,
        previous: lineup,
        fieldCounts,
        goalkeeperCounts,
        segmentIndex,
      });
    }
    recordLineup(result, lineup, segment, fieldCounts, goalkeeperCounts);
  });
  return result;
};
