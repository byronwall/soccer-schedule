import { Title } from "@solidjs/meta";
import { A, useParams } from "@solidjs/router";
import { CalendarDays, ChevronRight, Clock3, MapPin, Shield, UserRound } from "lucide-solid";
import { For, Show, createMemo } from "solid-js";
import { Badge, Button, Card, Heading, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { buildPlayerProfile, type PlayerGameSummary } from "~/lib/soccer/player-profile";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";

const gameDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const availabilityLabel = (status: PlayerGameSummary["availability"]) => {
  if (status === "available") return "Available";
  if (status === "unavailable") return "Unavailable";
  return "Awaiting response";
};

const availabilityColor = (status: PlayerGameSummary["availability"]) => {
  if (status === "available") return "grass" as const;
  if (status === "unavailable") return "red" as const;
  return "gray" as const;
};

export function PlayerDetailsPage() {
  const data = useSoccerData();
  const params = useParams();
  const profile = createMemo(() => {
    const snapshot = data.snapshot();
    return snapshot ? buildPlayerProfile(snapshot, params.playerId ?? "") : undefined;
  });

  return <Show when={data.snapshot()} fallback={<Text color="fg.muted">Loading player summary…</Text>}>
    <Show when={profile()} fallback={<MissingPlayer />}>
      {(current) => <>
        <Title>{current().player.displayName} · Coach Companion</Title>
        <PageHeader
          eyebrow="Player profile"
          title={current().player.displayName}
          description={`#${current().player.jerseyNumber ?? "—"} · ${current().player.active ? "Active roster member" : "Inactive roster member"}`}
          actions={<A href="/roster"><Button variant="outline">Back to roster</Button></A>}
        />

        <Grid gridTemplateColumns={{ base: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }} gap="3" mb="5">
          <SummaryStat label="Appearances" value={current().appearances} icon={<UserRound size={18} />} />
          <SummaryStat label="Minutes played" value={current().completedMinutes} icon={<Clock3 size={18} />} />
          <SummaryStat label="Positions played" value={current().positionTotals.length} icon={<Shield size={18} />} />
          <SummaryStat label="Minutes planned" value={current().upcomingMinutes} icon={<CalendarDays size={18} />} />
        </Grid>

        <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(16rem, .8fr) minmax(0, 1.7fr)" }} gap="5" alignItems="start">
          <Card.Root>
            <Card.Header>
              <Card.Title>Positions played</Card.Title>
              <Card.Description>Published assignments from completed games.</Card.Description>
            </Card.Header>
            <Card.Body>
              <Show when={current().positionTotals.length > 0} fallback={<EmptySection icon={<Shield size={26} />} message="No completed position history yet." />}>
                <VStack gap="4" alignItems="stretch">
                  <For each={current().positionTotals}>{(position) => {
                    const maxSegments = () => current().positionTotals[0]?.segments ?? 1;
                    return <VStack gap="2" alignItems="stretch">
                      <HStack justifyContent="space-between">
                        <HStack gap="2"><Badge variant="subtle" colorPalette="grass">{position.short}</Badge><Text fontWeight="medium">{position.label}</Text></HStack>
                        <Text textStyle="sm" color="fg.muted">{position.minutes} min</Text>
                      </HStack>
                      <Box h="2" borderRadius="full" bg="bg.muted" overflow="hidden">
                        <Box h="full" borderRadius="full" bg="grass.solid.bg" style={{ width: `${position.segments / maxSegments() * 100}%` }} />
                      </Box>
                    </VStack>;
                  }}</For>
                </VStack>
              </Show>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Header>
              <Card.Title>Upcoming schedule</Card.Title>
              <Card.Description>Availability and planned roles for future games.</Card.Description>
            </Card.Header>
            <Show when={current().upcomingGames.length > 0} fallback={<Card.Body><EmptySection icon={<CalendarDays size={26} />} message="No future games are scheduled." /></Card.Body>}>
              <Box as="ul" listStyleType="none" p="0" m="0">
                <For each={current().upcomingGames}>{(game) => <PlayerGameRow summary={game} upcoming />}</For>
              </Box>
            </Show>
          </Card.Root>
        </Grid>

        <Card.Root mt="5">
          <Card.Header>
            <Card.Title>Game history</Card.Title>
            <Card.Description>Completed games with minutes and every position assigned.</Card.Description>
          </Card.Header>
          <Show when={current().completedGames.length > 0} fallback={<Card.Body><EmptySection icon={<Clock3 size={26} />} message="Completed games will appear here." /></Card.Body>}>
            <Box as="ul" listStyleType="none" p="0" m="0">
              <For each={current().completedGames}>{(game) => <PlayerGameRow summary={game} />}</For>
            </Box>
          </Show>
        </Card.Root>
      </>}
    </Show>
  </Show>;
}

function SummaryStat(props: { label: string; value: number; icon: ReturnType<typeof UserRound> }) {
  return <Card.Root><Card.Body px={{ base: "3", sm: "5" }}><HStack justifyContent="space-between" gap="2"><VStack alignItems="start" gap="0"><Text textStyle={{ base: "xs", sm: "sm" }} color="fg.muted">{props.label}</Text><Text textStyle={{ base: "2xl", sm: "3xl" }} fontWeight="bold" fontVariantNumeric="tabular-nums">{props.value}</Text></VStack><Box display={{ base: "none", sm: "block" }} color="grass.solid.bg" bg="grass.subtle.bg" borderRadius="l2" p="2">{props.icon}</Box></HStack></Card.Body></Card.Root>;
}

function PlayerGameRow(props: { summary: PlayerGameSummary; upcoming?: boolean }) {
  return <Box as="li" borderTopWidth="1px" borderColor="border" _first={{ borderTopWidth: "0" }}>
    <Grid gridTemplateColumns={{ base: "1fr", md: "minmax(12rem, 1.3fr) minmax(10rem, 1fr) auto" }} gap="4" alignItems="center" px="6" py="4">
      <VStack alignItems="start" gap="1">
        <Text fontWeight="semibold">vs. {props.summary.game.opponentName}</Text>
        <HStack gap="3" flexWrap="wrap" color="fg.muted">
          <Text textStyle="sm">{gameDateFormatter.format(new Date(props.summary.game.startsAt))}</Text>
          <HStack gap="1"><MapPin size={14} /><Text textStyle="sm">{props.summary.game.venueName}</Text></HStack>
        </HStack>
      </VStack>
      <VStack alignItems="start" gap="2">
        <Show when={props.upcoming}><Badge colorPalette={availabilityColor(props.summary.availability)}>{availabilityLabel(props.summary.availability)}</Badge></Show>
        <Show when={props.summary.positions.length > 0} fallback={<Text textStyle="sm" color="fg.muted">No lineup assignments</Text>}>
          <Flex gap="1" flexWrap="wrap"><For each={props.summary.positions}>{(position) => <Badge variant="subtle">{position.short} · {position.minutes} min</Badge>}</For></Flex>
        </Show>
      </VStack>
      <HStack justifyContent={{ base: "space-between", md: "end" }} gap="3">
        <VStack alignItems={{ base: "start", md: "end" }} gap="0"><Text fontWeight="bold">{props.summary.minutes} min</Text><Text textStyle="xs" color="fg.muted">{props.summary.assignmentCount} segments</Text></VStack>
        <A href={`/games/${props.summary.game.id}`}><Button variant="plain" size="sm">Open <ChevronRight size={17} /></Button></A>
      </HStack>
    </Grid>
  </Box>;
}

function EmptySection(props: { icon: ReturnType<typeof Shield>; message: string }) {
  return <VStack py="7" gap="2" color="fg.muted" textAlign="center"><Box>{props.icon}</Box><Text textStyle="sm">{props.message}</Text></VStack>;
}

function MissingPlayer() {
  return <VStack alignItems="center" py="16" gap="4" textAlign="center"><Box color="fg.muted"><UserRound size={40} /></Box><VStack gap="1"><Heading as="h1" textStyle="2xl">Player not found</Heading><Text color="fg.muted">This roster record may have been removed.</Text></VStack><A href="/roster"><Button>Return to roster</Button></A></VStack>;
}
