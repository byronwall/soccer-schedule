import { randomInt, randomUUID } from "node:crypto";
import { isPlayerColor, pickPlayerColor } from "./player-colors";
import {
  availabilityStatusSchema,
  gameStatusSchema,
  positionLabelsSchema,
  type Game,
} from "./schemas";
import {
  ensureActivePlayerAvailability,
  upsertAvailability,
} from "./store-availability";
import {
  markScheduleStale,
  requireGame,
  requirePlayer,
  type ActionPayload,
  type StoreActionHandler,
} from "./store-action-helpers";

const nextPlayerColor = (players: Array<{ color?: string }>) =>
  pickPlayerColor(
    players.flatMap((player) => player.color ? [player.color] : []),
    randomInt,
  );

const createGameFromPayload = (payload: ActionPayload, stamp: string): Game => ({
  id: randomUUID(),
  opponentName: String(payload.opponentName),
  venueName: String(payload.venueName),
  venueAddress: String(payload.venueAddress || "") || undefined,
  startsAt: new Date(String(payload.startsAt)).toISOString(),
  arrivalAt: payload.arrivalAt
    ? new Date(String(payload.arrivalAt)).toISOString()
    : undefined,
  status: "scheduled",
  createdAt: stamp,
  updatedAt: stamp,
});

export const rosterAndGameActionHandlers: Record<string, StoreActionHandler> = {
  updatePositionLabels: (store, payload) => {
    store.positionLabels = positionLabelsSchema.parse(payload.positionLabels);
  },
  addPlayer: (store, payload, stamp) => {
    const requestedColor = isPlayerColor(payload.color)
      ? payload.color.toUpperCase()
      : undefined;
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
    ensureActivePlayerAvailability(store, stamp);
  },
  updatePlayer: (store, payload, stamp) => {
    const player = requirePlayer(store, payload.id);
    const color = isPlayerColor(payload.color)
      ? payload.color.toUpperCase()
      : player.color;
    if (store.players.some(
      (candidate) => candidate.id !== player.id && candidate.color === color,
    )) {
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
    if (player.active) ensureActivePlayerAvailability(store, stamp);
  },
  deletePlayer: (store, payload) => {
    const hasHistory = store.schedules.some((schedule) =>
      schedule.assignments.some((item) => item.playerId === payload.id));
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
    const game = requireGame(store, payload.gameId);
    const player = requirePlayer(store, payload.playerId);
    if (!player.active) {
      throw new Error("This player is no longer active. Team data has been refreshed.");
    }
    upsertAvailability(store, {
      gameId: game.id,
      playerId: player.id,
      status: availabilityStatusSchema.parse(payload.status),
    }, stamp);
    markScheduleStale(store, game.id, stamp);
  },
  markAllAvailable: (store, payload, stamp) => {
    const game = requireGame(store, payload.gameId);
    ensureActivePlayerAvailability(store, stamp);
    for (const player of store.players.filter((item) => item.active)) {
      upsertAvailability(store, {
        gameId: game.id,
        playerId: player.id,
        status: "available",
      }, stamp);
    }
    markScheduleStale(store, game.id, stamp);
  },
};
