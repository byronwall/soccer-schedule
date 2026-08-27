import { createMemo, For } from "solid-js";
import { Button, SimpleDialog, Text } from "~/components/ui";
import { useLiveGame } from "~/features/soccer/LiveGameProvider";
import { compactPlayerNameMap } from "~/lib/soccer/player-display-name";
import { Grid, HStack, VStack } from "styled-system/jsx";

export function LiveTrackerDialogs() {
  const tracker = useLiveGame();
  const pending = () => !!tracker.ui.pendingAction;
  const currentPosition = () =>
    tracker.data.positions().find((position) => position.key === tracker.ui.selectedPositionKey);
  const currentPlayer = () => {
    const positionKey = tracker.ui.selectedPositionKey;
    return positionKey ? tracker.player(tracker.lineup()[positionKey]) : undefined;
  };
  const scorerLabels = createMemo(() => compactPlayerNameMap(tracker.availablePlayers()));

  return (
    <>
      <SimpleDialog
        open={!!tracker.ui.selectedPositionKey}
        onOpenChange={(open) => !open && tracker.selectPosition(undefined)}
        title={`Change ${currentPosition()?.label ?? "position"}`}
        description={`Choose who replaces ${currentPlayer()?.displayName ?? "this player"}, or choose another field player to swap positions.`}
        skipPortal
      >
        <VStack alignItems="stretch" gap="4">
          <strong>Replace from bench</strong>
          <Grid gridTemplateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))" }} gap="2">
            <For each={tracker.bench()}>
              {(player) => (
                <Button
                  variant="outline"
                  disabled={pending()}
                  onClick={() => void tracker.substitute(player.id)}
                >
                  {player.displayName}
                </Button>
              )}
            </For>
          </Grid>
          <strong>Swap with field player</strong>
          <Grid gridTemplateColumns={{ base: "1fr", sm: "repeat(2, minmax(0, 1fr))" }} gap="2">
            <For
              each={tracker.data
                .positions()
                .filter((position) => position.key !== tracker.ui.selectedPositionKey)}
            >
              {(position) => {
                const player = () => tracker.player(tracker.lineup()[position.key]);
                return (
                  <Button
                    variant="outline"
                    minH="14"
                    disabled={pending()}
                    onClick={() => void tracker.swap(position.key)}
                  >
                    <VStack gap="0">
                      <Text fontWeight="semibold">{player()?.displayName ?? "Unassigned"}</Text>
                      <Text textStyle="xs" color="fg.muted">
                        {position.label}
                      </Text>
                    </VStack>
                  </Button>
                );
              }}
            </For>
          </Grid>
        </VStack>
      </SimpleDialog>

      <SimpleDialog
        open={tracker.ui.goalOpen}
        onOpenChange={tracker.setGoalOpen}
        title="Record player goal"
        description="Choose the player who scored for your team."
        skipPortal
      >
        <VStack alignItems="stretch" gap="4">
          <Grid
            gridTemplateColumns={{
              base: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
            }}
            gap="2"
            role="group"
            aria-label="Scorer"
          >
            <For each={tracker.availablePlayers()}>
              {(player) => {
                const selected = () => tracker.ui.goalPlayerId === player.id;
                return (
                  <Button
                    variant={selected() ? "solid" : "outline"}
                    aria-pressed={selected()}
                    disabled={pending()}
                    onClick={() => tracker.setGoalPlayerId(player.id)}
                  >
                    {scorerLabels().get(player.id)}
                  </Button>
                );
              }}
            </For>
          </Grid>
          <Button
            size="lg"
            disabled={!tracker.ui.goalPlayerId || pending()}
            onClick={() => void tracker.recordGoal()}
          >
            {tracker.ui.pendingAction === "liveRecordGoal" ? "Recording…" : "Record goal"}
          </Button>
        </VStack>
      </SimpleDialog>

      <SimpleDialog
        open={!!tracker.ui.voidEventId}
        onOpenChange={(open) => !open && tracker.requestVoid(undefined)}
        title="Void this event?"
        description="The published plan will remain unchanged. The current lineup will be recomputed from the remaining events."
        skipPortal
      >
        <HStack justifyContent="flex-end">
          <Button variant="outline" onClick={() => tracker.requestVoid(undefined)}>
            Cancel
          </Button>
          <Button colorPalette="red" disabled={pending()} onClick={() => void tracker.voidEvent()}>
            Void event
          </Button>
        </HStack>
      </SimpleDialog>

      <SimpleDialog
        open={tracker.ui.completionOpen}
        onOpenChange={tracker.setCompletionOpen}
        title="Complete and confirm?"
        description="This records all four quarters as 14 minutes, applies each published lineup change at 7:00, and permanently confirms the ledger. Check recent events first."
        skipPortal
      >
        <HStack justifyContent="flex-end">
          <Button variant="outline" onClick={() => tracker.setCompletionOpen(false)}>
            Keep tracking
          </Button>
          <Button
            colorPalette="orange"
            disabled={pending()}
            onClick={() => void tracker.completeAndConfirm()}
          >
            {tracker.ui.pendingAction === "liveCompleteAndConfirm"
              ? "Confirming…"
              : "Complete and confirm"}
          </Button>
        </HStack>
      </SimpleDialog>
    </>
  );
}
