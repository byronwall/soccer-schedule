import { randomUUID } from "node:crypto";
import { preferencesForPlayers } from "./player-preferences";
import { repairSchedule, replaceAssignment, scoreSchedule } from "./scheduling";
import {
  generateScheduleTarget,
  scheduleGenerationRequestSchema,
} from "./schedule-targeted-generation";
import {
  assertEditableSchedule,
  assertRevision,
  playersAvailableForGame,
  replaceWorkingSchedule,
  requireGame,
  requireSchedule,
  type StoreActionHandler,
} from "./store-action-helpers";
import { POSITIONS, SEGMENTS, type PositionGroup } from "./fixed-game";
import { scheduleReadiness } from "./schedule-readiness";
import { selectSeasonImpactAssignmentTarget } from "./season-impact-scheduling";
import { z } from "zod";

const groupLockRequestSchema = z.object({
  scheduleId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("player"), playerId: z.string().uuid() }),
    z.object({
      kind: z.literal("position"),
      positionKey: z.enum(POSITIONS.map((item) => item.key)),
    }),
    z.object({ kind: z.literal("segment"), segmentKey: z.enum(SEGMENTS.map((item) => item.key)) }),
  ]),
});
const groupClearRequestSchema = z.object({
  scheduleId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("player"), playerId: z.string().uuid() }),
    z.object({
      kind: z.literal("position"),
      positionKey: z.enum(POSITIONS.map((item) => item.key)),
    }),
    z.object({ kind: z.literal("segment"), segmentKey: z.enum(SEGMENTS.map((item) => item.key)) }),
  ]),
});
const scheduleRevisionRequestSchema = z.object({
  scheduleId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
});
const scheduleCellRequestSchema = scheduleRevisionRequestSchema.extend({
  segmentKey: z.enum(SEGMENTS.map((item) => item.key)),
  positionKey: z.enum(POSITIONS.map((item) => item.key)),
});
const replaceAssignmentRequestSchema = scheduleCellRequestSchema.extend({
  playerId: z.string().uuid(),
});
const seasonImpactAssignmentRequestSchema = scheduleRevisionRequestSchema.extend({
  playerId: z.string().uuid(),
  group: z.enum(["goalkeeper", "defense", "midfield", "forward"] satisfies PositionGroup[]),
});

const recordScheduleChange = (schedule: ReturnType<typeof requireSchedule>) => {
  schedule.history.push(
    schedule.assignments.map((assignment) => ({
      ...assignment,
    })),
  );
  schedule.future = [];
};

const continuityPolicyForGame = () => "goalkeeper-and-defense" as const;

export const scheduleActionHandlers: Record<string, StoreActionHandler> = {
  generateScheduleTarget: (store, payload, stamp) => {
    const request = scheduleGenerationRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const players = playersAvailableForGame(store, schedule.gameId);
    const preferences = preferencesForPlayers(players, store.playerPreferences.entries);
    const currentGame = requireGame(store, schedule.gameId);
    const earlierGameIds = new Set(
      store.games.filter((game) => game.startsAt < currentGame.startsAt).map((game) => game.id),
    );
    const seasonAssignments = store.schedules
      .filter(
        (candidate) => earlierGameIds.has(candidate.gameId) && candidate.status === "published",
      )
      .flatMap((candidate) => candidate.assignments);
    const generated = generateScheduleTarget({
      players,
      knownPlayers: store.players,
      currentAssignments: schedule.assignments,
      seasonAssignments,
      target: request.target,
      preferences,
      continuityPolicy: continuityPolicyForGame(),
    });
    if (!generated.result.changed) return generated.result;
    recordScheduleChange(schedule);
    schedule.assignments = generated.assignments;
    schedule.status = "draft";
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return generated.result;
  },
  editPublishedSchedule: (store, payload, stamp) => {
    const published = requireSchedule(store, payload.scheduleId);
    if (requireGame(store, published.gameId).status === "completed") {
      throw new Error("A completed game's published schedule cannot be edited.");
    }
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
      (() => {
        const players = playersAvailableForGame(store, gameId);
        return repairSchedule(
          source.assignments,
          players,
          preferencesForPlayers(players, store.playerPreferences.entries),
          continuityPolicyForGame(),
        );
      })(),
      stamp,
    );
  },
  replaceAssignment: (store, payload, stamp) => {
    const request = replaceAssignmentRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const availablePlayerIds = new Set(
      playersAvailableForGame(store, schedule.gameId).map((player) => player.id),
    );
    if (!availablePlayerIds.has(request.playerId)) {
      throw new Error("Choose a player who is available for this game.");
    }
    recordScheduleChange(schedule);
    schedule.assignments = replaceAssignment(
      schedule.assignments,
      request.segmentKey,
      request.positionKey,
      request.playerId,
    );
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  assignSeasonImpactSlot: (store, payload, stamp) => {
    const request = seasonImpactAssignmentRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const players = playersAvailableForGame(store, schedule.gameId);
    const target = selectSeasonImpactAssignmentTarget({
      assignments: schedule.assignments,
      playerId: request.playerId,
      group: request.group,
      eligibleIds: players.map((player) => player.id),
      preferences: preferencesForPlayers(players, store.playerPreferences.entries),
    });
    if (!target) return { changed: false };
    recordScheduleChange(schedule);
    schedule.assignments = replaceAssignment(
      schedule.assignments,
      target.segmentKey,
      target.positionKey,
      request.playerId,
    );
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return { changed: true, target };
  },
  clearAssignment: (store, payload, stamp) => {
    const request = scheduleCellRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const assignmentIndex = schedule.assignments.findIndex(
      (item) => item.segmentKey === request.segmentKey && item.positionKey === request.positionKey,
    );
    if (assignmentIndex === -1) return { changed: false };
    if (schedule.assignments[assignmentIndex].locked) {
      throw new Error("Unlock this assignment before clearing it.");
    }
    recordScheduleChange(schedule);
    schedule.assignments = schedule.assignments.filter((_, index) => index !== assignmentIndex);
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return { changed: true };
  },
  undoSchedule: (store, payload, stamp) => {
    const request = scheduleRevisionRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const prior = schedule.history.pop();
    if (!prior) throw new Error("Nothing to undo.");
    schedule.future.push(schedule.assignments);
    schedule.assignments = prior;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  redoSchedule: (store, payload, stamp) => {
    const request = scheduleRevisionRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const next = schedule.future.pop();
    if (!next) throw new Error("Nothing to redo.");
    schedule.history.push(schedule.assignments);
    schedule.assignments = next;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  toggleLock: (store, payload, stamp) => {
    const request = scheduleCellRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const assignment = schedule.assignments.find(
      (item) => item.segmentKey === request.segmentKey && item.positionKey === request.positionKey,
    );
    if (!assignment) throw new Error("Assignment not found.");
    recordScheduleChange(schedule);
    assignment.locked = !assignment.locked;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
  },
  lockAssignmentGroup: (store, payload, stamp) => {
    const request = groupLockRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const matches = schedule.assignments.filter((assignment) => {
      if (request.scope.kind === "player") {
        return assignment.playerId === request.scope.playerId;
      }
      if (request.scope.kind === "position") {
        return assignment.positionKey === request.scope.positionKey;
      }
      return assignment.segmentKey === request.scope.segmentKey;
    });
    if (matches.length === 0) return { changed: false };
    const shouldLock = matches.some((assignment) => !assignment.locked);
    recordScheduleChange(schedule);
    for (const assignment of matches) assignment.locked = shouldLock;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return { changed: true };
  },
  clearAssignmentGroup: (store, payload, stamp) => {
    const request = groupClearRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const matchesScope = (assignment: (typeof schedule.assignments)[number]) => {
      if (request.scope.kind === "player") {
        return assignment.playerId === request.scope.playerId;
      }
      if (request.scope.kind === "position") {
        return assignment.positionKey === request.scope.positionKey;
      }
      return assignment.segmentKey === request.scope.segmentKey;
    };
    if (!schedule.assignments.some(matchesScope)) return { changed: false };
    recordScheduleChange(schedule);
    schedule.assignments = schedule.assignments.filter((assignment) => !matchesScope(assignment));
    schedule.status = "draft";
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return { changed: true };
  },
  removeAllScheduleLocks: (store, payload, stamp) => {
    const request = scheduleRevisionRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    if (schedule.assignments.every((assignment) => !assignment.locked)) {
      return { changed: false };
    }
    recordScheduleChange(schedule);
    for (const assignment of schedule.assignments) assignment.locked = false;
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return { changed: true };
  },
  clearScheduleAssignments: (store, payload, stamp) => {
    const request = scheduleRevisionRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    if (schedule.assignments.length === 0) return { changed: false };
    recordScheduleChange(schedule);
    schedule.assignments = [];
    schedule.status = "draft";
    schedule.revision += 1;
    schedule.updatedAt = stamp;
    return { changed: true };
  },
  publishSchedule: (store, payload, stamp) => {
    const request = scheduleRevisionRequestSchema.parse(payload);
    const schedule = requireSchedule(store, request.scheduleId);
    assertEditableSchedule(schedule.status);
    assertRevision(schedule.revision, request);
    const eligibleIds = store.availability
      .filter((item) => item.gameId === schedule.gameId && item.status === "available")
      .map((item) => item.playerId);
    const readiness = scheduleReadiness(schedule, eligibleIds);
    if (readiness.kind === "incomplete") {
      throw new Error(`Incomplete schedule: ${readiness.message}`);
    }
    if (
      !scoreSchedule(
        schedule.assignments,
        eligibleIds,
        store.playerPreferences.entries,
        continuityPolicyForGame(),
      ).valid
    ) {
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
