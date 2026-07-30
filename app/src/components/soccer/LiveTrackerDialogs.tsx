import { For } from "solid-js";
import {
  Button,
  SimpleDialog,
  SimpleSelect,
} from "~/components/ui";
import { useLiveGame } from "~/features/soccer/LiveGameProvider";
import { HStack, VStack } from "styled-system/jsx";

export function LiveTrackerDialogs() {
  const tracker = useLiveGame();
  const pending = () => !!tracker.ui.pendingAction;
  const currentPosition = () =>
    tracker.data.positions().find(
      (position) => position.key === tracker.ui.selectedPositionKey,
    );

  return (
    <>
      <SimpleDialog
        open={!!tracker.ui.selectedPositionKey}
        onOpenChange={(open) => !open && tracker.selectPosition(undefined)}
        title={`Change ${currentPosition()?.label ?? "position"}`}
        description="Choose a bench player to replace this field player, or swap with another field position."
        skipPortal
      >
        <VStack alignItems="stretch" gap="4">
          <strong>Replace from bench</strong>
          <For each={tracker.bench()}>
            {(player) => (
              <Button
                variant="outline"
                disabled={pending()}
                onClick={() => void tracker.substitute(player.id)}
              >
                #{player.jerseyNumber ?? "—"} {player.displayName}
              </Button>
            )}
          </For>
          <strong>Swap field positions</strong>
          <For
            each={tracker.data.positions().filter(
              (position) => position.key !== tracker.ui.selectedPositionKey,
            )}
          >
            {(position) => (
              <Button
                variant="outline"
                disabled={pending()}
                onClick={() => void tracker.swap(position.key)}
              >
                Swap with {position.label}
              </Button>
            )}
          </For>
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
          <SimpleSelect
            label="Scorer"
            placeholder="Choose player"
            value={tracker.ui.goalPlayerId}
            onChange={tracker.setGoalPlayerId}
            items={tracker.availablePlayers().map((player) => ({
              value: player.id,
              label: `#${player.jerseyNumber ?? "—"} ${player.displayName}`,
            }))}
          />
          <Button
            size="lg"
            disabled={!tracker.ui.goalPlayerId || pending()}
            onClick={() => void tracker.recordGoal()}
          >
            {tracker.ui.pendingAction === "liveRecordGoal"
              ? "Recording…"
              : "Record goal"}
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
          <Button
            variant="outline"
            onClick={() => tracker.requestVoid(undefined)}
          >
            Cancel
          </Button>
          <Button
            colorPalette="red"
            disabled={pending()}
            onClick={() => void tracker.voidEvent()}
          >
            Void event
          </Button>
        </HStack>
      </SimpleDialog>

      <SimpleDialog
        open={tracker.ui.completionOpen}
        onOpenChange={tracker.setCompletionOpen}
        title="Complete and confirm?"
        description="This permanently marks the event ledger as trusted actual history. Check recent events and correct mistakes first."
        skipPortal
      >
        <HStack justifyContent="flex-end">
          <Button
            variant="outline"
            onClick={() => tracker.setCompletionOpen(false)}
          >
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
