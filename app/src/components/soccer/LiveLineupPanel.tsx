import { For } from "solid-js";
import { Badge, Button, Card, Text } from "~/components/ui";
import { useLiveGame } from "~/features/soccer/LiveGameProvider";
import { Grid, HStack, VStack } from "styled-system/jsx";

export function LiveLineupPanel() {
  const tracker = useLiveGame();
  const started = () => tracker.live()?.status === "running" || tracker.live()?.status === "paused";
  const unavailable = () => tracker.live()?.actualHistoryStatus === "legacy_unavailable";

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Current lineup</Card.Title>
        <Card.Description>
          Tap a position to choose a bench replacement or swap with another field position.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Grid gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="3">
          <For each={tracker.data.positions()}>
            {(position) => {
              const assigned = () => tracker.player(tracker.lineup()[position.key]);
              return (
                <Button
                  variant="outline"
                  minH="20"
                  justifyContent="space-between"
                  disabled={
                    !!tracker.ui.pendingAction ||
                    !started() ||
                    tracker.live()?.status === "completed" ||
                    unavailable()
                  }
                  onClick={() => tracker.selectPosition(position.key)}
                >
                  <HStack minW="0">
                    <Badge>{position.short}</Badge>
                    <VStack alignItems="start" gap="0" minW="0">
                      <Text textStyle="xs" color="fg.muted">
                        {position.label}
                      </Text>
                      <Text fontWeight="semibold">
                        #{assigned()?.jerseyNumber ?? "—"} {assigned()?.displayName}
                      </Text>
                    </VStack>
                  </HStack>
                </Button>
              );
            }}
          </For>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
