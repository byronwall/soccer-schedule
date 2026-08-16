import {
  soccerStoreSchema,
  soccerStoreV2Schema,
  soccerStoreV3Schema,
  soccerStoreV4Schema,
  soccerStoreV5Schema,
  type SoccerStore,
} from "./schemas";
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
  if (version === 6) return soccerStoreSchema.parse(input);
  if (version === 5) {
    const previous = soccerStoreV5Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 6,
    });
  }
  if (version === 4) {
    const previous = soccerStoreV4Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 6,
      liveGames: migrateLegacyLiveGames(previous.liveGames),
    });
  }
  if (version === 3) {
    const previous = soccerStoreV3Schema.parse(input);
    return soccerStoreSchema.parse({
      ...previous,
      schemaVersion: 6,
      liveGames: migrateLegacyLiveGames(previous.liveGames),
    });
  }
  if (version !== 2) {
    throw new Error(`Unsupported soccer store schema version: ${String(version)}.`);
  }
  const previous = soccerStoreV2Schema.parse(input);
  return soccerStoreSchema.parse({
    ...previous,
    schemaVersion: 6,
    liveGames: migrateLegacyLiveGames(previous.liveGames),
    playerPreferences: {
      schemaVersion: 1,
      entries: previous.players.map((player) =>
        createDefaultPlayerPreference(player.id, player.updatedAt),
      ),
    },
  });
};
