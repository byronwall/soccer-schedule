import { POSITIONS, SEGMENTS } from "./fixed-game";
import {
  chooseLowestRepeatLineup,
  type Lineup,
} from "./schedule-position-optimizer";
import {
  favorsExtraTime,
  playerPreferenceLookup,
  type PlayerPreferenceLookup,
} from "./player-preferences";
import {
  choosePreferredGoalkeeper,
} from "./schedule-preference-ordering";
import { selectGeneratedSchedule } from "./schedule-generated-quality";
import { chooseOptionalOutgoing } from "./schedule-outgoing-selection";
import type {
  Assignment,
  DefensiveContinuityPolicy,
  Player,
  PlayerPreference,
} from "./schemas";

const FIELD_POSITIONS = POSITIONS.filter((position) => position.key !== "goalkeeper");

const stableRotationRank = (playerId: string, segmentIndex: number, seed: string) => {
  let hash = 2_166_136_261;
  for (const character of `${seed}:${segmentIndex}:${playerId}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 2_246_822_507);
  hash ^= hash >>> 13;
  return hash >>> 0;
};

const byRotationRank = (segmentIndex: number, seed: string) => (left: Player, right: Player) =>
  stableRotationRank(left.id, segmentIndex, seed) -
  stableRotationRank(right.id, segmentIndex, seed) ||
  left.id.localeCompare(right.id);

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
  seed: string,
  preferences: PlayerPreferenceLookup,
) => {
  const goalkeeper = choosePreferredGoalkeeper({
    candidates: players,
    goalkeeperCounts,
    fieldCounts,
    preferences,
    fallback: byRotationRank(0, seed),
  });
  const remaining = players
    .filter((player) => player.id !== goalkeeper.id)
    .sort((left, right) =>
      Number(favorsExtraTime(preferences, right.id)) -
        Number(favorsExtraTime(preferences, left.id)) ||
      byRotationRank(0, seed)(left, right),
    )
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
  seed: string,
  preferences: PlayerPreferenceLookup,
) => {
  const previousGoalkeeper = previous.get("goalkeeper");
  if (!previousGoalkeeper) throw new Error("Previous lineup has no goalkeeper.");
  const goalkeeper = choosePreferredGoalkeeper({
    candidates: players.filter(
      (player) => player.id !== previousGoalkeeper.id,
    ),
    goalkeeperCounts,
    fieldCounts,
    preferences,
    fallback: byRotationRank(segmentIndex, seed),
  });
  const goalkeeperPosition = POSITIONS.find(
    (position) => previous.get(position.key)?.id === goalkeeper.id,
  );
  if (!goalkeeperPosition) throw new Error("Could not rotate goalkeeper.");
  const lineup = new Map(previous);
  lineup.set("goalkeeper", goalkeeper);
  lineup.set(goalkeeperPosition.key, previousGoalkeeper);
  return lineup;
};

const createNextLineup = (options: {
  players: Player[];
  previous: Lineup;
  fieldCounts: Map<string, number>;
  goalkeeperCounts: Map<string, number>;
  segmentIndex: number;
  assignments: Assignment[];
  seed: string;
  preferences: PlayerPreferenceLookup;
  continuityPolicy: DefensiveContinuityPolicy;
  prioritizeContinuity: boolean;
}) => {
  const {
    players,
    previous,
    fieldCounts,
    goalkeeperCounts,
    segmentIndex,
    assignments,
    seed,
    preferences,
    continuityPolicy,
    prioritizeContinuity,
  } = options;
  const segment = SEGMENTS[segmentIndex];
  const quarterStart = segment.half === "a";
  const previousFieldIds = new Set([...previous.values()].map((player) => player.id));
  const substitutes = players.filter((player) => !previousFieldIds.has(player.id));

  if (substitutes.length === 0) {
    return quarterStart
      ? rotateSevenPlayerGoalkeeper(
          previous,
          players,
          goalkeeperCounts,
          fieldCounts,
          segmentIndex,
          seed,
          preferences,
        )
      : new Map(previous);
  }

  const incomingGoalkeeper = quarterStart
    ? choosePreferredGoalkeeper({
        candidates: substitutes,
        goalkeeperCounts,
        fieldCounts,
        preferences,
        fallback: byRotationRank(segmentIndex, seed),
      })
    : undefined;
  const protectedGoalkeeper = !quarterStart;
  const swapCount = Math.min(
    substitutes.length,
    protectedGoalkeeper ? POSITIONS.length - 1 : POSITIONS.length,
  );
  const requiredOutgoing = quarterStart ? ["goalkeeper" as const] : [];
  const incomingPlayers = substitutes
    .filter((player) => player.id !== incomingGoalkeeper?.id)
    .sort((left, right) =>
      (fieldCounts.get(left.id) ?? 0) - (fieldCounts.get(right.id) ?? 0) ||
      Number(favorsExtraTime(preferences, right.id)) -
        Number(favorsExtraTime(preferences, left.id)) ||
      byRotationRank(segmentIndex, seed)(left, right),
    );
  const optionalOutgoing = chooseOptionalOutgoing({
    players,
    previous,
    substitutes,
    fieldCounts,
    goalkeeperCounts,
    segmentIndex,
    count: swapCount - requiredOutgoing.length,
    quarterStart,
    assignments,
    incomingPlayers,
    rotationRank: (playerId) =>
      stableRotationRank(playerId, segmentIndex, seed),
    preferences,
    continuityPolicy,
    prioritizeContinuity,
  }).map((position) => position.key);
  const outgoingPositions = [...requiredOutgoing, ...optionalOutgoing];
  const lineup = new Map(previous);

  if (incomingGoalkeeper) lineup.set("goalkeeper", incomingGoalkeeper);
  outgoingPositions
    .filter((positionKey) => positionKey !== "goalkeeper")
    .forEach((positionKey, index) => lineup.set(positionKey, incomingPlayers[index]));
  return lineup;
};

export type GenerateScheduleOptions = {
  seed?: string;
  preferences?: PlayerPreference[];
  continuityPolicy?: DefensiveContinuityPolicy;
  compareAssignments?: (left: Assignment[], right: Assignment[]) => number;
};

const generateCandidate = (
  players: Player[],
  options: GenerateScheduleOptions,
  prioritizeContinuity: boolean,
): Assignment[] => {
  if (players.length < POSITIONS.length) {
    throw new Error("At least seven available players are required.");
  }
  const ordered = [...players].sort((left, right) =>
    left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id),
  );
  const seed = options.seed ?? "default";
  const preferences = playerPreferenceLookup(options.preferences ?? []);
  const continuityPolicy =
    options.continuityPolicy ?? "goalkeeper-and-defense";
  const fieldCounts = new Map(ordered.map((player) => [player.id, 0]));
  const goalkeeperCounts = new Map(ordered.map((player) => [player.id, 0]));
  const result: Assignment[] = [];
  let lineup = createInitialLineup(
    ordered,
    fieldCounts,
    goalkeeperCounts,
    seed,
    preferences,
  );

  SEGMENTS.forEach((segment, segmentIndex) => {
    const previous = lineup;
    if (segmentIndex > 0) {
      lineup = createNextLineup({
        players: ordered,
        previous: lineup,
        fieldCounts,
        goalkeeperCounts,
        segmentIndex,
        assignments: result,
        seed,
        preferences,
        continuityPolicy,
        prioritizeContinuity,
      });
    }
    const positionKeys = segment.half === "a"
      ? FIELD_POSITIONS.map((position) => position.key)
      : FIELD_POSITIONS
          .filter(
            (position) =>
              previous.get(position.key)?.id !== lineup.get(position.key)?.id,
          )
          .map((position) => position.key);
    if (positionKeys.length > 1) {
      lineup = chooseLowestRepeatLineup({
        lineup,
        positionKeys,
        assignments: result,
        segmentKey: segment.key,
        preferences: options.preferences,
      });
    }
    recordLineup(result, lineup, segment, fieldCounts, goalkeeperCounts);
  });
  return result;
};

export const generateSchedule = (
  players: Player[],
  options: GenerateScheduleOptions = {},
): Assignment[] => {
  const continuityPolicy =
    options.continuityPolicy ?? "goalkeeper-and-defense";
  const fairnessFirst = generateCandidate(players, options, false);
  const continuityFirst = generateCandidate(players, options, true);
  if (options.compareAssignments) {
    return [fairnessFirst, continuityFirst].sort(
      options.compareAssignments,
    )[0] ?? fairnessFirst;
  }
  const preferences = options.preferences ?? [];
  return selectGeneratedSchedule({
    candidates: [fairnessFirst, continuityFirst],
    players,
    preferences,
    continuityPolicy,
  }) ?? fairnessFirst;
};
