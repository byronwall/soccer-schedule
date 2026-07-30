import { A } from "@solidjs/router";
import { ChevronRight, MapPin } from "lucide-solid";
import { For, Show } from "solid-js";
import { Badge, Button, Text } from "~/components/ui";
import { resolvePositions, type PositionLabels } from "~/lib/soccer/fixed-game";
import type { PlayerGameSummary } from "~/lib/soccer/player-profile";
import {
  formatExactDuration,
  formatGameClock,
} from "~/lib/soccer/post-game-history";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";

const gameDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const availabilityLabel = (status: PlayerGameSummary["availability"]) => {
  if (status === "available") return "Available";
  if (status === "unavailable") return "Unavailable";
  return "Awaiting response";
};

const availabilityColor = (status: PlayerGameSummary["availability"]) => {
  if (status === "available") return "grass" as const;
  if (status === "unavailable") return "red" as const;
  return "gray" as const;
};

const actualStatusText = (summary: PlayerGameSummary) => {
  if (summary.actualStatus === "incomplete") {
    return "Actual record incomplete — totals are unavailable until it is completed and confirmed.";
  }
  if (summary.actualReason === "legacy") {
    return "Actual history unavailable — this game used the legacy tracker.";
  }
  if (summary.actualReason === "invalid-confirmation") {
    return "Actual history unavailable — confirmation metadata is incomplete.";
  }
  return "Actual history was not recorded for this game.";
};

export function PlayerGameHistoryRow(props: {
  summary: PlayerGameSummary;
  positionLabels: PositionLabels;
  upcoming?: boolean;
}) {
  const actualPositions = () => {
    const totals = props.summary.actual?.positionSeconds ?? {};
    return resolvePositions(props.positionLabels).flatMap((position) => {
      const seconds = totals[position.key] ?? 0;
      return seconds > 0 ? [{ ...position, seconds }] : [];
    });
  };

  return (
    <Box
      as="li"
      borderTopWidth="1px"
      borderColor="border"
      _first={{ borderTopWidth: "0" }}
    >
      <Grid
        gridTemplateColumns={{
          base: "1fr",
          md: "minmax(12rem, .8fr) minmax(0, 1.7fr) auto",
        }}
        gap="4"
        alignItems="start"
        px={{ base: "4", md: "6" }}
        py="4"
      >
        <VStack alignItems="start" gap="1">
          <Text fontWeight="semibold">
            vs. {props.summary.game.opponentName}
          </Text>
          <HStack gap="3" flexWrap="wrap" color="fg.muted">
            <Text textStyle="sm">
              {gameDateFormatter.format(new Date(props.summary.game.startsAt))}
            </Text>
            <HStack gap="1">
              <MapPin size={14} />
              <Text textStyle="sm">{props.summary.game.venueName}</Text>
            </HStack>
          </HStack>
          <Show when={props.upcoming}>
            <Badge colorPalette={availabilityColor(props.summary.availability)}>
              {availabilityLabel(props.summary.availability)}
            </Badge>
          </Show>
        </VStack>

        <VStack alignItems="stretch" gap="3" minW="0">
          <VStack alignItems="start" gap="1">
            <Text textStyle="xs" color="fg.muted" fontWeight="semibold">
              PUBLISHED PLAN
            </Text>
            <Show
              when={props.summary.positions.length > 0}
              fallback={
                <Text textStyle="sm" color="fg.muted">
                  No planned lineup assignments
                </Text>
              }
            >
              <Flex gap="1" flexWrap="wrap">
                <For each={props.summary.positions}>
                  {(position) => (
                    <Badge variant="subtle">
                      {position.short} · {position.minutes} min
                    </Badge>
                  )}
                </For>
              </Flex>
            </Show>
          </VStack>

          <Show when={!props.upcoming}>
            <VStack alignItems="start" gap="1">
              <Text textStyle="xs" color="fg.muted" fontWeight="semibold">
                ACTUAL
              </Text>
              <Show
                when={props.summary.actual}
                fallback={
                  <HStack gap="2" alignItems="start">
                    <Badge
                      colorPalette={
                        props.summary.actualStatus === "incomplete"
                          ? "orange"
                          : "gray"
                      }
                    >
                      {props.summary.actualStatus === "incomplete"
                        ? "Incomplete"
                        : "Unavailable"}
                    </Badge>
                    <Text textStyle="sm" color="fg.muted">
                      {actualStatusText(props.summary)}
                    </Text>
                  </HStack>
                }
              >
                {(actual) => (
                  <>
                    <Flex gap="1" flexWrap="wrap">
                      <For each={actualPositions()}>
                        {(position) => (
                          <Badge colorPalette="grass" variant="subtle">
                            {position.short} ·{" "}
                            {formatExactDuration(position.seconds)}
                          </Badge>
                        )}
                      </For>
                      <Badge colorPalette="gray" variant="subtle">
                        Bench · {formatExactDuration(actual().benchSeconds)}
                      </Badge>
                    </Flex>
                    <Show when={actual().goals.length > 0}>
                      <Flex gap="1" flexWrap="wrap">
                        <For each={actual().goals}>
                          {(goal) => (
                            <Badge colorPalette="green">
                              Goal · Q{goal.quarter}{" "}
                              {formatGameClock(
                                goal.elapsedGameClockSeconds,
                              )}
                            </Badge>
                          )}
                        </For>
                      </Flex>
                    </Show>
                  </>
                )}
              </Show>
            </VStack>
          </Show>
        </VStack>

        <HStack justifyContent={{ base: "space-between", md: "end" }} gap="3">
          <VStack alignItems={{ base: "start", md: "end" }} gap="0">
            <Show
              when={props.summary.actual}
              fallback={
                <Text fontWeight="bold">
                  {props.summary.minutes} planned min
                </Text>
              }
            >
              {(actual) => (
                <>
                  <Text fontWeight="bold">
                    {formatExactDuration(actual().fieldSeconds)} actual
                  </Text>
                  <Text textStyle="xs" color="fg.muted">
                    {props.summary.minutes} min planned
                  </Text>
                </>
              )}
            </Show>
          </VStack>
          <A href={`/games/${props.summary.game.id}`}>
            <Button variant="plain" size="sm">
              Open <ChevronRight size={17} />
            </Button>
          </A>
        </HStack>
      </Grid>
    </Box>
  );
}
