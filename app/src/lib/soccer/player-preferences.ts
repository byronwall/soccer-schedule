import { POSITIONS, type PositionKey } from "./fixed-game";
import {
  playerPreferenceSchema,
  positionDispositionsSchema,
  type Player,
  type PlayerPreference,
  type PositionDisposition,
  type SoccerStore,
} from "./schemas";

export type PreferenceRoleGroup = "attack" | "midfield" | "defense" | "goalkeeper";

export const MAX_POSITIONS_PER_DISPOSITION = 2;

export const positionDispositionLimitError = (
  dispositions: PlayerPreference["positionDispositions"],
) => {
  const counts = Object.values(dispositions).reduce(
    (result, disposition) => {
      if (disposition === "prefer") result.prefer += 1;
      if (disposition === "avoid") result.avoid += 1;
      return result;
    },
    { prefer: 0, avoid: 0 },
  );
  if (counts.prefer > MAX_POSITIONS_PER_DISPOSITION) {
    return "Prefer is limited to 2 positions. Set another preferred position to Neutral first.";
  }
  if (counts.avoid > MAX_POSITIONS_PER_DISPOSITION) {
    return "Avoid is limited to 2 positions. Set another avoided position to Neutral first.";
  }
  return undefined;
};

export const assertPositionDispositionLimits = (
  dispositions: PlayerPreference["positionDispositions"],
) => {
  const error = positionDispositionLimitError(dispositions);
  if (error) throw new Error(error);
  return dispositions;
};

export const updatePositionDisposition = (
  dispositions: PlayerPreference["positionDispositions"],
  positionKey: PositionKey,
  disposition: PositionDisposition,
) => {
  const next = { ...dispositions, [positionKey]: disposition };
  return disposition === "neutral" ? next : assertPositionDispositionLimits(next);
};

export const neutralPositionDispositions = () =>
  positionDispositionsSchema.parse(
    Object.fromEntries(POSITIONS.map((position) => [position.key, "neutral"])),
  );

export const createDefaultPlayerPreference = (
  playerId: string,
  updatedAt: string,
): PlayerPreference =>
  playerPreferenceSchema.parse({
    playerId,
    positionDispositions: neutralPositionDispositions(),
    fieldTimePreference: "standard",
    coachNote: "",
    updatedAt,
  });

export const preferenceForPlayer = (preferences: PlayerPreference[], playerId: string) =>
  preferences.find((preference) => preference.playerId === playerId);

export const ensurePlayerPreferences = (store: SoccerStore, updatedAt: string) => {
  const playerIds = new Set(store.players.map((player) => player.id));
  store.playerPreferences.entries = store.playerPreferences.entries.filter((preference) =>
    playerIds.has(preference.playerId),
  );
  for (const player of store.players) {
    if (!preferenceForPlayer(store.playerPreferences.entries, player.id)) {
      store.playerPreferences.entries.push(createDefaultPlayerPreference(player.id, updatedAt));
    }
  }
};

export type PlayerPreferenceLookup = ReadonlyMap<string, PlayerPreference>;

export const playerPreferenceLookup = (preferences: PlayerPreference[]): PlayerPreferenceLookup =>
  new Map(preferences.map((preference) => [preference.playerId, preference]));

export const positionDisposition = (
  preferences: PlayerPreferenceLookup,
  playerId: string,
  positionKey: PositionKey,
): PositionDisposition => preferences.get(playerId)?.positionDispositions[positionKey] ?? "neutral";

export const favorsExtraTime = (preferences: PlayerPreferenceLookup, playerId: string) =>
  preferences.get(playerId)?.fieldTimePreference === "favor-extra-when-needed";

export const preferencesForPlayers = (players: Player[], preferences: PlayerPreference[]) => {
  const playerIds = new Set(players.map((player) => player.id));
  return preferences.filter((preference) => playerIds.has(preference.playerId));
};

export const hasSchedulingPreferences = (preferences: PlayerPreference[]) =>
  preferences.some(
    (preference) =>
      preference.fieldTimePreference === "favor-extra-when-needed" ||
      Object.values(preference.positionDispositions).some(
        (disposition) => disposition !== "neutral",
      ),
  );

export const applyRoleGroupDisposition = (
  dispositions: PlayerPreference["positionDispositions"],
  group: PreferenceRoleGroup,
  disposition: PositionDisposition,
) => {
  const next = { ...dispositions };
  for (const position of POSITIONS) {
    const matches =
      group === "attack"
        ? position.group === "midfield" || position.group === "forward"
        : position.group === group;
    if (matches) next[position.key] = disposition;
  }
  return disposition === "neutral" ? next : assertPositionDispositionLimits(next);
};
