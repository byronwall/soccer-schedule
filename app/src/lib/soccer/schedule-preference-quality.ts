import type { PositionKey } from "./fixed-game";
import {
  favorsExtraTime,
  playerPreferenceLookup,
  positionDisposition,
} from "./player-preferences";
import type { Assignment, PlayerPreference } from "./schemas";

export type RelaxedPositionAvoid = {
  playerId: string;
  positionKey: PositionKey;
  segments: number;
};

export type UnmetPositionPreference = {
  playerId: string;
  positionKey: PositionKey;
};

export type SchedulePreferenceQuality = {
  avoidAssignmentCount: number;
  favoredExtraMisses: number;
  preferredAssignmentCount: number;
  relaxedAvoids: RelaxedPositionAvoid[];
  unmetPreferences: UnmetPositionPreference[];
};

export const scoreSchedulePreferences = (
  assignments: Assignment[],
  eligibleIds: string[],
  preferences: PlayerPreference[] = [],
): SchedulePreferenceQuality => {
  const eligible = new Set(eligibleIds);
  const lookup = playerPreferenceLookup(preferences);
  const counts = new Map(eligibleIds.map((playerId) => [playerId, 0]));
  const avoidCounts = new Map<string, number>();
  let preferredAssignmentCount = 0;
  for (const assignment of assignments) {
    if (!eligible.has(assignment.playerId)) continue;
    counts.set(assignment.playerId, (counts.get(assignment.playerId) ?? 0) + 1);
    const disposition = positionDisposition(
      lookup,
      assignment.playerId,
      assignment.positionKey,
    );
    if (disposition === "prefer") preferredAssignmentCount += 1;
    if (disposition === "avoid") {
      const key = `${assignment.playerId}:${assignment.positionKey}`;
      avoidCounts.set(key, (avoidCounts.get(key) ?? 0) + 1);
    }
  }
  const segmentCounts = [...counts.values()];
  const maximumSegments = segmentCounts.length > 0
    ? Math.max(...segmentCounts)
    : 0;
  const minimumSegments = segmentCounts.length > 0
    ? Math.min(...segmentCounts)
    : 0;
  const hasUnequalTotals = maximumSegments > minimumSegments;
  const favoredExtraMisses = hasUnequalTotals
    ? eligibleIds.reduce(
      (total, playerId) =>
        total + (
          favorsExtraTime(lookup, playerId)
            ? maximumSegments - (counts.get(playerId) ?? 0)
            : 0
        ),
      0,
    )
    : 0;
  const relaxedAvoids = [...avoidCounts.entries()].map(([key, segments]) => {
    const separator = key.lastIndexOf(":");
    return {
      playerId: key.slice(0, separator),
      positionKey: key.slice(separator + 1) as PositionKey,
      segments,
    };
  });
  const unmetPreferences = preferences.flatMap((preference) =>
    Object.entries(preference.positionDispositions).flatMap(
      ([positionKey, disposition]) => {
        if (disposition !== "prefer" || !eligible.has(preference.playerId)) {
          return [];
        }
        const met = assignments.some(
          (assignment) =>
            assignment.playerId === preference.playerId &&
            assignment.positionKey === positionKey,
        );
        return met
          ? []
          : [{
              playerId: preference.playerId,
              positionKey: positionKey as PositionKey,
            }];
      },
    ),
  );
  return {
    avoidAssignmentCount: relaxedAvoids.reduce(
      (total, exception) => total + exception.segments,
      0,
    ),
    favoredExtraMisses,
    preferredAssignmentCount,
    relaxedAvoids,
    unmetPreferences,
  };
};
