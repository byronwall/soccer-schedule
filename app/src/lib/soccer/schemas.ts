import { z } from "zod";
import { DEFAULT_POSITION_LABELS, POSITIONS, SEGMENTS } from "./fixed-game";

const id = z.string().uuid();
const timestamp = z.string().datetime();
export const playerSchema = z.object({
  id, displayName: z.string().trim().min(1).max(60), jerseyNumber: z.string().trim().max(8).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i), active: z.boolean(), createdAt: timestamp, updatedAt: timestamp,
});
export const gameStatusSchema = z.enum(["scheduled", "completed", "canceled"]);
export const gameSchema = z.object({
  id, opponentName: z.string().trim().min(1).max(80), venueName: z.string().trim().min(1).max(100),
  venueAddress: z.string().trim().max(160).optional(), startsAt: timestamp, arrivalAt: timestamp.optional(),
  status: gameStatusSchema, createdAt: timestamp, updatedAt: timestamp,
});
export const availabilitySchema = z.object({
  gameId: id, playerId: id, status: z.enum(["unknown", "available", "unavailable"]), updatedAt: timestamp,
});
export const assignmentSchema = z.object({
  segmentKey: z.enum(SEGMENTS.map((item) => item.key)),
  positionKey: z.enum(POSITIONS.map((item) => item.key)), playerId: id,
  source: z.enum(["generated", "manual"]), locked: z.boolean(),
});
export const scheduleSchema = z.object({
  id, gameId: id, revision: z.number().int().positive(), status: z.enum(["draft", "published", "stale", "superseded"]),
  assignments: z.array(assignmentSchema), history: z.array(z.array(assignmentSchema)).default([]), future: z.array(z.array(assignmentSchema)).default([]),
  generatedAt: timestamp, updatedAt: timestamp, publishedAt: timestamp.optional(),
});
export const liveStateSchema = z.object({
  gameId: id, revision: z.number().int().nonnegative(), status: z.enum(["not_started", "running", "paused", "completed"]),
  quarter: z.number().int().min(1).max(4), accumulatedQuarterSeconds: z.number().int().min(0).max(840),
  runningSince: timestamp.optional(), overrides: z.array(z.object({ positionKey: z.enum(POSITIONS.map((item) => item.key)), replacementPlayerId: id })),
  updatedAt: timestamp,
});
export const sessionSchema = z.object({ tokenHash: z.string(), coachId: z.string(), coachDisplayName: z.string(), credentialVersion: z.string().default("1"), expiresAt: timestamp });
export const positionLabelsSchema = z.object({
  goalkeeper: z.string().trim().min(1).max(40),
  leftDefense: z.string().trim().min(1).max(40),
  rightDefense: z.string().trim().min(1).max(40),
  leftMidfield: z.string().trim().min(1).max(40),
  rightMidfield: z.string().trim().min(1).max(40),
  leftForward: z.string().trim().min(1).max(40),
  rightForward: z.string().trim().min(1).max(40),
});
export const soccerStoreSchema = z.object({
  schemaVersion: z.literal(2), teamDisplayName: z.string(), seasonName: z.string(), players: z.array(playerSchema), games: z.array(gameSchema),
  positionLabels: positionLabelsSchema.default(() => ({ ...DEFAULT_POSITION_LABELS })),
  availability: z.array(availabilitySchema), schedules: z.array(scheduleSchema), liveGames: z.array(liveStateSchema), sessions: z.array(sessionSchema),
});
export type Player = z.infer<typeof playerSchema>;
export type Game = z.infer<typeof gameSchema>;
export type GameStatus = z.infer<typeof gameStatusSchema>;
export type Availability = z.infer<typeof availabilitySchema>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type LiveState = z.infer<typeof liveStateSchema>;
export type PositionLabels = z.infer<typeof positionLabelsSchema>;
export type SoccerStore = z.infer<typeof soccerStoreSchema>;
