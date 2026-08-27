import { For, Show } from "solid-js";
import { CircleDot, Flag, Pause, Play, RefreshCw, RotateCcw, SkipForward } from "lucide-solid";
import { Badge, Button, Card, Text } from "~/components/ui";
import { useLiveGame } from "~/features/soccer/LiveGameProvider";
import { Box, HStack, VStack } from "styled-system/jsx";

const clockLabel = (remainingSeconds: number) =>
  `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

function LiveClockCard() {
  const tracker = useLiveGame();
  const pending = () => !!tracker.ui.pendingAction;
  const completed = () => tracker.live()?.status === "completed";
  const status = () => tracker.live()?.status;
  const quarter = () => tracker.live()?.quarter ?? 1;
  const secondSegment = () =>
    tracker
      .live()
      ?.events.some((event) => event.quarter === quarter() && event.type === "segment_advanced") ??
    false;
  const revision = () => tracker.live()?.revision ?? 0;
  const confirmed = () => tracker.live()?.actualHistoryStatus === "confirmed";
  const unavailable = () => tracker.live()?.actualHistoryStatus === "legacy_unavailable";
  const trustPalette = () =>
    confirmed() ? ("green" as const) : unavailable() ? ("gray" as const) : ("orange" as const);
  const trustLabel = () =>
    confirmed()
      ? "Actual record confirmed"
      : unavailable()
        ? "Actual history unavailable"
        : "Actual record incomplete";
  const statusLabel = () => status()?.replace("_", " ") ?? "not started";
  const startLabel = () => (status() === "paused" ? "Resume" : "Start");
  const started = () => tracker.live()?.status === "running" || tracker.live()?.status === "paused";

  return (
    <Card.Root bg="grass.subtle.bg">
      <Card.Body>
        <VStack py="3">
          <HStack flexWrap="wrap" justifyContent="center">
            <Badge>Quarter {quarter()}</Badge>
            <Badge colorPalette={secondSegment() ? "blue" : "gray"}>
              {secondSegment() ? "Second 7 min" : "First 7 min"}
            </Badge>
            <Badge colorPalette={trustPalette()}>{trustLabel()}</Badge>
          </HStack>
          <Box fontSize="6xl" lineHeight="1" fontWeight="bold" fontVariantNumeric="tabular-nums">
            {clockLabel(840 - tracker.elapsedSeconds())}
          </Box>
          <Text color="fg.muted">
            {statusLabel()} · revision {revision()}
          </Text>
          <HStack flexWrap="wrap" justifyContent="center">
            <Show
              when={status() === "running"}
              fallback={
                <Button
                  size="lg"
                  disabled={pending() || completed() || unavailable()}
                  onClick={() => void tracker.run("liveStart")}
                >
                  <Play /> {startLabel()}
                </Button>
              }
            >
              <Button size="lg" disabled={pending()} onClick={() => void tracker.run("livePause")}>
                <Pause /> Pause
              </Button>
            </Show>
            <Show
              when={secondSegment()}
              fallback={
                <Button
                  variant="outline"
                  disabled={pending() || !started() || completed() || unavailable()}
                  onClick={() => void tracker.run("liveAdvanceSegment")}
                >
                  <SkipForward /> Show second lineup
                </Button>
              }
            >
              <Show
                when={quarter() === 4}
                fallback={
                  <Button
                    variant="outline"
                    disabled={pending() || !started() || completed() || unavailable()}
                    onClick={() => void tracker.run("liveAdvanceQuarter")}
                  >
                    <SkipForward /> Next quarter
                  </Button>
                }
              >
                <Button
                  colorPalette="orange"
                  disabled={pending() || !started() || completed() || unavailable()}
                  onClick={() => tracker.setCompletionOpen(true)}
                >
                  <Flag /> End game
                </Button>
              </Show>
            </Show>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function LiveBenchCard() {
  const tracker = useLiveGame();
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Bench</Card.Title>
      </Card.Header>
      <Card.Body>
        <VStack alignItems="stretch">
          <For each={tracker.bench()}>
            {(player) => (
              <HStack justifyContent="space-between">
                <Text>
                  #{player.jerseyNumber ?? "—"} {player.displayName}
                </Text>
                <Badge>Ready</Badge>
              </HStack>
            )}
          </For>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function LivePrimaryActions() {
  const tracker = useLiveGame();
  const pending = () => !!tracker.ui.pendingAction;
  const started = () => tracker.live()?.status === "running" || tracker.live()?.status === "paused";
  const blocked = () =>
    pending() ||
    !started() ||
    tracker.live()?.status === "completed" ||
    tracker.live()?.actualHistoryStatus === "legacy_unavailable";
  return (
    <>
      <Button size="lg" disabled={blocked()} onClick={() => tracker.setGoalOpen(true)}>
        <CircleDot size={18} /> Record player goal
      </Button>
      <Button
        variant="outline"
        disabled={blocked()}
        onClick={() => void tracker.run("liveResetLineup")}
      >
        <RotateCcw size={16} /> Reset to published plan
      </Button>
      <Text textStyle="xs" color="fg.muted">
        The timer is a reference. Lineups follow the published 0–7 and 7–14 minute plan unless you
        record a change. Completing records a full 14 minutes per quarter.
      </Text>
      <Button variant="plain" disabled={pending()} onClick={() => void tracker.data.refresh()}>
        <RefreshCw size={16} /> Refresh now
      </Button>
    </>
  );
}

export function LiveGameStatusPanel() {
  return (
    <VStack alignItems="stretch" gap="4">
      <LiveClockCard />
      <LiveBenchCard />
      <LivePrimaryActions />
    </VStack>
  );
}
