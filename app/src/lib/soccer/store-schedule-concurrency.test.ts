import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySoccerAction, getSnapshot } from "./store";

let dataDir = "";

beforeAll(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "schedule-concurrency-test-"));
  process.env.APP_DATA_DIR = dataDir;
});

afterAll(async () => {
  delete process.env.APP_DATA_DIR;
  await rm(dataDir, { recursive: true, force: true });
});

describe("serialized schedule persistence", () => {
  it("accepts one rapid writer and rejects the stale peer without overwriting", async () => {
    let snapshot = await getSnapshot();
    let schedule = snapshot.schedules.find(
      (candidate) =>
        candidate.status === "draft" || candidate.status === "stale",
    );
    if (!schedule) {
      const published = snapshot.schedules.find(
        (candidate) => candidate.status === "published",
      );
      if (!published) throw new Error("Expected a seeded schedule.");
      await applySoccerAction("editPublishedSchedule", {
        scheduleId: published.id,
        expectedRevision: published.revision,
      });
      snapshot = await getSnapshot();
      schedule = snapshot.schedules.find(
        (candidate) =>
          candidate.gameId === published.gameId &&
          candidate.status === "draft",
      );
    }
    if (!schedule) throw new Error("Expected an editable schedule.");

    const cells = schedule.assignments.slice(0, 2);
    if (cells.length < 2) throw new Error("Expected two seeded assignments.");
    const results = await Promise.allSettled(cells.map((cell) =>
      applySoccerAction("toggleLock", {
        scheduleId: schedule.id,
        expectedRevision: schedule.revision,
        segmentKey: cell.segmentKey,
        positionKey: cell.positionKey,
      })));

    expect(results.filter((result) => result.status === "fulfilled"))
      .toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected"))
      .toHaveLength(1);
    expect(results.find((result) => result.status === "rejected"))
      .toMatchObject({ reason: expect.objectContaining({
        message: expect.stringMatching(/Version conflict/),
      }) });

    const refreshed = (await getSnapshot()).schedules.find(
      (candidate) => candidate.id === schedule.id,
    );
    expect(refreshed?.revision).toBe(schedule.revision + 1);
    expect(cells.filter((cell) =>
      refreshed?.assignments.find((assignment) =>
        assignment.segmentKey === cell.segmentKey &&
        assignment.positionKey === cell.positionKey)?.locked !== cell.locked,
    )).toHaveLength(1);
  });
});
