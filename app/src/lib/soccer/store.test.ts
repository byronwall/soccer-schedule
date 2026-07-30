import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySoccerAction, createAuthUser, getCoachForToken, getSnapshot, listAuthUsers, loginCoach } from "./store";
import { mutateStore } from "./store-persistence";

let dataDir = "";
const configuredNodeEnvironment = process.env.NODE_ENV;
beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "coach-companion-test-"));
  process.env.NODE_ENV = "production";
  process.env.APP_DATA_DIR = dataDir;
  process.env.MASTER_USERNAME = "admin";
  process.env.MASTER_DISPLAY_NAME = "Coach Byron";
  process.env.MASTER_PASSWORD = "demo-sideline-2026";
});
afterAll(async () => {
  delete process.env.APP_DATA_DIR;
  delete process.env.MASTER_USERNAME;
  delete process.env.MASTER_DISPLAY_NAME;
  delete process.env.MASTER_PASSWORD;
  if (configuredNodeEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = configuredNodeEnvironment;
  await rm(dataDir, { recursive: true, force: true });
});

describe("file-backed soccer store", () => {
  it("requires a master password", async () => {
    const configured = process.env.MASTER_PASSWORD;
    delete process.env.MASTER_PASSWORD;
    await expect(loginCoach("admin", "anything")).rejects.toThrow(/MASTER_PASSWORD/);
    process.env.MASTER_PASSWORD = configured;
  });

  it("persists roster create, read, update, status, and delete operations", async () => {
    const before = await getSnapshot();
    await applySoccerAction("addPlayer", { displayName: "Test Player", jerseyNumber: "88" });
    const created = (await getSnapshot()).players.find((item) => item.displayName === "Test Player");
    expect(created?.jerseyNumber).toBe("88");
    expect(created?.color).toMatch(/^#[0-9A-F]{6}$/);
    await expect(applySoccerAction("updatePlayer", { id: created?.id, displayName: "Verified Player", jerseyNumber: "89", color: before.players[0].color })).rejects.toThrow(/not already assigned/);
    await applySoccerAction("updatePlayer", { id: created?.id, displayName: "Verified Player", jerseyNumber: "89", color: created?.color });
    await applySoccerAction("togglePlayer", { id: created?.id });
    expect((await getSnapshot()).players.find((item) => item.id === created?.id)).toMatchObject({ displayName: "Verified Player", jerseyNumber: "89", active: false });
    await applySoccerAction("deletePlayer", { id: created?.id });
    expect((await getSnapshot()).players).toHaveLength(before.players.length);
    expect(new Set(before.players.map((player) => player.color)).size).toBe(before.players.length);
  });

  it("persists editable position labels without changing position ids", async () => {
    const before = await getSnapshot();
    await applySoccerAction("updatePositionLabels", {
      positionLabels: { ...before.positionLabels, leftDefense: "Left Back" },
    });
    expect((await getSnapshot()).positionLabels).toMatchObject({
      goalkeeper: "Goalkeeper",
      leftDefense: "Left Back",
    });
  });

  it("does not expose retired continuity persistence actions", async () => {
    await expect(applySoccerAction(
      "updateDefensiveContinuityDefault",
      { policy: "goalkeeper-and-defense" },
    )).rejects.toThrow(/Unknown soccer action/);
    expect(await getSnapshot()).not.toHaveProperty(
      "defensiveContinuityDefault",
    );
  });

  it("persists exact-position, field-time, and private-note preferences separately from player identity", async () => {
    const before = await getSnapshot();
    const player = before.players[0];
    const dispositions = {
      ...before.playerPreferences.entries.find(
        (entry) => entry.playerId === player.id,
      )!.positionDispositions,
      goalkeeper: "avoid" as const,
      leftMidfield: "prefer" as const,
      rightMidfield: "prefer" as const,
    };

    await applySoccerAction("updatePlayerPreferences", {
      playerId: player.id,
      positionDispositions: dispositions,
      fieldTimePreference: "favor-extra-when-needed",
      coachNote: "Private coach context",
    });

    const after = await getSnapshot();
    expect(after.players.find((candidate) => candidate.id === player.id)).toEqual(
      player,
    );
    expect(after.playerPreferences.entries.find(
      (entry) => entry.playerId === player.id,
    )).toMatchObject({
      playerId: player.id,
      positionDispositions: dispositions,
      fieldTimePreference: "favor-extra-when-needed",
      coachNote: "Private coach context",
    });
  });

  it("authenticates the master user with an opaque persisted super-user session", async () => {
    expect(await loginCoach("admin", "wrong-password")).toBeNull();
    const result = await loginCoach("admin", "demo-sideline-2026");
    expect(result?.token).toBeTruthy();
    expect(result?.coach).toEqual({ id: "super-user", displayName: "Coach Byron", isSuperUser: true });
    await expect(getCoachForToken(result?.token)).resolves.toMatchObject({ id: "super-user", isSuperUser: true });
  });

  it("salts and hashes created user passwords before authenticating them", async () => {
    const user = await createAuthUser({
      username: "assistant-coach",
      displayName: "Assistant Coach",
      password: "x",
    });
    expect(user).toMatchObject({ username: "assistant-coach", isSuperUser: false });
    expect(JSON.stringify(await getSnapshot())).not.toContain('"password":"x"');
    expect(await loginCoach("assistant-coach", "wrong-password")).toBeNull();
    const result = await loginCoach("assistant-coach", "x");
    expect(result?.coach).toMatchObject({ displayName: "Assistant Coach", isSuperUser: false });
    await expect(listAuthUsers()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ username: "admin", isSuperUser: true }),
      expect.objectContaining({ username: "assistant-coach", isSuperUser: false }),
    ]));
  });

  it("creates an editable draft without changing a published schedule", async () => {
    const before = await getSnapshot();
    const published = before.schedules.find((item) => item.status === "published");
    if (!published) throw new Error("Expected a published schedule in the seeded store.");

    await applySoccerAction("editPublishedSchedule", {
      scheduleId: published.id,
      expectedRevision: published.revision,
    });

    const after = await getSnapshot();
    const draft = after.schedules.find(
      (item) => item.gameId === published.gameId && item.status === "draft",
    );
    expect(after.schedules.find((item) => item.id === published.id)?.status).toBe("published");
    expect(draft?.assignments).toEqual(published.assignments);
    expect(draft).toMatchObject({
      gameId: published.gameId,
      status: "draft",
      revision: 1,
      generatedAt: published.generatedAt,
      history: [],
      future: [],
    });
  });

  it("rejects a stale schedule revision instead of overwriting", async () => {
    const schedule = (await getSnapshot()).schedules.find((item) => item.status === "draft");
    await expect(applySoccerAction("toggleLock", { scheduleId: schedule?.id, segmentKey: "q1a", positionKey: "goalkeeper", expectedRevision: 999 })).rejects.toThrow(/Version conflict/);
  });

  it.each([
    "generateSchedule", "previewScheduleRefinement", "acceptScheduleRefinement",
    "previewScheduleCandidates", "acceptScheduleCandidate",
  ])("removes the obsolete %s action contract", async (action) => {
    await expect(applySoccerAction(action, {})).rejects.toThrow(
      /Unknown soccer action/,
    );
  });

  it("returns regeneration feedback when locks prevent a different schedule", async () => {
    const before = await getSnapshot();
    const draft = before.schedules.find((item) => item.status === "draft");
    if (!draft) throw new Error("Expected a working draft.");
    await mutateStore((store) => {
      const storedDraft = store.schedules.find((item) => item.id === draft.id);
      if (!storedDraft) throw new Error("Expected the persisted working draft.");
      storedDraft.assignments = storedDraft.assignments.map((assignment) => ({
        ...assignment,
        locked: true,
      }));
    });

    await expect(applySoccerAction("generateScheduleTarget", {
      scheduleId: draft.id,
      expectedRevision: draft.revision,
      target: { kind: "all" },
    })).resolves.toMatchObject({
      changed: false,
      changedCellIds: [],
      noChangeReason: expect.stringMatching(/locked assignment/),
    });
    expect((await getSnapshot()).schedules.find(
      (item) => item.id === draft.id,
    )?.assignments).toEqual(draft.assignments.map((assignment) => ({
      ...assignment,
      locked: true,
    })));
  });

  it("applies targeted generation as one undoable revision", async () => {
    const before = await getSnapshot();
    const draft = before.schedules.find((item) => item.status === "draft");
    if (!draft) throw new Error("Expected a working draft.");
    await mutateStore((store) => {
      const storedDraft = store.schedules.find((item) => item.id === draft.id);
      if (!storedDraft) throw new Error("Expected the persisted working draft.");
      storedDraft.assignments = storedDraft.assignments.map((assignment) => ({
        ...assignment,
        locked: false,
      })).filter((_, index) => index % 4 !== 0);
    });
    const unlocked = (await getSnapshot()).schedules.find(
      (item) => item.id === draft.id,
    );
    if (!unlocked) throw new Error("Expected the unlocked working draft.");

    const result = await applySoccerAction("generateScheduleTarget", {
      scheduleId: unlocked.id,
      expectedRevision: unlocked.revision,
      target: { kind: "segment", segmentKey: "q2a" },
    });
    expect(result).toMatchObject({
      changed: true,
      changedCellIds: expect.arrayContaining([
        expect.stringMatching(/^q2a:/),
      ]),
    });
    const accepted = (await getSnapshot()).schedules.find(
      (item) => item.id === unlocked.id,
    );
    expect(accepted).toMatchObject({
      revision: unlocked.revision + 1,
    });
    expect(accepted?.history).toHaveLength(unlocked.history.length + 1);
    expect(accepted?.history.at(-1)).toEqual(unlocked.assignments);

    await applySoccerAction("undoSchedule", {
      scheduleId: accepted?.id,
      expectedRevision: accepted?.revision,
    });
    expect((await getSnapshot()).schedules.find(
      (item) => item.id === unlocked.id,
    )?.assignments).toEqual(unlocked.assignments);
  });

  it("preserves the published schedule and incomplete draft after availability changes", async () => {
    const before = await getSnapshot();
    const published = before.schedules.find((item) => item.status === "published");
    const working = before.schedules.find(
      (item) => item.gameId === published?.gameId && item.status === "draft",
    );
    const player = before.players.find(
      (candidate) =>
        candidate.id === working?.assignments[0]?.playerId,
    );
    if (!player) throw new Error("Expected an assigned player in the draft.");

    await applySoccerAction("setAvailability", {
      gameId: published?.gameId,
      playerId: player.id,
      status: "unavailable",
    });

    const after = await getSnapshot();
    expect(after.schedules.find((item) => item.id === published?.id)?.status).toBe("published");
    expect(after.schedules).toContainEqual(expect.objectContaining({
      gameId: published?.gameId,
      status: "draft",
      assignments: working?.assignments,
    }));
  });

  it("upserts availability when a persisted active-player record is missing", async () => {
    const before = await getSnapshot();
    const game = before.games[0];
    const player = before.players.find((item) => item.active);
    if (!player) throw new Error("Expected an active player in the seeded store.");

    await mutateStore((store) => {
      store.availability = store.availability.filter(
        (item) => item.gameId !== game.id || item.playerId !== player.id,
      );
    });

    await applySoccerAction("setAvailability", {
      gameId: game.id,
      playerId: player.id,
      status: "available",
    });

    const matching = (await getSnapshot()).availability.filter(
      (item) => item.gameId === game.id && item.playerId === player.id,
    );
    expect(matching).toHaveLength(1);
    expect(matching[0]?.status).toBe("available");
  });

  it("backfills existing games when a player is added after game creation", async () => {
    const before = await getSnapshot();
    const gameIds = before.games.map((game) => game.id);

    await applySoccerAction("addPlayer", {
      displayName: "Late Roster Addition",
      jerseyNumber: "91",
    });

    const after = await getSnapshot();
    const player = after.players.find(
      (item) => item.displayName === "Late Roster Addition",
    );
    expect(player).toBeDefined();
    expect(after.availability.filter(
      (item) => item.playerId === player?.id && gameIds.includes(item.gameId),
    )).toHaveLength(gameIds.length);
    expect(after.availability.filter(
      (item) => item.playerId === player?.id,
    ).every((item) => item.status === "unknown")).toBe(true);
  });

  it("restores missing availability when a player is reactivated", async () => {
    const snapshot = await getSnapshot();
    const game = snapshot.games[0];
    const player = snapshot.players.find(
      (item) => item.displayName === "Late Roster Addition",
    );
    if (!player) throw new Error("Expected the late roster addition.");

    await applySoccerAction("togglePlayer", { id: player.id });
    await mutateStore((store) => {
      store.availability = store.availability.filter(
        (item) => item.gameId !== game.id || item.playerId !== player.id,
      );
    });
    await applySoccerAction("togglePlayer", { id: player.id });

    expect((await getSnapshot()).availability).toContainEqual(
      expect.objectContaining({
        gameId: game.id,
        playerId: player.id,
        status: "unknown",
      }),
    );
  });

  it("marks every active player in through bulk upserts without changing inactive players", async () => {
    const game = (await getSnapshot()).games[0];
    await applySoccerAction("addPlayer", {
      displayName: "Bulk Active Player",
      jerseyNumber: "92",
    });
    await applySoccerAction("addPlayer", {
      displayName: "Bulk Inactive Player",
      jerseyNumber: "93",
    });
    const added = await getSnapshot();
    const activePlayer = added.players.find(
      (item) => item.displayName === "Bulk Active Player",
    );
    const inactivePlayer = added.players.find(
      (item) => item.displayName === "Bulk Inactive Player",
    );
    if (!activePlayer || !inactivePlayer) {
      throw new Error("Expected both bulk availability test players.");
    }
    await applySoccerAction("togglePlayer", { id: inactivePlayer.id });
    await mutateStore((store) => {
      store.availability = store.availability.filter(
        (item) =>
          item.gameId !== game.id || item.playerId !== activePlayer.id,
      );
    });

    await applySoccerAction("markAllAvailable", { gameId: game.id });

    const after = await getSnapshot();
    const activeIds = after.players
      .filter((player) => player.active)
      .map((player) => player.id);
    expect(activeIds.every((playerId) =>
      after.availability.some(
        (item) =>
          item.gameId === game.id &&
          item.playerId === playerId &&
          item.status === "available",
      ),
    )).toBe(true);
    expect(after.availability.find(
      (item) =>
        item.gameId === game.id && item.playerId === inactivePlayer.id,
    )?.status).toBe("unknown");
  });

  it("does not recreate availability for a player deleted by another client", async () => {
    const snapshot = await getSnapshot();
    const game = snapshot.games[0];
    const player = snapshot.players.find(
      (item) => item.displayName === "Bulk Active Player",
    );
    if (!player) throw new Error("Expected the bulk active test player.");

    await applySoccerAction("deletePlayer", { id: player.id });

    await expect(applySoccerAction("setAvailability", {
      gameId: game.id,
      playerId: player.id,
      status: "available",
    })).rejects.toThrow("Player not found.");
    expect((await getSnapshot()).availability.some(
      (item) => item.playerId === player.id,
    )).toBe(false);
  });

  it("updates a game's lifecycle status", async () => {
    const game = (await getSnapshot()).games[0];
    await applySoccerAction("setGameStatus", { id: game.id, status: "completed" });
    expect((await getSnapshot()).games.find((item) => item.id === game.id)?.status).toBe("completed");
    await expect(applySoccerAction("setGameStatus", { id: game.id, status: "played-ish" })).rejects.toThrow();
  });

});
