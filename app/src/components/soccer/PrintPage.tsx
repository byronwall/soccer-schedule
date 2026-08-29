import { A, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { Button, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { DEFAULT_POSITION_COORDINATES, SEGMENTS, type SegmentKey } from "~/lib/soccer/fixed-game";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { SoccerFieldDiagram } from "./SoccerFieldDiagram";

export function PrintPage() {
  const data = useSoccerData();
  const params = useParams();
  const game = () => data.snapshot()?.games.find((item) => item.id === params.gameId);
  const schedule = () =>
    data
      .snapshot()
      ?.schedules.find((item) => item.gameId === params.gameId && item.status === "published");
  const player = (id?: string) => data.snapshot()?.players.find((item) => item.id === id);
  const availableIds = () =>
    data
      .snapshot()
      ?.availability.filter((item) => item.gameId === params.gameId && item.status === "available")
      .map((item) => item.playerId) ?? [];
  const bench = (segmentKey: SegmentKey) => {
    const assigned = new Set(
      schedule()
        ?.assignments.filter((item) => item.segmentKey === segmentKey)
        .map((item) => item.playerId),
    );
    return availableIds()
      .filter((id) => !assigned.has(id))
      .map((id) => player(id))
      .filter((item) => item !== undefined);
  };

  return (
    <Show when={game()}>
      {(current) => (
        <Box
          class="print-layout"
          bg="white"
          color="black"
          p={{ base: "3", md: "8" }}
          borderRadius="l3"
        >
          <HStack justifyContent="space-between" mb="5" class="no-print">
            <A href={`/games/${params.gameId}/schedule`}>
              <Button variant="outline">Back to editor</Button>
            </A>
            <Button disabled={!schedule()} onClick={() => window.print()}>
              Print schedule
            </Button>
          </HStack>
          <VStack alignItems="start" gap="1" mb="5">
            <Box as="h1" fontSize="3xl" fontWeight="bold">
              {data.snapshot()?.teamDisplayName} vs. {current().opponentName}
            </Box>
            <Text>
              {new Date(current().startsAt).toLocaleString()} · {current().venueName}
            </Text>
            <Text>
              Arrival:{" "}
              {current().arrivalAt
                ? new Date(current().arrivalAt!).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—"}
            </Text>
          </VStack>
          <Show
            when={schedule()}
            fallback={
              <Text>Publish a complete, valid schedule before printing the final game plan.</Text>
            }
          >
            {(published) => (
              <>
                <Box borderWidth="1px" borderColor="gray.6">
                  <Grid gridTemplateColumns="150px repeat(8, minmax(70px, 1fr))" bg="gray.3">
                    <Box p="2" fontWeight="bold">
                      Position
                    </Box>
                    <For each={SEGMENTS}>
                      {(segment) => (
                        <Box p="2" fontSize="xs" textAlign="center" fontWeight="bold">
                          {segment.key.toUpperCase()}
                        </Box>
                      )}
                    </For>
                  </Grid>
                  <For each={data.positions()}>
                    {(position) => (
                      <Grid
                        gridTemplateColumns="150px repeat(8, minmax(70px, 1fr))"
                        borderTopWidth="1px"
                        borderColor="gray.6"
                      >
                        <Box p="2" fontSize="sm" fontWeight="bold">
                          {position.short} · {position.label}
                        </Box>
                        <For each={SEGMENTS}>
                          {(segment) => {
                            const person = () =>
                              player(
                                published().assignments.find(
                                  (item) =>
                                    item.segmentKey === segment.key &&
                                    item.positionKey === position.key,
                                )?.playerId,
                              );
                            return (
                              <Box
                                p="2"
                                borderLeftWidth="1px"
                                borderColor="gray.6"
                                textAlign="center"
                                fontSize="xs"
                              >
                                <Box fontWeight="bold">{person()?.displayName.split(" ")[0]}</Box>
                              </Box>
                            );
                          }}
                        </For>
                      </Grid>
                    )}
                  </For>
                  <Grid
                    gridTemplateColumns="150px repeat(8, minmax(70px, 1fr))"
                    borderTopWidth="2px"
                    borderColor="gray.7"
                    bg="gray.2"
                  >
                    <Box p="2" fontSize="sm" fontWeight="bold">
                      Bench
                    </Box>
                    <For each={SEGMENTS}>
                      {(segment) => (
                        <Box
                          p="2"
                          borderLeftWidth="1px"
                          borderColor="gray.6"
                          textAlign="center"
                          fontSize="xs"
                        >
                          <For each={bench(segment.key)}>
                            {(person) => <Box>{person.displayName.split(" ")[0]}</Box>}
                          </For>
                        </Box>
                      )}
                    </For>
                  </Grid>
                </Box>
                <Text mt="4" textStyle="xs">
                  <For each={data.positions()}>
                    {(position, index) => (
                      <>
                        {index() > 0 ? " · " : ""}
                        {position.short} {position.label}
                      </>
                    )}
                  </For>{" "}
                  · Published{" "}
                  {published().publishedAt
                    ? new Date(published().publishedAt!).toLocaleString()
                    : "—"}{" "}
                  · Revision {published().revision}
                </Text>
                <Box class="print-field-page" mt="8">
                  <VStack alignItems="stretch" gap="3" h="full">
                    <Box textAlign="center">
                      <Box as="h2" fontSize="2xl" fontWeight="bold">
                        {data.snapshot()?.teamDisplayName} Position Guide
                      </Box>
                      <Text>Attack toward the right goal.</Text>
                    </Box>
                    <Box flex="1" minH="0">
                      <SoccerFieldDiagram
                        positions={data.positions()}
                        coordinates={
                          data.snapshot()?.positionCoordinates ?? DEFAULT_POSITION_COORDINATES
                        }
                      />
                    </Box>
                  </VStack>
                </Box>
              </>
            )}
          </Show>
        </Box>
      )}
    </Show>
  );
}
