import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySoccerAction, getSnapshot } from "./store";
import type { Player, Schedule } from "./schemas";

let dataDir = "";

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "partial-schedule-test-"));
  process.env.APP_DATA_DIR = dataDir;
});

afterAll(async () => {
  delete process.env.APP_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

const requireDraft = async (
  predicate: (schedule: Schedule) => boolean,
) => {
  const draft = (await getSnapshot()).schedules.find(predicate);
  if (!draft) throw new Error("Expected the partial schedule draft.");
  return draft;
};

const requireActivePlayer = (players: Player[]) => {
  const player = players.find((candidate) => candidate.active);
  if (!player) throw new Error("Expected an active player.");
  return player;
};

describe("partial schedule persistence", () => {
  it("preserves a blank-start draft across refresh, undo, redo, and availability changes", async () => {
    const created = await applySoccerAction("createGame", {
      opponentName: "Partial Draft United",
      venueName: "Practice Field",
      startsAt: "2026-10-01T12:00:00.000Z",
    }) as { gameId: string };
    await applySoccerAction("markAllAvailable", { gameId: created.gameId });
    await expect(applySoccerAction("liveStart", {
      gameId: created.gameId,
      expectedRevision: 0,
    })).rejects.toThrow("Publish a schedule before using live mode.");
    const snapshot = await getSnapshot();
    let draft = await requireDraft(
      (schedule) => schedule.gameId === created.gameId,
    );
    expect(draft.assignments).toEqual([]);

    const player = requireActivePlayer(snapshot.players);
    await applySoccerAction("replaceAssignment", {
      scheduleId: draft.id,
      expectedRevision: draft.revision,
      segmentKey: "q1a",
      positionKey: "goalkeeper",
      playerId: player.id,
    });
    const draftId = draft.id;
    draft = await requireDraft((schedule) => schedule.id === draftId);
    expect(draft.assignments).toHaveLength(1);
    expect(draft.assignments[0]).toMatchObject({
      locked: true,
      source: "manual",
    });

    await applySoccerAction("undoSchedule", {
      scheduleId: draft.id,
      expectedRevision: draft.revision,
    });
    draft = await requireDraft((schedule) => schedule.id === draftId);
    expect(draft.assignments).toEqual([]);
    await applySoccerAction("redoSchedule", {
      scheduleId: draft.id,
      expectedRevision: draft.revision,
    });
    draft = await requireDraft((schedule) => schedule.id === draftId);
    expect(draft.assignments).toHaveLength(1);

    await applySoccerAction("setAvailability", {
      gameId: created.gameId,
      playerId: player.id,
      status: "unavailable",
    });
    const afterAvailability = await requireDraft(
      (schedule) => schedule.id === draftId,
    );
    expect(afterAvailability).toMatchObject({
      status: "draft",
      assignments: draft?.assignments,
      history: draft?.history,
      future: draft?.future,
    });
  });
});
