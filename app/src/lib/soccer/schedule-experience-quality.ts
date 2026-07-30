import { POSITIONS, type PositionKey } from "./fixed-game";
import type {
  Assignment,
  DefensiveContinuityPolicy,
} from "./schemas";

const ATTACK_POSITIONS = new Set<PositionKey>([
  "leftMidfield",
  "rightMidfield",
  "leftForward",
  "rightForward",
]);
const DEFENSE_POSITIONS = new Set<PositionKey>([
  "goalkeeper",
  "leftDefense",
  "rightDefense",
]);

export const continuityPositionKeys = (
  policy: DefensiveContinuityPolicy,
): PositionKey[] => policy === "goalkeeper-and-defense"
  ? ["goalkeeper", "leftDefense", "rightDefense"]
  : ["goalkeeper"];

export type ContinuityException = {
  quarter: number;
  positionKey: PositionKey;
  firstPlayerId: string;
  secondPlayerId: string;
};

export const scheduleContinuityExceptions = (
  assignments: Assignment[],
  policy: DefensiveContinuityPolicy,
): ContinuityException[] => [1, 2, 3, 4].flatMap((quarter) =>
  continuityPositionKeys(policy).flatMap((positionKey) => {
    const first = assignments.find(
      (assignment) =>
        assignment.segmentKey === `q${quarter}a` &&
        assignment.positionKey === positionKey,
    );
    const second = assignments.find(
      (assignment) =>
        assignment.segmentKey === `q${quarter}b` &&
        assignment.positionKey === positionKey,
    );
    return first && second && first.playerId !== second.playerId
      ? [{
          quarter,
          positionKey,
          firstPlayerId: first.playerId,
          secondPlayerId: second.playerId,
        }]
      : [];
  }),
);

export type ExperienceCoverageWarning = {
  playerId: string;
  kind: "missing-attack" | "missing-defense";
  message: string;
};

export const scheduleExperienceWarnings = (
  assignments: Assignment[],
  eligibleIds: string[],
): ExperienceCoverageWarning[] => eligibleIds.flatMap((playerId) => {
  const positions = assignments
    .filter((assignment) => assignment.playerId === playerId)
    .map((assignment) => assignment.positionKey);
  const hasAttack = positions.some((positionKey) =>
    ATTACK_POSITIONS.has(positionKey));
  const hasDefense = positions.some((positionKey) =>
    DEFENSE_POSITIONS.has(positionKey));
  return [
    ...(!hasAttack ? [{
      playerId,
      kind: "missing-attack" as const,
      message: "Experience coverage: no midfield or forward assignment in this game.",
    }] : []),
    ...(!hasDefense ? [{
      playerId,
      kind: "missing-defense" as const,
      message: "Experience coverage: no goalkeeper or defense assignment in this game.",
    }] : []),
  ];
});

export const seasonPositionVariety = (
  assignments: Assignment[],
  playerId: string,
) => POSITIONS.map((position) => ({
  ...position,
  segments: assignments.filter(
    (assignment) =>
      assignment.playerId === playerId &&
      assignment.positionKey === position.key,
  ).length,
}));
