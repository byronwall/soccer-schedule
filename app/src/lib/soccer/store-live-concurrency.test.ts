import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySoccerAction, getSnapshot } from "./store";

let dataDir = "";
beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "live-concurrency-test-"));
  process.env.APP_DATA_DIR = dataDir;
});
afterAll(async () => {
  delete process.env.APP_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("serialized live-game persistence", () => {
  it("rejects one simultaneous stale writer and preserves an idempotent goal retry after refresh", async () => {
    const before = await getSnapshot();
    const game = before.games[0];
    const scorer = before.players[0];
    await applySoccerAction("liveStart", {
      gameId: game.id,
      expectedRevision: 0,
    });
    const submissionIds = [crypto.randomUUID(), crypto.randomUUID()];
    const results = await Promise.allSettled(
      submissionIds.map((submissionId) =>
        applySoccerAction("liveRecordGoal", {
          gameId: game.id,
          expectedRevision: 1,
          playerId: scorer.id,
          submissionId,
        }),
      ),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const fulfilledIndex = results.findIndex((result) => result.status === "fulfilled");
    const refreshed = (await getSnapshot()).liveGames.find((live) => live.gameId === game.id);
    expect(refreshed?.events.filter((event) => event.type === "own_team_goal_scored")).toHaveLength(
      1,
    );

    await expect(
      applySoccerAction("liveRecordGoal", {
        gameId: game.id,
        expectedRevision: 1,
        playerId: scorer.id,
        submissionId: submissionIds[fulfilledIndex],
      }),
    ).resolves.toMatchObject({ type: "own_team_goal_scored" });
    expect((await getSnapshot()).liveGames.find((live) => live.gameId === game.id)?.revision).toBe(
      2,
    );
  });
});
