import {
  POSITIONS,
  SEGMENTS,
  type PositionGroup,
} from "./fixed-game";
import { scoreSchedule } from "./scheduling";
import type { Assignment, PlayerPreference } from "./schemas";
import { z } from "zod";

export type SeasonImpactAssignmentTarget = Pick<
  Assignment,
  "segmentKey" | "positionKey"
>;

export const seasonImpactAssignmentResultSchema = z.object({
  changed: z.boolean(),
  target: z.object({
    segmentKey: z.string(),
    positionKey: z.string(),
  }).optional(),
});

const candidateRank = (
  assignments: Assignment[],
  eligibleIds: string[],
  preferences: PlayerPreference[],
) => {
  const quality = scoreSchedule(assignments, eligibleIds, preferences);
  return [
    quality.hardViolations.length,
    quality.avoidAssignmentCount,
    quality.midfieldExceptions,
    quality.goalkeeperExceptions,
    quality.goalkeeperOveruse,
    quality.substituteOveruse,
    quality.crossQuarterPositionRepeats.length,
    quality.continuityExceptions.length,
    -quality.preferredAssignmentCount,
    quality.minuteSpread,
  ];
};

const compareRank = (left: number[], right: number[]) => {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
};

export const selectSeasonImpactAssignmentTarget = (options: {
  assignments: Assignment[];
  playerId: string;
  group: PositionGroup;
  eligibleIds: string[];
  preferences?: PlayerPreference[];
}): SeasonImpactAssignmentTarget | undefined => {
  if (options.assignments.some((assignment) =>
    assignment.playerId === options.playerId &&
    POSITIONS.find((position) => position.key === assignment.positionKey)?.group === options.group,
  )) return undefined;

  const eligible = new Set(options.eligibleIds);
  if (!eligible.has(options.playerId)) return undefined;

  let selected: SeasonImpactAssignmentTarget | undefined;
  let selectedRank: number[] | undefined;
  for (const segment of SEGMENTS) {
    const scheduledInSegment = options.assignments.some((assignment) =>
      assignment.segmentKey === segment.key && assignment.playerId === options.playerId,
    );
    if (scheduledInSegment) continue;

    for (const position of POSITIONS) {
      if (position.group !== options.group) continue;
      const occupied = options.assignments.some((assignment) =>
        assignment.segmentKey === segment.key && assignment.positionKey === position.key,
      );
      if (occupied) continue;

      const target = { segmentKey: segment.key, positionKey: position.key };
      const rank = candidateRank([
        ...options.assignments,
        {
          ...target,
          playerId: options.playerId,
          source: "manual",
          locked: true,
        },
      ], options.eligibleIds, options.preferences ?? []);
      if (!selectedRank || compareRank(rank, selectedRank) < 0) {
        selected = target;
        selectedRank = rank;
      }
    }
  }
  return selected;
};
