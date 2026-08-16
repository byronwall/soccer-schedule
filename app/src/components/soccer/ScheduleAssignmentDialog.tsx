import { For, Show } from "solid-js";
import { Lock } from "lucide-solid";
import { Button, SimpleDialog } from "~/components/ui";
import type { PositionKey, SegmentKey } from "~/lib/soccer/fixed-game";
import type { Assignment, Player, Schedule } from "~/lib/soccer/schemas";
import { Grid } from "styled-system/jsx";

type ScheduleAssignmentDialogProps = {
  selection?: { segmentKey: SegmentKey; positionKey: PositionKey };
  schedule?: Schedule;
  players: Player[];
  assignment: (segmentKey: SegmentKey, positionKey: PositionKey) => Assignment | undefined;
  onClose: () => void;
  onClear: () => void;
  onReplace: (playerId: string) => void;
  onToggleLock: () => void;
};

const isEditable = (schedule?: Schedule) =>
  schedule?.status === "draft" || schedule?.status === "stale";

export function ScheduleAssignmentDialog(props: ScheduleAssignmentDialogProps) {
  const selectedPlayerId = () => {
    if (!props.selection) return undefined;
    return props.assignment(props.selection.segmentKey, props.selection.positionKey)?.playerId;
  };
  const selectedAssignment = () => {
    if (!props.selection) return undefined;
    return props.assignment(props.selection.segmentKey, props.selection.positionKey);
  };

  return (
    <SimpleDialog
      open={!!props.selection && isEditable(props.schedule)}
      onOpenChange={(open) => !open && props.onClose()}
      title="Change assignment"
      description="Selecting a player already on the field swaps the two assignments automatically."
      footer={
        <Show when={selectedAssignment() && isEditable(props.schedule)}>
          <>
            <Button variant="outline" onClick={props.onToggleLock}>
              <Lock size={16} /> {selectedAssignment()?.locked ? "Unlock cell" : "Lock cell"}
            </Button>
            <Button
              variant="outline"
              colorPalette="red"
              disabled={selectedAssignment()?.locked}
              onClick={props.onClear}
            >
              Clear assignment
            </Button>
          </>
        </Show>
      }
    >
      <Grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="2">
        <For each={props.players}>
          {(player) => (
            <Show
              when={selectedPlayerId() === player.id}
              fallback={
                <Button variant="outline" onClick={() => props.onReplace(player.id)}>
                  #{player.jerseyNumber ?? "—"} {player.displayName}
                </Button>
              }
            >
              <Button onClick={() => props.onReplace(player.id)}>
                #{player.jerseyNumber ?? "—"} {player.displayName}
              </Button>
            </Show>
          )}
        </For>
      </Grid>
    </SimpleDialog>
  );
}
