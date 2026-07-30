import { POSITIONS, SEGMENTS, TOTAL_ASSIGNMENTS } from "./fixed-game";
import type { ScheduleQuality } from "./scheduling";
import type { Assignment } from "./schemas";

export type QualityRuleStatus =
  | "pass"
  | "warning"
  | "fail"
  | "not-assessable";

export type QualityRuleReport = {
  id: string;
  label: string;
  priority: number;
  status: QualityRuleStatus;
  summary: string;
  help: string;
  details?: string[];
};

const complete = (assignments: Assignment[]) =>
  assignments.length === TOTAL_ASSIGNMENTS;

const currentAssignmentConflicts = (
  assignments: Assignment[],
  eligibleIds: string[],
) => {
  const eligible = new Set(eligibleIds);
  const conflicts: string[] = [];
  for (const segment of SEGMENTS) {
    const cells = assignments.filter((item) => item.segmentKey === segment.key);
    const positions = new Set<string>();
    const players = new Set<string>();
    for (const cell of cells) {
      if (positions.has(cell.positionKey)) {
        conflicts.push(`${segment.label} assigns ${cell.positionKey} more than once.`);
      }
      if (players.has(cell.playerId)) {
        conflicts.push(`${segment.label} assigns one player to multiple positions.`);
      }
      if (!eligible.has(cell.playerId)) {
        conflicts.push(
          `${segment.label} ${cell.positionKey} uses an unavailable player. Unlock or replace that cell.`,
        );
      }
      positions.add(cell.positionKey);
      players.add(cell.playerId);
    }
  }
  return conflicts;
};

const completedSegmentCount = (assignments: Assignment[]) =>
  SEGMENTS.filter((segment) =>
    assignments.filter((item) => item.segmentKey === segment.key).length ===
    POSITIONS.length).length;

const assignedQuarterPairs = (
  assignments: Assignment[],
  positionKeys: Assignment["positionKey"][],
) => [1, 2, 3, 4].reduce((count, quarter) =>
  count + positionKeys.filter((positionKey) =>
    assignments.some((assignment) =>
      assignment.segmentKey === `q${quarter}a` &&
      assignment.positionKey === positionKey) &&
    assignments.some((assignment) =>
      assignment.segmentKey === `q${quarter}b` &&
      assignment.positionKey === positionKey)).length, 0);

export const buildScheduleQualityReport = (options: {
  assignments: Assignment[];
  eligibleIds: string[];
  quality: ScheduleQuality;
}): QualityRuleReport[] => {
  const { assignments, eligibleIds, quality } = options;
  const isComplete = complete(assignments);
  const conflicts = currentAssignmentConflicts(assignments, eligibleIds);
  const completedSegments = completedSegmentCount(assignments);
  const lockedCount = assignments.filter((assignment) => assignment.locked).length;
  const goalkeeperPairs = assignedQuarterPairs(assignments, ["goalkeeper"]);
  const defenderPairs = assignedQuarterPairs(
    assignments,
    ["leftDefense", "rightDefense"],
  );
  const preferenceExceptions = [
    ...quality.relaxedAvoids.map((item) =>
      `${item.playerId} has ${item.segments} avoided-position segment${item.segments === 1 ? "" : "s"} after higher-priority validity, locks, or balance constraints were applied.`),
    ...(isComplete ? quality.unmetPreferences.map((item) =>
      `${item.playerId} did not receive ${item.positionKey} after higher-priority constraints were applied.`) : []),
  ];
  const continuityDetails = quality.continuityExceptions.map((exception) =>
    `${exception.firstPlayerId} → ${exception.secondPlayerId} · Q${exception.quarter} ${exception.positionKey}: continuity yielded to a higher-priority rule.`);
  return [
    locksRule(lockedCount),
    validityRule(conflicts),
    completenessRule(assignments.length, isComplete),
    gameBalanceRule(quality.minuteSpread, isComplete),
    seasonBalanceRule(isComplete),
    preferenceRule(quality, preferenceExceptions),
    goalkeeperContinuityRule(
      quality,
      goalkeeperPairs,
      continuityDetails,
    ),
    defenderContinuityRule(quality, defenderPairs, continuityDetails),
    substitutionRule(quality.substituteOveruse, completedSegments),
    varietyRule(quality, isComplete),
  ];
};

const completenessRule = (
  count: number,
  isComplete: boolean,
): QualityRuleReport => ({
  id: "completeness",
  label: "Assignment completeness",
  priority: 3,
  status: isComplete ? "pass" : "warning",
  summary: `${count} of ${TOTAL_ASSIGNMENTS} assignments filled`,
  help: "Required before publishing. Empty cells are expected in a partial draft and are not treated as errors.",
});

const validityRule = (conflicts: string[]): QualityRuleReport => ({
  id: "validity",
  label: "Current-cell validity",
  priority: 2,
  status: conflicts.length ? "fail" : "pass",
  summary: conflicts.length
    ? `${conflicts.length} actionable conflict${conflicts.length === 1 ? "" : "s"}`
    : "Filled cells have eligible players and no duplicate use",
  help: "Applied immediately to filled cells. Availability, duplicate-position, and duplicate-player conflicts outrank every generator preference.",
  details: conflicts,
});

const locksRule = (count: number): QualityRuleReport => ({
  id: "locks",
  label: "Coach locks",
  priority: 1,
  status: "pass",
  summary: `${count} assignment${count === 1 ? "" : "s"} protected`,
  help: "Locked cells are preserved before balancing or preference rules. An invalid locked cell is reported under Current-cell validity with the cell to unlock.",
});

const gameBalanceRule = (
  minuteSpread: number,
  isComplete: boolean,
): QualityRuleReport => ({
  id: "game-balance",
  label: "Game-minute balance",
  priority: 4,
  status: isComplete
    ? minuteSpread <= 7 ? "pass" : "warning"
    : "not-assessable",
  summary: isComplete
    ? `${minuteSpread} min spread`
    : "Not yet assessable on a partial draft",
  help: "Compared only after all 56 assignments are filled. A partial draft never passes or fails whole-game fairness.",
});

const seasonBalanceRule = (isComplete: boolean): QualityRuleReport => ({
  id: "season-balance",
  label: "Season-minute balance",
  priority: 5,
  status: isComplete ? "pass" : "not-assessable",
  summary: isComplete
    ? "Included in generation priority"
    : "Not yet assessable on a partial draft",
  help: "The generator compares cumulative earlier-game minutes plus this complete draft. It never projects unfilled future assignments.",
});

const preferenceRule = (
  quality: ScheduleQuality,
  details: string[],
): QualityRuleReport => ({
  id: "preferences",
  label: "Position preferences",
  priority: 6,
  status: quality.avoidAssignmentCount > 0 ? "warning" : "pass",
  summary: quality.avoidAssignmentCount > 0
    ? `${quality.avoidAssignmentCount} avoided-position assignment${quality.avoidAssignmentCount === 1 ? "" : "s"}`
    : `${quality.preferredAssignmentCount} preferred-position assignment${quality.preferredAssignmentCount === 1 ? "" : "s"}`,
  help: "Applied to every filled cell, whether placed manually or generated. Validity, locks, and minute balance may require an avoided assignment.",
  details,
});

const goalkeeperContinuityRule = (
  quality: ScheduleQuality,
  pairCount: number,
  details: string[],
): QualityRuleReport => ({
  id: "goalkeeper-continuity",
  label: "Goalkeeper continuity",
  priority: 7,
  status: pairCount === 0
    ? "not-assessable"
    : quality.goalkeeperExceptions > 0 ? "warning" : "pass",
  summary: pairCount === 0
    ? "Not yet assessable until a goalkeeper quarter pair is filled"
    : `${quality.goalkeeperExceptions} within-quarter change${quality.goalkeeperExceptions === 1 ? "" : "s"}`,
  help: "A soft rule applied when both halves of a quarter are assigned. It is the first continuity tie-breaker, below validity, locks, balance, and preferences.",
  details: details.filter((detail) => detail.includes("goalkeeper")),
});

const defenderContinuityRule = (
  quality: ScheduleQuality,
  pairCount: number,
  details: string[],
): QualityRuleReport => {
  const exceptions = quality.continuityExceptions.filter((item) =>
    item.positionKey.includes("Defense"));
  return {
    id: "defender-continuity",
    label: "Defender continuity",
    priority: 8,
    status: pairCount === 0
      ? "not-assessable"
      : exceptions.length ? "warning" : "pass",
    summary: pairCount === 0
      ? "Not yet assessable until a defender quarter pair is filled"
      : `${exceptions.length} named exception${exceptions.length === 1 ? "" : "s"}`,
    help: "A soft rule after goalkeeper continuity. Fairness or preferences can break it; every break is named here instead of being controlled by a setting.",
    details: details.filter((detail) => detail.includes("Defense")),
  };
};

const substitutionRule = (
  overuse: number,
  completedSegments: number,
): QualityRuleReport => ({
  id: "substitution-load",
  label: "Substitution load",
  priority: 9,
  status: completedSegments === 0
    ? "not-assessable"
    : overuse > 0 ? "warning" : "pass",
  summary: completedSegments === 0
    ? "Not yet assessable until one segment is complete"
    : `${overuse} player${overuse === 1 ? "" : "s"} over the limit in completed segments`,
  help: "Evaluated only from fully assigned segments. Empty segment cells never imply bench time.",
});

const varietyRule = (
  quality: ScheduleQuality,
  isComplete: boolean,
): QualityRuleReport => ({
  id: "whole-game-variety",
  label: "Whole-game role variety",
  priority: 10,
  status: isComplete
    ? quality.experienceWarnings.length > 0 ? "warning" : "pass"
    : "not-assessable",
  summary: isComplete
    ? `${quality.experienceWarnings.length} coverage warning${quality.experienceWarnings.length === 1 ? "" : "s"}`
    : "Not yet assessable on a partial draft",
  help: "Attack and defense coverage is a whole-schedule check. It is reported only after all assignments are filled.",
  details: isComplete
    ? quality.experienceWarnings.map((item) => item.message)
    : undefined,
});
