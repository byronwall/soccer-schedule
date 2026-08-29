import { Show } from "solid-js";
import { Lock, TriangleAlert } from "lucide-solid";
import { Button, Text, Tooltip } from "~/components/ui";
import type { Player } from "~/lib/soccer/schemas";
import type { SegmentKey } from "~/lib/soccer/fixed-game";
import type { PositionDisposition } from "~/lib/soccer/schemas";
import { assignmentCellVisualStyle } from "~/lib/soccer/schedule-cell-visuals";
import { playerFirstName } from "~/lib/soccer/player-display-name";
import { Box, HStack, VStack } from "styled-system/jsx";

type DragCellProps = {
  player?: Player;
  inactive: boolean;
  editable: boolean;
  emphasized: boolean;
  dragging: boolean;
  validTarget: boolean;
  dropTarget: boolean;
  changed: boolean;
  selected?: boolean;
  preference?: PositionDisposition;
  segmentKey: SegmentKey;
  rowKey: string;
  onPointerDown: (event: PointerEvent) => void;
};

export function PlayerAssignmentCell(
  props: DragCellProps & {
    locked?: boolean;
    warnings: string[];
    onClick: () => void;
    onEmphasisChange: (playerId?: string) => void;
  },
) {
  return (
    <Button
      variant="plain"
      borderRadius="0"
      minH="10"
      minW="0"
      width="full"
      height="full"
      px="1"
      borderLeftWidth="1px"
      borderColor="border"
      disabled={!props.editable}
      data-segment={props.segmentKey}
      data-slot={props.rowKey}
      data-player-id={props.player?.id}
      data-drag-disabled={props.inactive ? "true" : undefined}
      data-dragging={props.dragging ? "true" : undefined}
      data-drop-target={props.dropTarget ? "active" : props.validTarget ? "valid" : undefined}
      data-player-emphasized={props.emphasized ? "true" : undefined}
      data-generation-changed={props.changed ? "true" : undefined}
      data-selected={props.selected ? "true" : undefined}
      data-preference={props.preference ?? "neutral"}
      aria-label={assignmentCellLabel(props)}
      style={assignmentCellVisualStyle(
        props.player?.color,
        props.editable && !props.inactive,
        props.inactive,
        props.dragging,
        props.validTarget,
        props.dropTarget,
        props.emphasized,
        props.changed,
        props.selected ?? false,
        props.preference ?? "neutral",
      )}
      onClick={props.onClick}
      onFocus={() => props.onEmphasisChange(props.player?.id)}
      onBlur={() => props.onEmphasisChange()}
      onPointerDown={props.onPointerDown}
      onDragStart={(event) => event.preventDefault()}
    >
      <PlayerCellContent
        player={props.player}
        inactive={props.inactive}
        locked={props.locked}
        warnings={props.warnings}
        preference={props.preference}
      />
    </Button>
  );
}

export function SubstituteCell(props: DragCellProps & { warnings: string[] }) {
  return (
    <Box
      minH="10"
      minW="0"
      width="full"
      height="full"
      px="1"
      borderLeftWidth="1px"
      borderColor="border"
      display="flex"
      alignItems="center"
      justifyContent="center"
      data-segment={props.segmentKey}
      data-slot={props.rowKey}
      data-player-id={props.player?.id}
      data-drag-disabled={props.inactive ? "true" : undefined}
      data-dragging={props.dragging ? "true" : undefined}
      data-drop-target={props.dropTarget ? "active" : props.validTarget ? "valid" : undefined}
      data-player-emphasized={props.emphasized ? "true" : undefined}
      aria-disabled={props.inactive}
      aria-label={`${props.player?.displayName ?? "Empty"}, substitute.${props.inactive ? " Player is inactive for this game." : " Drag onto a field position to swap."}`}
      style={assignmentCellVisualStyle(
        props.player?.color,
        props.editable && !props.inactive,
        props.inactive,
        props.dragging,
        props.validTarget,
        props.dropTarget,
        props.emphasized,
        false,
        false,
        "neutral",
      )}
      onPointerDown={props.onPointerDown}
      onDragStart={(event) => event.preventDefault()}
    >
      <PlayerCellContent
        player={props.player}
        inactive={props.inactive}
        substitute
        warnings={props.warnings}
      />
    </Box>
  );
}

function PlayerCellContent(props: {
  player?: Player;
  inactive?: boolean;
  locked?: boolean;
  substitute?: boolean;
  warnings?: string[];
  preference?: PositionDisposition;
}) {
  return (
    <Show
      when={props.player}
      fallback={
        <Text textStyle="xs" color="fg.muted">
          Empty
        </Text>
      }
    >
      {(player) => (
        <VStack width="full" minW="0" gap="0" justifyContent="center">
          <HStack gap="1" minW="0" maxW="full" justifyContent="center">
            <Box
              boxSize="2"
              borderRadius="full"
              flexShrink="0"
              style={{ "background-color": player().color }}
            />
            <Text
              textStyle="sm"
              fontWeight="semibold"
              truncate
              minW="0"
              style={{ "text-decoration": props.inactive ? "line-through" : undefined }}
            >
              {playerFirstName(player().displayName)}
            </Text>
          </HStack>
          <HStack minH="3" gap="1" justifyContent="center" color="fg.muted">
            <Show when={props.locked}>
              <Lock size={9} opacity={0.7} aria-label="Locked" />
            </Show>
            <Show when={(props.warnings?.length ?? 0) > 0}>
              <Tooltip
                content={props.warnings?.join(" ")}
                positioning={{
                  strategy: "fixed",
                  placement: "top",
                  flip: true,
                  slide: true,
                  shift: 8,
                  overflowPadding: 12,
                  fitViewport: true,
                }}
                openDelay={150}
              >
                <Box
                  as="span"
                  display="inline-flex"
                  color="orange.fg"
                  opacity="0.7"
                  aria-label={props.warnings?.join(" ")}
                >
                  <TriangleAlert size={10} />
                </Box>
              </Tooltip>
            </Show>
          </HStack>
        </VStack>
      )}
    </Show>
  );
}

const preferenceLabel = (preference?: PositionDisposition) => {
  if (preference === "prefer") return "preferred position";
  if (preference === "avoid") return "avoided position";
  return "neutral position fit";
};

const assignmentCellLabel = (
  options: DragCellProps & {
    locked?: boolean;
    warnings: string[];
  },
) => {
  if (!options.player) return "Empty assignment. Click to assign a player.";
  const states = [
    preferenceLabel(options.preference),
    options.locked ? "locked" : "",
    options.warnings.length ? `warning: ${options.warnings.join(" ")}` : "",
    options.changed ? "changed by the latest generation" : "",
    options.selected ? "selected" : "",
    options.inactive ? "inactive for this game" : "",
  ]
    .filter(Boolean)
    .join(", ");
  const action = options.inactive ? "Click to change." : "Click to change or drag to swap.";
  return `${options.player.displayName}, ${states}. ${action}`;
};
