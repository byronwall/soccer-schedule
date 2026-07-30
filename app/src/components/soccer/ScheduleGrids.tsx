import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import {
  Badge,
  IconButton,
  Text,
  Tooltip,
} from "~/components/ui";
import { Sparkles } from "lucide-solid";
import { POSITIONS, SEGMENTS, type Position, type PositionKey, type SegmentKey } from "~/lib/soccer/fixed-game";
import {
  lockStateForAssignments,
  type LockState,
} from "~/lib/soccer/schedule-readiness";
import {
  orderSubstitutesForDisplay,
  scheduleCellWarnings,
  scheduleSubstituteWarnings,
  substituteCountForRoster,
} from "~/lib/soccer/scheduling";
import type {
  Player,
  PlayerPreference,
  Schedule,
} from "~/lib/soccer/schemas";
import {
  playerPreferenceLookup,
  positionDisposition,
} from "~/lib/soccer/player-preferences";
import { setScheduleDragSelectionState } from "~/lib/soccer/schedule-drag-selection";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { PlayerAssignmentCell, SubstituteCell } from "./ScheduleGridCells";
import { ScheduleGroupLockButton } from "./ScheduleGroupLockButton";
import { ScheduleGroupClearButton } from "./ScheduleGroupClearButton";

type Selection = { segmentKey: SegmentKey; positionKey: PositionKey };
export type ScheduleSwap = Selection & { playerId: string };
type DragSource = { segmentKey: SegmentKey; playerId: string; positionKey?: PositionKey };

type PositionGridProps = {
  schedule: Schedule;
  positions: Position[];
  players: Player[];
  inactivePlayerIds: string[];
  editable: boolean;
  onSelect: (selection: Selection) => void;
  onSwap: (swap: ScheduleSwap) => void;
  onLockPosition: (positionKey: PositionKey) => void;
  onLockSegment: (segmentKey: SegmentKey) => void;
  onClearPosition: (positionKey: PositionKey) => void;
  onClearSegment: (segmentKey: SegmentKey) => void;
  onGeneratePosition: (positionKey: PositionKey) => void;
  onGenerateSegment: (segmentKey: SegmentKey) => void;
  changedCellIds: string[];
  preferences: PlayerPreference[];
  selected?: Selection;
};

const cellKey = (segmentKey: SegmentKey, rowKey: string) => `${segmentKey}:${rowKey}`;

export function PositionGrid(props: PositionGridProps) {
  const [dragState, setDragState] = createStore<{ source?: DragSource; over?: string }>({});
  const [emphasizedPlayerId, setEmphasizedPlayerId] = createSignal<string>();
  let pointerDrag: { source: DragSource; startX: number; startY: number; moved: boolean } | undefined;
  let suppressNextClick = false;
  let dragSelectionActive = false;
  const setDragSelectionActive = (active: boolean) => {
    if (dragSelectionActive === active) return;
    dragSelectionActive = active;
    setScheduleDragSelectionState(document.body, active, window.getSelection());
  };
  const cancelDrag = () => {
    pointerDrag = undefined;
    setDragSelectionActive(false);
    setDragState({ source: undefined, over: undefined });
  };
  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (pointerDrag || dragState.source)) cancelDrag();
    };
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerDrag) return;
      const distance = Math.hypot(event.clientX - pointerDrag.startX, event.clientY - pointerDrag.startY);
      if (!pointerDrag.moved && distance < 6) return;
      event.preventDefault();
      if (!pointerDrag.moved) {
        pointerDrag.moved = true;
        setDragState({ source: pointerDrag.source, over: undefined });
      }
      const target = dragTargetAt(event.clientX, event.clientY);
      setDragState("over", target?.segmentKey === pointerDrag.source.segmentKey
        ? cellKey(target.segmentKey, target.positionKey ?? target.rowKey)
        : undefined);
    };
    const handlePointerUp = (event: PointerEvent) => {
      if (!pointerDrag) return;
      const currentDrag = pointerDrag;
      const target = dragTargetAt(event.clientX, event.clientY);
      if (currentDrag.moved && target) finishDrop(target, currentDrag.source);
      else cancelDrag();
      suppressNextClick = currentDrag.moved;
    };
    const handlePointerCancel = () => cancelDrag();
    const handleWindowBlur = () => cancelDrag();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") cancelDrag();
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    onCleanup(() => {
      cancelDrag();
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    });
  });
  const playerById = (id: string) => props.players.find((player) => player.id === id);
  const assignment = (segmentKey: SegmentKey, positionKey: PositionKey) =>
    props.schedule.assignments.find(
      (item) => item.segmentKey === segmentKey && item.positionKey === positionKey,
    );
  const substitutes = (segmentKey: SegmentKey) => {
    const fieldIds = new Set(
      props.schedule.assignments
        .filter((item) => item.segmentKey === segmentKey)
        .map((item) => item.playerId),
    );
    if (fieldIds.size < POSITIONS.length) return [];
    return orderSubstitutesForDisplay(
      props.players.filter((player) => !fieldIds.has(player.id)),
      props.inactivePlayerIds,
    );
  };
  const substituteCount = () => substituteCountForRoster(props.players.length);
  const isInactive = (player?: Player) => !!player && props.inactivePlayerIds.includes(player.id);
  const warnings = createMemo(() => scheduleCellWarnings(props.schedule.assignments));
  const preferences = createMemo(() =>
    playerPreferenceLookup(props.preferences));
  const substituteWarnings = createMemo(() => scheduleSubstituteWarnings(
    props.schedule.assignments,
    props.players
      .filter((player) => !props.inactivePlayerIds.includes(player.id))
      .map((player) => player.id),
  ));
  const cellWarnings = (segmentKey: SegmentKey, positionKey: PositionKey) =>
    warnings()
      .filter((warning) => warning.segmentKey === segmentKey && warning.positionKey === positionKey)
      .map((warning) => warning.message);
  const substituteCellWarnings = (segmentKey: SegmentKey, playerId?: string) =>
    substituteWarnings()
      .filter((warning) => warning.segmentKey === segmentKey && warning.playerId === playerId)
      .map((warning) => warning.message);
  const positionLockState = (positionKey: PositionKey): LockState =>
    lockStateForAssignments(
      props.schedule.assignments.filter(
        (item) => item.positionKey === positionKey,
      ),
    );
  const segmentLockState = (segmentKey: SegmentKey): LockState =>
    lockStateForAssignments(
      props.schedule.assignments.filter(
        (item) => item.segmentKey === segmentKey,
      ),
    );

  const beginPointerDrag = (event: PointerEvent, source: DragSource) => {
    if (!props.editable) return;
    pointerDrag = { source, startX: event.clientX, startY: event.clientY, moved: false };
    setDragSelectionActive(true);
  };

  const finishDrop = (target: DragSource & { rowKey: string }, sourceOverride?: DragSource) => {
    const source = sourceOverride ?? dragState.source;
    cancelDrag();
    if (!source || source.segmentKey !== target.segmentKey || source.playerId === target.playerId) return;
    if (target.positionKey) {
      props.onSwap({ segmentKey: target.segmentKey, positionKey: target.positionKey, playerId: source.playerId });
      return;
    }
    if (source.positionKey) {
      props.onSwap({ segmentKey: source.segmentKey, positionKey: source.positionKey, playerId: target.playerId });
    }
  };

  const activateFieldCell = (selection: Selection) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    props.onSelect(selection);
  };

  const emphasizeFromPointer = (event: PointerEvent) => {
    const target = event.target;
    const cell = target instanceof Element
      ? target.closest<HTMLElement>("[data-player-id]")
      : undefined;
    setEmphasizedPlayerId(cell?.dataset.playerId);
  };

  return (
    <Box
        minW="760px"
        bg="bg.default"
        borderWidth="1px"
        borderColor="border"
        borderRadius="l3"
        overflow="hidden"
        onPointerMove={emphasizeFromPointer}
        onPointerLeave={() => setEmphasizedPlayerId()}
      >
      <Grid gridTemplateColumns="128px repeat(8, minmax(0, 1fr))" gap="0" bg="bg.muted">
        <Box px="2" py="1.5" fontWeight="semibold" fontSize="sm">Position</Box>
        <For each={SEGMENTS}>
          {(segment) => (
            <VStack px="1" py="0.5" justifyContent="center" gap="0">
              <Text textStyle="xs" fontWeight="semibold">{segment.label}</Text>
              <HStack gap="0">
                <ScheduleGroupLockButton
                  label={`${segment.label} segment`}
                  state={segmentLockState(segment.key)}
                  disabled={
                    !props.editable ||
                    !props.schedule.assignments.some(
                      (item) => item.segmentKey === segment.key,
                    )
                  }
                  onLock={() => props.onLockSegment(segment.key)}
                />
                <ScheduleGroupClearButton
                  label={`${segment.label} assignments`}
                  disabled={
                    !props.editable ||
                    !props.schedule.assignments.some(
                      (item) => item.segmentKey === segment.key,
                    )
                  }
                  onClear={() => props.onClearSegment(segment.key)}
                />
                <Tooltip
                  content={`Regenerate ${segment.label} segment`}
                  positioning={{
                    strategy: "fixed",
                    flip: true,
                    slide: true,
                    overflowPadding: 12,
                  }}
                >
                <IconButton
                  size="2xs"
                  variant="plain"
                  disabled={!props.editable}
                  aria-label={`Regenerate ${segment.label} segment`}
                  onClick={() => props.onGenerateSegment(segment.key)}
                >
                  <Sparkles size={14} />
                </IconButton>
                </Tooltip>
              </HStack>
            </VStack>
          )}
        </For>
      </Grid>
      <For each={props.positions}>
        {(position) => (
          <Grid gridTemplateColumns="128px repeat(8, minmax(0, 1fr))" gap="0" borderTopWidth="1px" borderColor="border">
            <VStack px="1.5" py="0.5" gap="0" alignItems="start" justifyContent="center">
              <HStack gap="1" minW="0" width="full">
                  <Badge size="sm">{position.short}</Badge>
                  <Text textStyle="xs" fontWeight="medium" whiteSpace="nowrap">{position.label}</Text>
              </HStack>
              <HStack gap="0" flexShrink="0">
                <ScheduleGroupLockButton
                  label={`${position.label} row`}
                  state={positionLockState(position.key)}
                  disabled={
                    !props.editable ||
                    !props.schedule.assignments.some(
                      (item) => item.positionKey === position.key,
                    )
                  }
                  onLock={() => props.onLockPosition(position.key)}
                />
                <ScheduleGroupClearButton
                  label={`${position.label} assignments`}
                  disabled={
                    !props.editable ||
                    !props.schedule.assignments.some(
                      (item) => item.positionKey === position.key,
                    )
                  }
                  onClear={() => props.onClearPosition(position.key)}
                />
                <Tooltip
                  content={`Regenerate ${position.label} position`}
                  positioning={{
                    strategy: "fixed",
                    flip: true,
                    slide: true,
                    overflowPadding: 12,
                  }}
                >
                  <IconButton
                    size="2xs"
                    variant="plain"
                    disabled={!props.editable}
                    aria-label={`Regenerate ${position.label} position`}
                    onClick={() => props.onGeneratePosition(position.key)}
                  >
                    <Sparkles size={14} />
                  </IconButton>
                </Tooltip>
              </HStack>
            </VStack>
            <For each={SEGMENTS}>
              {(segment) => {
                const item = () => assignment(segment.key, position.key);
                const assignedPlayer = () => playerById(item()?.playerId ?? "");
                const assignedPlayerInactive = () => isInactive(assignedPlayer());
                const key = cellKey(segment.key, position.key);
                return (
                  <PlayerAssignmentCell
                    player={assignedPlayer()}
                    inactive={assignedPlayerInactive()}
                    locked={item()?.locked}
                    warnings={[
                      ...cellWarnings(segment.key, position.key),
                      ...(assignedPlayerInactive() ? ["Player is inactive for this game."] : []),
                    ]}
                    editable={props.editable}
                    emphasized={emphasizedPlayerId() === assignedPlayer()?.id}
                    dragging={dragState.source?.playerId === assignedPlayer()?.id && dragState.source?.segmentKey === segment.key}
                    validTarget={!!dragState.source && dragState.source.segmentKey === segment.key && dragState.source.playerId !== assignedPlayer()?.id && !assignedPlayerInactive()}
                    dropTarget={dragState.over === key}
                    changed={props.changedCellIds.includes(key)}
                    selected={
                      props.selected?.segmentKey === segment.key &&
                      props.selected.positionKey === position.key
                    }
                    preference={assignedPlayer()
                      ? positionDisposition(
                          preferences(),
                          assignedPlayer()!.id,
                          position.key,
                        )
                      : "neutral"}
                    segmentKey={segment.key}
                    rowKey={position.key}
                    onEmphasisChange={setEmphasizedPlayerId}
                    onClick={() => activateFieldCell({ segmentKey: segment.key, positionKey: position.key })}
                    onPointerDown={(event) => {
                      const currentPlayer = assignedPlayer();
                      if (currentPlayer && !assignedPlayerInactive()) beginPointerDrag(event, { segmentKey: segment.key, positionKey: position.key, playerId: currentPlayer.id });
                    }}
                  />
                );
              }}
            </For>
          </Grid>
        )}
      </For>
      <Show when={substituteCount() > 0}>
        <Grid gridTemplateColumns="128px repeat(8, minmax(0, 1fr))" gap="0" borderTopWidth="2px" borderColor="border" bg="bg.subtle">
          <Box px="2" py="1" fontWeight="semibold" fontSize="xs" color="fg.muted">Substitutes</Box>
          <For each={SEGMENTS}>{() => <Box />}</For>
        </Grid>
        <For each={Array.from({ length: substituteCount() })}>
          {(_, substituteIndex) => (
            <Grid gridTemplateColumns="128px repeat(8, minmax(0, 1fr))" gap="0" borderTopWidth="1px" borderColor="border">
              <HStack px="1.5" py="0.5" gap="1">
                <Badge size="sm" colorPalette="gray">SUB</Badge>
                <Text textStyle="xs" color="fg.muted">Sub {substituteIndex() + 1}</Text>
              </HStack>
              <For each={SEGMENTS}>
                {(segment) => {
                  const substitute = () => substitutes(segment.key)[substituteIndex()];
                  const substituteInactive = () => isInactive(substitute());
                  const key = () => cellKey(segment.key, `sub-${substituteIndex()}`);
                  return (
                    <SubstituteCell
                      player={substitute()}
                      inactive={substituteInactive()}
                      warnings={[
                        ...substituteCellWarnings(segment.key, substitute()?.id),
                        ...(substituteInactive() ? ["Player is inactive for this game."] : []),
                      ]}
                      editable={props.editable}
                      emphasized={emphasizedPlayerId() === substitute()?.id}
                      dragging={dragState.source?.playerId === substitute()?.id && dragState.source?.segmentKey === segment.key}
                      validTarget={!!dragState.source && dragState.source.segmentKey === segment.key && dragState.source.playerId !== substitute()?.id && !substituteInactive()}
                      dropTarget={dragState.over === key()}
                      changed={false}
                      segmentKey={segment.key}
                      rowKey={`sub-${substituteIndex()}`}
                      onPointerDown={(event) => {
                        const currentPlayer = substitute();
                        if (currentPlayer && !substituteInactive()) beginPointerDrag(event, { segmentKey: segment.key, playerId: currentPlayer.id });
                      }}
                    />
                  );
                }}
              </For>
            </Grid>
          )}
        </For>
      </Show>
    </Box>
  );
}

const dragTargetAt = (x: number, y: number) => {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>(
    "[data-segment][data-slot][data-player-id]:not([data-drag-disabled='true'])",
  );
  const segmentKey = SEGMENTS.find((segment) => segment.key === element?.dataset.segment)?.key;
  const playerId = element?.dataset.playerId;
  const rowKey = element?.dataset.slot;
  if (!segmentKey || !playerId || !rowKey) return undefined;
  const positionKey = POSITIONS.find((position) => position.key === rowKey)?.key;
  return { segmentKey, playerId, rowKey, positionKey };
};
