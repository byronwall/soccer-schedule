import { z } from "zod";
import {
  DEFAULT_POSITION_COORDINATES,
  DEFAULT_POSITION_LABELS,
  POSITIONS,
  SEGMENTS,
} from "./fixed-game";
import { legacyLiveStateSchema, liveStateSchema, type LiveState } from "./live-event-schemas";

export { liveStateSchema } from "./live-event-schemas";

const id = z.string().uuid();
const timestamp = z.string().datetime();
export const playerSchema = z.object({
  id,
  displayName: z.string().trim().min(1).max(60),
  jerseyNumber: z.string().trim().max(8).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  active: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const gameStatusSchema = z.enum(["scheduled", "completed", "canceled"]);
export const defensiveContinuityPolicySchema = z.enum([
  "goalkeeper-only",
  "goalkeeper-and-defense",
]);
const legacyGameSchema = z.object({
  id,
  opponentName: z.string().trim().min(1).max(80),
  venueName: z.string().trim().min(1).max(100),
  venueAddress: z.string().trim().max(160).optional(),
  startsAt: timestamp,
  arrivalAt: timestamp.optional(),
  status: gameStatusSchema,
  defensiveContinuityOverride: defensiveContinuityPolicySchema.optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});
export const gameSchema = legacyGameSchema.omit({
  defensiveContinuityOverride: true,
});
export const availabilityStatusSchema = z.enum(["unknown", "available", "unavailable"]);
export const availabilitySchema = z.object({
  gameId: id,
  playerId: id,
  status: availabilityStatusSchema,
  updatedAt: timestamp,
});
export const assignmentSchema = z.object({
  segmentKey: z.enum(SEGMENTS.map((item) => item.key)),
  positionKey: z.enum(POSITIONS.map((item) => item.key)),
  playerId: id,
  source: z.enum(["generated", "manual"]),
  locked: z.boolean(),
});
export const scheduleSchema = z.object({
  id,
  gameId: id,
  revision: z.number().int().positive(),
  status: z.enum(["draft", "published", "stale", "superseded"]),
  assignments: z.array(assignmentSchema).max(56),
  history: z.array(z.array(assignmentSchema).max(56)).default([]),
  future: z.array(z.array(assignmentSchema).max(56)).default([]),
  generatedAt: timestamp,
  updatedAt: timestamp,
  publishedAt: timestamp.optional(),
});
export const authUserSchema = z.object({
  id,
  username: z.string().trim().min(1).max(40),
  displayName: z.string().trim().min(1).max(60),
  passwordSalt: z.string().min(1),
  passwordHash: z.string().min(1),
  createdAt: timestamp,
});
export const sessionSchema = z.object({
  tokenHash: z.string(),
  coachId: z.string(),
  coachDisplayName: z.string(),
  isSuperUser: z.boolean().default(false),
  credentialVersion: z.string().default("1"),
  expiresAt: timestamp,
});
export const positionLabelsSchema = z.object({
  goalkeeper: z.string().trim().min(1).max(40),
  leftDefense: z.string().trim().min(1).max(40),
  rightDefense: z.string().trim().min(1).max(40),
  leftMidfield: z.string().trim().min(1).max(40),
  rightMidfield: z.string().trim().min(1).max(40),
  leftForward: z.string().trim().min(1).max(40),
  rightForward: z.string().trim().min(1).max(40),
});
const fieldCoordinateSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export const positionCoordinatesSchema = z.object({
  goalkeeper: fieldCoordinateSchema,
  leftDefense: fieldCoordinateSchema,
  rightDefense: fieldCoordinateSchema,
  leftMidfield: fieldCoordinateSchema,
  rightMidfield: fieldCoordinateSchema,
  leftForward: fieldCoordinateSchema,
  rightForward: fieldCoordinateSchema,
});
export const positionDispositionSchema = z.enum(["prefer", "neutral", "avoid"]);
export const positionDispositionsSchema = z.object({
  goalkeeper: positionDispositionSchema,
  leftDefense: positionDispositionSchema,
  rightDefense: positionDispositionSchema,
  leftMidfield: positionDispositionSchema,
  rightMidfield: positionDispositionSchema,
  leftForward: positionDispositionSchema,
  rightForward: positionDispositionSchema,
});
export const fieldTimePreferenceSchema = z.enum(["standard", "favor-extra-when-needed"]);
export const playerPreferenceSchema = z.object({
  playerId: id,
  positionDispositions: positionDispositionsSchema,
  fieldTimePreference: fieldTimePreferenceSchema,
  coachNote: z.string().max(500),
  updatedAt: timestamp,
});
export const playerPreferencesSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(playerPreferenceSchema),
});
const legacySoccerStoreFields = {
  teamDisplayName: z.string(),
  seasonName: z.string(),
  players: z.array(playerSchema),
  games: z.array(legacyGameSchema),
  positionLabels: positionLabelsSchema.default(() => ({ ...DEFAULT_POSITION_LABELS })),
  availability: z.array(availabilitySchema),
  schedules: z.array(scheduleSchema),
  liveGames: z.array(legacyLiveStateSchema),
  users: z.array(authUserSchema).default([]),
  sessions: z.array(sessionSchema),
};
export const soccerStoreV2Schema = z.object({
  schemaVersion: z.literal(2),
  ...legacySoccerStoreFields,
});
export const soccerStoreV3Schema = z.object({
  schemaVersion: z.literal(3),
  ...legacySoccerStoreFields,
  playerPreferences: playerPreferencesSchema,
});
export const soccerStoreV4Schema = z.object({
  schemaVersion: z.literal(4),
  ...legacySoccerStoreFields,
  playerPreferences: playerPreferencesSchema,
  defensiveContinuityDefault: defensiveContinuityPolicySchema,
});
export const soccerStoreV5Schema = z.object({
  schemaVersion: z.literal(5),
  ...legacySoccerStoreFields,
  liveGames: z.array(liveStateSchema),
  playerPreferences: playerPreferencesSchema,
  defensiveContinuityDefault: defensiveContinuityPolicySchema,
});
export const soccerStoreV6Schema = z.object({
  schemaVersion: z.literal(6),
  ...legacySoccerStoreFields,
  games: z.array(gameSchema),
  liveGames: z.array(liveStateSchema),
  playerPreferences: playerPreferencesSchema,
});
export const soccerStoreSchema = z.object({
  schemaVersion: z.literal(7),
  ...legacySoccerStoreFields,
  games: z.array(gameSchema),
  liveGames: z.array(liveStateSchema),
  playerPreferences: playerPreferencesSchema,
  positionCoordinates: positionCoordinatesSchema.default(() => ({
    ...DEFAULT_POSITION_COORDINATES,
  })),
});
export type Player = z.infer<typeof playerSchema>;
export type Game = z.infer<typeof gameSchema>;
export type GameStatus = z.infer<typeof gameStatusSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type { LiveState };
export type PositionLabels = z.infer<typeof positionLabelsSchema>;
export type PositionCoordinates = z.infer<typeof positionCoordinatesSchema>;
export type PositionDisposition = z.infer<typeof positionDispositionSchema>;
export type PositionDispositions = z.infer<typeof positionDispositionsSchema>;
export type FieldTimePreference = z.infer<typeof fieldTimePreferenceSchema>;
export type PlayerPreference = z.infer<typeof playerPreferenceSchema>;
export type DefensiveContinuityPolicy = z.infer<typeof defensiveContinuityPolicySchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type SoccerStore = z.infer<typeof soccerStoreSchema>;
