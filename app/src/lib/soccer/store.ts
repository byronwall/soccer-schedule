import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { DEFAULT_POSITION_LABELS } from "./fixed-game";
import { gameStatusSchema, positionLabelsSchema, soccerStoreSchema, type Game, type Player, type SoccerStore } from "./schemas";
import { isPlayerColor, pickPlayerColor } from "./player-colors";
import { generateSchedule, repairSchedule, replaceAssignment, scoreSchedule } from "./scheduling";
import { applyLiveAction } from "./store-live-actions";

const now = () => new Date().toISOString();
const appRoot = () => path.basename(process.cwd()) === "app" ? process.cwd() : path.join(process.cwd(), "app");
const storePath = () => path.join(process.env.APP_DATA_DIR ? path.resolve(process.env.APP_DATA_DIR) : path.join(appRoot(), "data"), "soccer", "store.json");
const lockPath = () => path.join(path.dirname(storePath()), "store.lock");
let queue = Promise.resolve();

const seedPlayers = [
  ["Avery Bennett", "4"], ["Maya Brooks", "7"], ["Sofia Carter", "9"], ["Nora Diaz", "11"],
  ["Emma Foster", "13"], ["Zoe Grant", "16"], ["Lily Hughes", "18"], ["Chloe Kim", "21"],
  ["Riley Morgan", "23"], ["Grace Patel", "27"], ["Harper Reed", "30"],
];

const nextPlayerColor = (players: Array<{ color?: string }>) =>
  pickPlayerColor(players.flatMap((player) => player.color ? [player.color] : []), randomInt);

const legacyStoreSchema = z.object({
  schemaVersion: z.literal(1),
  players: z.array(z.object({ color: z.unknown().optional() }).passthrough()),
}).passthrough();

const assignUniqueColors = <T extends { color?: unknown }>(players: T[]) => {
  const usedColors: string[] = [];
  let changed = false;
  const normalizedPlayers = players.map((player) => {
    const requestedColor = isPlayerColor(player.color) ? player.color.toUpperCase() : undefined;
    const color = requestedColor && !usedColors.includes(requestedColor)
      ? requestedColor
      : pickPlayerColor(usedColors, randomInt);
    usedColors.push(color);
    changed ||= color !== player.color;
    return { ...player, color };
  });
  return { players: normalizedPlayers, changed };
};

export const migrateSoccerStore = (value: unknown): { store: SoccerStore; migrated: boolean } => {
  const current = soccerStoreSchema.safeParse(value);
  if (current.success) {
    const normalized = assignUniqueColors(current.data.players);
    return {
      store: normalized.changed ? { ...current.data, players: normalized.players } : current.data,
      migrated: normalized.changed,
    };
  }

  const legacy = legacyStoreSchema.parse(value);
  const normalized = assignUniqueColors(legacy.players);
  return {
    store: soccerStoreSchema.parse({ ...legacy, schemaVersion: 2, players: normalized.players }),
    migrated: true,
  };
};

const createSeedStore = (): SoccerStore => {
  const stamp = now();
  const players: Player[] = seedPlayers.map(([displayName, jerseyNumber], index) => ({
    id: randomUUID(), displayName, jerseyNumber, color: pickPlayerColor([], () => index),
    active: true, createdAt: stamp, updatedAt: stamp,
  }));
  const game: Game = { id: randomUUID(), opponentName: "Northside Comets", venueName: "Riverside Fields", venueAddress: "1250 River Road", startsAt: new Date(Date.now() + 3 * 86_400_000).toISOString(), arrivalAt: new Date(Date.now() + 3 * 86_400_000 - 2_700_000).toISOString(), status: "scheduled", createdAt: stamp, updatedAt: stamp };
  const assignments = generateSchedule(players);
  return {
    schemaVersion: 2, teamDisplayName: "Indy United U12", seasonName: "Fall 2026", positionLabels: { ...DEFAULT_POSITION_LABELS }, players, games: [game],
    availability: players.map((player) => ({ gameId: game.id, playerId: player.id, status: "available", updatedAt: stamp })),
    schedules: [{ id: randomUUID(), gameId: game.id, revision: 1, status: "published", assignments, history: [], future: [], generatedAt: stamp, updatedAt: stamp, publishedAt: stamp }],
    liveGames: [], sessions: [],
  };
};

const readStore = async () => {
  try {
    const { store, migrated } = migrateSoccerStore(JSON.parse(await readFile(storePath(), "utf8")));
    if (migrated) await persist(store);
    return store;
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const store = createSeedStore();
    await persist(store);
    return store;
  }
};

const persist = async (store: SoccerStore) => {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temp, `${JSON.stringify(soccerStoreSchema.parse(store), null, 2)}\n`, "utf8");
  await rename(temp, target);
};

const acquireLock = async () => {
  await mkdir(path.dirname(lockPath()), { recursive: true });
  const startedAt = Date.now();
  while (true) {
    try { await mkdir(lockPath()); return async () => rm(lockPath(), { recursive: true, force: true }); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const lock = await stat(lockPath()).catch(() => null);
      if (lock && Date.now() - lock.mtimeMs > 30_000) { await rm(lockPath(), { recursive: true, force: true }); continue; }
      if (Date.now() - startedAt > 5_000) throw new Error("Timed out waiting for the soccer store lock.");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
};

const mutate = async <T>(operation: (store: SoccerStore) => T | Promise<T>) => {
  const pending = queue.then(async () => { const release = await acquireLock(); try { const store = await readStore(); const result = await operation(store); await persist(store); return result; } finally { await release(); } });
  queue = pending.then(() => undefined, () => undefined);
  return pending;
};

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const coachCredentialsSchema = z.array(z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  password: z.string().min(16),
})).length(2).superRefine((items, context) => {
  if (new Set(items.map((item) => item.id)).size !== 2) context.addIssue({ code: "custom", message: "Coach IDs must be unique." });
  if (new Set(items.map((item) => item.displayName)).size !== 2) context.addIssue({ code: "custom", message: "Coach display names must be unique." });
});

const credentials = () => {
  const configured = process.env.COACH_CREDENTIALS_JSON;
  if (!configured) throw new Error("COACH_CREDENTIALS_JSON must configure exactly two coaches.");
  return coachCredentialsSchema.parse(JSON.parse(configured));
};
export const publicCoaches = () => credentials().map(({ id, displayName }) => ({ id, displayName }));
const credentialVersion = () => process.env.COACH_CREDENTIAL_VERSION?.trim() || "1";
export const loginCoach = async (coachId: string, password: string) => {
  const coach = credentials().find((item) => item.id === coachId);
  if (!coach) return null;
  const expected = createHash("sha256").update(coach.password).digest();
  const supplied = createHash("sha256").update(password).digest();
  if (!timingSafeEqual(expected, supplied)) return null;
  const token = randomBytes(32).toString("base64url");
  await mutate((store) => { store.sessions = store.sessions.filter((item) => Date.parse(item.expiresAt) > Date.now() && item.credentialVersion === credentialVersion()); store.sessions.push({ tokenHash: hashToken(token), coachId: coach.id, coachDisplayName: coach.displayName, credentialVersion: credentialVersion(), expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString() }); });
  return {
    token,
    coach: { id: coach.id, displayName: coach.displayName },
  };
};
export const getCoachForToken = async (token?: string) => {
  if (!token) return null;
  const session = (await readStore()).sessions.find((item) => item.tokenHash === hashToken(token) && item.credentialVersion === credentialVersion() && Date.parse(item.expiresAt) > Date.now());
  return session ? { id: session.coachId, displayName: session.coachDisplayName } : null;
};
export const logoutToken = async (token?: string) => { if (token) await mutate((store) => { store.sessions = store.sessions.filter((item) => item.tokenHash !== hashToken(token)); }); };

export const getSnapshot = async () => {
  const store = await readStore();
  return { ...store, sessions: undefined };
};

const assertRevision = (revision: number, payload: Record<string, unknown>) => {
  if (payload.expectedRevision !== undefined && Number(payload.expectedRevision) !== revision) throw new Error("Version conflict: this schedule changed on another device. Refresh and reapply your edit.");
};

const assertEditableSchedule = (status: SoccerStore["schedules"][number]["status"]) => {
  if (status !== "draft" && status !== "stale") {
    throw new Error("Create a new draft before editing a published schedule.");
  }
};

const markScheduleStale = (store: SoccerStore, gameId: string, stamp: string) => {
  const editable = store.schedules.find(
    (schedule) => schedule.gameId === gameId && (schedule.status === "draft" || schedule.status === "stale"),
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

type ActionPayload = Record<string, unknown>;
type StoreActionHandler = (store: SoccerStore, payload: ActionPayload, stamp: string) => unknown;
type ScheduleRecord = SoccerStore["schedules"][number];

const requirePlayer = (store: SoccerStore, id: unknown) => {
  const player = store.players.find((item) => item.id === id);
  if (!player) throw new Error("Player not found.");
  return player;
};

const requireGame = (store: SoccerStore, id: unknown) => {
  const game = store.games.find((item) => item.id === id);
  if (!game) throw new Error("Game not found.");
  return game;
};

const requireSchedule = (store: SoccerStore, id: unknown) => {
  const schedule = store.schedules.find((item) => item.id === id);
  if (!schedule) throw new Error("Schedule not found.");
  return schedule;
};

const playersAvailableForGame = (store: SoccerStore, gameId: string) => {
  const availableIds = store.availability
    .filter((item) => item.gameId === gameId && item.status === "available")
    .map((item) => item.playerId);
  return store.players.filter((item) => item.active && availableIds.includes(item.id));
};

const replaceWorkingSchedule = (
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

const createGameFromPayload = (payload: ActionPayload, stamp: string): Game => ({
  id: randomUUID(),
  opponentName: String(payload.opponentName),
  venueName: String(payload.venueName),
  venueAddress: String(payload.venueAddress || "") || undefined,
  startsAt: new Date(String(payload.startsAt)).toISOString(),
  arrivalAt: payload.arrivalAt ? new Date(String(payload.arrivalAt)).toISOString() : undefined,
  status: "scheduled",
  createdAt: stamp,
  updatedAt: stamp,
});

const actionHandlers: Record<string, StoreActionHandler> = {
  updatePositionLabels: (store, payload) => {
    store.positionLabels = positionLabelsSchema.parse(payload.positionLabels);
  },
  addPlayer: (store, payload, stamp) => {
    const requestedColor = isPlayerColor(payload.color) ? payload.color.toUpperCase() : undefined;
    const color = requestedColor ?? nextPlayerColor(store.players);
    if (store.players.some((player) => player.color === color)) {
      throw new Error("Choose a color that is not already assigned to another player.");
    }
    store.players.push({
      id: randomUUID(),
      displayName: String(payload.displayName),
      jerseyNumber: String(payload.jerseyNumber || "") || undefined,
      color,
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    });
  },
  updatePlayer: (store, payload, stamp) => {
    const player = requirePlayer(store, payload.id);
    const color = isPlayerColor(payload.color) ? payload.color.toUpperCase() : player.color;
    if (store.players.some((candidate) => candidate.id !== player.id && candidate.color === color)) {
      throw new Error("Choose a color that is not already assigned to another player.");
    }
    player.displayName = String(payload.displayName);
    player.jerseyNumber = String(payload.jerseyNumber || "") || undefined;
    player.color = color;
    player.updatedAt = stamp;
  },
  togglePlayer: (store, payload, stamp) => {
    const player = requirePlayer(store, payload.id);
    player.active = !player.active;
    player.updatedAt = stamp;
  },
  deletePlayer: (store, payload) => {
    const hasHistory = store.schedules.some((schedule) =>
      schedule.assignments.some((item) => item.playerId === payload.id),
    );
    if (hasHistory) {
      throw new Error("Players with schedule history must be marked inactive instead of deleted.");
    }
    store.players = store.players.filter((item) => item.id !== payload.id);
    store.availability = store.availability.filter((item) => item.playerId !== payload.id);
  },
  createGame: (store, payload, stamp) => {
    const game = createGameFromPayload(payload, stamp);
    store.games.push(game);
    store.availability.push(
      ...store.players
        .filter((player) => player.active)
        .map((player) => ({
          gameId: game.id,
          playerId: player.id,
          status: "unknown" as const,
          updatedAt: stamp,
        })),
    );
    return { gameId: game.id };
  },
  updateGame: (store, payload, stamp) => {
    const game = requireGame(store, payload.id);
    game.opponentName = String(payload.opponentName);
    game.venueName = String(payload.venueName);
    game.venueAddress = String(payload.venueAddress || "") || undefined;
    game.startsAt = new Date(String(payload.startsAt)).toISOString();
    game.arrivalAt = payload.arrivalAt
      ? new Date(String(payload.arrivalAt)).toISOString()
      : undefined;
    game.updatedAt = stamp;
  },
  setGameStatus: (store, payload, stamp) => {
    const game = requireGame(store, payload.id);
    game.status = gameStatusSchema.parse(payload.status);
    game.updatedAt = stamp;
  },
  deleteGame: (store, payload) => {
    store.games = store.games.filter((item) => item.id !== payload.id);
    store.availability = store.availability.filter((item) => item.gameId !== payload.id);
    store.schedules = store.schedules.filter((item) => item.gameId !== payload.id);
    store.liveGames = store.liveGames.filter((item) => item.gameId !== payload.id);
  },
  setAvailability: (store, payload, stamp) => {
    const availability = store.availability.find(
      (item) => item.gameId === payload.gameId && item.playerId === payload.playerId,
    );
    if (!availability) throw new Error("Availability not found.");
    availability.status = payload.status as typeof availability.status;
    availability.updatedAt = stamp;
    markScheduleStale(store, String(payload.gameId), stamp);
  },
  markAllAvailable: (store, payload, stamp) => {
    for (const item of store.availability.filter(
      (entry) => entry.gameId === payload.gameId && entry.status === "unknown",
    )) {
      item.status = "available";
      item.updatedAt = stamp;
    }
  },
  generateSchedule: (store, payload, stamp) => {
    const gameId = String(payload.gameId);
    replaceWorkingSchedule(store, gameId, generateSchedule(playersAvailableForGame(store, gameId)), stamp);
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
    if (workingSchedule) {
      throw new Error("A working draft already exists for this game.");
    }
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
    const assignments = repairSchedule(source.assignments, playersAvailableForGame(store, gameId));
    replaceWorkingSchedule(store, gameId, assignments, stamp);
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
      (item) => item.segmentKey === payload.segmentKey && item.positionKey === payload.positionKey,
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

export const applySoccerAction = (action: string, payload: ActionPayload) =>
  mutate((store) => {
    const stamp = now();
    const handler = actionHandlers[action];
    if (handler) return handler(store, payload, stamp) ?? {};
    if (action.startsWith("live")) {
      applyLiveAction(store, action, payload, stamp);
      return {};
    }
    throw new Error(`Unknown soccer action: ${action}`);
  });
