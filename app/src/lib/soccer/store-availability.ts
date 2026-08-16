import type { Availability, SoccerStore } from "./schemas";

const availabilityKey = (gameId: string, playerId: string) => `${gameId}:${playerId}`;

export const ensureActivePlayerAvailability = (store: SoccerStore, stamp: string) => {
  const existing = new Set(
    store.availability.map((item) => availabilityKey(item.gameId, item.playerId)),
  );

  for (const game of store.games) {
    for (const player of store.players) {
      const key = availabilityKey(game.id, player.id);
      if (!player.active || existing.has(key)) continue;
      store.availability.push({
        gameId: game.id,
        playerId: player.id,
        status: "unknown",
        updatedAt: stamp,
      });
      existing.add(key);
    }
  }
};

export const upsertAvailability = (
  store: SoccerStore,
  input: Pick<Availability, "gameId" | "playerId" | "status">,
  stamp: string,
) => {
  const existing = store.availability.find(
    (item) => item.gameId === input.gameId && item.playerId === input.playerId,
  );
  if (existing) {
    existing.status = input.status;
    existing.updatedAt = stamp;
    return existing;
  }

  const availability: Availability = { ...input, updatedAt: stamp };
  store.availability.push(availability);
  return availability;
};
