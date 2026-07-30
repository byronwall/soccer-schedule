import { For, createEffect, createSignal, untrack } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import {
  Button,
  Badge,
  Card,
  Field,
  Heading,
  SimpleSelect,
  Text,
  Textarea,
} from "~/components/ui";
import type { Position } from "~/lib/soccer/fixed-game";
import {
  applyRoleGroupDisposition,
  neutralPositionDispositions,
  positionDispositionLimitError,
  type PreferenceRoleGroup,
  updatePositionDisposition,
} from "~/lib/soccer/player-preferences";
import type {
  FieldTimePreference,
  PlayerPreference,
  PositionDisposition,
  PositionDispositions,
} from "~/lib/soccer/schemas";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";

const dispositionItems = [
  { label: "Prefer", value: "prefer" },
  { label: "Neutral", value: "neutral" },
  { label: "Avoid", value: "avoid" },
];

const fieldTimeItems = [
  { label: "Standard", value: "standard" },
  {
    label: "Favor extra when needed",
    value: "favor-extra-when-needed",
  },
];

const roleGroupItems = [
  { label: "Attack (midfield + forward)", value: "attack" },
  { label: "Midfield", value: "midfield" },
  { label: "Defense", value: "defense" },
  { label: "Goalkeeper", value: "goalkeeper" },
];

export type PreferenceDraft = {
  positionDispositions: PositionDispositions;
  fieldTimePreference: FieldTimePreference;
  coachNote: string;
};

type PlayerPreferencesCardProps = {
  playerId: string;
  preference?: PlayerPreference;
  positions: Position[];
  onSave: (draft: PreferenceDraft) => Promise<void>;
};

const draftFromPreference = (
  preference?: PlayerPreference,
): PreferenceDraft => ({
  positionDispositions:
    preference?.positionDispositions ?? neutralPositionDispositions(),
  fieldTimePreference: preference?.fieldTimePreference ?? "standard",
  coachNote: preference?.coachNote ?? "",
});

export function PlayerPreferencesCard(props: PlayerPreferencesCardProps) {
  const [draft, setDraft] = createStore<PreferenceDraft>(
    untrack(() => draftFromPreference(props.preference)),
  );
  const [shortcutGroup, setShortcutGroup] =
    createSignal<PreferenceRoleGroup>("attack");
  const [shortcutDisposition, setShortcutDisposition] =
    createSignal<PositionDisposition>("prefer");
  const [pending, setPending] = createSignal(false);
  const [limitError, setLimitError] = createSignal<string>();
  const preferCount = () =>
    Object.values(draft.positionDispositions).filter(
      (disposition) => disposition === "prefer",
    ).length;
  const avoidCount = () =>
    Object.values(draft.positionDispositions).filter(
      (disposition) => disposition === "avoid",
    ).length;
  const goalkeeperPosition = () =>
    props.positions.find((position) => position.key === "goalkeeper");
  const outfieldPositions = () =>
    props.positions.filter((position) => position.key !== "goalkeeper");

  const positionControl = (position: Position) => (
    <SimpleSelect
      label={position.label}
      items={dispositionItems}
      value={draft.positionDispositions[position.key]}
      onChange={(value) => {
        try {
          const next = updatePositionDisposition(
            draft.positionDispositions,
            position.key,
            value as PositionDisposition,
          );
          setDraft("positionDispositions", reconcile(next));
          setLimitError(positionDispositionLimitError(next));
        } catch (error) {
          setLimitError(
            error instanceof Error
              ? error.message
              : "Choose at most 2 positions.",
          );
        }
      }}
    />
  );

  createEffect(() => {
    props.playerId;
    props.preference?.updatedAt;
    const next = draftFromPreference(props.preference);
    setDraft(
      "positionDispositions",
      reconcile(next.positionDispositions),
    );
    setDraft("fieldTimePreference", next.fieldTimePreference);
    setDraft("coachNote", next.coachNote);
    setLimitError(positionDispositionLimitError(next.positionDispositions));
  });

  const applyShortcut = () => {
    try {
      const next = applyRoleGroupDisposition(
        draft.positionDispositions,
        shortcutGroup(),
        shortcutDisposition(),
      );
      setDraft("positionDispositions", reconcile(next));
      setLimitError(positionDispositionLimitError(next));
    } catch (error) {
      setLimitError(
        error instanceof Error ? error.message : "Choose at most 2 positions.",
      );
    }
  };

  const save = async () => {
    const error = positionDispositionLimitError(draft.positionDispositions);
    if (error) {
      setLimitError(error);
      return;
    }
    setPending(true);
    try {
      await props.onSave({
        positionDispositions: { ...draft.positionDispositions },
        fieldTimePreference: draft.fieldTimePreference,
        coachNote: draft.coachNote,
      });
      setLimitError();
    } finally {
      setPending(false);
    }
  };

  return (
    <Card.Root mt="5">
      <Card.Header>
        <Card.Title>Scheduling preferences</Card.Title>
        <Card.Description maxW="72ch">
          Set position fit, playing time, and private coach context.
        </Card.Description>
        <HStack gap="2" flexWrap="wrap" pt="2">
          <Badge variant="subtle" colorPalette="grass">
            Up to 2 Prefer
          </Badge>
          <Badge variant="subtle" colorPalette="gray">
            Up to 2 Avoid
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack alignItems="stretch" gap="7">
          <Grid
            gridTemplateColumns={{
              base: "1fr",
              xl: "minmax(0, 1.8fr) minmax(17rem, .8fr)",
            }}
            gap={{ base: "6", xl: "7" }}
            alignItems="start"
          >
            <VStack alignItems="stretch" gap="4">
              <VStack alignItems="stretch" gap="2">
                <HStack justifyContent="space-between" gap="3" flexWrap="wrap">
                  <Heading as="h4" textStyle="md">Position fit</Heading>
                  <HStack gap="2" aria-label="Position preference usage">
                    <Badge variant="subtle" colorPalette="grass">
                      Prefer {preferCount()}/2
                    </Badge>
                    <Badge variant="subtle" colorPalette="gray">
                      Avoid {avoidCount()}/2
                    </Badge>
                  </HStack>
                </HStack>
                <Text textStyle="sm" color="fg.muted" maxW="65ch">
                  Mark the positions that fit best. Avoid may be relaxed when needed to make a valid schedule.
                </Text>
                <Text
                  role={limitError() ? "alert" : undefined}
                  aria-live="polite"
                  aria-atomic="true"
                  minH="5"
                  textStyle="sm"
                  style={{
                    color: limitError()
                      ? "var(--colors-red-fg)"
                      : "var(--colors-fg-muted)",
                  }}
                >
                  {limitError()
                    ? `${limitError()} Set a position back to Neutral, then try again.`
                    : "Choose up to 2 Prefer and up to 2 Avoid positions."}
                </Text>
              </VStack>

              <VStack alignItems="stretch" gap="3">
                <For each={goalkeeperPosition() ? [goalkeeperPosition()!] : []}>
                  {(position) => (
                    <Box maxW={{ base: "full", sm: "sm" }}>
                      {positionControl(position)}
                    </Box>
                  )}
                </For>
                <Grid
                gridTemplateColumns={{
                  base: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                }}
                gap="3"
              >
                  <For each={outfieldPositions()}>
                    {(position) => positionControl(position)}
                  </For>
                </Grid>
              </VStack>
            </VStack>

            <Box
              bg="gray.subtle.bg"
              borderRadius="l2"
              borderWidth="1px"
              borderColor="border"
              p="4"
            >
              <VStack alignItems="stretch" gap="3">
                <VStack alignItems="stretch" gap="1">
                  <Heading as="h4" textStyle="md">Role-group shortcut</Heading>
                  <Text textStyle="sm" color="fg.muted">
                    Set a related group at once, then adjust positions if needed.
                  </Text>
                </VStack>
                <SimpleSelect
                  label="Role group"
                  items={roleGroupItems}
                  value={shortcutGroup()}
                  onChange={(value) =>
                    setShortcutGroup(value as PreferenceRoleGroup)}
                />
                <SimpleSelect
                  label="Disposition to apply"
                  items={dispositionItems}
                  value={shortcutDisposition()}
                  onChange={(value) =>
                    setShortcutDisposition(value as PositionDisposition)}
                />
                <Button variant="outline" alignSelf="start" onClick={applyShortcut}>
                  Apply to group
                </Button>
              </VStack>
            </Box>
          </Grid>

          <Box borderTopWidth="1px" borderColor="border" pt="6">
            <VStack alignItems="stretch" gap="4">
              <VStack alignItems="stretch" gap="1">
                <Heading as="h4" textStyle="md">Playing time &amp; coach context</Heading>
                <Text textStyle="sm" color="fg.muted" maxW="65ch">
                  Set a playing-time preference and add a private note if useful.
                </Text>
              </VStack>
              <Grid
                gridTemplateColumns={{
                  base: "1fr",
                  lg: "minmax(15rem, .8fr) minmax(0, 1.4fr)",
                }}
                gap="5"
                alignItems="start"
              >
                <VStack alignItems="stretch" gap="2">
                  <SimpleSelect
                    label="Field-time preference"
                    items={fieldTimeItems}
                    value={draft.fieldTimePreference}
                    onChange={(value) =>
                      setDraft(
                        "fieldTimePreference",
                        value as FieldTimePreference,
                      )}
                  />
                  <Text textStyle="sm" color="fg.muted">
                    Used only to break a tie when schedules are otherwise equally balanced.
                  </Text>
                </VStack>

                <Field.Root>
                  <Field.Label>Private coach note</Field.Label>
                  <Textarea
                    value={draft.coachNote}
                    maxLength={500}
                    rows={3}
                    onInput={(event) =>
                      setDraft("coachNote", event.currentTarget.value)}
                  />
                  <Field.HelperText>
                    Private to coaches and not used to build the schedule.
                  </Field.HelperText>
                </Field.Root>
              </Grid>
            </VStack>
          </Box>
        </VStack>
      </Card.Body>
      <Card.Footer borderTopWidth="1px" borderColor="border" pt="4" mt="6">
        <Button loading={pending()} onClick={() => void save()}>
          Save scheduling preferences
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}
