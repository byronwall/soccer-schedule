import { A, useParams } from "@solidjs/router";
import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import {
  CheckCircle2,
  Lock,
  PencilLine,
  Printer,
  Redo2,
  RefreshCw,
  ShieldCheck,
  Undo2,
  Users,
  Wrench,
} from "lucide-solid";
import { Badge, Button, Card, SimpleDialog, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { type PositionKey, type SegmentKey } from "~/lib/soccer/fixed-game";
import { scoreSchedule, type ScheduleQuality } from "~/lib/soccer/scheduling";
import type { Assignment, Player, Schedule } from "~/lib/soccer/schemas";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";
import { PlayerScheduleGrid } from "./PlayerScheduleGrid";
import { PlannedMinutes, PositionGrid, type ScheduleSwap } from "./ScheduleGrids";
import { ScheduleQualityPopover } from "./ScheduleQualityPopover";

type Selection = { segmentKey: SegmentKey; positionKey: PositionKey };
type ScheduleView = "position" | "player";

const schedulePriority = (schedule: Schedule) => {
  if (schedule.status === "draft" || schedule.status === "stale") return 0;
  if (schedule.status === "published") return 1;
  return 2;
};

const selectCurrentSchedule = (schedules: Schedule[], gameId: string) =>
  schedules
    .filter((schedule) => schedule.gameId === gameId && schedule.status !== "superseded")
    .sort((left, right) => {
      const priorityDifference = schedulePriority(left) - schedulePriority(right);
      return priorityDifference || right.updatedAt.localeCompare(left.updatedAt);
    })[0];

const isEditable = (schedule?: Schedule) => schedule?.status === "draft" || schedule?.status === "stale";

export function SchedulePage() {
  const data = useSoccerData();
  const params = useParams();
  const [view, setView] = createSignal<ScheduleView>("position");
  const [selection, setSelection] = createSignal<Selection>();
  const [regenerateOpen, setRegenerateOpen] = createSignal(false);

  const game = () => data.snapshot()?.games.find((item) => item.id === params.gameId);
  const schedule = createMemo(() => selectCurrentSchedule(data.snapshot()?.schedules ?? [], params.gameId ?? ""));
  const availableIds = createMemo(
    () =>
      data.snapshot()?.availability
        .filter((item) => item.gameId === params.gameId && item.status === "available")
        .map((item) => item.playerId) ?? [],
  );
  const availablePlayers = createMemo(
    () => data.snapshot()?.players.filter((item) => availableIds().includes(item.id)) ?? [],
  );
  const rosterPlayers = createMemo(
    () => data.snapshot()?.players.filter((item) => item.active) ?? [],
  );
  const inactivePlayerIds = createMemo(
    () => rosterPlayers().filter((item) => !availableIds().includes(item.id)).map((item) => item.id),
  );
  const quality = createMemo(() => {
    const current = schedule();
    return current ? scoreSchedule(current.assignments, availableIds()) : undefined;
  });

  const player = (id: string) => data.snapshot()?.players.find((item) => item.id === id);
  const assignment = (segmentKey: SegmentKey, positionKey: PositionKey) =>
    schedule()?.assignments.find(
      (item) => item.segmentKey === segmentKey && item.positionKey === positionKey,
    );

  const replace = async (playerId: string) => {
    const selected = selection();
    const current = schedule();
    if (!selected || !current || !isEditable(current)) return;
    await data.run("replaceAssignment", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...selected,
      playerId,
    });
    setSelection();
  };

  const swap = async (change: ScheduleSwap) => {
    const current = schedule();
    if (!current || !isEditable(current)) return;
    await data.run("replaceAssignment", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...change,
    });
  };

  const toggleLock = async () => {
    const selected = selection();
    const current = schedule();
    if (!selected || !current || !isEditable(current)) return;
    await data.run("toggleLock", {
      scheduleId: current.id,
      expectedRevision: current.revision,
      ...selected,
    });
    setSelection();
  };

  const regenerate = async () => {
    await data.run("generateSchedule", { gameId: params.gameId });
    setRegenerateOpen(false);
    setSelection();
  };

  return (
    <Show when={game()}>
      {(currentGame) => (
        <>
          <PageHeader
            eyebrow="Schedule editor"
            title={`vs. ${currentGame().opponentName}`}
            description={isEditable(schedule())
              ? "Drag players up or down within a segment to swap field and substitute assignments. Click a field assignment for the accessible picker."
              : "This published schedule is read-only. Choose Edit again to make small changes without regenerating the rotation."}
            actions={
              <HStack gap="2">
                <A href={`/games/${params.gameId}/print`}>
                  <Button variant="outline">
                    <Printer size={16} /> Print
                  </Button>
                </A>
                <A href={`/games/${params.gameId}/live`}>
                  <Button variant="outline">Game day</Button>
                </A>
              </HStack>
            }
          />

          <ScheduleToolbar
            view={view()}
            schedule={schedule()}
            quality={quality()}
            onViewChange={setView}
            onGenerate={() => void data.run("generateSchedule", { gameId: params.gameId })}
            onEditAgain={() => {
              const current = schedule();
              if (current?.status === "published") {
                void data.run("editPublishedSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onRegenerate={() => setRegenerateOpen(true)}
            onRepair={() => void data.run("repairSchedule", { gameId: params.gameId })}
            onUndo={() => {
              const current = schedule();
              if (current) {
                void data.run("undoSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onRedo={() => {
              const current = schedule();
              if (current) {
                void data.run("redoSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
            onPublish={() => {
              const current = schedule();
              if (current) {
                void data.run("publishSchedule", {
                  scheduleId: current.id,
                  expectedRevision: current.revision,
                });
              }
            }}
          />

          <Show when={schedule()} fallback={<EmptySchedule onGenerate={() => void data.run("generateSchedule", { gameId: params.gameId })} />}>
            {(currentSchedule) => (
              <>
                <Box minW="0" maxW="100%" overflowX="auto">
                  <Show
                    when={view() === "position"}
                    fallback={<PlayerScheduleGrid schedule={currentSchedule()} players={availablePlayers()} positions={data.positions()} />}
                  >
                    <PositionGrid
                      schedule={currentSchedule()}
                      positions={data.positions()}
                      players={rosterPlayers()}
                      inactivePlayerIds={inactivePlayerIds()}
                      editable={isEditable(currentSchedule())}
                      onSelect={setSelection}
                      onSwap={(change) => void swap(change)}
                    />
                  </Show>
                </Box>
                <PlannedMinutes quality={quality()} player={player} />
              </>
            )}
          </Show>

          <AssignmentDialog
            selection={selection()}
            schedule={schedule()}
            players={availablePlayers()}
            assignment={assignment}
            onClose={() => setSelection()}
            onReplace={(playerId) => void replace(playerId)}
            onToggleLock={() => void toggleLock()}
          />

          <SimpleDialog
            open={regenerateOpen()}
            onOpenChange={setRegenerateOpen}
            title="Regenerate schedule?"
            description="This replaces the current working draft with a fresh deterministic rotation. The published schedule remains available until you publish the new draft."
            footer={
              <HStack justifyContent="flex-end">
                <Button variant="outline" onClick={() => setRegenerateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => void regenerate()}>
                  <RefreshCw size={16} /> Regenerate
                </Button>
              </HStack>
            }
          >
            <Text color="fg.muted">Use repair when you want to preserve unaffected assignments.</Text>
          </SimpleDialog>
        </>
      )}
    </Show>
  );
}

type ScheduleToolbarProps = {
  view: ScheduleView;
  schedule?: Schedule;
  quality?: ScheduleQuality;
  onViewChange: (view: ScheduleView) => void;
  onGenerate: () => void;
  onEditAgain: () => void;
  onRegenerate: () => void;
  onRepair: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
};

function ScheduleToolbar(props: ScheduleToolbarProps) {
  return (
    <Flex gap="2" mb="4" flexWrap="wrap">
      <Show
        when={props.view === "position"}
        fallback={
          <Button variant="outline" onClick={() => props.onViewChange("position")}>
            <ShieldCheck size={16} /> By position
          </Button>
        }
      >
        <Button onClick={() => props.onViewChange("position")}>
          <ShieldCheck size={16} /> By position
        </Button>
      </Show>
      <Show
        when={props.view === "player"}
        fallback={
          <Button variant="outline" onClick={() => props.onViewChange("player")}>
            <Users size={16} /> By player
          </Button>
        }
      >
        <Button onClick={() => props.onViewChange("player")}>
          <Users size={16} /> By player
        </Button>
      </Show>

      <Show when={props.schedule} fallback={<Button onClick={props.onGenerate}><RefreshCw size={16} /> Generate schedule</Button>}>
        {(currentSchedule) => (
          <Show
            when={currentSchedule().status === "published"}
            fallback={
              <Button variant="outline" onClick={props.onRegenerate}>
                <RefreshCw size={16} /> Regenerate
              </Button>
            }
          >
            <Button onClick={props.onEditAgain}>
              <PencilLine size={16} /> Edit again
            </Button>
          </Show>
        )}
      </Show>
      <Show when={props.schedule?.status === "stale" || (props.schedule && !props.quality?.valid)}>
        <Button onClick={props.onRepair}>
          <Wrench size={16} /> Repair draft
        </Button>
      </Show>
      <Show when={props.schedule?.status === "draft"}>
        <Button variant="outline" disabled={!props.schedule?.history.length} onClick={props.onUndo}>
          <Undo2 size={16} /> Undo
        </Button>
        <Button variant="outline" disabled={!props.schedule?.future.length} onClick={props.onRedo}>
          <Redo2 size={16} /> Redo
        </Button>
        <Button colorPalette="grass" onClick={props.onPublish}>
          <CheckCircle2 size={16} /> Publish schedule
        </Button>
      </Show>
      <Show when={props.schedule}><ScheduleQualityPopover quality={props.quality} /></Show>
      <Show when={props.schedule}>{(current) => <ScheduleStatusBadge status={current().status} />}</Show>
    </Flex>
  );
}

function ScheduleStatusBadge(props: { status: Schedule["status"] }) {
  return (
    <Switch fallback={<Badge>superseded</Badge>}>
      <Match when={props.status === "published"}><Badge colorPalette="grass">published</Badge></Match>
      <Match when={props.status === "stale"}><Badge colorPalette="orange">stale</Badge></Match>
      <Match when={props.status === "draft"}><Badge colorPalette="blue">draft</Badge></Match>
    </Switch>
  );
}

function EmptySchedule(props: { onGenerate: () => void }) {
  return (
    <Card.Root>
      <Card.Body>
        <VStack py="10">
          <RefreshCw size={38} />
          <Text fontWeight="semibold">No rotation yet</Text>
          <Text color="fg.muted">Generate a fair starting point from the current availability.</Text>
          <Button onClick={props.onGenerate}>Generate schedule</Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

type AssignmentDialogProps = {
  selection?: Selection;
  schedule?: Schedule;
  players: Player[];
  assignment: (segmentKey: SegmentKey, positionKey: PositionKey) => Assignment | undefined;
  onClose: () => void;
  onReplace: (playerId: string) => void;
  onToggleLock: () => void;
};

function AssignmentDialog(props: AssignmentDialogProps) {
  const selectedPlayerId = () => {
    if (!props.selection) return undefined;
    return props.assignment(props.selection.segmentKey, props.selection.positionKey)?.playerId;
  };

  return (
    <SimpleDialog
      open={!!props.selection && isEditable(props.schedule)}
      onOpenChange={(open) => !open && props.onClose()}
      title="Change assignment"
      description="Selecting a player already on the field swaps the two assignments automatically."
      footer={
        <Show when={props.selection && isEditable(props.schedule)}>
          <Button variant="outline" onClick={props.onToggleLock}>
            <Lock size={16} /> Toggle lock
          </Button>
        </Show>
      }
    >
      <Grid gridTemplateColumns="repeat(2, minmax(0, 1fr))" gap="2">
        <For each={props.players}>
          {(player) => (
            <Show
              when={selectedPlayerId() === player.id}
              fallback={<Button variant="outline" onClick={() => props.onReplace(player.id)}>#{player.jerseyNumber ?? "—"} {player.displayName}</Button>}
            >
              <Button onClick={() => props.onReplace(player.id)}>#{player.jerseyNumber ?? "—"} {player.displayName}</Button>
            </Show>
          )}
        </For>
      </Grid>
    </SimpleDialog>
  );
}
