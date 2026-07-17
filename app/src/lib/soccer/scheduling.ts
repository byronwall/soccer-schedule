import { POSITIONS, SEGMENTS, SEGMENT_SECONDS, type PositionKey } from "./fixed-game";
import type { Assignment, Player } from "./schemas";
export { generateSchedule } from "./schedule-generator";
import { generateSchedule } from "./schedule-generator";

export type ScheduleQuality = {
  valid: boolean; hardViolations: string[]; minuteSpread: number;
  midfieldExceptions: number; goalkeeperExceptions: number; goalkeeperOveruse: number;
  substituteOveruse: number;
  totals: Array<{ playerId: string; segments: number; minutes: number }>;
};

export type ScheduleCellWarning = {
  segmentKey: Assignment["segmentKey"];
  positionKey: Assignment["positionKey"];
  playerId: Assignment["playerId"];
  kind: "midfield-repeat" | "goalkeeper-change" | "goalkeeper-overuse";
  message: string;
};

export type ScheduleSubstituteWarning = {
  segmentKey: Assignment["segmentKey"];
  playerId: Assignment["playerId"];
  kind: "substitute-overuse";
  message: string;
};

export const substituteCountForRoster = (rosterCount: number) =>
  Math.max(0, rosterCount - POSITIONS.length);

export const orderSubstitutesForDisplay = (players: Player[], inactivePlayerIds: string[]) => {
  const inactiveIds = new Set(inactivePlayerIds);
  return [...players].sort((left, right) =>
    Number(inactiveIds.has(left.id)) - Number(inactiveIds.has(right.id)) ||
    left.displayName.localeCompare(right.displayName),
  );
};

export const scheduleSubstituteWarnings = (
  assignments: Assignment[],
  eligibleIds: string[],
): ScheduleSubstituteWarning[] => {
  const warnings: ScheduleSubstituteWarning[] = [];
  const substituteSegments = new Map(eligibleIds.map((playerId) => [playerId, 0]));
  for (const segment of SEGMENTS) {
    const fieldIds = new Set(
      assignments
        .filter((item) => item.segmentKey === segment.key)
        .map((item) => item.playerId),
    );
    for (const playerId of eligibleIds) {
      if (fieldIds.has(playerId)) continue;
      const segmentCount = (substituteSegments.get(playerId) ?? 0) + 1;
      substituteSegments.set(playerId, segmentCount);
      if (segmentCount > 2) {
        warnings.push({
          segmentKey: segment.key,
          playerId,
          kind: "substitute-overuse",
          message: "Substitute time: this player is scheduled as a sub for more than 14 minutes.",
        });
      }
    }
  }
  return warnings;
};

export const scheduleCellWarnings = (assignments: Assignment[]): ScheduleCellWarning[] => {
  const warnings: ScheduleCellWarning[] = [];
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    const firstSegmentKey = `q${quarter}a` as Assignment["segmentKey"];
    const secondSegmentKey = `q${quarter}b` as Assignment["segmentKey"];
    const first = assignments.filter((item) => item.segmentKey === firstSegmentKey);
    const second = assignments.filter((item) => item.segmentKey === secondSegmentKey);
    const firstHalfMidfielders = new Set(
      first.filter((item) => item.positionKey.includes("Midfield")).map((item) => item.playerId),
    );
    for (const assignment of second.filter(
      (item) => item.positionKey.includes("Midfield") && firstHalfMidfielders.has(item.playerId),
    )) {
      warnings.push({
        segmentKey: assignment.segmentKey,
        positionKey: assignment.positionKey,
        playerId: assignment.playerId,
        kind: "midfield-repeat",
        message: "Midfield repeat: this player also played midfield in the first half of the quarter.",
      });
    }
    const firstGoalkeeper = first.find((item) => item.positionKey === "goalkeeper");
    const secondGoalkeeper = second.find((item) => item.positionKey === "goalkeeper");
    if (firstGoalkeeper && secondGoalkeeper && firstGoalkeeper.playerId !== secondGoalkeeper.playerId) {
      warnings.push({
        segmentKey: secondGoalkeeper.segmentKey,
        positionKey: secondGoalkeeper.positionKey,
        playerId: secondGoalkeeper.playerId,
        kind: "goalkeeper-change",
        message: "Goalkeeper change: this player differs from the first half of the quarter.",
      });
    }
  }
  const goalkeeperSegments = new Map<string, number>();
  for (const segment of SEGMENTS) {
    const goalkeeper = assignments.find(
      (item) => item.segmentKey === segment.key && item.positionKey === "goalkeeper",
    );
    if (!goalkeeper) continue;
    const segmentCount = (goalkeeperSegments.get(goalkeeper.playerId) ?? 0) + 1;
    goalkeeperSegments.set(goalkeeper.playerId, segmentCount);
    if (segmentCount > 2) {
      warnings.push({
        segmentKey: goalkeeper.segmentKey,
        positionKey: goalkeeper.positionKey,
        playerId: goalkeeper.playerId,
        kind: "goalkeeper-overuse",
        message: "Goalkeeper time: this player is scheduled for more than 14 minutes in goal.",
      });
    }
  }
  return warnings;
};

export const validateAssignments = (assignments: Assignment[], eligibleIds: string[]) => {
  const errors: string[] = [];
  const eligible = new Set(eligibleIds);
  for (const segment of SEGMENTS) {
    const cells = assignments.filter((item) => item.segmentKey === segment.key);
    if (cells.length !== POSITIONS.length) errors.push(`${segment.label} does not fill all seven positions.`);
    const players = cells.map((item) => item.playerId);
    if (new Set(players).size !== players.length) errors.push(`${segment.label} assigns a player twice.`);
    if (cells.some((item) => !eligible.has(item.playerId))) errors.push(`${segment.label} includes an unavailable player.`);
  }
  return errors;
};

export const scoreSchedule = (assignments: Assignment[], eligibleIds: string[]): ScheduleQuality => {
  const counts = new Map(eligibleIds.map((id) => [id, 0]));
  for (const item of assignments) counts.set(item.playerId, (counts.get(item.playerId) ?? 0) + 1);
  const totals = eligibleIds.map((playerId) => ({ playerId, segments: counts.get(playerId) ?? 0, minutes: (counts.get(playerId) ?? 0) * 7 }));
  const segmentCounts = totals.map((item) => item.segments);
  const cellWarnings = scheduleCellWarnings(assignments);
  const midfieldExceptions = cellWarnings.filter((warning) => warning.kind === "midfield-repeat").length;
  const goalkeeperExceptions = cellWarnings.filter((warning) => warning.kind === "goalkeeper-change").length;
  const goalkeeperOveruse = new Set(
    cellWarnings
      .filter((warning) => warning.kind === "goalkeeper-overuse")
      .map((warning) => warning.playerId),
  ).size;
  const substituteOveruse = new Set(
    scheduleSubstituteWarnings(assignments, eligibleIds).map((warning) => warning.playerId),
  ).size;
  const hardViolations = validateAssignments(assignments, eligibleIds);
  return { valid: hardViolations.length === 0, hardViolations, minuteSpread: (Math.max(...segmentCounts) - Math.min(...segmentCounts)) * 7, midfieldExceptions, goalkeeperExceptions, goalkeeperOveruse, substituteOveruse, totals };
};

const selectRepairPlayer = (options: {
  current?: Assignment;
  suggested?: string;
  players: Player[];
  eligible: Set<string>;
  used: Set<string>;
  reserved: Set<string>;
  counts: Map<string, number>;
}) => {
  const { current, suggested, players, eligible, used, reserved, counts } = options;
  if (current && eligible.has(current.playerId) && !used.has(current.playerId)) return current.playerId;
  if (suggested && !used.has(suggested) && !reserved.has(suggested)) return suggested;

  const unreserved = players
    .filter((player) => !used.has(player.id) && !reserved.has(player.id))
    .sort(
      (left, right) =>
        (counts.get(left.id) ?? 0) - (counts.get(right.id) ?? 0) ||
        left.id.localeCompare(right.id),
    )[0];
  return unreserved?.id ?? players.find((player) => !used.has(player.id))?.id;
};

const repairSegment = (options: {
  assignments: Assignment[];
  generated: Assignment[];
  players: Player[];
  eligible: Set<string>;
  counts: Map<string, number>;
  segment: (typeof SEGMENTS)[number];
}) => {
  const { assignments, generated, players, eligible, counts, segment } = options;
  const used = new Set<string>();
  const reserved = new Set(
    assignments
      .filter((item) => item.segmentKey === segment.key && eligible.has(item.playerId))
      .map((item) => item.playerId),
  );

  return POSITIONS.map((position): Assignment => {
    const current = assignments.find(
      (item) => item.segmentKey === segment.key && item.positionKey === position.key,
    );
    if (current?.locked && (!eligible.has(current.playerId) || used.has(current.playerId))) {
      throw new Error(`Locked ${segment.label} ${position.label} assignment is no longer eligible.`);
    }
    const suggested = generated.find(
      (item) => item.segmentKey === segment.key && item.positionKey === position.key,
    )?.playerId;
    const playerId = selectRepairPlayer({
      current,
      suggested,
      players,
      eligible,
      used,
      reserved,
      counts,
    });
    if (!playerId) throw new Error(`Could not repair ${segment.label}.`);

    used.add(playerId);
    counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    const preserved = current?.playerId === playerId;
    return {
      segmentKey: segment.key,
      positionKey: position.key,
      playerId,
      source: preserved ? current.source : "generated",
      locked: preserved ? current.locked : false,
    };
  });
};

export const repairSchedule = (assignments: Assignment[], players: Player[]): Assignment[] => {
  if (players.length < POSITIONS.length) {
    throw new Error("At least seven available players are required.");
  }
  const eligible = new Set(players.map((item) => item.id));
  const generated = generateSchedule(players);
  const counts = new Map(players.map((item) => [item.id, 0]));
  return SEGMENTS.flatMap((segment) =>
    repairSegment({ assignments, generated, players, eligible, counts, segment }),
  );
};

export const replaceAssignment = (assignments: Assignment[], segmentKey: Assignment["segmentKey"], positionKey: PositionKey, playerId: string) => {
  const target = assignments.find((item) => item.segmentKey === segmentKey && item.positionKey === positionKey);
  const existing = assignments.find((item) => item.segmentKey === segmentKey && item.playerId === playerId);
  if (!target) throw new Error("Assignment not found.");
  return assignments.map((item) => {
    if (item === target) return { ...item, playerId, source: "manual" as const };
    if (item === existing) return { ...item, playerId: target.playerId, source: "manual" as const };
    return item;
  });
};

export const elapsedQuarterSeconds = (runningSince: string | undefined, accumulated: number) => Math.min(840, accumulated + (runningSince ? Math.floor((Date.now() - Date.parse(runningSince)) / 1000) : 0));
export const plannedMinutes = (count: number) => Math.round((count * SEGMENT_SECONDS) / 60);
