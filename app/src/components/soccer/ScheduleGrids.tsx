import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { Badge, Card, Text } from "~/components/ui";
import { POSITIONS, SEGMENTS, type Position, type PositionKey, type SegmentKey } from "~/lib/soccer/fixed-game";
import {
  orderSubstitutesForDisplay,
  scheduleCellWarnings,
  scheduleSubstituteWarnings,
  substituteCountForRoster,
  type ScheduleQuality,
} from "~/lib/soccer/scheduling";
import type { Player, Schedule } from "~/lib/soccer/schemas";
import { Box, Grid, HStack } from "styled-system/jsx";
import { PlayerAssignmentCell, SubstituteCell } from "./ScheduleGridCells";

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
};

const cellKey = (segmentKey: SegmentKey, rowKey: string) => `${segmentKey}:${rowKey}`;

export function PositionGrid(props: PositionGridProps) {
  const [dragState, setDragState] = createStore<{ source?: DragSource; over?: string }>({});
  const [emphasizedPlayerId, setEmphasizedPlayerId] = createSignal<string>();
  let pointerDrag: { source: DragSource; startX: number; startY: number; moved: boolean } | undefined;
  let suppressNextClick = false;
  const cancelDrag = () => {
    pointerDrag = undefined;
    setDragState({ source: undefined, over: undefined });
  };
  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dragState.source) cancelDrag();
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
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
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
    return orderSubstitutesForDisplay(
      props.players.filter((player) => !fieldIds.has(player.id)),
      props.inactivePlayerIds,
    );
  };
  const substituteCount = () => substituteCountForRoster(props.players.length);
  const isInactive = (player?: Player) => !!player && props.inactivePlayerIds.includes(player.id);
  const warnings = createMemo(() => scheduleCellWarnings(props.schedule.assignments));
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

  const beginPointerDrag = (event: PointerEvent, source: DragSource) => {
    if (!props.editable) return;
    pointerDrag = { source, startX: event.clientX, startY: event.clientY, moved: false };
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
    <>
      <HStack mb="2" gap="2" color="fg.muted">
        <Text textStyle="xs">
          {props.editable
            ? "Drag within a segment column to swap. Outlined cells are valid targets; press Esc to cancel."
            : "Published assignments are read-only. Choose Edit again to make changes."}
        </Text>
      </HStack>
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
        <Box p="2.5" fontWeight="semibold">Position</Box>
        <For each={SEGMENTS}>
          {(segment) => <Box p="2.5" textAlign="center" fontSize="xs" fontWeight="semibold">{segment.label}</Box>}
        </For>
      </Grid>
      <For each={props.positions}>
        {(position) => (
          <Grid gridTemplateColumns="128px repeat(8, minmax(0, 1fr))" gap="0" borderTopWidth="1px" borderColor="border">
            <HStack px="2.5" py="2" gap="2">
              <Badge size="sm">{position.short}</Badge>
              <Text textStyle="xs" fontWeight="medium">{position.label}</Text>
            </HStack>
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
          <Box px="2.5" py="1.5" fontWeight="semibold" fontSize="xs" color="fg.muted">Substitutes</Box>
          <For each={SEGMENTS}>{() => <Box />}</For>
        </Grid>
        <For each={Array.from({ length: substituteCount() })}>
          {(_, substituteIndex) => (
            <Grid gridTemplateColumns="128px repeat(8, minmax(0, 1fr))" gap="0" borderTopWidth="1px" borderColor="border">
              <HStack px="2.5" py="2" gap="2">
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
    </>
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

export function PlannedMinutes(props: { quality?: ScheduleQuality; player: (id: string) => Player | undefined }) {
  return (
    <Card.Root mt="5">
      <Card.Header>
        <Card.Title>Planned minutes</Card.Title>
        <Card.Description>Projected playing time across all eight segments.</Card.Description>
      </Card.Header>
      <Card.Body>
        <Grid gridTemplateColumns={{ base: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))", xl: "repeat(6, minmax(0, 1fr))" }} gap="2">
          <For each={props.quality?.totals}>
            {(total) => {
              const currentPlayer = () => props.player(total.playerId);
              return (
                <HStack justifyContent="space-between" minW="0" px="3" py="2" bg="bg.muted" borderRadius="l2">
                  <HStack minW="0" gap="2">
                    <Box boxSize="2.5" flexShrink="0" borderRadius="full" style={{ "background-color": currentPlayer()?.color }} />
                    <Text textStyle="sm" truncate>{currentPlayer()?.displayName}</Text>
                  </HStack>
                  <Text textStyle="sm" fontWeight="bold" flexShrink="0">{total.minutes} min</Text>
                </HStack>
              );
            }}
          </For>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
