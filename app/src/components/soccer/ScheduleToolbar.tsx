import { Match, Show, Switch } from "solid-js";
import {
  CheckCircle2,
  LockOpen,
  PencilLine,
  Redo2,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-solid";
import {
  Badge,
  Button,
  ButtonGroup,
  IconButton,
  SegmentGroup,
  Tooltip,
} from "~/components/ui";
import type { ScheduleQuality } from "~/lib/soccer/scheduling";
import type { Schedule } from "~/lib/soccer/schemas";
import type { ScheduleReadiness } from "~/lib/soccer/schedule-readiness";
import { Flex, HStack } from "styled-system/jsx";
import { ScheduleQualityPopover } from "./ScheduleQualityPopover";

export type ScheduleView = "position" | "player";

type ScheduleToolbarProps = {
  view: ScheduleView;
  schedule?: Schedule;
  quality?: ScheduleQuality;
  eligibleIds: string[];
  readiness?: ScheduleReadiness;
  playerName: (playerId: string) => string;
  onViewChange: (view: ScheduleView) => void;
  onGenerate: () => void;
  onEditAgain: () => void;
  onFillAll: () => void;
  generationPending: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPublish: () => void;
  onRemoveAllLocks: () => void;
  onClearAll: () => void;
};

export function ScheduleToolbar(props: ScheduleToolbarProps) {
  const viewItems = [
    { value: "position", label: "By position" },
    { value: "player", label: "By player" },
  ];

  return (
    <Flex
      as="section"
      aria-label="Schedule controls"
      alignItems="center"
      gap="2"
      mb="4"
      flexWrap="wrap"
    >
      <SegmentGroup.Root
        size="sm"
        value={props.view}
        aria-label="Schedule view"
        onValueChange={(details) => {
          if (details.value === "position" || details.value === "player") {
            props.onViewChange(details.value);
          }
        }}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={viewItems} />
      </SegmentGroup.Root>

      <Show
        when={props.schedule}
        fallback={
          <Button size="sm" onClick={props.onGenerate}>
            <RefreshCw size={16} /> Generate schedule
          </Button>
        }
      >
        {(currentSchedule) => (
          <Show
            when={currentSchedule().status === "published"}
            fallback={
              <>
                <Button
                  size="sm"
                  colorPalette="grass"
                  disabled={props.generationPending}
                  onClick={props.onFillAll}
                >
                  <RefreshCw size={16} />
                  {props.readiness?.kind === "incomplete"
                    ? "Fill all"
                    : "Fill or rebalance all"}
                </Button>
              </>
            }
          >
            <Button size="sm" onClick={props.onEditAgain}>
              <PencilLine size={16} /> Edit again
            </Button>
          </Show>
        )}
      </Show>
      <Show when={props.schedule?.status === "draft"}>
        <ButtonGroup gap="0">
          <Tooltip content="Undo last schedule change">
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Undo last schedule change"
              disabled={!props.schedule?.history.length}
              onClick={props.onUndo}
            >
              <Undo2 size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Redo schedule change">
            <IconButton
              size="sm"
              variant="outline"
              aria-label="Redo schedule change"
              disabled={!props.schedule?.future.length}
              onClick={props.onRedo}
            >
              <Redo2 size={16} />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Show>
      <Show when={props.schedule}>
        {(current) => (
          <HStack gap="2" flexWrap="wrap">
            <Show when={props.quality}>
              {(quality) => (
                <ScheduleQualityPopover
                  quality={quality()}
                  assignments={current().assignments}
                  eligibleIds={props.eligibleIds}
                  playerName={props.playerName}
                />
              )}
            </Show>
            <ScheduleStatusBadge
              status={current().status}
              readiness={props.readiness}
            />
            <Show when={current().status === "draft"}>
              <Button
                size="sm"
                colorPalette="grass"
                disabled={props.readiness?.kind !== "valid-draft"}
                onClick={props.onPublish}
              >
                <CheckCircle2 size={16} /> Publish schedule
              </Button>
            </Show>
          </HStack>
        )}
      </Show>
      <Show
        when={
          props.schedule?.status === "draft" ||
          props.schedule?.status === "stale"
        }
      >
        <Show
          when={props.schedule?.assignments.some(
            (assignment) => assignment.locked,
          )}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={props.onRemoveAllLocks}
          >
            <LockOpen size={16} /> Remove all locks
          </Button>
        </Show>
        <Button
          size="sm"
          variant="outline"
          disabled={!props.schedule?.assignments.length}
          onClick={props.onClearAll}
        >
          <Trash2 size={16} /> Clear all
        </Button>
      </Show>
    </Flex>
  );
}

function ScheduleStatusBadge(props: {
  status: Schedule["status"];
  readiness?: ScheduleReadiness;
}) {
  return (
    <Switch fallback={<Badge>superseded</Badge>}>
      <Match when={props.status === "published"}>
        <Badge colorPalette="grass">published</Badge>
      </Match>
      <Match when={props.status === "stale"}>
        <Badge colorPalette="orange">
          {props.readiness?.kind === "incomplete"
            ? "incomplete · availability changed"
            : props.readiness?.kind === "complete-invalid"
              ? "complete · invalid"
              : "stale"}
        </Badge>
      </Match>
      <Match when={props.status === "draft"}>
        <Badge
          colorPalette={
            props.readiness?.kind === "incomplete"
              ? "orange"
              : props.readiness?.kind === "complete-invalid"
                ? "red"
                : "blue"
          }
        >
          {props.readiness?.kind === "incomplete"
            ? "incomplete"
            : props.readiness?.kind === "complete-invalid"
              ? "complete · invalid"
              : "valid draft"}
        </Badge>
      </Match>
    </Switch>
  );
}
