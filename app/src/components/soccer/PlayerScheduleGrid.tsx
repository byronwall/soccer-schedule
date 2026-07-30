import { For, Show, createMemo } from "solid-js";
import { IconButton, Text, Tooltip } from "~/components/ui";
import { Sparkles } from "lucide-solid";
import { SEGMENTS, type Position } from "~/lib/soccer/fixed-game";
import type {
  Player,
  PlayerPreference,
  PositionDisposition,
  Schedule,
} from "~/lib/soccer/schemas";
import {
  playerPreferenceLookup,
  positionDisposition,
} from "~/lib/soccer/player-preferences";
import { lockStateForAssignments } from "~/lib/soccer/schedule-readiness";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { ScheduleGroupLockButton } from "./ScheduleGroupLockButton";
import { ScheduleGroupClearButton } from "./ScheduleGroupClearButton";

export function PlayerScheduleGrid(props: {
  schedule: Schedule;
  players: Player[];
  positions: Position[];
  editable: boolean;
  onLockPlayer: (playerId: string) => void;
  onClearPlayer: (playerId: string) => void;
  onClearSegment: (segmentKey: (typeof SEGMENTS)[number]["key"]) => void;
  onGeneratePlayer: (playerId: string) => void;
  changedCellIds: string[];
  preferences: PlayerPreference[];
}) {
  const preferences = createMemo(() =>
    playerPreferenceLookup(props.preferences));
  return (
    <VStack minW="1080px" alignItems="stretch" gap="0">
      <Box bg="bg.default" borderWidth="1px" borderColor="border" borderRadius="l3" overflow="hidden">
        <Grid gridTemplateColumns="180px repeat(8, minmax(100px, 1fr)) 56px" gap="0" bg="bg.muted">
          <Box px="2" py="1.5" fontWeight="semibold">Player</Box>
          <For each={SEGMENTS}>{(segment) => (
            <VStack px="1" py="0.5" justifyContent="center" gap="0">
              <Text textStyle="xs" fontWeight="semibold">{segment.label}</Text>
              <ScheduleGroupClearButton
                label={`${segment.label} assignments`}
                disabled={
                  !props.editable ||
                  !props.schedule.assignments.some(
                    (assignment) => assignment.segmentKey === segment.key,
                  )
                }
                onClear={() => props.onClearSegment(segment.key)}
              />
            </VStack>
          )}</For>
          <Box px="2" py="1.5" textAlign="center" fontSize="xs">Min</Box>
        </Grid>
        <For each={props.players}>
          {(player) => {
            const cells = createMemo(() => props.schedule.assignments.filter((item) => item.playerId === player.id));
            return (
              <Grid gridTemplateColumns="180px repeat(8, minmax(100px, 1fr)) 56px" gap="0" borderTopWidth="1px" borderColor="border">
                <VStack px="2" py="1" gap="0" minW="0" alignItems="start" justifyContent="center">
                  <HStack gap="1.5" minW="0" width="full">
                    <Box boxSize="2.5" borderRadius="full" flexShrink="0" style={{ "background-color": player.color }} />
                    <Text textStyle="xs" fontWeight="medium" truncate>
                      #{player.jerseyNumber ?? "—"} {player.displayName}
                    </Text>
                  </HStack>
                  <HStack gap="0">
                    <ScheduleGroupLockButton
                      label={`${player.displayName} assignments`}
                      state={lockStateForAssignments(cells())}
                      disabled={!props.editable || cells().length === 0}
                      onLock={() => props.onLockPlayer(player.id)}
                    />
                    <ScheduleGroupClearButton
                      label={`assignments for ${player.displayName}`}
                      disabled={!props.editable || cells().length === 0}
                      onClear={() => props.onClearPlayer(player.id)}
                    />
                    <Tooltip
                      content={`Rebalance ${player.displayName}'s assignments`}
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
                      aria-label={`Rebalance ${player.displayName}`}
                      onClick={() => props.onGeneratePlayer(player.id)}
                    >
                      <Sparkles size={14} />
                    </IconButton>
                    </Tooltip>
                  </HStack>
                </VStack>
                <For each={SEGMENTS}>
                  {(segment) => {
                    const assignment = () => cells().find((item) => item.segmentKey === segment.key);
                    const position = () => props.positions.find((item) => item.key === assignment()?.positionKey);
                    const disposition = () => assignment()
                      ? positionDisposition(
                          preferences(),
                          player.id,
                          assignment()!.positionKey,
                        )
                      : "neutral";
                    const segmentIsFilled = () =>
                      props.schedule.assignments.filter(
                        (item) => item.segmentKey === segment.key,
                      ).length === props.positions.length;
                    return (
                      <Box
                        px="1.5"
                        py="1"
                        display="grid"
                        placeItems="center"
                        role="group"
                        data-generation-changed={
                          assignment() &&
                          props.changedCellIds.includes(
                            `${segment.key}:${assignment()?.positionKey}`,
                          )
                            ? "true"
                            : undefined
                        }
                        data-preference={disposition()}
                        aria-label={assignment()
                          ? assignmentCellLabel(
                              position()?.label ?? assignment()!.positionKey,
                              disposition(),
                            )
                          : segmentIsFilled()
                            ? "Substitute"
                            : "Open assignment"}
                        style={{
                          "background-color":
                            assignment() &&
                            props.changedCellIds.includes(
                              `${segment.key}:${assignment()?.positionKey}`,
                            )
                              ? "var(--colors-grass-subtle-bg)"
                              : disposition() === "prefer"
                                ? "var(--colors-green-subtle-bg)"
                                : disposition() === "avoid"
                                  ? "var(--colors-orange-subtle-bg)"
                                  : undefined,
                        }}
                      >
                        <Show
                          when={position()}
                          fallback={
                            <Show when={segmentIsFilled()} fallback={<UnassignedBadge />}>
                              <SubBadge />
                            </Show>
                          }
                        >
                          {(currentPosition) => (
                            <PositionLabel position={currentPosition()} />
                          )}
                        </Show>
                      </Box>
                    );
                  }}
                </For>
                <Box px="2" py="1" display="grid" placeItems="center" textAlign="center" fontWeight="bold" fontSize="xs" fontVariantNumeric="tabular-nums">{cells().length * 7}</Box>
              </Grid>
            );
          }}
        </For>
      </Box>
    </VStack>
  );
}

function PositionLabel(props: { position: Position }) {
  return (
    <Text
      width="full"
      minW="0"
      textAlign="center"
      whiteSpace="normal"
      textStyle="xs"
      fontWeight="medium"
      lineHeight="1.2"
      aria-label={props.position.label}
    >
      {props.position.label}
    </Text>
  );
}

function SubBadge() {
  return <Text textStyle="xs" color="fg.muted" fontWeight="medium">Sub</Text>;
}

function UnassignedBadge() {
  return <Text textStyle="xs" color="fg.muted">Open</Text>;
}

function assignmentCellLabel(positionLabel: string, disposition: PositionDisposition) {
  if (disposition === "prefer") return `${positionLabel}, preferred position`;
  if (disposition === "avoid") return `${positionLabel}, avoided position`;
  return `${positionLabel}, neutral position fit`;
}
