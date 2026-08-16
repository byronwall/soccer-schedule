import { z } from "zod";
import { POSITIONS, type PositionGroup, type PositionKey, type SegmentKey } from "./fixed-game";
import { crossQuarterPositionRepeatScore } from "./schedule-position-repeats";
import { scoreSchedulePreferences } from "./schedule-preference-quality";
import type { Assignment, DefensiveContinuityPolicy, Player, PlayerPreference } from "./schemas";
import { scheduleCellWarnings, validateAssignments } from "./scheduling";

export const scheduleGenerationQualitySchema = z.object({
  assignedCount: z.number().int().min(0).max(56),
  hardErrorCount: z.number().int().min(0),
  gameMinuteSpread: z.number().int().min(0),
  seasonMinuteSpread: z.number().int().min(0),
  seasonRoleImbalance: z.number().int().min(0),
  avoidAssignmentCount: z.number().int().min(0),
  preferredAssignmentCount: z.number().int().min(0),
  favoredExtraMisses: z.number().int().min(0),
  goalkeeperOveruse: z.number().int().min(0),
  goalkeeperChanges: z.number().int().min(0),
  defenderChanges: z.number().int().min(0),
  midfieldRepeats: z.number().int().min(0),
  crossQuarterPositionRepeats: z.number().int().min(0),
  varietyGaps: z.number().int().min(0),
});

export type ScheduleGenerationQuality = z.infer<typeof scheduleGenerationQualitySchema>;

type QualityOptions = {
  players: Player[];
  seasonAssignments?: Assignment[];
  preferences?: PlayerPreference[];
  continuityPolicy?: DefensiveContinuityPolicy;
};

const assignmentAt = (
  assignments: Assignment[],
  segmentKey: SegmentKey,
  positionKey: PositionKey,
) =>
  assignments.find(
    (assignment) => assignment.segmentKey === segmentKey && assignment.positionKey === positionKey,
  );

const assignedCounts = (assignments: Assignment[], playerIds: string[]) => {
  const counts = new Map(playerIds.map((playerId) => [playerId, 0]));
  for (const assignment of assignments) {
    counts.set(assignment.playerId, (counts.get(assignment.playerId) ?? 0) + 1);
  }
  return counts;
};

const spread = (values: number[]) =>
  values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);

const currentHardErrorCount = (assignments: Assignment[], eligibleIds: string[]) => {
  if (assignments.length === POSITIONS.length * 8) {
    return validateAssignments(assignments, eligibleIds).length;
  }
  const eligible = new Set(eligibleIds);
  const positions = new Map<string, number>();
  const players = new Map<string, number>();
  for (const assignment of assignments) {
    const positionKey = `${assignment.segmentKey}:${assignment.positionKey}`;
    const playerKey = `${assignment.segmentKey}:${assignment.playerId}`;
    positions.set(positionKey, (positions.get(positionKey) ?? 0) + 1);
    players.set(playerKey, (players.get(playerKey) ?? 0) + 1);
  }
  let count = 0;
  for (const assignment of assignments) {
    const duplicatePosition =
      (positions.get(`${assignment.segmentKey}:${assignment.positionKey}`) ?? 0) > 1;
    const duplicatePlayer =
      (players.get(`${assignment.segmentKey}:${assignment.playerId}`) ?? 0) > 1;
    count +=
      Number(duplicatePosition) +
      Number(duplicatePlayer) +
      Number(!eligible.has(assignment.playerId));
  }
  return count;
};

const goalkeeperChanges = (assignments: Assignment[]) =>
  [1, 2, 3, 4].filter((quarter) => {
    const first = assignmentAt(assignments, `q${quarter}a` as SegmentKey, "goalkeeper");
    const second = assignmentAt(assignments, `q${quarter}b` as SegmentKey, "goalkeeper");
    return first && second && first.playerId !== second.playerId;
  }).length;

const defenderChanges = (assignments: Assignment[]) =>
  [1, 2, 3, 4].reduce(
    (total, quarter) =>
      total +
      (["leftDefense", "rightDefense"] as const).filter((positionKey) => {
        const first = assignmentAt(assignments, `q${quarter}a` as SegmentKey, positionKey);
        const second = assignmentAt(assignments, `q${quarter}b` as SegmentKey, positionKey);
        return first && second && first.playerId !== second.playerId;
      }).length,
    0,
  );

const varietyGaps = (assignments: Assignment[], playerIds: string[]) => {
  const exactPositions = new Map(playerIds.map((playerId) => [playerId, new Set<PositionKey>()]));
  for (const assignment of assignments) {
    exactPositions.get(assignment.playerId)?.add(assignment.positionKey);
  }
  return playerIds.reduce((total, playerId) => {
    const positions = exactPositions.get(playerId) ?? new Set<PositionKey>();
    const hasAttack = [...positions].some(
      (positionKey) => positionKey.includes("Midfield") || positionKey.includes("Forward"),
    );
    const hasDefense = [...positions].some(
      (positionKey) => positionKey === "goalkeeper" || positionKey.includes("Defense"),
    );
    return total + Number(!hasAttack) + Number(!hasDefense) + (POSITIONS.length - positions.size);
  }, 0);
};

export const evaluateGenerationQuality = (
  assignments: Assignment[],
  options: QualityOptions,
): ScheduleGenerationQuality => {
  const playerIds = options.players.map((player) => player.id);
  const gameCounts = assignedCounts(assignments, playerIds);
  const season = [...(options.seasonAssignments ?? []), ...assignments];
  const seasonCounts = assignedCounts(season, playerIds);
  const roleCounts = new Map(
    playerIds.map((playerId) => [
      playerId,
      new Map<PositionGroup, number>([
        ["goalkeeper", 0],
        ["defense", 0],
        ["midfield", 0],
        ["forward", 0],
      ]),
    ]),
  );
  for (const assignment of season) {
    const group = POSITIONS.find((position) => position.key === assignment.positionKey)?.group;
    if (!group) continue;
    const counts = roleCounts.get(assignment.playerId);
    counts?.set(group, (counts.get(group) ?? 0) + 1);
  }
  const preferenceQuality = scoreSchedulePreferences(
    assignments,
    playerIds,
    options.preferences ?? [],
  );
  const cellWarnings = scheduleCellWarnings(assignments);
  return {
    assignedCount: assignments.length,
    hardErrorCount: currentHardErrorCount(assignments, playerIds),
    gameMinuteSpread: spread([...gameCounts.values()]) * 7,
    seasonMinuteSpread: spread([...seasonCounts.values()]) * 7,
    seasonRoleImbalance: (["goalkeeper", "defense", "midfield", "forward"] as const).reduce(
      (total, group) =>
        total + spread(playerIds.map((playerId) => roleCounts.get(playerId)?.get(group) ?? 0)),
      0,
    ),
    avoidAssignmentCount: preferenceQuality.avoidAssignmentCount,
    preferredAssignmentCount: preferenceQuality.preferredAssignmentCount,
    favoredExtraMisses: preferenceQuality.favoredExtraMisses,
    goalkeeperOveruse: new Set(
      cellWarnings
        .filter((warning) => warning.kind === "goalkeeper-overuse")
        .map((warning) => warning.playerId),
    ).size,
    goalkeeperChanges: goalkeeperChanges(assignments),
    defenderChanges:
      options.continuityPolicy === "goalkeeper-only" ? 0 : defenderChanges(assignments),
    midfieldRepeats: cellWarnings.filter((warning) => warning.kind === "midfield-repeat").length,
    crossQuarterPositionRepeats: crossQuarterPositionRepeatScore(assignments),
    varietyGaps: varietyGaps(season, playerIds),
  };
};

// This is the canonical lexicographic policy for both full and targeted
// generation. Array order is policy order; later rules never compensate for an
// earlier regression. Targeted search adds churn only after this entire rank.
export const generationPriorityRank = (quality: ScheduleGenerationQuality) => [
  quality.hardErrorCount,
  -quality.assignedCount,
  quality.gameMinuteSpread,
  quality.seasonMinuteSpread,
  quality.seasonRoleImbalance,
  quality.avoidAssignmentCount,
  -quality.preferredAssignmentCount,
  quality.goalkeeperOveruse,
  quality.goalkeeperChanges,
  quality.defenderChanges,
  quality.midfieldRepeats,
  quality.crossQuarterPositionRepeats,
  quality.varietyGaps,
  quality.favoredExtraMisses,
];

export const compareGenerationRanks = (left: number[], right: number[]) => {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

export const generationHardErrors = (options: {
  assignments: Assignment[];
  currentAssignments: Assignment[];
  players: Player[];
  knownPlayers?: Player[];
}) => {
  const eligibleIds = options.players.map((player) => player.id);
  const eligibleById = new Set(eligibleIds);
  const knownById = new Map(
    (options.knownPlayers ?? options.players).map((player) => [player.id, player]),
  );
  const lockedAvailabilityErrors = options.currentAssignments.flatMap((assignment) =>
    assignment.locked && !eligibleById.has(assignment.playerId)
      ? [
          `Locked ${assignment.segmentKey.toUpperCase()} ${
            POSITIONS.find((position) => position.key === assignment.positionKey)?.label ??
            assignment.positionKey
          } assigns ${
            knownById.get(assignment.playerId)?.displayName ?? "an unavailable player"
          }, who is unavailable. Unlock that assignment or restore availability.`,
        ]
      : [],
  );
  const currentConflicts = options.assignments.flatMap((assignment, index, assignments) => {
    const duplicatePosition =
      assignments.findIndex(
        (candidate) =>
          candidate.segmentKey === assignment.segmentKey &&
          candidate.positionKey === assignment.positionKey,
      ) !== index;
    const duplicatePlayer =
      assignments.findIndex(
        (candidate) =>
          candidate.segmentKey === assignment.segmentKey &&
          candidate.playerId === assignment.playerId,
      ) !== index;
    return [
      ...(duplicatePosition
        ? [
            `${assignment.segmentKey.toUpperCase()} assigns ${assignment.positionKey} more than once.`,
          ]
        : []),
      ...(duplicatePlayer
        ? [`${assignment.segmentKey.toUpperCase()} assigns one player to multiple positions.`]
        : []),
      ...(!eligibleById.has(assignment.playerId)
        ? [
            `${assignment.segmentKey.toUpperCase()} ${assignment.positionKey} assigns an unavailable player.`,
          ]
        : []),
    ];
  });
  return [
    ...lockedAvailabilityErrors,
    ...(options.assignments.length === 56
      ? validateAssignments(options.assignments, eligibleIds)
      : currentConflicts),
  ].filter((message, index, messages) => messages.indexOf(message) === index);
};

export const summarizeGenerationImprovement = (
  before: ScheduleGenerationQuality,
  after: ScheduleGenerationQuality,
) => {
  if (after.assignedCount > before.assignedCount) {
    const count = after.assignedCount - before.assignedCount;
    return `Filled ${count} previously empty assignment${count === 1 ? "" : "s"}.`;
  }
  const improvements: Array<[keyof ScheduleGenerationQuality, string]> = [
    ["hardErrorCount", "Reduced hard schedule conflicts."],
    ["gameMinuteSpread", "Improved playing-time balance in this game."],
    ["seasonMinuteSpread", "Improved cumulative season-minute balance."],
    ["seasonRoleImbalance", "Improved season role-group balance."],
    ["avoidAssignmentCount", "Reduced avoided-position assignments."],
    ["preferredAssignmentCount", "Improved preferred-position coverage."],
    ["goalkeeperOveruse", "Reduced goalkeeper overuse."],
    ["goalkeeperChanges", "Improved goalkeeper continuity."],
    ["defenderChanges", "Improved defender continuity."],
    ["midfieldRepeats", "Reduced within-quarter midfield repeats."],
    ["crossQuarterPositionRepeats", "Reduced exact-position repeats across quarters."],
    ["varietyGaps", "Improved attack, defense, and exact-position variety."],
    ["favoredExtraMisses", "Improved the late extra-time tie-breaker."],
  ];
  for (const [key, message] of improvements) {
    const improved =
      key === "preferredAssignmentCount" ? after[key] > before[key] : after[key] < before[key];
    if (improved) return message;
  }
  return "Applied the smallest equally strong targeted adjustment.";
};
