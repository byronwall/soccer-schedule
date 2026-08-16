import { Title } from "@solidjs/meta";
import { A, useParams } from "@solidjs/router";
import { CalendarDays, Clock3, Shield, UserRound } from "lucide-solid";
import { For, Show, createMemo } from "solid-js";
import { Badge, Button, Card, Heading, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { DEFAULT_POSITION_LABELS } from "~/lib/soccer/fixed-game";
import { buildPlayerProfile } from "~/lib/soccer/player-profile";
import { formatExactDuration } from "~/lib/soccer/post-game-history";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";
import { PlayerGameHistoryRow } from "./PlayerGameHistoryRow";
import { PlayerPreferencesCard, type PreferenceDraft } from "./PlayerPreferencesCard";
import { PlayerSeasonCoverageCard } from "./PlayerSeasonCoverageCard";

export function PlayerDetailsPage() {
  const data = useSoccerData();
  const params = useParams();
  const profile = createMemo(() => {
    const snapshot = data.snapshot();
    return snapshot ? buildPlayerProfile(snapshot, params.playerId ?? "") : undefined;
  });
  const playerPreference = createMemo(() =>
    data
      .snapshot()
      ?.playerPreferences.entries.find((preference) => preference.playerId === params.playerId),
  );
  const savePreferences = (playerId: string, draft: PreferenceDraft) =>
    data.run("updatePlayerPreferences", { playerId, ...draft }).then(() => undefined);

  return (
    <Show when={data.snapshot()} fallback={<Text color="fg.muted">Loading player summary…</Text>}>
      <Show when={profile()} fallback={<MissingPlayer />}>
        {(current) => (
          <>
            <Title>{current().player.displayName} · Coach Companion</Title>
            <PageHeader
              eyebrow="Player profile"
              title={current().player.displayName}
              description={`#${current().player.jerseyNumber ?? "—"} · ${current().player.active ? "Active roster member" : "Inactive roster member"}`}
              actions={
                <A href="/roster">
                  <Button variant="outline">Back to roster</Button>
                </A>
              }
            />

            <Grid
              gridTemplateColumns={{
                base: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(4, minmax(0, 1fr))",
              }}
              gap="3"
              mb="5"
            >
              <SummaryStat
                label="Planned appearances"
                value={current().appearances}
                icon={<UserRound size={18} />}
              />
              <SummaryStat
                label="Planned minutes"
                value={current().completedMinutes}
                icon={<Clock3 size={18} />}
              />
              <SummaryStat
                label="Confirmed actual minutes"
                value={formatExactDuration(current().confirmedActualFieldSeconds)}
                icon={<Shield size={18} />}
              />
              <SummaryStat
                label="Upcoming planned minutes"
                value={current().upcomingMinutes}
                icon={<CalendarDays size={18} />}
              />
            </Grid>

            <PlayerSeasonCoverageCard coverage={current().seasonCoverage} />

            <Grid
              gridTemplateColumns={{ base: "1fr", lg: "minmax(16rem, .8fr) minmax(0, 1.7fr)" }}
              gap="5"
              alignItems="start"
            >
              <Card.Root mt="5">
                <Card.Header>
                  <Card.Title>Season exact-position variety</Card.Title>
                  <Card.Description>
                    Published-plan experience across all seven exact positions, including
                    goalkeeper. A player does not need every position in each game.
                  </Card.Description>
                </Card.Header>
                <Card.Body>
                  <VStack gap="3" alignItems="stretch">
                    <For each={current().positionVariety}>
                      {(position) => (
                        <HStack justifyContent="space-between" gap="3">
                          <HStack gap="2">
                            <Badge
                              variant="subtle"
                              colorPalette={position.segments > 0 ? "grass" : "gray"}
                            >
                              {position.short}
                            </Badge>
                            <Text fontWeight="medium">{position.label}</Text>
                          </HStack>
                          <Text textStyle="sm" color="fg.muted">
                            {position.segments > 0
                              ? `${position.minutes} min · ${position.segments} segment${position.segments === 1 ? "" : "s"}`
                              : "Not yet this season"}
                          </Text>
                        </HStack>
                      )}
                    </For>
                  </VStack>
                </Card.Body>
              </Card.Root>

              <Card.Root mt="5">
                <Card.Header>
                  <Card.Title>Upcoming schedule</Card.Title>
                  <Card.Description>
                    Availability and planned roles for future games.
                  </Card.Description>
                </Card.Header>
                <Show
                  when={current().upcomingGames.length > 0}
                  fallback={
                    <Card.Body>
                      <EmptySection
                        icon={<CalendarDays size={26} />}
                        message="No future games are scheduled."
                      />
                    </Card.Body>
                  }
                >
                  <Box as="ul" listStyleType="none" p="0" m="0">
                    <For each={current().upcomingGames}>
                      {(game) => (
                        <PlayerGameHistoryRow
                          summary={game}
                          positionLabels={
                            data.snapshot()?.positionLabels ?? DEFAULT_POSITION_LABELS
                          }
                          upcoming
                        />
                      )}
                    </For>
                  </Box>
                </Show>
              </Card.Root>
            </Grid>

            <Show when={playerPreference()}>
              {(preference) => (
                <PlayerPreferencesCard
                  playerId={current().player.id}
                  preference={preference()}
                  positions={data.positions()}
                  onSave={(draft) => savePreferences(current().player.id, draft)}
                />
              )}
            </Show>

            <Card.Root mt="5">
              <Card.Header>
                <Card.Title>Planned versus actual history</Card.Title>
                <Card.Description>
                  Confirmed ledgers show exact actual field, bench, position, and own-team goal
                  history beside the immutable published plan. Incomplete and legacy records never
                  substitute planned values for actuals.
                </Card.Description>
              </Card.Header>
              <Show
                when={current().completedGames.length > 0}
                fallback={
                  <Card.Body>
                    <EmptySection
                      icon={<Clock3 size={26} />}
                      message="Completed games will appear here."
                    />
                  </Card.Body>
                }
              >
                <Box as="ul" listStyleType="none" p="0" m="0">
                  <For each={current().completedGames}>
                    {(game) => (
                      <PlayerGameHistoryRow
                        summary={game}
                        positionLabels={data.snapshot()?.positionLabels ?? DEFAULT_POSITION_LABELS}
                      />
                    )}
                  </For>
                </Box>
              </Show>
            </Card.Root>
          </>
        )}
      </Show>
    </Show>
  );
}

function SummaryStat(props: {
  label: string;
  value: number | string;
  icon: ReturnType<typeof UserRound>;
}) {
  return (
    <Card.Root>
      <Card.Body px={{ base: "3", sm: "5" }}>
        <HStack justifyContent="space-between" gap="2">
          <VStack alignItems="start" gap="0">
            <Text textStyle={{ base: "xs", sm: "sm" }} color="fg.muted">
              {props.label}
            </Text>
            <Text
              textStyle={{ base: "2xl", sm: "3xl" }}
              fontWeight="bold"
              fontVariantNumeric="tabular-nums"
            >
              {props.value}
            </Text>
          </VStack>
          <Box
            display={{ base: "none", sm: "block" }}
            color="grass.solid.bg"
            bg="grass.subtle.bg"
            borderRadius="l2"
            p="2"
          >
            {props.icon}
          </Box>
        </HStack>
      </Card.Body>
    </Card.Root>
  );
}

function EmptySection(props: { icon: ReturnType<typeof Shield>; message: string }) {
  return (
    <VStack py="7" gap="2" color="fg.muted" textAlign="center">
      <Box>{props.icon}</Box>
      <Text textStyle="sm">{props.message}</Text>
    </VStack>
  );
}

function MissingPlayer() {
  return (
    <VStack alignItems="center" py="16" gap="4" textAlign="center">
      <Box color="fg.muted">
        <UserRound size={40} />
      </Box>
      <VStack gap="1">
        <Heading as="h1" textStyle="2xl">
          Player not found
        </Heading>
        <Text color="fg.muted">This roster record may have been removed.</Text>
      </VStack>
      <A href="/roster">
        <Button>Return to roster</Button>
      </A>
    </VStack>
  );
}
