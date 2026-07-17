import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_POSITION_LABELS } from "./fixed-game";
import { pickPlayerColor } from "./player-colors";
import { generateSchedule } from "./scheduling";
import { soccerStoreSchema, type Game, type Player, type SoccerStore } from "./schemas";

const appRoot = () => path.basename(process.cwd()) === "app"
  ? process.cwd()
  : path.join(process.cwd(), "app");
const dataRoot = () => process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(appRoot(), "data");
const storePath = () => path.join(dataRoot(), "soccer", "store.json");
const lockPath = () => path.join(path.dirname(storePath()), "store.lock");
let queue = Promise.resolve();

const seedPlayers = [
  ["Avery Bennett", "4"], ["Maya Brooks", "7"], ["Sofia Carter", "9"],
  ["Nora Diaz", "11"], ["Emma Foster", "13"], ["Zoe Grant", "16"],
  ["Lily Hughes", "18"], ["Chloe Kim", "21"], ["Riley Morgan", "23"],
  ["Grace Patel", "27"], ["Harper Reed", "30"],
];

const createSeedStore = (): SoccerStore => {
  const stamp = new Date().toISOString();
  const players: Player[] = seedPlayers.map(([displayName, jerseyNumber], index) => ({
    id: randomUUID(),
    displayName,
    jerseyNumber,
    color: pickPlayerColor([], () => index),
    active: true,
    createdAt: stamp,
    updatedAt: stamp,
  }));
  const game: Game = {
    id: randomUUID(),
    opponentName: "Northside Comets",
    venueName: "Riverside Fields",
    venueAddress: "1250 River Road",
    startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    arrivalAt: new Date(Date.now() + 3 * 86_400_000 - 2_700_000).toISOString(),
    status: "scheduled",
    createdAt: stamp,
    updatedAt: stamp,
  };
  const assignments = generateSchedule(players);
  return soccerStoreSchema.parse({
    schemaVersion: 2,
    teamDisplayName: "Indy United U12",
    seasonName: "Fall 2026",
    positionLabels: { ...DEFAULT_POSITION_LABELS },
    players,
    games: [game],
    availability: players.map((player) => ({
      gameId: game.id,
      playerId: player.id,
      status: "available",
      updatedAt: stamp,
    })),
    schedules: [{
      id: randomUUID(),
      gameId: game.id,
      revision: 1,
      status: "published",
      assignments,
      history: [],
      future: [],
      generatedAt: stamp,
      updatedAt: stamp,
      publishedAt: stamp,
    }],
    liveGames: [],
    sessions: [],
  });
};

export const readStore = async () => {
  try {
    return soccerStoreSchema.parse(JSON.parse(await readFile(storePath(), "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const store = createSeedStore();
    await persistStore(store);
    return store;
  }
};

const persistStore = async (store: SoccerStore) => {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temporaryPath = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(
    temporaryPath,
    `${JSON.stringify(soccerStoreSchema.parse(store), null, 2)}\n`,
    "utf8",
  );
  await rename(temporaryPath, target);
};

const acquireStoreLock = async () => {
  await mkdir(path.dirname(lockPath()), { recursive: true });
  const startedAt = Date.now();
  while (true) {
    try {
      await mkdir(lockPath());
      return async () => rm(lockPath(), { recursive: true, force: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const lock = await stat(lockPath()).catch(() => null);
      if (lock && Date.now() - lock.mtimeMs > 30_000) {
        await rm(lockPath(), { recursive: true, force: true });
        continue;
      }
      if (Date.now() - startedAt > 5_000) {
        throw new Error("Timed out waiting for the soccer store lock.");
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 25 + randomInt(10)));
    }
  }
};

export const mutateStore = async <T>(operation: (store: SoccerStore) => T | Promise<T>) => {
  const pending = queue.then(async () => {
    const release = await acquireStoreLock();
    try {
      const store = await readStore();
      const result = await operation(store);
      await persistStore(store);
      return result;
    } finally {
      await release();
    }
  });
  queue = pending.then(() => undefined, () => undefined);
  return pending;
};
