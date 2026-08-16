import { describe, expect, it } from "vitest";
import { POSITIONS, SEGMENTS } from "./fixed-game";
import { generateSchedule, repairSchedule, replaceAssignment } from "./scheduling";
import { generateScheduleTarget } from "./schedule-targeted-generation";
import { lockStateForAssignments, scheduleReadiness } from "./schedule-readiness";
import { soccerStoreSchema, type Assignment, type Player, type SoccerStore } from "./schemas";
import { migrateSoccerStore } from "./store-migrations";
import { rosterAndGameActionHandlers } from "./store-roster-game-actions";
import { scheduleActionHandlers } from "./store-schedule-actions";

const stamp = "2026-07-28T12:00:00.000Z";
const nextStamp = "2026-07-28T12:01:00.000Z";
const ids = Array.from(
  { length: 12 },
  (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
);
const gameId = "10000000-0000-4000-8000-000000000001";
const scheduleId = "20000000-0000-4000-8000-000000000001";

const players: Player[] = ids.slice(0, 8).map((id, index) => ({
  id,
  displayName: `Player ${index + 1}`,
  jerseyNumber: String(index + 1),
  color: `#${String(index + 1).padStart(6, "0")}`,
  active: true,
  createdAt: stamp,
  updatedAt: stamp,
}));

const storeWithAssignments = (assignments: Assignment[]): SoccerStore =>
  soccerStoreSchema.parse({
    schemaVersion: 6,
    teamDisplayName: "Test Team",
    seasonName: "Test Season",
    positionLabels: {
      goalkeeper: "Goalkeeper",
      leftDefense: "Left Defense",
      rightDefense: "Right Defense",
      leftMidfield: "Left Midfield",
      rightMidfield: "Right Midfield",
      leftForward: "Left Forward",
      rightForward: "Right Forward",
    },
    players,
    games: [
      {
        id: gameId,
        opponentName: "Test Opponent",
        venueName: "Test Field",
        startsAt: "2026-08-01T12:00:00.000Z",
        status: "scheduled",
        createdAt: stamp,
        updatedAt: stamp,
      },
    ],
    availability: players.map((player) => ({
      gameId,
      playerId: player.id,
      status: "available",
      updatedAt: stamp,
    })),
    schedules: [
      {
        id: scheduleId,
        gameId,
        revision: 1,
        status: "draft",
        assignments,
        history: [],
        future: [],
        generatedAt: stamp,
        updatedAt: stamp,
      },
    ],
    liveGames: [],
    playerPreferences: {
      schemaVersion: 1,
      entries: players.map((player) => ({
        playerId: player.id,
        positionDispositions: {
          goalkeeper: "neutral",
          leftDefense: "neutral",
          rightDefense: "neutral",
          leftMidfield: "neutral",
          rightMidfield: "neutral",
          leftForward: "neutral",
          rightForward: "neutral",
        },
        fieldTimePreference: "standard",
        coachNote: "",
        updatedAt: stamp,
      })),
    },
    users: [],
    sessions: [],
  });

const action = (
  store: SoccerStore,
  name: keyof typeof scheduleActionHandlers,
  payload: Record<string, unknown>,
) => scheduleActionHandlers[name](store, payload, nextStamp);

describe("partial schedule drafts", () => {
  it("creates a new game with a blank persisted draft", () => {
    const store = storeWithAssignments([]);
    store.games = [];
    store.schedules = [];
    store.availability = [];

    const result = rosterAndGameActionHandlers.createGame(
      store,
      {
        opponentName: "Blank Draft FC",
        venueName: "Home",
        startsAt: "2026-09-01T12:00:00.000Z",
      },
      stamp,
    ) as { gameId: string };

    expect(store.schedules).toContainEqual(
      expect.objectContaining({
        gameId: result.gameId,
        status: "draft",
        assignments: [],
        history: [],
        future: [],
      }),
    );
  });

  it("distinguishes incomplete, complete-invalid, valid, and published schedules", () => {
    const complete = generateSchedule(players, { seed: "readiness" });
    expect(scheduleReadiness({ status: "draft", assignments: [] }, ids)).toMatchObject({
      kind: "incomplete",
      assignedCount: 0,
      missingCount: 56,
    });
    expect(
      scheduleReadiness(
        {
          status: "draft",
          assignments: complete.map((assignment, index) =>
            index === 1 ? { ...assignment, playerId: complete[0].playerId } : assignment,
          ),
        },
        ids,
      ),
    ).toMatchObject({ kind: "complete-invalid" });
    expect(
      scheduleReadiness(
        {
          status: "draft",
          assignments: complete,
        },
        ids,
      ),
    ).toMatchObject({ kind: "valid-draft" });
    expect(
      scheduleReadiness(
        {
          status: "published",
          assignments: complete,
        },
        ids,
      ),
    ).toMatchObject({ kind: "published" });
  });

  it("assigns a blank cell, auto-locks it, and preserves the partial draft through undo and redo", () => {
    const store = storeWithAssignments([]);
    action(store, "replaceAssignment", {
      scheduleId,
      expectedRevision: 1,
      segmentKey: "q1a",
      positionKey: "goalkeeper",
      playerId: players[0].id,
    });
    expect(store.schedules[0].assignments).toEqual([
      expect.objectContaining({
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: true,
      }),
    ]);
    expect(store.schedules[0].history).toEqual([[]]);

    action(store, "undoSchedule", {
      scheduleId,
      expectedRevision: 2,
    });
    expect(store.schedules[0].assignments).toEqual([]);
    action(store, "redoSchedule", {
      scheduleId,
      expectedRevision: 3,
    });
    expect(store.schedules[0].assignments).toHaveLength(1);
  });

  it("clears one unlocked assignment and restores its prior lock through undo", () => {
    const original: Assignment = {
      segmentKey: "q1a",
      positionKey: "goalkeeper",
      playerId: players[0].id,
      source: "manual",
      locked: false,
    };
    const store = storeWithAssignments([original]);

    action(store, "clearAssignment", {
      scheduleId,
      expectedRevision: 1,
      segmentKey: "q1a",
      positionKey: "goalkeeper",
    });
    expect(store.schedules[0].assignments).toEqual([]);
    expect(store.schedules[0].history).toEqual([[original]]);

    action(store, "undoSchedule", {
      scheduleId,
      expectedRevision: 2,
    });
    expect(store.schedules[0].assignments).toEqual([original]);
  });

  it("locks only the coach-targeted destination during a swap", () => {
    const assignments: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "generated",
        locked: false,
      },
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: players[1].id,
        source: "generated",
        locked: false,
      },
    ];

    const swapped = replaceAssignment(assignments, "q1a", "goalkeeper", players[1].id);
    expect(swapped.find((item) => item.positionKey === "goalkeeper")).toMatchObject({
      playerId: players[1].id,
      locked: true,
    });
    expect(swapped.find((item) => item.positionKey === "leftDefense")).toMatchObject({
      playerId: players[0].id,
      locked: false,
    });
  });

  it("toggles partial groups to all locked and all-locked groups to none", () => {
    const assignments: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: true,
      },
      {
        segmentKey: "q1b",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: false,
      },
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: players[1].id,
        source: "manual",
        locked: false,
      },
    ];
    const store = storeWithAssignments(assignments);
    expect(
      lockStateForAssignments(
        store.schedules[0].assignments.filter((item) => item.playerId === players[0].id),
      ),
    ).toBe("some");

    action(store, "lockAssignmentGroup", {
      scheduleId,
      expectedRevision: 1,
      scope: { kind: "position", positionKey: "goalkeeper" },
    });
    expect(store.schedules[0].assignments).toHaveLength(3);
    expect(
      store.schedules[0].assignments
        .filter((item) => item.positionKey === "goalkeeper")
        .every((item) => item.locked),
    ).toBe(true);
    expect(
      store.schedules[0].assignments.find((item) => item.positionKey === "leftDefense")?.locked,
    ).toBe(false);

    action(store, "lockAssignmentGroup", {
      scheduleId,
      expectedRevision: 2,
      scope: { kind: "position", positionKey: "goalkeeper" },
    });
    expect(
      store.schedules[0].assignments
        .filter((item) => item.positionKey === "goalkeeper")
        .every((item) => !item.locked),
    ).toBe(true);
    expect(
      store.schedules[0].assignments.find((item) => item.positionKey === "leftDefense")?.locked,
    ).toBe(false);
    expect(store.schedules[0].history).toHaveLength(2);
  });

  it("supports player and segment group locks without filling blank cells", () => {
    const assignments: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: false,
      },
      {
        segmentKey: "q1b",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: false,
      },
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: players[1].id,
        source: "manual",
        locked: false,
      },
    ];
    const store = storeWithAssignments(assignments);
    action(store, "lockAssignmentGroup", {
      scheduleId,
      expectedRevision: 1,
      scope: { kind: "player", playerId: players[0].id },
    });
    expect(
      store.schedules[0].assignments
        .filter((item) => item.playerId === players[0].id)
        .every((item) => item.locked),
    ).toBe(true);
    action(store, "lockAssignmentGroup", {
      scheduleId,
      expectedRevision: 2,
      scope: { kind: "segment", segmentKey: "q1a" },
    });
    expect(
      store.schedules[0].assignments
        .filter((item) => item.segmentKey === "q1a")
        .every((item) => item.locked),
    ).toBe(true);
    expect(store.schedules[0].assignments).toHaveLength(3);
  });

  it("clears a position scope without affecting other assignments and restores locks on undo", () => {
    const assignments: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: true,
      },
      {
        segmentKey: "q1b",
        positionKey: "goalkeeper",
        playerId: players[1].id,
        source: "manual",
        locked: false,
      },
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: players[2].id,
        source: "manual",
        locked: true,
      },
    ];
    const store = storeWithAssignments(assignments);

    action(store, "clearAssignmentGroup", {
      scheduleId,
      expectedRevision: 1,
      scope: { kind: "position", positionKey: "goalkeeper" },
    });
    expect(store.schedules[0].assignments).toEqual([assignments[2]]);

    action(store, "undoSchedule", { scheduleId, expectedRevision: 2 });
    expect(store.schedules[0].assignments).toEqual(assignments);

    action(store, "redoSchedule", { scheduleId, expectedRevision: 3 });
    expect(store.schedules[0].assignments).toEqual([assignments[2]]);
  });

  it("clears segment and player scopes without affecting assignments outside each scope", () => {
    const assignments: Assignment[] = [
      {
        segmentKey: "q1a",
        positionKey: "goalkeeper",
        playerId: players[0].id,
        source: "manual",
        locked: true,
      },
      {
        segmentKey: "q1a",
        positionKey: "leftDefense",
        playerId: players[1].id,
        source: "manual",
        locked: false,
      },
      {
        segmentKey: "q1b",
        positionKey: "rightDefense",
        playerId: players[0].id,
        source: "manual",
        locked: true,
      },
      {
        segmentKey: "q1b",
        positionKey: "leftMidfield",
        playerId: players[2].id,
        source: "manual",
        locked: false,
      },
    ];
    const store = storeWithAssignments(assignments);

    action(store, "clearAssignmentGroup", {
      scheduleId,
      expectedRevision: 1,
      scope: { kind: "segment", segmentKey: "q1a" },
    });
    expect(store.schedules[0].assignments).toEqual([assignments[2], assignments[3]]);

    action(store, "clearAssignmentGroup", {
      scheduleId,
      expectedRevision: 2,
      scope: { kind: "player", playerId: players[0].id },
    });
    expect(store.schedules[0].assignments).toEqual([assignments[3]]);
  });

  it("clears every assignment and lock as one undoable schedule change", () => {
    const complete = generateSchedule(players, { seed: "clear-all" }).map((assignment, index) => ({
      ...assignment,
      locked: index % 2 === 0,
    }));
    const store = storeWithAssignments(complete);

    action(store, "clearScheduleAssignments", {
      scheduleId,
      expectedRevision: 1,
    });
    expect(store.schedules[0].assignments).toEqual([]);
    expect(store.schedules[0].history).toEqual([complete]);
    expect(store.schedules[0].future).toEqual([]);

    action(store, "undoSchedule", {
      scheduleId,
      expectedRevision: 2,
    });
    expect(store.schedules[0].assignments).toEqual(complete);
    expect(store.schedules[0].assignments.some((assignment) => assignment.locked)).toBe(true);
  });

  it("requires the current revision for grouped lock writes", () => {
    const complete = generateSchedule(players, { seed: "group-lock-revision" });
    const store = storeWithAssignments(complete);

    expect(() =>
      action(store, "lockAssignmentGroup", {
        scheduleId,
        scope: { kind: "position", positionKey: "goalkeeper" },
      }),
    ).toThrow();
    expect(store.schedules[0].assignments.every((assignment) => !assignment.locked)).toBe(true);
  });

  it("blocks publishing an incomplete draft with direct recovery text", () => {
    const store = storeWithAssignments([]);
    expect(() =>
      action(store, "publishSchedule", {
        scheduleId,
        expectedRevision: 1,
      }),
    ).toThrow(/Incomplete schedule: Assign 56 more cells/);
    expect(store.schedules[0].status).toBe("draft");
  });

  it("migrates existing complete version-five schedules unchanged", () => {
    const complete = generateSchedule(players, { seed: "migration" });
    const store = storeWithAssignments(complete);
    const legacy = {
      ...JSON.parse(JSON.stringify(store)),
      schemaVersion: 5,
      defensiveContinuityDefault: "goalkeeper-only",
    };
    const migrated = migrateSoccerStore(legacy);
    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.schedules[0].assignments).toEqual(complete);
    expect(migrated.schedules[0].assignments).toHaveLength(POSITIONS.length * SEGMENTS.length);
  });

  it("preserves locked cells through regeneration and repair", () => {
    const complete = generateSchedule(players, { seed: "locked-source" });
    const locked = complete.map((assignment, index) => ({
      ...assignment,
      locked: index === 0,
    }));
    const protectedCell = locked[0];
    const regenerated = generateScheduleTarget({
      players,
      currentAssignments: locked,
      target: { kind: "all" },
    }).assignments;
    expect(
      regenerated.find(
        (assignment) =>
          assignment.segmentKey === protectedCell.segmentKey &&
          assignment.positionKey === protectedCell.positionKey,
      ),
    ).toMatchObject({
      playerId: protectedCell.playerId,
      locked: true,
    });
    expect(
      repairSchedule(locked, players).find(
        (assignment) =>
          assignment.segmentKey === protectedCell.segmentKey &&
          assignment.positionKey === protectedCell.positionKey,
      ),
    ).toMatchObject({
      playerId: protectedCell.playerId,
      locked: true,
    });
  });

  it("returns a successfully regenerated stale schedule to draft status", () => {
    const complete = generateSchedule(players, { seed: "stale-source" });
    const store = storeWithAssignments(complete.slice(0, 14));
    store.schedules[0].status = "stale";

    const result = action(store, "generateScheduleTarget", {
      scheduleId,
      expectedRevision: 1,
      target: { kind: "all" },
    });

    expect(result).toMatchObject({ changed: true });
    expect(store.schedules[0]).toMatchObject({
      status: "draft",
      revision: 2,
    });
  });
});
