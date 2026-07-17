import { randomUUID } from "node:crypto";
import { generateSchedule, repairSchedule, replaceAssignment, scoreSchedule } from "./scheduling";
import {
  assertEditableSchedule,
  assertRevision,
  playersAvailableForGame,
  replaceWorkingSchedule,
  requireSchedule,
  type StoreActionHandler,
} from "./store-action-helpers";

export const scheduleActionHandlers: Record<string, StoreActionHandler> = {
  generateSchedule: (store, payload, stamp) => {
    const gameId = String(payload.gameId);
    replaceWorkingSchedule(
      store,
      gameId,
      generateSchedule(playersAvailableForGame(store, gameId)),
      stamp,
    );
  },
  editPublishedSchedule: (store, payload, stamp) => {
    const published = requireSchedule(store, payload.scheduleId);
    if (published.status !== "published") {
      throw new Error("Only a published schedule can be reopened for editing.");
    }
    assertRevision(published.revision, payload);
    const workingSchedule = store.schedules.find(
      (schedule) =>
        schedule.gameId === published.gameId &&
        (schedule.status === "draft" || schedule.status === "stale"),
    );
    if (workingSchedule) throw new Error("A working draft already exists for this game.");
    store.schedules.push({
      id: randomUUID(),
      gameId: published.gameId,
      revision: 1,
      status: "draft",
      assignments: published.assignments.map((assignment) => ({ ...assignment })),
      history: [],
      future: [],
      generatedAt: published.generatedAt,
      updatedAt: stamp,
    });
  },
  repairSchedule: (store, payload, stamp) => {
    const gameId = String(payload.gameId);
    const source = store.schedules
      .filter((item) => item.gameId === gameId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!source) throw new Error("Schedule not found.");
    replaceWorkingSchedule(
      store,
      gameId,
      repairSchedule(source.assignments, playersAvailableForGame(store, gameId)),
      stamp,
    );
  },
  replaceAssignment: (store, payload, stamp) => {
    const schedule = requireSchedule(store, payload.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, payload);
    schedule.history.push(schedule.assignments);
    schedule.future = [];
    schedule.assignments = replaceAssignment(
      schedule.assignments,
      payload.segmentKey as never,
      payload.positionKey as never,
      String(payload.playerId),
    );
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  undoSchedule: (store, payload, stamp) => {
    const schedule = requireSchedule(store, payload.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, payload);
    const prior = schedule.history.pop();
    if (!prior) throw new Error("Nothing to undo.");
    schedule.future.push(schedule.assignments);
    schedule.assignments = prior;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  redoSchedule: (store, payload, stamp) => {
    const schedule = requireSchedule(store, payload.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, payload);
    const next = schedule.future.pop();
    if (!next) throw new Error("Nothing to redo.");
    schedule.history.push(schedule.assignments);
    schedule.assignments = next;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  toggleLock: (store, payload, stamp) => {
    const schedule = requireSchedule(store, payload.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, payload);
    const assignment = schedule.assignments.find(
      (item) =>
        item.segmentKey === payload.segmentKey &&
        item.positionKey === payload.positionKey,
    );
    if (!assignment) throw new Error("Assignment not found.");
    assignment.locked = !assignment.locked;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  publishSchedule: (store, payload, stamp) => {
    const schedule = requireSchedule(store, payload.scheduleId);
    if (schedule.status !== "draft") {
      throw new Error("Repair or regenerate the stale schedule before publishing.");
    }
    assertRevision(schedule.revision, payload);
    const eligibleIds = store.availability
      .filter((item) => item.gameId === schedule.gameId && item.status === "available")
      .map((item) => item.playerId);
    if (!scoreSchedule(schedule.assignments, eligibleIds).valid) {
      throw new Error("Invalid schedule: repair hard errors before publishing.");
    }
    for (const item of store.schedules.filter(
      (candidate) =>
        candidate.gameId === schedule.gameId &&
        candidate.status === "published" &&
        candidate.id !== schedule.id,
    )) {
      item.status = "superseded";
    }
    schedule.status = "published";
    schedule.publishedAt = stamp;
    schedule.updatedAt = stamp;
  },
};
