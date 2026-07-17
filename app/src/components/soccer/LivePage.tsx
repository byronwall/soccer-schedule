import { A, useParams } from "@solidjs/router";
import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Pause, Play, RefreshCw, RotateCcw, SkipForward } from "lucide-solid";
import { Badge, Button, Card, SimpleDialog, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { type Position, type PositionKey, type SEGMENTS } from "~/lib/soccer/fixed-game";
import { elapsedQuarterSeconds } from "~/lib/soccer/scheduling";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";

type SegmentKey = (typeof SEGMENTS)[number]["key"];

export function LivePage() {
  const data = useSoccerData();
  const params = useParams();
  const [tick, setTick] = createSignal(0);
  const [selectedPosition, setSelectedPosition] = createSignal<Position>();

  const game = createMemo(() => data.snapshot()?.games.find((item) => item.id === params.gameId));
  const schedule = createMemo(() =>
    data.snapshot()?.schedules.find(
      (item) => item.gameId === params.gameId && item.status === "published",
    ),
  );
  const live = createMemo(() =>
    data.snapshot()?.liveGames.find((item) => item.gameId === params.gameId),
  );

  onMount(() => {
    let elapsedTicks = 0;
    const timer = window.setInterval(() => {
      elapsedTicks += 1;
      setTick(elapsedTicks);
      if (elapsedTicks % 2 === 0) void data.refresh();
    }, 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  const elapsed = createMemo(() => {
    tick();
    const current = live();
    return current
      ? elapsedQuarterSeconds(current.runningSince, current.accumulatedQuarterSeconds)
      : 0;
  });
  const remaining = createMemo(() => 840 - elapsed());
  const clock = createMemo(
    () =>
      `${String(Math.floor(remaining() / 60)).padStart(2, "0")}:${String(remaining() % 60).padStart(2, "0")}`,
  );
  const segmentKey = createMemo(
    () => `q${live()?.quarter ?? 1}${elapsed() < 420 ? "a" : "b"}` as SegmentKey,
  );
  const lineup = createMemo(() => {
    const published = schedule();
    const currentLive = live();
    return Object.fromEntries(
      data.positions().map((position) => {
        const plannedPlayerId = published?.assignments.find(
          (item) => item.segmentKey === segmentKey() && item.positionKey === position.key,
        )?.playerId;
        const replacementPlayerId = currentLive?.overrides.find(
          (item) => item.positionKey === position.key,
        )?.replacementPlayerId;
        return [position.key, replacementPlayerId ?? plannedPlayerId];
      }),
    ) as Partial<Record<PositionKey, string>>;
  });
  const availableIds = createMemo(
    () =>
      data.snapshot()?.availability
        .filter((item) => item.gameId === params.gameId && item.status === "available")
        .map((item) => item.playerId) ?? [],
  );
  const fieldIds = createMemo(() => Object.values(lineup()).filter(Boolean));
  const bench = createMemo(
    () =>
      data.snapshot()?.players.filter(
        (item) => item.active && availableIds().includes(item.id) && !fieldIds().includes(item.id),
      ) ?? [],
  );

  const player = (id?: string) => data.snapshot()?.players.find((item) => item.id === id);

  const applyOverride = async (playerId: string) => {
    const position = selectedPosition();
    if (!position) return;
    await data.run("liveOverride", {
      gameId: params.gameId,
      positionKey: position.key,
      playerId,
    });
    setSelectedPosition();
  };

  return (
    <Show when={game()}>
      {(currentGame) => (
        <>
          <PageHeader
            eyebrow="Game day"
            title={`vs. ${currentGame().opponentName}`}
            description="Live changes are temporary. Published planned minutes stay untouched."
            actions={
              <A href={`/games/${params.gameId}/schedule`}>
                <Button variant="outline">Back to schedule</Button>
              </A>
            }
          />
          <Show
            when={schedule()}
            fallback={
              <Card.Root>
                <Card.Body>
                  <Text>Publish a valid schedule before opening game-day mode.</Text>
                </Card.Body>
              </Card.Root>
            }
          >
            <Grid gridTemplateColumns={{ base: "1fr", lg: "320px 1fr" }} gap="5">
              <VStack alignItems="stretch" gap="4">
                <Card.Root bg="grass.subtle.bg">
                  <Card.Body>
                    <VStack py="4">
                      <Badge>
                        Quarter {live()?.quarter ?? 1} · {segmentKey().endsWith("a") ? "First 7" : "Second 7"}
                      </Badge>
                      <Box fontSize="6xl" lineHeight="1" fontWeight="bold" fontVariantNumeric="tabular-nums">
                        {clock()}
                      </Box>
                      <Text color="fg.muted">
                        {live()?.status?.replace("_", " ") ?? "not started"} · sync revision {live()?.revision ?? 0}
                      </Text>
                      <HStack>
                        <Show
                          when={live()?.status === "running"}
                          fallback={
                            <Button size="lg" onClick={() => void data.run("liveStart", { gameId: params.gameId })}>
                              <Play /> Start
                            </Button>
                          }
                        >
                          <Button size="lg" onClick={() => void data.run("livePause", { gameId: params.gameId })}>
                            <Pause /> Pause
                          </Button>
                        </Show>
                        <Button variant="outline" onClick={() => void data.run("liveAdvance", { gameId: params.gameId })}>
                          <SkipForward /> Next quarter
                        </Button>
                      </HStack>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                <Card.Root>
                  <Card.Header><Card.Title>Bench</Card.Title></Card.Header>
                  <Card.Body>
                    <VStack alignItems="stretch">
                      <For each={bench()}>
                        {(item) => (
                          <HStack justifyContent="space-between">
                            <Text>#{item.jerseyNumber ?? "—"} {item.displayName}</Text>
                            <Badge>Ready</Badge>
                          </HStack>
                        )}
                      </For>
                    </VStack>
                  </Card.Body>
                </Card.Root>

                <Button variant="outline" onClick={() => void data.run("liveReset", { gameId: params.gameId })}>
                  <RotateCcw size={16} /> Reset temporary changes
                </Button>
                <Button variant="plain" onClick={() => void data.refresh()}>
                  <RefreshCw size={16} /> Refresh now
                </Button>
              </VStack>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Current lineup</Card.Title>
                  <Card.Description>Tap a position to make a temporary game-day change.</Card.Description>
                </Card.Header>
                <Card.Body>
                  <Grid gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="3">
                    <For each={data.positions()}>
                      {(position) => {
                        const assignedPlayer = () => player(lineup()[position.key]);
                        const hasOverride = () =>
                          live()?.overrides.some((entry) => entry.positionKey === position.key);
                        return (
                          <Button
                            variant="outline"
                            minH="20"
                            justifyContent="space-between"
                            onClick={() => setSelectedPosition(position)}
                          >
                            <HStack>
                              <Badge>{position.short}</Badge>
                              <VStack alignItems="start" gap="0">
                                <Text textStyle="xs" color="fg.muted">{position.label}</Text>
                                <Text fontWeight="semibold">
                                  #{assignedPlayer()?.jerseyNumber ?? "—"} {assignedPlayer()?.displayName}
                                </Text>
                              </VStack>
                            </HStack>
                            <Show when={hasOverride()}>
                              <Badge colorPalette="orange">Temporary</Badge>
                            </Show>
                          </Button>
                        );
                      }}
                    </For>
                  </Grid>
                </Card.Body>
              </Card.Root>
            </Grid>
          </Show>

          <SimpleDialog
            open={!!selectedPosition()}
            onOpenChange={(open) => !open && setSelectedPosition()}
            title={`Replace ${selectedPosition()?.label ?? "player"}`}
            description="Choose someone currently on the bench. This clears at the next quarter."
            footer={<Button variant="outline" onClick={() => setSelectedPosition()}>Cancel</Button>}
          >
            <VStack alignItems="stretch">
              <For each={bench()}>
                {(item) => (
                  <Button variant="outline" onClick={() => void applyOverride(item.id)}>
                    #{item.jerseyNumber ?? "—"} {item.displayName}
                  </Button>
                )}
              </For>
            </VStack>
          </SimpleDialog>
        </>
      )}
    </Show>
  );
}
