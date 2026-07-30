import { A } from "@solidjs/router";
import { CheckCircle2, History, ShieldAlert } from "lucide-solid";
import { For, Show, createMemo } from "solid-js";
import { Badge, Button, Card, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import {
  DEFAULT_POSITION_LABELS,
  SEGMENT_SECONDS,
  resolvePositions,
  type PositionKey,
} from "~/lib/soccer/fixed-game";
import {
  deriveActualGameSummary,
  formatExactDuration,
  formatGameClock,
} from "~/lib/soccer/post-game-history";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";

export function CompletedGameSummary(props: { gameId: string }) {
  const data = useSoccerData();
  const schedule = createMemo(() =>
    data.snapshot()?.schedules.find((candidate) =>
      candidate.gameId === props.gameId &&
      candidate.status === "published"));
  const availablePlayerIds = createMemo(() =>
    data.snapshot()?.availability
      .filter((item) =>
        item.gameId === props.gameId && item.status === "available")
      .map((item) => item.playerId) ?? []);
  const actual = createMemo(() =>
    deriveActualGameSummary({
      schedule: schedule(),
      live: data.snapshot()?.liveGames.find(
        (candidate) => candidate.gameId === props.gameId,
      ),
      availablePlayerIds: availablePlayerIds(),
    }));
  const confirmedActual = createMemo(() => {
    const summary = actual();
    return summary.status === "confirmed" ? summary : undefined;
  });
  const players = createMemo(() => {
    const snapshot = data.snapshot();
    if (!snapshot) return [];
    const relevantIds = new Set([
      ...availablePlayerIds(),
      ...(schedule()?.assignments.map((item) => item.playerId) ?? []),
      ...(confirmedActual()?.players.map((item) => item.playerId) ?? []),
    ]);
    return snapshot.players
      .filter((player) => relevantIds.has(player.id))
      .sort((left, right) =>
        left.displayName < right.displayName
          ? -1
          : left.displayName > right.displayName ? 1 : 0);
  });
  const actualPlayer = (playerId: string) => {
    return confirmedActual()?.players.find(
      (player) => player.playerId === playerId,
    );
  };
  const plannedPositions = (playerId: string) => {
    const assignments = schedule()?.assignments.filter(
      (item) => item.playerId === playerId,
    ) ?? [];
    return resolvePositions(
      data.snapshot()?.positionLabels ?? DEFAULT_POSITION_LABELS,
    ).flatMap((position) => {
      const count = assignments.filter(
        (assignment) => assignment.positionKey === position.key,
      ).length;
      return count > 0 ? [{ ...position, seconds: count * SEGMENT_SECONDS }] : [];
    });
  };
  const actualPositions = (playerId: string) => {
    const totals = actualPlayer(playerId)?.positionSeconds ?? {};
    return resolvePositions(
      data.snapshot()?.positionLabels ?? DEFAULT_POSITION_LABELS,
    ).flatMap((position) => {
      const seconds = totals[position.key as PositionKey] ?? 0;
      return seconds > 0 ? [{ ...position, seconds }] : [];
    });
  };
  const trustCopy = () => {
    const summary = actual();
    if (summary.status === "confirmed") {
      return "Exact actual intervals come from the explicitly completed and confirmed event ledger.";
    }
    if (summary.status === "incomplete") {
      return "The event ledger is incomplete. Actual totals are unavailable until a coach completes and confirms it.";
    }
    if (summary.reason === "legacy") {
      return "This game used the legacy tracker, so trustworthy actual history cannot be reconstructed.";
    }
    return "No trustworthy actual ledger is available for this completed game.";
  };

  return (
    <VStack alignItems="stretch" gap="5">
      <Card.Root
        borderWidth="1px"
        borderColor={
          actual().status === "confirmed" ? "green.border" : "orange.border"
        }
      >
        <Card.Body>
          <HStack justifyContent="space-between" gap="4" flexWrap="wrap">
            <HStack alignItems="start">
              <Box
                color={
                  actual().status === "confirmed" ? "green.fg" : "orange.fg"
                }
              >
                {actual().status === "confirmed"
                  ? <CheckCircle2 size={22} />
                  : <ShieldAlert size={22} />}
              </Box>
              <VStack alignItems="start" gap="0">
                <Text fontWeight="semibold">
                  {actual().status === "confirmed"
                    ? "Actual record confirmed"
                    : actual().status === "incomplete"
                      ? "Actual record incomplete"
                      : "Actual history unavailable"}
                </Text>
                <Text color="fg.muted" textStyle="sm">
                  {trustCopy()}
                </Text>
              </VStack>
            </HStack>
            <HStack>
              <Badge
                colorPalette={
                  actual().status === "confirmed" ? "green" : "orange"
                }
              >
                {actual().status === "confirmed" ? "Trusted" : "Not trusted"}
              </Badge>
              <A href={`/games/${props.gameId}/live`}>
                <Button variant="outline" size="sm">
                  <History size={16} /> Event ledger
                </Button>
              </A>
            </HStack>
          </HStack>
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Planned versus actual participation</Card.Title>
          <Card.Description>
            The published plan remains unchanged. Actual field, bench, and
            exact-position totals appear only for a trusted ledger.
          </Card.Description>
        </Card.Header>
        <Box as="ul" listStyleType="none" p="0" m="0">
          <For each={players()}>
            {(player) => {
              const actualSummary = () => actualPlayer(player.id);
              const plannedSeconds = () => plannedPositions(player.id)
                .reduce((total, position) => total + position.seconds, 0);
              return (
                <Box
                  as="li"
                  borderTopWidth="1px"
                  borderColor="border"
                  px={{ base: "4", md: "6" }}
                  py="4"
                >
                  <Grid
                    gridTemplateColumns={{
                      base: "1fr",
                      md: "minmax(10rem, .65fr) minmax(0, 1fr) minmax(0, 1fr)",
                    }}
                    gap="4"
                  >
                    <HStack alignItems="start">
                      <Box
                        boxSize="9"
                        display="grid"
                        placeItems="center"
                        borderRadius="full"
                        bg="bg.muted"
                        fontWeight="bold"
                      >
                        {player.jerseyNumber ?? "—"}
                      </Box>
                      <Text fontWeight="semibold">{player.displayName}</Text>
                    </HStack>
                    <VStack alignItems="start" gap="1">
                      <Text textStyle="xs" color="fg.muted" fontWeight="semibold">
                        PUBLISHED PLAN · {formatExactDuration(plannedSeconds())}
                      </Text>
                      <Flex gap="1" flexWrap="wrap">
                        <For each={plannedPositions(player.id)}>
                          {(position) => (
                            <Badge variant="subtle">
                              {position.short} ·{" "}
                              {formatExactDuration(position.seconds)}
                            </Badge>
                          )}
                        </For>
                      </Flex>
                    </VStack>
                    <VStack alignItems="start" gap="1">
                      <Text textStyle="xs" color="fg.muted" fontWeight="semibold">
                        ACTUAL
                      </Text>
                      <Show
                        when={actualSummary()}
                        fallback={
                          <Badge colorPalette="orange">
                            {actual().status === "incomplete"
                              ? "Incomplete — totals unavailable"
                              : "Unavailable"}
                          </Badge>
                        }
                      >
                        {(summary) => (
                          <>
                            <Text fontWeight="semibold">
                              {formatExactDuration(summary().fieldSeconds)} field
                              {" · "}
                              {formatExactDuration(summary().benchSeconds)} bench
                            </Text>
                            <Flex gap="1" flexWrap="wrap">
                              <For each={actualPositions(player.id)}>
                                {(position) => (
                                  <Badge colorPalette="grass" variant="subtle">
                                    {position.short} ·{" "}
                                    {formatExactDuration(position.seconds)}
                                  </Badge>
                                )}
                              </For>
                            </Flex>
                          </>
                        )}
                      </Show>
                    </VStack>
                  </Grid>
                </Box>
              );
            }}
          </For>
        </Box>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Own-team goal history</Card.Title>
          <Card.Description>
            Individual recorded goal events only. This is not a score or game
            result.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Show
              when={confirmedActual()}
            fallback={
              <Text color="fg.muted">
                Goal history is unavailable without a confirmed actual record.
              </Text>
            }
          >
            <Show
              when={(confirmedActual()?.goals.length ?? 0) > 0}
              fallback={
                <Text color="fg.muted">
                  No own-team goal events were recorded.
                </Text>
              }
            >
              <VStack alignItems="stretch" gap="2">
                <For
                  each={confirmedActual()?.goals ?? []}
                >
                  {(goal) => (
                    <HStack
                      justifyContent="space-between"
                      p="3"
                      borderWidth="1px"
                      borderColor="border"
                      borderRadius="l2"
                    >
                      <Text fontWeight="semibold">
                        {data.snapshot()?.players.find(
                          (player) => player.id === goal.playerId,
                        )?.displayName ?? "Player"}
                      </Text>
                      <Badge colorPalette="green">
                        Goal · Q{goal.quarter}{" "}
                        {formatGameClock(goal.elapsedGameClockSeconds)}
                      </Badge>
                    </HStack>
                  )}
                </For>
              </VStack>
            </Show>
          </Show>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}
