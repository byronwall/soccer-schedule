import { randomUUID } from "node:crypto";
import type { SoccerStore } from "./schemas";

export type ActionPayload = Record<string, unknown>;
export type StoreActionHandler = (
  store: SoccerStore,
  payload: ActionPayload,
  stamp: string,
) => unknown;
export type ScheduleRecord = SoccerStore["schedules"][number];

export const requirePlayer = (store: SoccerStore, id: unknown) => {
  const player = store.players.find((item) => item.id === id);
  if (!player) throw new Error("Player not found.");
  return player;
};

export const requireGame = (store: SoccerStore, id: unknown) => {
  const game = store.games.find((item) => item.id === id);
  if (!game) throw new Error("Game not found.");
  return game;
};

export const requireSchedule = (store: SoccerStore, id: unknown) => {
  const schedule = store.schedules.find((item) => item.id === id);
  if (!schedule) throw new Error("Schedule not found.");
  return schedule;
};

export const assertRevision = (revision: number, payload: ActionPayload) => {
  if (
    payload.expectedRevision !== undefined &&
    Number(payload.expectedRevision) !== revision
  ) {
    throw new Error(
      "Version conflict: this schedule changed on another device. Refresh and reapply your edit.",
    );
  }
};

export const assertEditableSchedule = (status: ScheduleRecord["status"]) => {
  if (status !== "draft" && status !== "stale") {
    throw new Error("Create a new draft before editing a published schedule.");
  }
};

export const playersAvailableForGame = (store: SoccerStore, gameId: string) => {
  const availableIds = store.availability
    .filter((item) => item.gameId === gameId && item.status === "available")
    .map((item) => item.playerId);
  return store.players.filter((item) => item.active && availableIds.includes(item.id));
};

export const markScheduleStale = (store: SoccerStore, gameId: string, stamp: string) => {
  const editable = store.schedules.find(
    (schedule) =>
      schedule.gameId === gameId &&
      (schedule.status === "draft" || schedule.status === "stale"),
  );
  if (editable) {
    editable.status = "stale";
    editable.updatedAt = stamp;
    return;
  }

  const published = store.schedules.find(
    (schedule) => schedule.gameId === gameId && schedule.status === "published",
  );
  if (!published) return;
  store.schedules.push({
    id: randomUUID(),
    gameId,
    revision: 1,
    status: "stale",
    assignments: published.assignments.map((assignment) => ({ ...assignment })),
    history: [],
    future: [],
    generatedAt: published.generatedAt,
    updatedAt: stamp,
  });
};

export const replaceWorkingSchedule = (
  store: SoccerStore,
  gameId: string,
  assignments: ScheduleRecord["assignments"],
  stamp: string,
) => {
  store.schedules = store.schedules.filter(
    (item) => item.gameId !== gameId || item.status === "published",
  );
  store.schedules.push({
    id: randomUUID(),
    gameId,
    revision: 1,
    status: "draft",
    assignments,
    history: [],
    future: [],
    generatedAt: stamp,
    updatedAt: stamp,
  });
};
