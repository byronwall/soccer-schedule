import { For, Show } from "solid-js";
import { CircleDot, Pause, Play, RefreshCw, RotateCcw, SkipForward } from "lucide-solid";
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
            <Button
              variant="outline"
              disabled={pending() || !started() || completed() || unavailable() || quarter() === 4}
              onClick={() => void tracker.run("liveAdvanceQuarter")}
            >
              <SkipForward /> Next quarter
            </Button>
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
        Advancing a quarter keeps every event and loads that quarter’s published lineup. Resetting
        also adds an event; it never erases history.
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
