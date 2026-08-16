import { POSITIONS, SEGMENTS, type PositionKey, type SegmentKey } from "./fixed-game";
import type { Assignment } from "./schemas";

export type CrossQuarterPositionRepeat = {
  playerId: string;
  positionKey: PositionKey;
  quarterNumbers: number[];
  segmentKeys: SegmentKey[];
};

const quarterBySegment = new Map(SEGMENTS.map((segment) => [segment.key, segment.quarter]));

export const detectCrossQuarterPositionRepeats = (
  assignments: Assignment[],
): CrossQuarterPositionRepeat[] => {
  const occurrences = new Map<
    string,
    {
      playerId: string;
      positionKey: PositionKey;
      quarterNumbers: Set<number>;
      segmentKeys: SegmentKey[];
    }
  >();

  for (const assignment of assignments) {
    const quarter = quarterBySegment.get(assignment.segmentKey);
    if (!quarter) continue;
    const key = `${assignment.playerId}:${assignment.positionKey}`;
    const occurrence = occurrences.get(key) ?? {
      playerId: assignment.playerId,
      positionKey: assignment.positionKey,
      quarterNumbers: new Set<number>(),
      segmentKeys: [],
    };
    occurrence.quarterNumbers.add(quarter);
    occurrence.segmentKeys.push(assignment.segmentKey);
    occurrences.set(key, occurrence);
  }

  return [...occurrences.values()]
    .filter((occurrence) => occurrence.quarterNumbers.size >= 2)
    .map((occurrence) => ({
      playerId: occurrence.playerId,
      positionKey: occurrence.positionKey,
      quarterNumbers: [...occurrence.quarterNumbers].sort((left, right) => left - right),
      segmentKeys: occurrence.segmentKeys,
    }))
    .sort(
      (left, right) =>
        left.playerId.localeCompare(right.playerId) ||
        POSITIONS.findIndex((position) => position.key === left.positionKey) -
          POSITIONS.findIndex((position) => position.key === right.positionKey),
    );
};

export const crossQuarterPositionRepeatScore = (assignments: Assignment[]) =>
  detectCrossQuarterPositionRepeats(assignments).reduce(
    (total, repeat) => total + repeat.quarterNumbers.length - 1,
    0,
  );
