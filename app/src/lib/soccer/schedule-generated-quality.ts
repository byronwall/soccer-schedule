import { scoreSchedulePreferences } from "./schedule-preference-quality";
import {
  scheduleContinuityExceptions,
  scheduleExperienceWarnings,
} from "./schedule-experience-quality";
import type {
  Assignment,
  DefensiveContinuityPolicy,
  Player,
  PlayerPreference,
} from "./schemas";

const generatedQualityRank = (
  assignments: Assignment[],
  players: Player[],
  preferences: PlayerPreference[],
  continuityPolicy: DefensiveContinuityPolicy,
) => {
  const counts = new Map(players.map((player) => [player.id, 0]));
  for (const assignment of assignments) {
    counts.set(assignment.playerId, (counts.get(assignment.playerId) ?? 0) + 1);
  }
  const segmentCounts = [...counts.values()];
  const preferenceQuality = scoreSchedulePreferences(
    assignments,
    players.map((player) => player.id),
    preferences,
  );
  const continuityExceptions = scheduleContinuityExceptions(
    assignments,
    continuityPolicy,
  );
  return [
    Math.max(...segmentCounts) - Math.min(...segmentCounts),
    preferenceQuality.avoidAssignmentCount,
    preferenceQuality.favoredExtraMisses,
    -preferenceQuality.preferredAssignmentCount,
    continuityExceptions.filter((exception) =>
      exception.positionKey === "goalkeeper").length,
    continuityExceptions.filter((exception) =>
      exception.positionKey.includes("Defense")).length,
    scheduleExperienceWarnings(
      assignments,
      players.map((player) => player.id),
    ).length,
  ];
};

const compareRanks = (left: number[], right: number[]) => {
  for (let index = 0; index < left.length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

export const selectGeneratedSchedule = (options: {
  candidates: Assignment[][];
  players: Player[];
  preferences: PlayerPreference[];
  continuityPolicy: DefensiveContinuityPolicy;
}) => [...options.candidates].sort((left, right) =>
  compareRanks(
    generatedQualityRank(
      left,
      options.players,
      options.preferences,
      options.continuityPolicy,
    ),
    generatedQualityRank(
      right,
      options.players,
      options.preferences,
      options.continuityPolicy,
    ),
  )
)[0];
