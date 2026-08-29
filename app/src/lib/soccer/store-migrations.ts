import {
  soccerStoreSchema,
  soccerStoreV2Schema,
  soccerStoreV3Schema,
  soccerStoreV4Schema,
  soccerStoreV5Schema,
  soccerStoreV6Schema,
  type SoccerStore,
} from "./schemas";
import { DEFAULT_POSITION_COORDINATES } from "./fixed-game";
import { createDefaultPlayerPreference } from "./player-preferences";
import type { LegacyLiveState } from "./live-event-schemas";

const migrateLegacyLiveGames = (liveGames: LegacyLiveState[]) =>
  liveGames.map((live) => ({
    schemaVersion: 1 as const,
    gameId: live.gameId,
    revision: live.revision,
    status: live.status,
    quarter: live.quarter,
    accumulatedQuarterSeconds: live.accumulatedQuarterSeconds,
    runningSince: live.runningSince,
    events: [],
    actualHistoryStatus: "legacy_unavailable" as const,
    updatedAt: live.updatedAt,
  }));

export const migrateSoccerStore = (input: unknown): SoccerStore => {
  const version =
    input && typeof input === "object" && "schemaVersion" in input
      ? (input as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  if (version === 7) return soccerStoreSchema.parse(input);
  if (version === 6) {
    const previous = soccerStoreV6Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 7,
      positionCoordinates: DEFAULT_POSITION_COORDINATES,
    });
  }
  if (version === 5) {
    const previous = soccerStoreV5Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 7,
      positionCoordinates: DEFAULT_POSITION_COORDINATES,
    });
  }
  if (version === 4) {
    const previous = soccerStoreV4Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 7,
      positionCoordinates: DEFAULT_POSITION_COORDINATES,
      liveGames: migrateLegacyLiveGames(previous.liveGames),
    });
  }
  if (version === 3) {
    const previous = soccerStoreV3Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 7,
      positionCoordinates: DEFAULT_POSITION_COORDINATES,
      liveGames: migrateLegacyLiveGames(previous.liveGames),
    });
  }
  if (version !== 2) {
    throw new Error(`Unsupported soccer store schema version: ${String(version)}.`);
  }
  const previous = soccerStoreV2Schema.parse(input);
  return soccerStoreSchema.parse({
    ...previous,
    schemaVersion: 7,
    positionCoordinates: DEFAULT_POSITION_COORDINATES,
    liveGames: migrateLegacyLiveGames(previous.liveGames),
    playerPreferences: {
      schemaVersion: 1,
      entries: previous.players.map((player) =>
        createDefaultPlayerPreference(player.id, player.updatedAt),
      ),
    },
  });
};
