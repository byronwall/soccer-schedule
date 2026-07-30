import { A, useParams } from "@solidjs/router";
import { Show, createMemo, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import {
  Printer,
} from "lucide-solid";
import { Button, ConfirmDialog, Text, Toaster, toaster } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import {
  SEGMENTS,
  type PositionGroup,
  type PositionKey,
  type SegmentKey,
} from "~/lib/soccer/fixed-game";
import { scoreSchedule } from "~/lib/soccer/scheduling";
import { scheduleReadiness } from "~/lib/soccer/schedule-readiness";
import {
  isEditableSchedule,
  selectCurrentSchedule,
} from "~/lib/soccer/schedule-selection";
import { buildSeasonImpact } from "~/lib/soccer/season-impact";
import {
  seasonImpactAssignmentResultSchema,
  selectSeasonImpactAssignmentTarget,
} from "~/lib/soccer/season-impact-scheduling";
import {
  scheduleGenerationResultSchema,
  type ScheduleGenerationTarget,
} from "~/lib/soccer/schedule-targeted-generation";
import { Box, HStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";
import { PlayerScheduleGrid } from "./PlayerScheduleGrid";
import { PositionGrid, type ScheduleSwap } from "./ScheduleGrids";
import { ScheduleAssignmentDialog } from "./ScheduleAssignmentDialog";
import {
  ScheduleEmptyState,
} from "./ScheduleGenerationStatus";
import { ScheduleToolbar, type ScheduleView } from "./ScheduleToolbar";
import { SchedulePreferenceLegend } from "./SchedulePreferenceLegend";
import { SeasonImpactTable } from "./SeasonImpactTable";

type Selection = { segmentKey: SegmentKey; positionKey: PositionKey };

export function SchedulePage() {
  const data = useSoccerData();
  const params = useParams();
  const [view, setView] = createSignal<ScheduleView>("position");
  const [selection, setSelection] = createSignal<Selection>();
  const [removeLocksOpen, setRemoveLocksOpen] = createSignal(false);
  const [clearScheduleOpen, setClearScheduleOpen] = createSignal(false);
  const [generation, setGeneration] = createStore<{
    pending: boolean;
    changedCellIds: string[];
  }>({
    pending: false,
    changedCellIds: [],
  });
  let highlightTimer: ReturnType<typeof setTimeout> | undefined;
  let generationToastId: string | undefined;
  onCleanup(() => {
    if (highlightTimer) clearTimeout(highlightTimer);
  });

  const game = () => data.snapshot()?.games.find((item) => item.id === params.gameId);
  const schedule = createMemo(() => selectCurrentSchedule(data.snapshot()?.schedules ?? [], params.gameId ?? ""));
  const availableIds = createMemo(
    () =>
      data.snapshot()?.availability
        .filter((item) => item.gameId === params.gameId && item.status === "available")
        .map((item) => item.playerId) ?? [],
  );
  const availablePlayers = createMemo(
    () => data.snapshot()?.players.filter((item) => availableIds().includes(item.id)) ?? [],
  );
  const rosterPlayers = createMemo(
    () => data.snapshot()?.players.filter((item) => item.active) ?? [],
  );
  const inactivePlayerIds = createMemo(
    () => rosterPlayers().filter((item) => !availableIds().includes(item.id)).map((item) => item.id),
  );
  const quality = createMemo(() => {
    const current = schedule();
    return current ? scoreSchedule(
      current.assignments,
      availableIds(),
      data.snapshot()?.playerPreferences.entries,
      "goalkeeper-and-defense",
    ) : undefined;
  });
  const readiness = createMemo(() => {
    const current = schedule();
    return current
      ? scheduleReadiness(current, availableIds())
      : undefined;
  });
  const seasonImpact = createMemo(() => {
    const snapshot = data.snapshot();
    const currentGame = game();
    const currentSchedule = schedule();
    if (!snapshot || !currentGame || !currentSchedule) return undefined;
    return buildSeasonImpact({
      currentGame,
      currentAssignments: currentSchedule.assignments,
      games: snapshot.games,
      schedules: snapshot.schedules,
      liveGames: snapshot.liveGames,
      players: rosterPlayers(),
    });
  });

  const player = (id: string) => data.snapshot()?.players.find((item) => item.id === id);
  const segmentLabel = (segmentKey: SegmentKey) =>
    SEGMENTS.find((segment) => segment.key === segmentKey)?.label ?? segmentKey;
  const assignment = (segmentKey: SegmentKey, positionKey: PositionKey) =>
    schedule()?.assignments.find(
      (item) => item.segmentKey === segmentKey && item.positionKey === positionKey,
    );

  const replace = async (playerId: string) => {
    const selected = selection();
    const current = schedule();
    if (!selected || !current || !isEditableSchedule(current)) return;
    await data.run("replaceAssignment", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...selected,
      playerId,
    });
    setSelection();
  };

  const clearAssignment = async () => {
    const selected = selection();
    const current = schedule();
    if (!selected || !current || !isEditableSchedule(current)) return;
    await data.run("clearAssignment", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...selected,
    });
    setSelection();
  };

  const swap = async (change: ScheduleSwap) => {
    const current = schedule();
    if (!current || !isEditableSchedule(current)) return;
    await data.run("replaceAssignment", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...change,
    });
  };

  const toggleLock = async () => {
    const selected = selection();
    const current = schedule();
    if (!selected || !current || !isEditableSchedule(current)) return;
    await data.run("toggleLock", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...selected,
    });
    setSelection();
  };
  const lockGroup = async (
    scope:
      | { kind: "player"; playerId: string }
      | { kind: "position"; positionKey: PositionKey }
      | { kind: "segment"; segmentKey: SegmentKey },
  ) => {
    const current = schedule();
    if (!current || !isEditableSchedule(current)) return;
    await data.run("lockAssignmentGroup", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      scope,
    });
  };
  const clearGroup = async (
    scope:
      | { kind: "player"; playerId: string; label: string }
      | { kind: "position"; positionKey: PositionKey; label: string }
      | { kind: "segment"; segmentKey: SegmentKey; label: string },
  ) => {
    const current = schedule();
    if (!current || !isEditableSchedule(current)) return;
    const { label, ...requestScope } = scope;
    const result = await data.run("clearAssignmentGroup", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      scope: requestScope,
    }) as { changed: boolean };
    if (!result.changed) return;
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = undefined;
    }
    setGeneration({ pending: false, changedCellIds: [] });
    setSelection();
    upsertGenerationToast({
      type: "success",
      title: `${label} cleared`,
      description: "Assignments and their locks were removed.",
      duration: 8_000,
      closable: true,
      action: {
        label: "Undo",
        onClick: () => void undoLatestScheduleChange(
          "Clear undone",
          "Previous assignments and locks were restored.",
        ),
      },
    });
  };
  const removeAllLocks = async () => {
    const current = schedule();
    if (!current || !isEditableSchedule(current)) return;
    await data.run("removeAllScheduleLocks", {
      scheduleId: current.id,
      expectedRevision: current.revision,
    });
  };

  const upsertGenerationToast = (options: Parameters<typeof toaster.create>[0]) => {
    if (generationToastId && toaster.isVisible(generationToastId)) {
      toaster.update(generationToastId, options);
      return;
    }
    generationToastId = toaster.create(options);
  };

  const generateTarget = async (target: ScheduleGenerationTarget) => {
    const current = schedule();
    if (!current || !isEditableSchedule(current) || generation.pending) return;
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = undefined;
    }
    setGeneration({
      pending: true,
      changedCellIds: [],
    });
    upsertGenerationToast({
      type: "loading",
      title: "Updating schedule…",
      description: "Applying locks, availability, balance, and preferences.",
    });
    try {
      const result = scheduleGenerationResultSchema.parse(
        await data.run("generateScheduleTarget", {
          scheduleId: current.id,
          expectedRevision: current.revision,
          target,
        }),
      );
      setGeneration({
        pending: false,
        changedCellIds: result.changedCellIds,
      });
      const changedTitle = `${result.changedCellIds.length} assignment${
        result.changedCellIds.length === 1 ? "" : "s"
      } changed`;
      upsertGenerationToast({
        type: result.changed ? "success" : result.hardErrors.length ? "warning" : "info",
        title: result.changed ? changedTitle : "Schedule unchanged",
        description: [
          result.changed
            ? result.summary
            : result.noChangeReason ?? "The draft was left unchanged.",
          ...result.hardErrors,
        ].filter(Boolean).join(" "),
        duration: 8_000,
        closable: true,
        action: result.changed
          ? {
              label: "Undo",
              onClick: () => void undoLatestScheduleChange(
                "Generation undone",
                "Previous draft restored.",
              ),
            }
          : undefined,
      });
      if (result.changed) {
        setView("position");
        if (highlightTimer) clearTimeout(highlightTimer);
        highlightTimer = setTimeout(
          () => {
            setGeneration("changedCellIds", []);
            highlightTimer = undefined;
          },
          6_000,
        );
      }
      setSelection();
    } catch (error) {
      setGeneration("pending", false);
      const message = error instanceof Error ? error.message : "Try again.";
      const conflict = /Version conflict/.test(message);
      upsertGenerationToast({
        type: conflict ? "warning" : "error",
        title: conflict ? "Schedule refreshed" : "Schedule update failed",
        description: conflict
          ? "This schedule changed elsewhere. It was refreshed without overwriting those changes; review it and try again."
          : message,
        duration: 10_000,
        closable: true,
      });
    }
  };

  const undoLatestScheduleChange = async (
    title: string,
    description: string,
  ) => {
    const current = schedule();
    if (!current) return;
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = undefined;
    }
    await data.run("undoSchedule", {
      scheduleId: current.id,
      expectedRevision: current.revision,
    });
    setGeneration({
      pending: false,
      changedCellIds: [],
    });
    upsertGenerationToast({
      type: "info",
      title,
      description,
      duration: 6_000,
      closable: true,
    });
  };

  const seasonImpactTargetFor = (
    playerId: string,
    group: PositionGroup,
  ) => {
    const current = schedule();
    if (!current || !isEditableSchedule(current)) return undefined;
    return selectSeasonImpactAssignmentTarget({
      assignments: current.assignments,
      playerId,
      group,
      eligibleIds: availableIds(),
      preferences: data.snapshot()?.playerPreferences.entries,
    });
  };

  const scheduleFromSeasonImpact = async (
    playerId: string,
    group: PositionGroup,
  ) => {
    const current = schedule();
    if (!current || !seasonImpactTargetFor(playerId, group)) return;
    const result = seasonImpactAssignmentResultSchema.parse(
      await data.run("assignSeasonImpactSlot", {
        scheduleId: current.id,
        expectedRevision: current.revision,
        playerId,
        group,
      }),
    );
    if (!result.changed) return;
    upsertGenerationToast({
      type: "success",
      title: `${player(playerId)?.displayName ?? "Player"} scheduled`,
      description: `Added a ${group} assignment to the current draft.`,
      duration: 8_000,
      closable: true,
      action: {
        label: "Undo",
        onClick: () => void undoLatestScheduleChange(
          "Assignment undone",
          "Previous draft restored.",
        ),
      },
    });
  };

  const clearSchedule = async () => {
    const current = schedule();
    if (!current || !isEditableSchedule(current) || !current.assignments.length) {
      return;
    }
    await data.run("clearScheduleAssignments", {
      scheduleId: current.id,
      expectedRevision: current.revision,
    });
    if (highlightTimer) {
      clearTimeout(highlightTimer);
      highlightTimer = undefined;
    }
    setGeneration({ pending: false, changedCellIds: [] });
    setSelection();
    upsertGenerationToast({
      type: "success",
      title: "Schedule cleared",
      description: "All assignments and their locks were removed.",
      duration: 8_000,
      closable: true,
      action: {
        label: "Undo",
        onClick: () => void undoLatestScheduleChange(
          "Clear undone",
          "All assignments and locks were restored.",
        ),
      },
    });
  };

  return (
    <Show when={game()}>
      {(currentGame) => (
        <>
          <PageHeader
            eyebrow="Schedule editor"
            title={`vs. ${currentGame().opponentName}`}
            description={schedule()?.status === "published"
              ? "This published rotation is read-only until you choose Edit again."
              : undefined}
            actions={
              <Show when={schedule()?.status === "published"}>
                <HStack gap="2" flexWrap="wrap">
                  <A href={`/games/${params.gameId}/print`}>
                    <Button size="sm" variant="outline">
                      <Printer size={16} /> Print
                    </Button>
                  </A>
                  <A href={`/games/${params.gameId}/live`}>
                    <Button size="sm" variant="outline">Game day</Button>
                  </A>
                </HStack>
              </Show>
            }
          />

          <ScheduleToolbar
            view={view()}
            schedule={schedule()}
            quality={quality()}
            eligibleIds={availableIds()}
            readiness={readiness()}
            playerName={(playerId) => player(playerId)?.displayName ?? "Unknown player"}
            onViewChange={setView}
            onGenerate={() => void generateTarget({ kind: "all" })}
            onEditAgain={() => {
              const current = schedule();
              if (current?.status === "published") {
                void data.run("editPublishedSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onFillAll={() => void generateTarget({ kind: "all" })}
            generationPending={generation.pending}
            onUndo={() => {
              const current = schedule();
              if (current) {
                void data.run("undoSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onRedo={() => {
              const current = schedule();
              if (current) {
                void data.run("redoSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onPublish={() => {
              const current = schedule();
              if (current) {
                void data.run("publishSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onRemoveAllLocks={() => setRemoveLocksOpen(true)}
            onClearAll={() => setClearScheduleOpen(true)}
          />
          <Show when={schedule()} fallback={<ScheduleEmptyState />}>
            {(currentSchedule) => (
              <>
                <Box mb="2">
                  <SchedulePreferenceLegend />
                  <Text mt="2" textStyle="xs" color="fg.muted">
                    {isEditableSchedule(currentSchedule())
                      ? "Select a field cell to assign a player. In By position, drag within a segment to swap; press Esc to cancel."
                      : "Published assignments are read-only. Choose Edit again to make changes."}
                  </Text>
                </Box>
                <Box minW="0" maxW="100%" overflowX="auto">
                  <Show
                    when={view() === "position"}
                    fallback={
                      <PlayerScheduleGrid
                        schedule={currentSchedule()}
                        players={availablePlayers()}
                        positions={data.positions()}
                        editable={isEditableSchedule(currentSchedule())}
                        changedCellIds={generation.changedCellIds}
                        preferences={data.snapshot()?.playerPreferences.entries ?? []}
                        onLockPlayer={(playerId) =>
                          void lockGroup({ kind: "player", playerId })}
                        onClearPlayer={(playerId) =>
                          void clearGroup({
                            kind: "player",
                            playerId,
                            label: player(playerId)?.displayName ?? "Player assignments",
                          })}
                        onClearSegment={(segmentKey) =>
                          void clearGroup({
                            kind: "segment",
                            segmentKey,
                            label: segmentLabel(segmentKey),
                          })}
                        onGeneratePlayer={(playerId) =>
                          void generateTarget({ kind: "player", playerId })}
                      />
                    }
                  >
                    <PositionGrid
                      schedule={currentSchedule()}
                      positions={data.positions()}
                      players={rosterPlayers()}
                      inactivePlayerIds={inactivePlayerIds()}
                      editable={isEditableSchedule(currentSchedule())}
                      changedCellIds={generation.changedCellIds}
                      preferences={data.snapshot()?.playerPreferences.entries ?? []}
                      selected={selection()}
                      onSelect={setSelection}
                      onSwap={(change) => void swap(change)}
                      onLockPosition={(positionKey) =>
                        void lockGroup({ kind: "position", positionKey })}
                      onLockSegment={(segmentKey) =>
                        void lockGroup({ kind: "segment", segmentKey })}
                      onClearPosition={(positionKey) =>
                        void clearGroup({
                          kind: "position",
                          positionKey,
                          label: data.positions().find(
                            (position) => position.key === positionKey,
                          )?.label ?? "Position assignments",
                        })}
                      onClearSegment={(segmentKey) =>
                        void clearGroup({
                          kind: "segment",
                          segmentKey,
                          label: segmentLabel(segmentKey),
                        })}
                      onGeneratePosition={(positionKey) =>
                        void generateTarget({ kind: "position", positionKey })}
                      onGenerateSegment={(segmentKey) =>
                        void generateTarget({ kind: "segment", segmentKey })}
                    />
                  </Show>
                </Box>
                <Show when={seasonImpact()}>
                  {(impact) => (
                    <SeasonImpactTable
                      impact={impact()}
                      player={player}
                      targetFor={seasonImpactTargetFor}
                      onSchedule={(playerId, group) =>
                        void scheduleFromSeasonImpact(playerId, group)}
                    />
                  )}
                </Show>
              </>
            )}
          </Show>

          <ScheduleAssignmentDialog
            selection={selection()}
            schedule={schedule()}
            players={availablePlayers()}
            assignment={assignment}
            onClose={() => setSelection()}
            onClear={() => void clearAssignment()}
            onReplace={(playerId) => void replace(playerId)}
            onToggleLock={() => void toggleLock()}
          />
          <ConfirmDialog
            open={removeLocksOpen()}
            onOpenChange={setRemoveLocksOpen}
            title="Remove all locks?"
            description="Every assignment will become editable. The player placements themselves will not change."
            confirmLabel="Remove all locks"
            onConfirm={() => void removeAllLocks()}
          />
          <ConfirmDialog
            open={clearScheduleOpen()}
            onOpenChange={setClearScheduleOpen}
            title="Clear the entire schedule?"
            description="This removes every player assignment and every assignment lock from the draft. You can undo it afterward."
            confirmLabel="Clear all assignments"
            onConfirm={() => void clearSchedule()}
          />
          <Toaster />

        </>
      )}
    </Show>
  );
}
