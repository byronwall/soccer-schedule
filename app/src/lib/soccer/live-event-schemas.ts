import { z } from "zod";
import { POSITIONS } from "./fixed-game";

const idSchema = z.string().uuid();
const timestampSchema = z.string().datetime();
const positionKeySchema = z.enum(POSITIONS.map((position) => position.key));

export const liveActorSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().trim().min(1).max(60),
});

const eventMetadataSchema = z.object({
  id: idSchema,
  serverTimestamp: timestampSchema,
  quarter: z.number().int().min(1).max(4),
  elapsedGameClockSeconds: z.number().int().min(0).max(840),
  actor: liveActorSchema,
});

const liveEventSchemas = [
  eventMetadataSchema.extend({
    type: z.literal("game_started"),
    payload: z.object({}),
  }),
  eventMetadataSchema.extend({
    type: z.literal("game_paused"),
    payload: z.object({}),
  }),
  eventMetadataSchema.extend({
    type: z.literal("game_resumed"),
    payload: z.object({}),
  }),
  eventMetadataSchema.extend({
    type: z.literal("quarter_advanced"),
    payload: z.object({
      fromQuarter: z.number().int().min(1).max(4),
      toQuarter: z.number().int().min(2).max(4),
    }),
  }),
  eventMetadataSchema.extend({
    type: z.literal("segment_advanced"),
    payload: z.object({}),
  }),
  eventMetadataSchema.extend({
    type: z.literal("bench_replaced_field_player"),
    payload: z.object({
      positionKey: positionKeySchema,
      outgoingPlayerId: idSchema,
      incomingPlayerId: idSchema,
    }),
  }),
  eventMetadataSchema.extend({
    type: z.literal("field_players_swapped"),
    payload: z.object({
      firstPositionKey: positionKeySchema,
      secondPositionKey: positionKeySchema,
      firstPlayerId: idSchema,
      secondPlayerId: idSchema,
    }),
  }),
  eventMetadataSchema.extend({
    type: z.literal("own_team_goal_scored"),
    payload: z.object({
      playerId: idSchema,
      submissionId: idSchema,
    }),
  }),
  eventMetadataSchema.extend({
    type: z.literal("lineup_reset_to_published_plan"),
    payload: z.object({}),
  }),
  eventMetadataSchema.extend({
    type: z.literal("game_completed"),
    payload: z.object({
      fullRegulation: z.boolean().optional(),
    }),
  }),
  eventMetadataSchema.extend({
    type: z.literal("actual_record_confirmed"),
    payload: z.object({}),
  }),
  eventMetadataSchema.extend({
    type: z.literal("event_voided"),
    payload: z.object({
      targetEventId: idSchema,
      reason: z.string().trim().max(160).optional(),
    }),
  }),
] as const;

export const liveEventSchema = z.discriminatedUnion("type", liveEventSchemas);

export const liveStateSchema = z.object({
  schemaVersion: z.literal(1),
  gameId: idSchema,
  revision: z.number().int().nonnegative(),
  status: z.enum(["not_started", "running", "paused", "completed"]),
  quarter: z.number().int().min(1).max(4),
  accumulatedQuarterSeconds: z.number().int().min(0).max(840),
  runningSince: timestampSchema.optional(),
  events: z.array(liveEventSchema),
  actualHistoryStatus: z.enum(["incomplete", "confirmed", "legacy_unavailable"]),
  updatedAt: timestampSchema,
});

export const legacyLiveStateSchema = z.object({
  gameId: idSchema,
  revision: z.number().int().nonnegative(),
  status: z.enum(["not_started", "running", "paused", "completed"]),
  quarter: z.number().int().min(1).max(4),
  accumulatedQuarterSeconds: z.number().int().min(0).max(840),
  runningSince: timestampSchema.optional(),
  overrides: z.array(
    z.object({
      positionKey: positionKeySchema,
      replacementPlayerId: idSchema,
    }),
  ),
  updatedAt: timestampSchema,
});

export type LiveActor = z.infer<typeof liveActorSchema>;
export type LiveEvent = z.infer<typeof liveEventSchema>;
export type LiveEventType = LiveEvent["type"];
export type LiveState = z.infer<typeof liveStateSchema>;
export type LegacyLiveState = z.infer<typeof legacyLiveStateSchema>;
