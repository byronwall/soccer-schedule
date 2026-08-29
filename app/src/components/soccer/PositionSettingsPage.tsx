import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Check, RotateCcw, Save } from "lucide-solid";
import { Badge, Button, Card, Field, Input, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import {
  DEFAULT_POSITION_COORDINATES,
  DEFAULT_POSITION_LABELS,
  POSITIONS,
  type FieldCoordinate,
  type PositionCoordinates,
  type PositionKey,
  type PositionLabels,
} from "~/lib/soccer/fixed-game";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";
import { SoccerFieldDiagram } from "./SoccerFieldDiagram";

const settingsSignature = (labels: PositionLabels, coordinates: PositionCoordinates) =>
  JSON.stringify({ labels, coordinates });

export function PositionSettingsPage() {
  const data = useSoccerData();
  const [draft, setDraft] = createStore({
    labels: { ...DEFAULT_POSITION_LABELS },
    coordinates: structuredClone(DEFAULT_POSITION_COORDINATES),
  });
  const [pending, setPending] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  const [baseline, setBaseline] = createSignal(
    settingsSignature(DEFAULT_POSITION_LABELS, DEFAULT_POSITION_COORDINATES),
  );
  let initialized = false;
  createEffect(() => {
    const labels = data.snapshot()?.positionLabels;
    const coordinates = data.snapshot()?.positionCoordinates;
    if (!labels || !coordinates || initialized) return;
    const initial = { labels: { ...labels }, coordinates: structuredClone(coordinates) };
    setDraft(initial);
    setBaseline(settingsSignature(initial.labels, initial.coordinates));
    initialized = true;
  });
  const valid = createMemo(() =>
    POSITIONS.every((position) => draft.labels[position.key].trim().length > 0),
  );
  const dirty = createMemo(() => settingsSignature(draft.labels, draft.coordinates) !== baseline());

  const updateName = (key: PositionKey, value: string) => {
    setSaved(false);
    setDraft("labels", key, value);
  };

  const updateCoordinate = (key: PositionKey, coordinate: FieldCoordinate) => {
    setSaved(false);
    setDraft("coordinates", key, coordinate);
  };

  const resetCoordinates = () => {
    setSaved(false);
    setDraft("coordinates", structuredClone(DEFAULT_POSITION_COORDINATES));
  };

  const save = async () => {
    if (!valid() || !dirty()) return;
    setPending(true);
    try {
      await data.run("updatePositionSettings", {
        positionLabels: { ...draft.labels },
        positionCoordinates: structuredClone(draft.coordinates),
      });
      setBaseline(settingsSignature(draft.labels, draft.coordinates));
      setSaved(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Team settings"
        title="Positions"
        description="Name each position and place it on the field guide. The saved guide prints with every published schedule."
        actions={
          <Button loading={pending()} disabled={!valid() || !dirty()} onClick={() => void save()}>
            <Save size={16} /> Save positions
          </Button>
        }
      />
      <VStack alignItems="stretch" gap="5" maxW="4xl">
        <Card.Root>
          <Card.Header>
            <Card.Title>Field positions</Card.Title>
            <Card.Description>
              Each scheduling position has one permanent ID and one editable display name.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <VStack alignItems="stretch" gap="4">
              <Grid
                gridTemplateColumns="9rem minmax(0, 1fr)"
                gap="3"
                display={{ base: "none", md: "grid" }}
              >
                <Text textStyle="xs" color="fg.muted" fontWeight="semibold">
                  POSITION ID
                </Text>
                <Text textStyle="xs" color="fg.muted" fontWeight="semibold">
                  DISPLAY NAME
                </Text>
              </Grid>
              <For each={POSITIONS}>
                {(position) => (
                  <Grid gridTemplateColumns="9rem minmax(0, 1fr)" gap="3" alignItems="center">
                    <HStack gap="2" minW="0">
                      <Badge size="sm">{position.short}</Badge>
                      <Text fontFamily="mono" textStyle="xs" whiteSpace="nowrap">
                        {position.key}
                      </Text>
                    </HStack>
                    <Field.Root minW="0" required invalid={!draft.labels[position.key].trim()}>
                      <Field.Label srOnly>{position.key} display name</Field.Label>
                      <Input
                        size="sm"
                        value={draft.labels[position.key]}
                        maxLength={40}
                        onInput={(event) => updateName(position.key, event.currentTarget.value)}
                      />
                      <Field.ErrorText>Enter a position name.</Field.ErrorText>
                    </Field.Root>
                  </Grid>
                )}
              </For>
            </VStack>
          </Card.Body>
          <Card.Footer justifyContent="space-between">
            <Text textStyle="sm" color="fg.muted">
              Names apply everywhere this position is shown.
            </Text>
            <Show when={saved() && !dirty()}>
              <HStack color="grass.solid.bg">
                <Check size={16} />
                <Text textStyle="sm" fontWeight="medium">
                  Saved
                </Text>
              </HStack>
            </Show>
          </Card.Footer>
        </Card.Root>
        <Card.Root>
          <Card.Header>
            <Card.Title>Printable field guide</Card.Title>
            <Card.Description>
              Drag each label to its usual location. You can also focus a label and use the arrow
              keys.
            </Card.Description>
          </Card.Header>
          <Card.Body>
            <VStack alignItems="stretch" gap="3">
              <HStack justifyContent="flex-end">
                <Button variant="outline" size="sm" onClick={resetCoordinates}>
                  <RotateCcw size={15} /> Reset formation
                </Button>
              </HStack>
              <Box
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="l3"
                overflow="hidden"
                aspectRatio="10 / 7"
              >
                <SoccerFieldDiagram
                  positions={data.positions()}
                  coordinates={draft.coordinates}
                  editable
                  onPositionChange={updateCoordinate}
                />
              </Box>
            </VStack>
          </Card.Body>
          <Card.Footer>
            <Text textStyle="sm" color="fg.muted">
              The field guide prints on a separate landscape page for double-sided use.
            </Text>
          </Card.Footer>
        </Card.Root>
      </VStack>
    </>
  );
}
