import { A } from "@solidjs/router";
import { For, Show, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Pencil, Plus, Power, Trash2 } from "lucide-solid";
import { Button, Card, Field, Input, SegmentGroup, SimpleDialog, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { PLAYER_COLORS } from "~/lib/soccer/player-colors";
import type { Player } from "~/lib/soccer/schemas";
import { css } from "styled-system/css";
import { Box, Flex, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";

const playerNameLink = css({
  display: "inline-flex",
  px: "2",
  py: "1",
  mx: "-2",
  borderRadius: "l2",
  color: "fg.default",
  textDecoration: "none",
  transition: "colors",
  transitionProperty: "background-color, color, box-shadow",
  _hover: {
    bg: "grass.subtle.bg",
    color: "grass.solid.bg",
  },
  _focusVisible: {
    bg: "grass.subtle.bg",
    color: "grass.solid.bg",
    outline: "2px solid",
    outlineColor: "grass.solid.bg",
    outlineOffset: "2px",
  },
});

const emptyDraft: { id: string; displayName: string; jerseyNumber: string; color: string } = {
  id: "",
  displayName: "",
  jerseyNumber: "",
  color: PLAYER_COLORS[0],
};

type SortMode = "name" | "number";

const sortItems = [
  { value: "name", label: "Name" },
  { value: "number", label: "Number" },
];

const compareText = (left: string, right: string) => {
  const normalizedLeft = left.toLowerCase();
  const normalizedRight = right.toLowerCase();
  if (normalizedLeft < normalizedRight) return -1;
  if (normalizedLeft > normalizedRight) return 1;
  return 0;
};

const compareJerseyNumbers = (left: Player, right: Player) => {
  const leftNumber = Number(left.jerseyNumber);
  const rightNumber = Number(right.jerseyNumber);
  const leftIsNumber = Boolean(left.jerseyNumber?.trim()) && Number.isFinite(leftNumber);
  const rightIsNumber = Boolean(right.jerseyNumber?.trim()) && Number.isFinite(rightNumber);
  if (leftIsNumber && rightIsNumber && leftNumber !== rightNumber) return leftNumber - rightNumber;
  if (leftIsNumber !== rightIsNumber) return leftIsNumber ? -1 : 1;
  const numberComparison = compareText(left.jerseyNumber ?? "", right.jerseyNumber ?? "");
  return numberComparison || compareText(left.displayName, right.displayName);
};

export function RosterPage() {
  const data = useSoccerData();
  const [open, setOpen] = createSignal(false);
  const [draft, setDraft] = createStore(emptyDraft);
  const [pending, setPending] = createSignal(false);
  const [sort, setSort] = createSignal<SortMode>("name");
  const sortedPlayers = createMemo(() => {
    const players = [...(data.snapshot()?.players ?? [])];
    const sortMode = sort();
    return players.sort((left, right) => sortMode === "number"
      ? compareJerseyNumbers(left, right)
      : compareText(left.displayName, right.displayName));
  });

  const edit = (player?: Player) => {
    setDraft(player ? {
      id: player.id,
      displayName: player.displayName,
      jerseyNumber: player.jerseyNumber ?? "",
      color: player.color,
    } : {
      ...emptyDraft,
      color: PLAYER_COLORS.find((color) =>
        !data.snapshot()?.players.some((candidate) => candidate.color === color),
      ) ?? PLAYER_COLORS[0],
    });
    setOpen(true);
  };

  const save = async () => {
    if (!draft.displayName.trim()) return;
    setPending(true);
    try {
      await data.run(draft.id ? "updatePlayer" : "addPlayer", { ...draft });
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Roster"
        description="Open a player to review their season, position history, and upcoming plans. Each player color carries through every schedule."
        actions={<Button onClick={() => edit()}><Plus size={16} /> Add player</Button>}
      />
      <Card.Root>
        <Card.Header borderBottomWidth="1px" borderColor="border">
          <Flex alignItems={{ base: "stretch", sm: "center" }} justifyContent="space-between" flexDirection={{ base: "column", sm: "row" }} gap="3">
            <VStack alignItems="start" gap="0">
              <Card.Title>Players</Card.Title>
              <Card.Description>{sortedPlayers().length} roster members</Card.Description>
            </VStack>
            <HStack gap="2">
              <Text textStyle="sm" color="fg.muted">Sort by</Text>
              <SegmentGroup.Root value={sort()} onValueChange={(details) => setSort((details.value || "name") as SortMode)} size="sm">
                <SegmentGroup.Indicator />
                <SegmentGroup.Items items={sortItems} />
              </SegmentGroup.Root>
            </HStack>
          </Flex>
        </Card.Header>
        <Show when={sortedPlayers().length > 0} fallback={<Card.Body><Text color="fg.muted">No players have been added yet.</Text></Card.Body>}>
          <Box as="ul" listStyleType="none" p="0" m="0">
            <For each={sortedPlayers()}>
              {(player) => (
                <Box as="li" opacity={player.active ? 1 : 0.58} borderBottomWidth="1px" borderColor="border" _last={{ borderBottomWidth: "0" }}>
                  <Grid gridTemplateColumns="minmax(0, 1fr) auto" alignItems="center" gap="4" px={{ base: "4", sm: "6" }} py="3">
                    <HStack gap="3" minW="0">
                      <Box
                        boxSize="11"
                        flexShrink="0"
                        borderRadius="full"
                        display="grid"
                        placeItems="center"
                        fontWeight="bold"
                        style={{ "background-color": `${player.color}20`, color: player.color, "border-color": player.color, "border-width": "2px" }}
                      >
                        {player.jerseyNumber ?? "—"}
                      </Box>
                      <VStack alignItems="start" gap="0" minW="0">
                        <A href={`/roster/${player.id}`} class={playerNameLink}>
                          <Text fontWeight="semibold" truncate>{player.displayName}</Text>
                        </A>
                        <Text textStyle="sm" color="fg.muted">{player.active ? "Active" : "Inactive"}</Text>
                      </VStack>
                    </HStack>
                    <HStack gap="1">
                      <Button variant="plain" size="sm" aria-label={`Edit ${player.displayName}`} onClick={() => edit(player)}><Pencil size={16} /></Button>
                      <Button variant="plain" size="sm" aria-label={`${player.active ? "Deactivate" : "Activate"} ${player.displayName}`} onClick={() => data.run("togglePlayer", { id: player.id })}><Power size={16} /></Button>
                      <Button variant="plain" size="sm" aria-label={`Delete ${player.displayName}`} onClick={() => data.run("deletePlayer", { id: player.id })}><Trash2 size={16} /></Button>
                    </HStack>
                  </Grid>
                </Box>
              )}
            </For>
          </Box>
        </Show>
      </Card.Root>
      <SimpleDialog
        open={open()}
        onOpenChange={setOpen}
        title={draft.id ? "Edit player" : "Add player"}
        description="Names are required. Colors must be unique so players stay easy to track across the rotation."
        footer={
          <HStack justifyContent="end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending()} onClick={() => void save()}>{draft.id ? "Save changes" : "Add player"}</Button>
          </HStack>
        }
      >
        <VStack gap="4" alignItems="stretch">
          <Field.Root required>
            <Field.Label>Display name</Field.Label>
            <Input value={draft.displayName} onInput={(event) => setDraft("displayName", event.currentTarget.value)} />
          </Field.Root>
          <Field.Root>
            <Field.Label>Jersey number</Field.Label>
            <Input value={draft.jerseyNumber} onInput={(event) => setDraft("jerseyNumber", event.currentTarget.value)} />
          </Field.Root>
          <Field.Root required>
            <Field.Label>Schedule color</Field.Label>
            <HStack>
              <input
                aria-label="Schedule color"
                type="color"
                value={draft.color}
                onInput={(event) => setDraft("color", event.currentTarget.value.toUpperCase())}
                style={{ width: "3rem", height: "2.5rem", padding: "0.2rem", border: "1px solid var(--colors-border)", "border-radius": "0.5rem", cursor: "pointer" }}
              />
              <Text textStyle="sm" color="fg.muted">{draft.color}</Text>
            </HStack>
          </Field.Root>
          <Show when={draft.id}>
            <Text textStyle="sm" color="fg.muted">Historical schedules keep the player record and use its current color.</Text>
          </Show>
        </VStack>
      </SimpleDialog>
    </>
  );
}
