import { CheckCircle2, CircleDashed, Goal, Shield } from "lucide-solid";
import { For } from "solid-js";
import { Badge, Card, Text } from "~/components/ui";
import type { SeasonCoverage } from "~/lib/soccer/player-profile";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";

export function PlayerSeasonCoverageCard(props: {
  coverage: SeasonCoverage;
}) {
  const items = () => [
    {
      label: "Attack",
      covered: props.coverage.attack,
      detail: "Midfield or forward",
    },
    {
      label: "Defense",
      covered: props.coverage.defense,
      detail: "Defense or goalkeeper",
    },
    {
      label: "Goalkeeper",
      covered: props.coverage.goalkeeper,
      detail: "Time in goal",
    },
  ];
  const scoringDetail = () => {
    if (props.coverage.scoredThisSeason) {
      return `${props.coverage.confirmedGoalCount} confirmed goal event${
        props.coverage.confirmedGoalCount === 1 ? "" : "s"
      }`;
    }
    if (props.coverage.gamesWithoutTrustedActual > 0) {
      return `No confirmed goal yet · ${props.coverage.gamesWithoutTrustedActual} game${
        props.coverage.gamesWithoutTrustedActual === 1 ? "" : "s"
      } unavailable`;
    }
    return "No confirmed goal event yet";
  };

  return (
    <Card.Root>
      <Card.Header>
        <HStack justifyContent="space-between" gap="3" flexWrap="wrap">
          <Box>
            <Card.Title>Season experience coverage</Card.Title>
            <Card.Description>
              Confirmed games use actual roles. Games without trusted actuals
              use the published plan and are labeled as planned coverage.
            </Card.Description>
          </Box>
          <Badge
            colorPalette={
              props.coverage.source === "confirmed actual" ? "green" : "orange"
            }
          >
            {props.coverage.source}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Grid
          gridTemplateColumns={{
            base: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          }}
          gap="3"
        >
          <For each={items()}>
            {(item) => (
              <HStack
                alignItems="start"
                p="3"
                borderWidth="1px"
                borderColor="border"
                borderRadius="l2"
              >
                <Box color={item.covered ? "green.fg" : "fg.muted"}>
                  {item.covered
                    ? <CheckCircle2 size={19} />
                    : <CircleDashed size={19} />}
                </Box>
                <VStack alignItems="start" gap="0">
                  <Text fontWeight="semibold">{item.label}</Text>
                  <Text textStyle="xs" color="fg.muted">
                    {item.covered ? "Covered" : "Not yet"} · {item.detail}
                  </Text>
                </VStack>
              </HStack>
            )}
          </For>
          <HStack
            alignItems="start"
            p="3"
            borderWidth="1px"
            borderColor="border"
            borderRadius="l2"
          >
            <Box
              color={
                props.coverage.scoredThisSeason ? "green.fg" : "fg.muted"
              }
            >
              {props.coverage.scoredThisSeason
                ? <Goal size={19} />
                : <Shield size={19} />}
            </Box>
            <VStack alignItems="start" gap="0">
              <Text fontWeight="semibold">Scored this season</Text>
              <Text textStyle="xs" color="fg.muted">
                {scoringDetail()}
              </Text>
            </VStack>
          </HStack>
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
