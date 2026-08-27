import { MapPin } from "lucide-solid";
import { For, Show, createSignal } from "solid-js";
import { Button, Card, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { TOTAL_ASSIGNMENTS } from "~/lib/soccer/fixed-game";
import type { Game } from "~/lib/soccer/schemas";
import { playerFirstName } from "~/lib/soccer/player-display-name";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";

export function ScheduledGamePlanningDetails(props: { game: Game }) {
  const data = useSoccerData();
  const [allInPending, setAllInPending] = createSignal(false);
  const [allInSaved, setAllInSaved] = createSignal(false);
  const availability = () => {
    const snapshot = data.snapshot();
    if (!snapshot) return [];
    const activePlayerIds = new Set(
      snapshot.players.filter((player) => player.active).map((player) => player.id),
    );
    return snapshot.availability.filter(
      (item) => item.gameId === props.game.id && activePlayerIds.has(item.playerId),
    );
  };
  const count = (status: "unknown" | "available" | "unavailable") =>
    availability().filter((item) => item.status === status).length;
  const canBuildSchedule = () => count("unknown") === 0 && count("available") >= 7;
  const targetMinutes = () =>
    count("available") ? Math.round((TOTAL_ASSIGNMENTS * 7) / count("available")) : 0;
  const runAvailabilityAction = (payload: Record<string, unknown>) => {
    setAllInSaved(false);
    void data.run("setAvailability", payload).catch(() => undefined);
  };
  const markAllIn = async () => {
    setAllInPending(true);
    setAllInSaved(false);
    try {
      await data.run("markAllAvailable", { gameId: props.game.id });
      setAllInSaved(true);
    } catch {
      // SoccerDataProvider refreshes stale data and exposes the error in AppShell.
    } finally {
      setAllInPending(false);
    }
  };

  return (
    <Grid gridTemplateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="5">
      <Card.Root>
        <Card.Header>
          <Card.Title>Player availability</Card.Title>
          <Card.Description>Resolve every player before generating a schedule.</Card.Description>
        </Card.Header>
        <Card.Body>
          <VStack gap="2" alignItems="stretch">
            <For each={data.snapshot()?.players.filter((player) => player.active)}>
              {(player) => {
                const item = () => availability().find((entry) => entry.playerId === player.id);
                return (
                  <HStack
                    justifyContent="space-between"
                    p="3"
                    borderWidth="1px"
                    borderColor="border"
                    borderRadius="l2"
                  >
                    <HStack>
                      <Box
                        boxSize="2.5"
                        borderRadius="full"
                        flexShrink="0"
                        style={{ "background-color": player.color }}
                      />
                      <Text fontWeight="medium">{playerFirstName(player.displayName)}</Text>
                    </HStack>
                    <HStack gap="1">
                      <For each={["available", "unavailable", "unknown"] as const}>
                        {(status) => (
                          <Button
                            size="sm"
                            disabled={allInPending()}
                            variant={item()?.status === status ? "solid" : "outline"}
                            colorPalette={
                              status === "available"
                                ? "grass"
                                : status === "unavailable"
                                  ? "red"
                                  : "gray"
                            }
                            onClick={() =>
                              runAvailabilityAction({
                                gameId: props.game.id,
                                playerId: player.id,
                                status,
                              })
                            }
                          >
                            {status === "available" ? "In" : status === "unavailable" ? "Out" : "?"}
                          </Button>
                        )}
                      </For>
                    </HStack>
                  </HStack>
                );
              }}
            </For>
          </VStack>
        </Card.Body>
        <Card.Footer>
          <HStack justifyContent="space-between" w="full" flexWrap="wrap">
            <VStack alignItems="start" gap="0">
              <Text fontWeight="medium">Everyone available?</Text>
              <Text textStyle="sm" color={allInSaved() ? "grass.fg" : "fg.muted"}>
                {allInSaved()
                  ? "All active players are in. Adjust anyone above if needed."
                  : "Mark every active roster player In with one action."}
              </Text>
            </VStack>
            <Button loading={allInPending()} loadingText="Saving…" onClick={() => void markAllIn()}>
              All in
            </Button>
          </HStack>
        </Card.Footer>
      </Card.Root>

      <VStack gap="4" alignItems="stretch">
        <Card.Root>
          <Card.Header>
            <Card.Title>Capacity</Card.Title>
          </Card.Header>
          <Card.Body>
            <VStack alignItems="stretch" gap="3">
              <HStack justifyContent="space-between">
                <Text color="fg.muted">Available</Text>
                <Text fontWeight="bold">{count("available")}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="fg.muted">Unknown</Text>
                <Text fontWeight="bold">{count("unknown")}</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="fg.muted">Field assignments</Text>
                <Text fontWeight="bold">56</Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text color="fg.muted">Target / player</Text>
                <Text fontWeight="bold">~{targetMinutes()} min</Text>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
        <Show when={!canBuildSchedule()}>
          <Card.Root>
            <Card.Body>
              <Text color="fg.muted">
                Resolve availability and keep at least seven players available to build the
                rotation.
              </Text>
            </Card.Body>
          </Card.Root>
        </Show>
        <Card.Root>
          <Card.Body>
            <HStack>
              <MapPin />
              <VStack alignItems="start" gap="0">
                <Text fontWeight="medium">{props.game.venueName}</Text>
                <Text textStyle="sm" color="fg.muted">
                  {props.game.venueAddress || "No street address"}
                </Text>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Grid>
  );
}
