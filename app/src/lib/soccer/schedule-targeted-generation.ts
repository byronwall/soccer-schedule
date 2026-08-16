import { z } from "zod";
import { POSITIONS, SEGMENTS, type PositionKey, type SegmentKey } from "./fixed-game";
import {
  compareGenerationRanks,
  evaluateGenerationQuality,
  generationHardErrors,
  generationPriorityRank,
  scheduleGenerationQualitySchema,
  summarizeGenerationImprovement,
  type ScheduleGenerationQuality,
} from "./schedule-generation-quality";
import { generateSchedule } from "./schedule-generator";
import { continuityPositionKeys } from "./schedule-experience-quality";
import type { Assignment, DefensiveContinuityPolicy, Player, PlayerPreference } from "./schemas";

export const scheduleGenerationTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("player"), playerId: z.string().uuid() }),
  z.object({
    kind: z.literal("position"),
    positionKey: z.enum(POSITIONS.map((position) => position.key)),
  }),
  z.object({
    kind: z.literal("segment"),
    segmentKey: z.enum(SEGMENTS.map((segment) => segment.key)),
  }),
]);

export const scheduleGenerationRequestSchema = z.object({
  scheduleId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  target: scheduleGenerationTargetSchema,
});

export type ScheduleGenerationTarget = z.infer<typeof scheduleGenerationTargetSchema>;

export const scheduleGenerationResultSchema = z.object({
  changed: z.boolean(),
  changedCellIds: z.array(z.string()),
  beforeQuality: scheduleGenerationQualitySchema,
  afterQuality: scheduleGenerationQualitySchema,
  hardErrors: z.array(z.string()),
  summary: z.string().optional(),
  noChangeReason: z.string().optional(),
});

export type ScheduleGenerationResult = z.infer<typeof scheduleGenerationResultSchema>;

type GenerationOptions = {
  players: Player[];
  knownPlayers?: Player[];
  currentAssignments: Assignment[];
  seasonAssignments?: Assignment[];
  target: ScheduleGenerationTarget;
  preferences?: PlayerPreference[];
  continuityPolicy?: DefensiveContinuityPolicy;
};

type Cell = {
  segmentKey: SegmentKey;
  positionKey: PositionKey;
};

type SearchUnit = {
  cells: Cell[];
  anchorPlayerId?: string;
};

type SearchState = {
  assignments: Assignment[];
  quality: ScheduleGenerationQuality;
  changedCellIds: string[];
  signature: string;
};

const BEAM_WIDTH = 24;

const stableCompare = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

const cellId = (cell: Cell) => `${cell.segmentKey}:${cell.positionKey}`;

const cloneAssignments = (assignments: Assignment[]) =>
  assignments.map((assignment) => ({ ...assignment }));

const assignmentAt = (assignments: Assignment[], cell: Cell) =>
  assignments.find(
    (assignment) =>
      assignment.segmentKey === cell.segmentKey && assignment.positionKey === cell.positionKey,
  );

const assignmentChanges = (before: Assignment[], after: Assignment[]) => {
  const ids = new Set([...before.map(cellId), ...after.map(cellId)]);
  return [...ids]
    .filter((id) => {
      const [segmentKey, positionKey] = id.split(":") as [SegmentKey, PositionKey];
      return (
        assignmentAt(before, { segmentKey, positionKey })?.playerId !==
        assignmentAt(after, { segmentKey, positionKey })?.playerId
      );
    })
    .sort(stableCompare);
};

const assignmentSignature = (assignments: Assignment[]) =>
  [...assignments]
    .sort((left, right) => stableCompare(cellId(left), cellId(right)))
    .map((assignment) => `${cellId(assignment)}=${assignment.playerId}`)
    .join("|");

const lockedAssignmentsPreserved = (before: Assignment[], after: Assignment[]) =>
  before
    .filter((assignment) => assignment.locked)
    .every((locked) => {
      const next = assignmentAt(after, locked);
      return next?.playerId === locked.playerId && next.locked;
    });

const canonicalPlayerTargetCells = (options: GenerationOptions): Cell[] => {
  if (options.target.kind !== "player") return [];
  const targetPlayerId = options.target.playerId;
  const current = options.currentAssignments
    .filter((assignment) => assignment.playerId === targetPlayerId)
    .map(({ segmentKey, positionKey }) => ({ segmentKey, positionKey }));
  const empty = SEGMENTS.flatMap((segment) =>
    POSITIONS.flatMap((position) => {
      const cell = {
        segmentKey: segment.key,
        positionKey: position.key,
      };
      return assignmentAt(options.currentAssignments, cell) ? [] : [cell];
    }),
  );
  if (options.players.length < POSITIONS.length) return [...current, ...empty];

  // A canonical full-generation result defines where an absent player may
  // enter a partial draft. It does not choose the targeted result: the shared
  // quality rank below evaluates every actual move.
  const suggested = generateSchedule(options.players, {
    seed: "target-player-scope-v2",
    preferences: options.preferences,
    continuityPolicy: options.continuityPolicy,
    compareAssignments: (left, right) =>
      compareGenerationRanks(
        generationPriorityRank(evaluateGenerationQuality(left, options)),
        generationPriorityRank(evaluateGenerationQuality(right, options)),
      ),
  })
    .filter((assignment) => assignment.playerId === targetPlayerId)
    .map(({ segmentKey, positionKey }) => ({ segmentKey, positionKey }));

  return [
    ...new Map([...current, ...empty, ...suggested].map((cell) => [cellId(cell), cell])).values(),
  ];
};

const targetCells = (options: GenerationOptions): Cell[] => {
  if (options.target.kind === "all") {
    return SEGMENTS.flatMap((segment) =>
      POSITIONS.map((position) => ({
        segmentKey: segment.key,
        positionKey: position.key,
      })),
    );
  }
  if (options.target.kind === "segment") {
    const segmentKey = options.target.segmentKey;
    return POSITIONS.map((position) => ({
      segmentKey,
      positionKey: position.key,
    }));
  }
  if (options.target.kind === "position") {
    const positionKey = options.target.positionKey;
    return SEGMENTS.map((segment) => ({
      segmentKey: segment.key,
      positionKey,
    }));
  }
  return canonicalPlayerTargetCells(options);
};

const pairedPositionKeys = (policy: DefensiveContinuityPolicy | undefined) =>
  new Set(continuityPositionKeys(policy ?? "goalkeeper-and-defense"));

const searchUnits = (options: GenerationOptions): SearchUnit[] => {
  const remaining = new Map(targetCells(options).map((cell) => [cellId(cell), cell]));
  const units: SearchUnit[] = [];
  const paired = pairedPositionKeys(options.continuityPolicy);

  for (const quarter of [1, 2, 3, 4]) {
    for (const positionKey of paired) {
      const cells = (["a", "b"] as const).map((half) => ({
        segmentKey: `q${quarter}${half}` as SegmentKey,
        positionKey,
      }));
      if (!cells.every((cell) => remaining.has(cellId(cell)))) continue;
      cells.forEach((cell) => remaining.delete(cellId(cell)));
      const locked = cells
        .map((cell) => assignmentAt(options.currentAssignments, cell))
        .filter((assignment): assignment is Assignment => !!assignment?.locked);
      const lockedIds = new Set(locked.map((assignment) => assignment.playerId));
      const anchorPlayerId = lockedIds.size === 1 ? [...lockedIds][0] : undefined;
      const anchorFeasible =
        anchorPlayerId &&
        options.players.some((player) => player.id === anchorPlayerId) &&
        cells.every((cell) => {
          const target = assignmentAt(options.currentAssignments, cell);
          if (target?.locked) return target.playerId === anchorPlayerId;
          const counterpart = options.currentAssignments.find(
            (assignment) =>
              assignment.segmentKey === cell.segmentKey &&
              assignment.positionKey !== cell.positionKey &&
              assignment.playerId === anchorPlayerId,
          );
          return !counterpart || (!!target && !counterpart.locked);
        });
      const searchableCells =
        locked.length > 0 && !anchorFeasible
          ? cells.filter((cell) => !assignmentAt(options.currentAssignments, cell)?.locked)
          : cells;
      if (searchableCells.length > 0) {
        units.push({
          cells: searchableCells,
          anchorPlayerId: anchorFeasible ? anchorPlayerId : undefined,
        });
      }
    }
  }

  units.push(
    ...[...remaining.values()]
      .sort((left, right) => stableCompare(cellId(left), cellId(right)))
      .map((cell) => ({
        cells: [cell],
        anchorPlayerId: assignmentAt(options.currentAssignments, cell)?.locked
          ? assignmentAt(options.currentAssignments, cell)?.playerId
          : undefined,
      })),
  );
  return units;
};

const assignPlayerToCell = (assignments: Assignment[], cell: Cell, playerId: string) => {
  const target = assignmentAt(assignments, cell);
  if (target?.locked) return target.playerId === playerId;
  if (target?.playerId === playerId) return true;

  const counterpart = assignments.find(
    (assignment) =>
      assignment.segmentKey === cell.segmentKey &&
      assignment.positionKey !== cell.positionKey &&
      assignment.playerId === playerId,
  );
  if (counterpart?.locked || (counterpart && !target)) return false;

  if (counterpart && target) {
    counterpart.playerId = target.playerId;
    counterpart.source = "generated";
    counterpart.locked = false;
  }
  if (target) {
    target.playerId = playerId;
    target.source = "generated";
    target.locked = false;
  } else {
    assignments.push({
      ...cell,
      playerId,
      source: "generated",
      locked: false,
    });
  }
  return true;
};

const applyUnit = (assignments: Assignment[], unit: SearchUnit, playerId: string) => {
  const next = cloneAssignments(assignments);
  for (const cell of unit.cells) {
    if (!assignPlayerToCell(next, cell, playerId)) return undefined;
  }
  return next;
};

const compareSearchStates = (left: SearchState, right: SearchState) =>
  compareGenerationRanks(
    generationPriorityRank(left.quality),
    generationPriorityRank(right.quality),
  ) ||
  left.changedCellIds.length - right.changedCellIds.length ||
  stableCompare(left.changedCellIds.join("|"), right.changedCellIds.join("|")) ||
  stableCompare(left.signature, right.signature);

const createSearchState = (
  assignments: Assignment[],
  current: Assignment[],
  options: GenerationOptions,
): SearchState => ({
  assignments,
  quality: evaluateGenerationQuality(assignments, options),
  changedCellIds: assignmentChanges(current, assignments),
  signature: assignmentSignature(assignments),
});

const optimizeTarget = (options: GenerationOptions) => {
  const current = cloneAssignments(options.currentAssignments);
  let beam = [createSearchState(current, current, options)];
  const orderedPlayerIds = options.players.map((player) => player.id).sort(stableCompare);

  // At most 44 units (three quarter-paired roles plus 32 independent field
  // cells) are searched. Each step expands at most BEAM_WIDTH states by the
  // available roster, deduplicates exact schedules, and immediately prunes by
  // the full canonical lexicographic rank. This bounds the otherwise enormous
  // 8×7 assignment space while keeping every policy decision explainable.
  for (const unit of searchUnits(options)) {
    const playerIds = unit.anchorPlayerId ? [unit.anchorPlayerId] : orderedPlayerIds;
    const candidates = new Map<string, SearchState>();
    for (const state of beam) {
      candidates.set(state.signature, state);
      for (const playerId of playerIds) {
        const assignments = applyUnit(state.assignments, unit, playerId);
        if (!assignments || !lockedAssignmentsPreserved(current, assignments)) {
          continue;
        }
        const candidate = createSearchState(assignments, current, options);
        const existing = candidates.get(candidate.signature);
        if (!existing || compareSearchStates(candidate, existing) < 0) {
          candidates.set(candidate.signature, candidate);
        }
      }
    }
    beam = [...candidates.values()].sort(compareSearchStates).slice(0, BEAM_WIDTH);
  }

  return beam.filter((state) => state.changedCellIds.length > 0).sort(compareSearchStates)[0];
};

export const generateScheduleTarget = (
  options: GenerationOptions,
): {
  assignments: Assignment[];
  result: ScheduleGenerationResult;
} => {
  const current = cloneAssignments(options.currentAssignments);
  const beforeQuality = evaluateGenerationQuality(current, options);
  const selected = optimizeTarget(options);
  const improved =
    selected &&
    compareGenerationRanks(
      generationPriorityRank(selected.quality),
      generationPriorityRank(beforeQuality),
    ) < 0
      ? selected
      : undefined;

  if (!improved) {
    const hardErrors = generationHardErrors({
      assignments: current,
      currentAssignments: current,
      players: options.players,
      knownPlayers: options.knownPlayers,
    });
    return {
      assignments: current,
      result: {
        changed: false,
        changedCellIds: [],
        beforeQuality,
        afterQuality: beforeQuality,
        hardErrors,
        noChangeReason: current.some((assignment) => assignment.locked)
          ? "No higher-priority improvement is possible without changing a locked assignment."
          : "No higher-priority improvement was found for this target, so the draft was left unchanged.",
      },
    };
  }

  const hardErrors = generationHardErrors({
    assignments: improved.assignments,
    currentAssignments: current,
    players: options.players,
    knownPlayers: options.knownPlayers,
  });
  return {
    assignments: improved.assignments,
    result: {
      changed: true,
      changedCellIds: improved.changedCellIds,
      beforeQuality,
      afterQuality: improved.quality,
      hardErrors,
      summary: summarizeGenerationImprovement(beforeQuality, improved.quality),
    },
  };
};
