import { A } from "@solidjs/router";
import { CalendarDays, ChevronRight, CircleCheck, MapPin, Plus, Users } from "lucide-solid";
import { For, Show, createMemo, createSignal } from "solid-js";
import { Badge, Button, Card, SegmentGroup, SimpleSelect, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import type { Game, GameStatus, Schedule } from "~/lib/soccer/schemas";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";

type GameFilter = "scheduled" | "completed" | "all";

const filterItems = [
  { value: "scheduled", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All games" },
];

const statusItems = [
  { value: "scheduled", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const scheduleLabel = (schedule?: Schedule) => {
  if (!schedule) return "Schedule not started";
  if (schedule.status === "published") return "Schedule published";
  if (schedule.status === "stale") return "Schedule needs review";
  return "Schedule in progress";
};

const scheduleColor = (schedule?: Schedule) => {
  if (schedule?.status === "published") return "grass" as const;
  if (schedule?.status === "stale") return "orange" as const;
  return "gray" as const;
};

export function GamesPage() {
  const data = useSoccerData();
  const [filter, setFilter] = createSignal<GameFilter>("scheduled");
  const [updatingId, setUpdatingId] = createSignal<string>();
  const games = () => data.snapshot()?.games ?? [];
  const filteredGames = createMemo(() => {
    const sortAscending = filter() === "scheduled";
    const visible = filter() === "all" ? games() : games().filter((game) => game.status === filter());
    return [...visible].sort((left, right) => sortAscending
      ? left.startsAt.localeCompare(right.startsAt)
      : right.startsAt.localeCompare(left.startsAt));
  });
  const count = (status: GameStatus) => games().filter((game) => game.status === status).length;
  const updateStatus = async (game: Game, status: string) => {
    if (status === game.status) return;
    setUpdatingId(game.id);
    try {
      await data.run("setGameStatus", { id: game.id, status });
    } finally {
      setUpdatingId();
    }
  };

  return <>
    <PageHeader
      eyebrow="Season schedule"
      title="Games"
      description="Manage every match in one place, from first availability check through the final whistle."
      actions={<A href="/games/new"><Button><Plus size={16} /> Add game</Button></A>}
    />

    <Grid gridTemplateColumns="repeat(3, minmax(0, 1fr))" gap={{ base: "2", sm: "3" }} mb="5">
      <SummaryStat label="Upcoming" value={count("scheduled")} icon={<CalendarDays size={18} />} />
      <SummaryStat label="Completed" value={count("completed")} icon={<CircleCheck size={18} />} />
      <SummaryStat label="Total games" value={games().length} icon={<Users size={18} />} />
    </Grid>

    <Card.Root overflow="hidden">
      <Card.Header borderBottomWidth="1px" borderColor="border">
        <Flex alignItems={{ base: "stretch", sm: "center" }} justifyContent="space-between" flexDirection={{ base: "column", sm: "row" }} gap="3">
          <VStack alignItems="start" gap="0">
            <Card.Title>Season games</Card.Title>
            <Card.Description>Update game status or open a match to manage its players and schedule.</Card.Description>
          </VStack>
          <SegmentGroup.Root value={filter()} onValueChange={(details) => setFilter((details.value || "scheduled") as GameFilter)} size="sm">
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={filterItems} />
          </SegmentGroup.Root>
        </Flex>
      </Card.Header>

      <Show when={filteredGames().length > 0} fallback={<EmptyGames filter={filter()} />}>
        <Box display={{ base: "none", lg: "grid" }} gridTemplateColumns="minmax(15rem, 1.4fr) minmax(12rem, 1fr) minmax(10rem, .8fr) 10rem 7rem" gap="4" px="5" py="3" bg="bg.muted" color="fg.muted" textStyle="xs" fontWeight="semibold" borderBottomWidth="1px" borderColor="border">
          <Box>Game</Box><Box>Location</Box><Box>Readiness</Box><Box>Status</Box><Box textAlign="right">Action</Box>
        </Box>
        <Box as="ul" listStyleType="none" p="0" m="0">
          <For each={filteredGames()}>{(game) => {
            const schedule = () => data.snapshot()?.schedules
              .filter((item) => item.gameId === game.id && item.status !== "superseded")
              .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
            const availability = () => data.snapshot()?.availability.filter((item) => item.gameId === game.id) ?? [];
            const confirmed = () => availability().filter((item) => item.status !== "unknown").length;
            return <Box as="li" borderBottomWidth="1px" borderColor="border" _last={{ borderBottomWidth: "0" }}>
              <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(15rem, 1.4fr) minmax(12rem, 1fr) minmax(10rem, .8fr) 10rem 7rem" }} gap={{ base: "3", lg: "4" }} alignItems="center" px="5" py="4">
                <VStack alignItems="start" gap="1">
                  <HStack gap="2"><Text fontWeight="semibold" color="fg.default">vs. {game.opponentName}</Text><Show when={game.status === "canceled"}><Badge colorPalette="red">Canceled</Badge></Show></HStack>
                  <Text textStyle="sm" color="fg.muted" fontVariantNumeric="tabular-nums">{dateFormatter.format(new Date(game.startsAt))}</Text>
                </VStack>
                <HStack gap="2" minW="0"><MapPin size={16} /><Text textStyle="sm" truncate>{game.venueName}</Text></HStack>
                <VStack alignItems="start" gap="1">
                  <Badge colorPalette={scheduleColor(schedule())}>{scheduleLabel(schedule())}</Badge>
                  <Text textStyle="xs" color="fg.muted">{confirmed()} of {availability().length} responses</Text>
                </VStack>
                <Box opacity={updatingId() === game.id ? "0.6" : "1"}>
                  <SimpleSelect items={statusItems} value={game.status} onChange={(status) => void updateStatus(game, status)} size="sm" minW="36" placeholder="Status" />
                </Box>
                <Flex justifyContent={{ base: "start", lg: "end" }}>
                  <A href={`/games/${game.id}`}><Button variant="outline" size="sm">Manage <ChevronRight size={15} /></Button></A>
                </Flex>
              </Grid>
            </Box>;
          }}</For>
        </Box>
      </Show>
    </Card.Root>
  </>;
}

function SummaryStat(props: { label: string; value: number; icon: ReturnType<typeof CalendarDays> }) {
  return <Card.Root><Card.Body px={{ base: "3", sm: "6" }}><HStack justifyContent="space-between"><VStack alignItems="start" gap="0"><Text textStyle={{ base: "xs", sm: "sm" }} color="fg.muted">{props.label}</Text><Text textStyle={{ base: "2xl", sm: "3xl" }} fontWeight="bold" fontVariantNumeric="tabular-nums">{props.value}</Text></VStack><Box display={{ base: "none", sm: "block" }} color="grass.solid.bg" bg="grass.subtle.bg" borderRadius="l2" p="2">{props.icon}</Box></HStack></Card.Body></Card.Root>;
}

function EmptyGames(props: { filter: GameFilter }) {
  const isAll = () => props.filter === "all";
  return <VStack py="12" px="5" gap="3" textAlign="center">
    <Box color="fg.muted"><CalendarDays size={32} /></Box>
    <VStack gap="1"><Text fontWeight="semibold">{isAll() ? "No games yet" : `No ${props.filter === "scheduled" ? "upcoming" : props.filter} games`}</Text><Text textStyle="sm" color="fg.muted">{isAll() ? "Add the first game to begin planning the season." : "Choose another view or add a new game."}</Text></VStack>
    <A href="/games/new"><Button size="sm"><Plus size={15} /> Add game</Button></A>
  </VStack>;
}
