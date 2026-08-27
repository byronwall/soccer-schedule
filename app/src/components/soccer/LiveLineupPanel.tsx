import { For } from "solid-js";
import { Button, Text } from "~/components/ui";
import { useLiveGame } from "~/features/soccer/LiveGameProvider";
import { Box, Grid, VStack } from "styled-system/jsx";

export function LiveLineupPanel() {
  const tracker = useLiveGame();
  const started = () => tracker.live()?.status === "running" || tracker.live()?.status === "paused";
  const unavailable = () => tracker.live()?.actualHistoryStatus === "legacy_unavailable";

  return (
    <VStack alignItems="stretch" gap="2">
      <Box>
        <Text fontWeight="bold" fontSize="lg">
          Current lineup
        </Text>
        <Text color="fg.muted" textStyle="sm">
          Tap a position to choose a bench replacement or swap with another field position.
        </Text>
      </Box>
      <Grid gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="2">
        <For each={tracker.data.positions()}>
          {(position) => {
            const assigned = () => tracker.player(tracker.lineup()[position.key]);
            return (
              <Button
                variant="plain"
                minH="15"
                px="2"
                bg="bg.muted"
                justifyContent="start"
                disabled={
                  !!tracker.ui.pendingAction ||
                  !started() ||
                  tracker.live()?.status === "completed" ||
                  unavailable()
                }
                onClick={() => tracker.selectPosition(position.key)}
              >
                <Grid gridTemplateColumns="3.5rem minmax(0, 1fr)" alignItems="center" width="full">
                  <Text textStyle="xs" color="fg.muted" fontWeight="bold">
                    {position.short}
                  </Text>
                  <Text fontWeight="semibold" textAlign="left" truncate>
                    {assigned()?.displayName ?? "Unassigned"}
                  </Text>
                </Grid>
              </Button>
            );
          }}
        </For>
      </Grid>
    </VStack>
  );
}
