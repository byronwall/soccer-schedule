import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySoccerAction, getSnapshot } from "./store";
import { mutateStore } from "./store-persistence";

let dataDir = "";

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "coach-companion-schedule-repair-test-"));
  process.env.APP_DATA_DIR = dataDir;
});

afterAll(async () => {
  delete process.env.APP_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("missing schedule repair", () => {
  it("repairs every scheduled game that is missing its initial draft", async () => {
    const first = (await applySoccerAction("createGame", {
      opponentName: "Missing Draft One",
      venueName: "Test Field",
      startsAt: "2026-11-01T12:00:00.000Z",
    })) as { gameId: string };
    const second = (await applySoccerAction("createGame", {
      opponentName: "Missing Draft Two",
      venueName: "Test Field",
      startsAt: "2026-11-08T12:00:00.000Z",
    })) as { gameId: string };
    const gameIds = new Set([first.gameId, second.gameId]);

    await mutateStore((store) => {
      store.schedules = store.schedules.filter((schedule) => !gameIds.has(schedule.gameId));
    });

    const repaired = await getSnapshot();
    const repairedDrafts = repaired.schedules.filter((schedule) => gameIds.has(schedule.gameId));
    expect(repairedDrafts).toHaveLength(2);
    expect(repairedDrafts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: first.gameId, status: "draft", assignments: [] }),
        expect.objectContaining({ gameId: second.gameId, status: "draft", assignments: [] }),
      ]),
    );

    const persistedIds = repairedDrafts.map((schedule) => schedule.id).sort();
    expect(
      (await getSnapshot()).schedules
        .filter((schedule) => gameIds.has(schedule.gameId))
        .map((schedule) => schedule.id)
        .sort(),
    ).toEqual(persistedIds);
  });
});
