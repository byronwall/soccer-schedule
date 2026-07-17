import { Show } from "solid-js";
import { Lock, TriangleAlert } from "lucide-solid";
import { Button, Text, Tooltip } from "~/components/ui";
import type { Player } from "~/lib/soccer/schemas";
import type { SegmentKey } from "~/lib/soccer/fixed-game";
import { Box, HStack, VStack } from "styled-system/jsx";

type DragCellProps = {
  player?: Player;
  inactive: boolean;
  editable: boolean;
  emphasized: boolean;
  dragging: boolean;
  validTarget: boolean;
  dropTarget: boolean;
  segmentKey: SegmentKey;
  rowKey: string;
  onPointerDown: (event: PointerEvent) => void;
};

export function PlayerAssignmentCell(props: DragCellProps & {
  locked?: boolean;
  warnings: string[];
  onClick: () => void;
  onEmphasisChange: (playerId?: string) => void;
}) {
  return (
    <Button
      variant="plain"
      borderRadius="0"
      minH="12"
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
      aria-label={`${props.player?.displayName ?? "Empty assignment"}${props.inactive ? ", inactive for this game" : ""}. Click to change${props.inactive ? "." : " or drag to swap."}`}
      style={playerCellStyle(
        props.player?.color,
        props.editable && !props.inactive,
        props.inactive,
        props.dragging,
        props.validTarget,
        props.dropTarget,
        props.emphasized,
      )}
      onClick={props.onClick}
      onFocus={() => props.onEmphasisChange(props.player?.id)}
      onBlur={() => props.onEmphasisChange()}
      onPointerDown={props.onPointerDown}
    >
      <PlayerCellContent player={props.player} inactive={props.inactive} locked={props.locked} warnings={props.warnings} />
    </Button>
  );
}

export function SubstituteCell(props: DragCellProps & { warnings: string[] }) {
  return (
    <Box
      minH="12"
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
      style={playerCellStyle(
        props.player?.color,
        props.editable && !props.inactive,
        props.inactive,
        props.dragging,
        props.validTarget,
        props.dropTarget,
        props.emphasized,
      )}
      onPointerDown={props.onPointerDown}
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

function PlayerCellContent(props: { player?: Player; inactive?: boolean; locked?: boolean; substitute?: boolean; warnings?: string[] }) {
  return (
    <Show when={props.player} fallback={<Text textStyle="xs" color="fg.muted">Empty</Text>}>
      {(player) => (
        <HStack position="relative" width="full" minW="0" justifyContent="center">
          <HStack gap="1" minW="0">
            <Box boxSize="2" borderRadius="full" flexShrink="0" style={{ "background-color": player().color }} />
            <VStack gap="0" minW="0">
              <Text
                textStyle="xs"
                fontWeight="semibold"
                truncate
                style={{ "text-decoration": props.inactive ? "line-through" : undefined }}
              >
                {player().displayName.split(" ")[0]}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                #{player().jerseyNumber ?? "—"} <Show when={props.locked}><Lock size={10} /></Show>
              </Text>
            </VStack>
          </HStack>
          <Show when={(props.warnings?.length ?? 0) > 0}>
            <Tooltip content={props.warnings?.join(" ")} positioning={{ placement: "top" }} openDelay={150}>
              <Box as="span" position="absolute" right="1" top="50%" transform="translateY(-50%)" display="inline-flex" color="orange.fg" aria-label={props.warnings?.join(" ")}>
                <TriangleAlert size={14} />
              </Box>
            </Tooltip>
          </Show>
        </HStack>
      )}
    </Show>
  );
}

const playerCellStyle = (
  playerColor: string | undefined,
  editable: boolean,
  inactive: boolean,
  dragging: boolean,
  validTarget: boolean,
  dropTarget: boolean,
  emphasized: boolean,
) => ({
  "background-color": inactive
    ? "var(--colors-bg-muted)"
    : dropTarget
      ? "var(--colors-grass-a3)"
      : undefined,
  "box-shadow": dropTarget
    ? "inset 0 0 0 3px var(--colors-grass-9)"
    : dragging
      ? "inset 0 0 0 2px var(--colors-fg-default)"
      : validTarget
        ? "inset 0 0 0 2px var(--colors-grass-9)"
        : emphasized && playerColor
          ? `inset 0 0 0 2px ${playerColor}`
          : undefined,
  opacity: dragging ? 0.5 : 1,
  filter: "none",
  cursor: editable ? (dragging ? "grabbing" : "grab") : "default",
  "touch-action": editable ? "none" : "auto",
});
