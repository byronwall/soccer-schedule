import { For, Show } from "solid-js";
import { Badge, Button, Card, Table, Text } from "~/components/ui";
import {
  formatPlanningMinutes,
  SEASON_ROLE_GROUPS,
  totalRoleSeconds,
  type SeasonImpact,
  type SeasonRoleTotals,
} from "~/lib/soccer/season-impact";
import type { Player } from "~/lib/soccer/schemas";
import type { PositionGroup } from "~/lib/soccer/fixed-game";
import type { SeasonImpactAssignmentTarget } from "~/lib/soccer/season-impact-scheduling";
import { Box, HStack, VStack } from "styled-system/jsx";

const GROUP_LABELS = {
  goalkeeper: "Goalkeeper",
  defense: "Defense",
  midfield: "Mid",
  forward: "Forward",
} as const;

export function SeasonImpactTable(props: {
  impact: SeasonImpact;
  player: (playerId: string) => Player | undefined;
  targetFor: (
    playerId: string,
    group: PositionGroup,
  ) => SeasonImpactAssignmentTarget | undefined;
  onSchedule: (playerId: string, group: PositionGroup) => void;
}) {
  const sourceLabel = () => {
    const parts = [
      props.impact.actualGameCount
        ? `${props.impact.actualGameCount} confirmed actual`
        : "",
      props.impact.plannedGameCount
        ? `${props.impact.plannedGameCount} published plan`
        : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : "No earlier published games";
  };
  return (
    <Card.Root mt="4">
      <Card.Header pb="2">
        <HStack justifyContent="space-between" alignItems="start" gap="3" flexWrap="wrap">
          <VStack alignItems="start" gap="1">
            <Card.Title>Season impact</Card.Title>
            <Card.Description>
              This game = current draft · Before = earlier confirmed or published games
            </Card.Description>
          </VStack>
          <VStack alignItems="end" gap="1">
            <Badge colorPalette="blue">
              This game +{formatPlanningMinutes(props.impact.draftSeconds)} min
            </Badge>
            <Text textStyle="xs" color="fg.muted">{sourceLabel()}</Text>
          </VStack>
        </HStack>
      </Card.Header>
      <Card.Body p="0">
        <Box maxW="100%" overflowX="auto">
          <Table.Root variant="surface" minW="680px" columnBorder>
            <Table.Caption srOnly>
              Season minutes by role. Each cell shows this game first, then before.
            </Table.Caption>
            <Table.Head>
              <Table.Row>
                <Table.Header px="2" py="1.5">Player</Table.Header>
                <For each={SEASON_ROLE_GROUPS}>
                  {(group) => <Table.Header textAlign="center" px="2" py="1.5">{GROUP_LABELS[group]}</Table.Header>}
                </For>
                <Table.Header textAlign="center" px="2" py="1.5" bg="bg.subtle">Total</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              <For each={props.impact.rows}>
                {(row) => (
                  <Table.Row>
                    <Table.Cell px="2" py="1">
                      <HStack gap="1.5" minW="32">
                        <Box
                          boxSize="2.5"
                          borderRadius="full"
                          flexShrink="0"
                          style={{ "background-color": props.player(row.playerId)?.color }}
                        />
                        <Text textStyle="xs" fontWeight="semibold" truncate>
                          {props.player(row.playerId)?.displayName ?? "Unknown player"}
                        </Text>
                      </HStack>
                    </Table.Cell>
                    <For each={SEASON_ROLE_GROUPS}>
                      {(group) => (
                        <Table.Cell p="0">
                          <ImpactValue
                            before={row.beforeSeconds}
                            draft={row.draftSeconds}
                            group={group}
                            playerName={props.player(row.playerId)?.displayName ?? "Unknown player"}
                            target={props.targetFor(row.playerId, group)}
                            onSchedule={() => props.onSchedule(row.playerId, group)}
                          />
                        </Table.Cell>
                      )}
                    </For>
                    <Table.Cell p="0" bg="bg.subtle">
                      <ImpactValue
                        before={row.beforeSeconds}
                        draft={row.draftSeconds}
                        playerName={props.player(row.playerId)?.displayName ?? "Unknown player"}
                      />
                    </Table.Cell>
                  </Table.Row>
                )}
              </For>
            </Table.Body>
          </Table.Root>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

function ImpactValue(props: {
  before: SeasonRoleTotals;
  draft: SeasonRoleTotals;
  group?: keyof SeasonRoleTotals;
  playerName: string;
  target?: SeasonImpactAssignmentTarget;
  onSchedule?: () => void;
}) {
  const before = () => props.group
    ? props.before[props.group]
    : totalRoleSeconds(props.before);
  const draft = () => props.group
    ? props.draft[props.group]
    : totalRoleSeconds(props.draft);
  const actionDescription = () => props.draft[props.group!] > 0
    ? "Already scheduled in this position group."
    : "No available compatible spot in this position group.";
  const accessibleLabel = () => {
    const role = GROUP_LABELS[props.group!];
    const availability = props.target
      ? "Available to schedule."
      : actionDescription();
    return `${props.playerName}, ${role}: this game +${formatPlanningMinutes(draft())} minutes; before ${formatPlanningMinutes(before())} minutes. ${availability}`;
  };
  const content = () => (
    <HStack
      justifyContent="center"
      alignItems="baseline"
      gap="1.5"
      minH="9"
      px="2"
      py="0.5"
      fontVariantNumeric="tabular-nums"
    >
      <Text
        textStyle="md"
        color={draft() > 0 ? "blue.fg" : "fg.muted"}
        fontWeight="semibold"
        lineHeight="1"
      >
        +{formatPlanningMinutes(draft())}
      </Text>
      <Text
        textStyle="2xs"
        color="fg.muted"
        borderLeftWidth="1px"
        borderColor="border"
        pl="1.5"
        lineHeight="1.2"
        aria-label={`${formatPlanningMinutes(before())} minutes before`}
      >
        {before() ? formatPlanningMinutes(before()) : "—"}
      </Text>
    </HStack>
  );
  if (!props.group) return content();
  return (
    <Button
      variant="plain"
      width="full"
      minH="10"
      px="0"
      py="0"
      borderRadius="sm"
      bg="transparent"
      transition="background"
      transitionDuration="fast"
      aria-label={accessibleLabel()}
      disabled={!props.target}
      onClick={props.onSchedule}
      _hover={{ bg: "blue.subtle" }}
      _focusVisible={{ bg: "blue.subtle" }}
      _disabled={{ cursor: "not-allowed", opacity: "0.72" }}
    >
      <Show when={props.target}>
        <Box
          position="absolute"
          top="1"
          right="1"
          boxSize="2"
          borderRadius="full"
          bg="blue.solid.bg"
          aria-hidden="true"
        />
      </Show>
      {content()}
    </Button>
  );
}
