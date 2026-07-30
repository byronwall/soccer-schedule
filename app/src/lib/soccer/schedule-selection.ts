import type { Schedule } from "./schemas";

const schedulePriority = (schedule: Schedule) => {
  if (schedule.status === "draft" || schedule.status === "stale") return 0;
  if (schedule.status === "published") return 1;
  return 2;
};

export const selectCurrentSchedule = (
  schedules: Schedule[],
  gameId: string,
) => schedules
  .filter((schedule) =>
    schedule.gameId === gameId && schedule.status !== "superseded")
  .sort((left, right) => {
    const priorityDifference =
      schedulePriority(left) - schedulePriority(right);
    return priorityDifference ||
      right.updatedAt.localeCompare(left.updatedAt);
  })[0];

export const isEditableSchedule = (schedule?: Schedule) =>
  schedule?.status === "draft" || schedule?.status === "stale";
