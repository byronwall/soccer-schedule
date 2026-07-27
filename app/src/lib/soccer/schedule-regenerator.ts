import { POSITIONS, SEGMENTS } from "./fixed-game";
import { generateSchedule } from "./schedule-generator";
import { detectCrossQuarterPositionRepeats } from "./schedule-position-repeats";
import type { Assignment, Player } from "./schemas";

export type RegenerateScheduleResult = {
  assignments: Assignment[];
  changed: boolean;
  reason?: string;
};

export const assignmentSignature = (assignments: Assignment[]) =>
  assignments
    .map((assignment) =>
      `${assignment.segmentKey}:${assignment.positionKey}:${assignment.playerId}`,
    )
    .join("|");

const applyLockedAssignments = (
  generated: Assignment[],
  current: Assignment[],
) => {
  const reconciled = generated.map((assignment) => ({
    ...assignment,
    locked: false,
  }));
  for (const locked of current.filter((assignment) => assignment.locked)) {
    const target = reconciled.find(
      (assignment) =>
        assignment.segmentKey === locked.segmentKey &&
        assignment.positionKey === locked.positionKey,
    );
    const playerCell = reconciled.find(
      (assignment) =>
        assignment.segmentKey === locked.segmentKey &&
        assignment.playerId === locked.playerId,
    );
    if (!target || !playerCell) return undefined;
    const displacedPlayerId = target.playerId;
    target.playerId = locked.playerId;
    target.source = locked.source;
    target.locked = true;
    playerCell.playerId = displacedPlayerId;
  }
  return reconciled;
};

const goalkeeperChangeCount = (assignments: Assignment[]) =>
  [1, 2, 3, 4].filter((quarter) => {
    const first = assignments.find(
      (assignment) =>
        assignment.segmentKey === `q${quarter}a` &&
        assignment.positionKey === "goalkeeper",
    );
    const second = assignments.find(
      (assignment) =>
        assignment.segmentKey === `q${quarter}b` &&
        assignment.positionKey === "goalkeeper",
    );
    return first && second && first.playerId !== second.playerId;
  }).length;

const candidateQuality = (assignments: Assignment[]) => ({
  goalkeeperChanges: goalkeeperChangeCount(assignments),
  positionRepeats: detectCrossQuarterPositionRepeats(assignments).length,
});

const assignmentsAreValid = (assignments: Assignment[], players: Player[]) => {
  const eligible = new Set(players.map((player) => player.id));
  return SEGMENTS.every((segment) => {
    const segmentAssignments = assignments.filter(
      (assignment) => assignment.segmentKey === segment.key,
    );
    return segmentAssignments.length === POSITIONS.length &&
      new Set(segmentAssignments.map((assignment) => assignment.playerId)).size === POSITIONS.length &&
      segmentAssignments.every((assignment) => eligible.has(assignment.playerId));
  });
};

const unlockedSwapCandidates = (assignments: Assignment[]) =>
  SEGMENTS.flatMap((segment) => {
    const unlocked = assignments.filter(
      (assignment) =>
        assignment.segmentKey === segment.key && !assignment.locked,
    );
    return unlocked.flatMap((left, leftIndex) =>
      unlocked.slice(leftIndex + 1).map((right) =>
        assignments.map((assignment) => {
          if (assignment === left) {
            return { ...assignment, playerId: right.playerId, source: "generated" as const };
          }
          if (assignment === right) {
            return { ...assignment, playerId: left.playerId, source: "generated" as const };
          }
          return { ...assignment };
        }),
      ),
    );
  });

export const regenerateSchedule = (options: {
  players: Player[];
  currentAssignments: Assignment[];
  seeds: string[];
  priorAssignments?: Assignment[][];
}): RegenerateScheduleResult => {
  const eligible = new Set(options.players.map((player) => player.id));
  if (options.currentAssignments.some(
    (assignment) => assignment.locked && !eligible.has(assignment.playerId),
  )) {
    throw new Error(
      "A locked assignment belongs to an unavailable player. Unlock it or restore availability before regenerating.",
    );
  }
  if (options.currentAssignments.every((assignment) => assignment.locked)) {
    return {
      assignments: options.currentAssignments.map((assignment) => ({ ...assignment })),
      changed: false,
      reason: "Every assignment is locked, so the schedule has only one allowed arrangement.",
    };
  }
  const currentSignature = assignmentSignature(options.currentAssignments);
  const priorSignatures = new Set(
    (options.priorAssignments ?? []).map(assignmentSignature),
  );
  const currentGoalkeeperChanges = goalkeeperChangeCount(options.currentAssignments);
  const candidates = options.seeds.flatMap((seed) => {
    const reconciled = applyLockedAssignments(
      generateSchedule(options.players, { seed }),
      options.currentAssignments,
    );
    if (!reconciled) return [];
    const quality = candidateQuality(reconciled);
    if (quality.goalkeeperChanges > currentGoalkeeperChanges) return [];
    return [{
      assignments: reconciled,
      signature: assignmentSignature(reconciled),
      quality,
    }];
  });
  const selectChanged = (available: typeof candidates) => available
    .filter((candidate) => candidate.signature !== currentSignature)
    .sort((left, right) =>
      Number(priorSignatures.has(left.signature)) -
        Number(priorSignatures.has(right.signature)) ||
      left.quality.positionRepeats - right.quality.positionRepeats ||
      left.signature.localeCompare(right.signature),
    )[0];
  const fallbackCandidates = assignmentsAreValid(
    options.currentAssignments,
    options.players,
  )
    ? unlockedSwapCandidates(options.currentAssignments)
      .map((assignments) => ({
        assignments,
        signature: assignmentSignature(assignments),
        quality: candidateQuality(assignments),
      }))
      .filter(
        (candidate) =>
          candidate.quality.goalkeeperChanges <= currentGoalkeeperChanges,
      )
    : [];
  const changed = selectChanged(candidates) ?? selectChanged(fallbackCandidates);

  if (changed) return { assignments: changed.assignments, changed: true };
  if (assignmentsAreValid(options.currentAssignments, options.players)) return {
    assignments: options.currentAssignments.map((assignment) => ({ ...assignment })),
    changed: false,
    reason: "No different valid rotation was found without changing the locked assignments.",
  };
  throw new Error(
    "No valid rotation could preserve the current locked assignments.",
  );
};
