import { For, Show, createMemo } from "solid-js";
import { Badge, Text } from "~/components/ui";
import { SEGMENTS, type Position } from "~/lib/soccer/fixed-game";
import type { Player, Schedule } from "~/lib/soccer/schemas";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";

export function PlayerScheduleGrid(props: { schedule: Schedule; players: Player[]; positions: Position[] }) {
  return (
    <VStack minW="760px" alignItems="stretch" gap="2">
      <PositionLegend positions={props.positions} />
      <Box bg="bg.default" borderWidth="1px" borderColor="border" borderRadius="l3" overflow="hidden">
        <Grid gridTemplateColumns="150px repeat(8, minmax(0, 1fr)) 56px" bg="bg.muted">
          <Box p="2.5" fontWeight="semibold">Player</Box>
          <For each={SEGMENTS}>{(segment) => <Box p="2.5" textAlign="center" fontSize="xs">{segment.key.toUpperCase()}</Box>}</For>
          <Box p="2.5" textAlign="center" fontSize="xs">Min</Box>
        </Grid>
        <For each={props.players}>
          {(player) => {
            const cells = createMemo(() => props.schedule.assignments.filter((item) => item.playerId === player.id));
            return (
              <Grid gridTemplateColumns="150px repeat(8, minmax(0, 1fr)) 56px" borderTopWidth="1px" borderColor="border">
                <HStack p="2.5" gap="2" minW="0">
                  <Box boxSize="2.5" borderRadius="full" flexShrink="0" style={{ "background-color": player.color }} />
                  <Text textStyle="xs" fontWeight="medium" truncate>#{player.jerseyNumber ?? "—"} {player.displayName}</Text>
                </HStack>
                <For each={SEGMENTS}>
                  {(segment) => {
                    const assignment = () => cells().find((item) => item.segmentKey === segment.key);
                    const position = () => props.positions.find((item) => item.key === assignment()?.positionKey);
                    return (
                      <Box p="2" display="grid" placeItems="center">
                        <Show when={position()} fallback={<BenchBadge />}>
                          {(currentPosition) => <PositionBadge position={currentPosition()} />}
                        </Show>
                      </Box>
                    );
                  }}
                </For>
                <Box p="2.5" textAlign="center" fontWeight="bold" fontSize="xs" fontVariantNumeric="tabular-nums">{cells().length * 7}</Box>
              </Grid>
            );
          }}
        </For>
      </Box>
    </VStack>
  );
}

function PositionLegend(props: { positions: Position[] }) {
  return (
    <Flex as="section" aria-label="Position color legend" alignItems="center" gap="2" flexWrap="wrap" px="1">
      <Text textStyle="xs" color="fg.muted" fontWeight="semibold" mr="1">Position legend</Text>
      <For each={props.positions}>{(position) => (
        <HStack gap="1.5">
          <PositionBadge position={position} />
          <Text textStyle="xs" color="fg.muted">{position.label}</Text>
        </HStack>
      )}</For>
      <HStack gap="1.5"><BenchBadge /><Text textStyle="xs" color="fg.muted">Bench</Text></HStack>
    </Flex>
  );
}

function PositionBadge(props: { position: Position }) {
  return (
    <Badge
      minW="8"
      justifyContent="center"
      color="white"
      borderColor="transparent"
      aria-label={`${props.position.short}, ${props.position.label}`}
      style={{ "background-color": props.position.color }}
    >
      {props.position.short}
    </Badge>
  );
}

function BenchBadge() {
  return <Badge minW="12" justifyContent="center" variant="subtle" colorPalette="gray">Bench</Badge>;
}
