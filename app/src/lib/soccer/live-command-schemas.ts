import { z } from "zod";
import { POSITIONS } from "./fixed-game";

export const liveBaseCommandSchema = z.object({
  gameId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
});
export const livePositionKeySchema = z.enum(POSITIONS.map((position) => position.key));
export const liveSubstituteCommandSchema = liveBaseCommandSchema.extend({
  playerId: z.string().uuid(),
  positionKey: livePositionKeySchema,
});
export const liveSwapCommandSchema = liveBaseCommandSchema.extend({
  firstPositionKey: livePositionKeySchema,
  secondPositionKey: livePositionKeySchema,
});
export const liveGoalCommandSchema = liveBaseCommandSchema.extend({
  playerId: z.string().uuid(),
  submissionId: z.string().uuid(),
});
export const liveVoidCommandSchema = liveBaseCommandSchema.extend({
  targetEventId: z.string().uuid(),
  reason: z.string().trim().max(160).optional(),
});

export const liveCommandSchemas = {
  liveStart: liveBaseCommandSchema,
  livePause: liveBaseCommandSchema,
  liveAdvanceQuarter: liveBaseCommandSchema,
  liveSubstitute: liveSubstituteCommandSchema,
  liveSwapPositions: liveSwapCommandSchema,
  liveRecordGoal: liveGoalCommandSchema,
  liveResetLineup: liveBaseCommandSchema,
  liveVoidEvent: liveVoidCommandSchema,
  liveCompleteAndConfirm: liveBaseCommandSchema,
} as const;

export type LiveSubstituteCommand = z.infer<typeof liveSubstituteCommandSchema>;
export type LiveSwapCommand = z.infer<typeof liveSwapCommandSchema>;
export type LiveGoalCommand = z.infer<typeof liveGoalCommandSchema>;
export type LiveVoidCommand = z.infer<typeof liveVoidCommandSchema>;
