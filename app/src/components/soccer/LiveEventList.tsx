import { For, Show, createMemo } from "solid-js";
import { Undo2 } from "lucide-solid";
import { Badge, Button, Card, Text } from "~/components/ui";
import { useLiveGame } from "~/features/soccer/LiveGameProvider";
import {
  isCorrectableLiveEvent,
  voidedLiveEventIds,
} from "~/lib/soccer/live-game";
import type { LiveEvent } from "~/lib/soccer/live-event-schemas";
import { HStack, VStack } from "styled-system/jsx";

const clockLabel = (event: LiveEvent) =>
  `${String(Math.floor(event.elapsedGameClockSeconds / 60)).padStart(2, "0")}:${String(event.elapsedGameClockSeconds % 60).padStart(2, "0")}`;

export function LiveEventList() {
  const tracker = useLiveGame();
  const events = createMemo(() => [...(tracker.live()?.events ?? [])].reverse());
  const voidedIds = createMemo(() =>
    voidedLiveEventIds(tracker.live()?.events ?? []),
  );
  const playerName = (id: string) =>
    tracker.player(id)?.displayName ?? "Unknown player";
  const positionName = (key: string) =>
    tracker.data.positions().find((position) => position.key === key)?.label ??
    key;

  const eventLabel = (event: LiveEvent) => {
    if (event.type === "game_started") return "Game started";
    if (event.type === "game_paused") return "Game paused";
    if (event.type === "game_resumed") return "Game resumed";
    if (event.type === "quarter_advanced") {
      return `Advanced to quarter ${event.payload.toQuarter}`;
    }
    if (event.type === "bench_replaced_field_player") {
      return `${playerName(event.payload.incomingPlayerId)} replaced ${playerName(event.payload.outgoingPlayerId)} at ${positionName(event.payload.positionKey)}`;
    }
    if (event.type === "field_players_swapped") {
      return `${playerName(event.payload.firstPlayerId)} and ${playerName(event.payload.secondPlayerId)} swapped positions`;
    }
    if (event.type === "own_team_goal_scored") {
      return `Goal recorded for ${playerName(event.payload.playerId)}`;
    }
    if (event.type === "lineup_reset_to_published_plan") {
      return "Lineup reset to published plan";
    }
    if (event.type === "game_completed") return "Game completed";
    if (event.type === "actual_record_confirmed") {
      return "Actual record confirmed";
    }
    return "Earlier event voided";
  };

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Recent events</Card.Title>
        <Card.Description>
          Durable game-day history, newest first.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <VStack alignItems="stretch" gap="2">
          <Show
            when={events().length > 0}
            fallback={<Text color="fg.muted">No events recorded yet.</Text>}
          >
            <For each={events().slice(0, 12)}>
              {(event) => {
                const isVoided = () => voidedIds().has(event.id);
                return (
                  <HStack
                    justifyContent="space-between"
                    alignItems="center"
                    gap="3"
                    py="2"
                    borderBottomWidth="1px"
                    borderColor="border.muted"
                    opacity={isVoided() ? "0.55" : "1"}
                  >
                    <VStack alignItems="start" gap="0" minW="0">
                      <HStack gap="2" flexWrap="wrap">
                        <Text textStyle="sm" fontWeight="medium">
                          {eventLabel(event)}
                        </Text>
                        <Show when={isVoided()}>
                          <Badge colorPalette="gray">Voided</Badge>
                        </Show>
                      </HStack>
                      <Text textStyle="xs" color="fg.muted">
                        Q{event.quarter} · {clockLabel(event)} ·{" "}
                        {event.actor.displayName}
                      </Text>
                    </VStack>
                    <Show
                      when={
                        isCorrectableLiveEvent(event) &&
                        !isVoided() &&
                        tracker.live()?.status !== "completed"
                      }
                    >
                      <Button
                        size="xs"
                        variant="plain"
                        disabled={!!tracker.ui.pendingAction}
                        onClick={() => tracker.requestVoid(event.id)}
                      >
                        <Undo2 size={14} /> Void
                      </Button>
                    </Show>
                  </HStack>
                );
              }}
            </For>
          </Show>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
