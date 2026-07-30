import { POSITIONS, SEGMENTS } from "./fixed-game";
import type { Assignment, Schedule } from "./schemas";
import { validateAssignments } from "./scheduling";

export const SCHEDULE_CELL_COUNT = POSITIONS.length * SEGMENTS.length;

export type ScheduleReadiness =
  | {
      kind: "incomplete";
      assignedCount: number;
      totalCount: number;
      missingCount: number;
      message: string;
    }
  | {
      kind: "complete-invalid";
      assignedCount: number;
      totalCount: number;
      missingCount: 0;
      message: string;
      errors: string[];
    }
  | {
      kind: "valid-draft";
      assignedCount: number;
      totalCount: number;
      missingCount: 0;
      message: string;
    }
  | {
      kind: "published";
      assignedCount: number;
      totalCount: number;
      missingCount: number;
      message: string;
    };

export const scheduleReadiness = (
  schedule: Pick<Schedule, "assignments" | "status">,
  eligibleIds: string[],
): ScheduleReadiness => {
  const assignedCount = schedule.assignments.length;
  const missingCount = Math.max(0, SCHEDULE_CELL_COUNT - assignedCount);
  if (schedule.status === "published") {
    return {
      kind: "published",
      assignedCount,
      totalCount: SCHEDULE_CELL_COUNT,
      missingCount,
      message: "Published schedule",
    };
  }
  if (assignedCount < SCHEDULE_CELL_COUNT) {
    return {
      kind: "incomplete",
      assignedCount,
      totalCount: SCHEDULE_CELL_COUNT,
      missingCount,
      message: `Assign ${missingCount} more ${missingCount === 1 ? "cell" : "cells"} before publishing.`,
    };
  }
  const errors = validateAssignments(schedule.assignments, eligibleIds);
  if (errors.length > 0) {
    return {
      kind: "complete-invalid",
      assignedCount,
      totalCount: SCHEDULE_CELL_COUNT,
      missingCount: 0,
      message: "All cells are filled, but the draft has conflicts to repair before publishing.",
      errors,
    };
  }
  return {
    kind: "valid-draft",
    assignedCount,
    totalCount: SCHEDULE_CELL_COUNT,
    missingCount: 0,
    message: "Complete and ready to publish.",
  };
};

export type LockState = "none" | "some" | "all";

export const lockStateForAssignments = (
  assignments: Assignment[],
): LockState => {
  if (assignments.length === 0 || assignments.every((item) => !item.locked)) {
    return "none";
  }
  return assignments.every((item) => item.locked) ? "all" : "some";
};
