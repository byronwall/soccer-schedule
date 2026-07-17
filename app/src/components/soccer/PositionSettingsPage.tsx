import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Check, Save } from "lucide-solid";
import { Badge, Button, Card, Field, Input, Text } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { DEFAULT_POSITION_LABELS, POSITIONS, type PositionKey } from "~/lib/soccer/fixed-game";
import { Grid, HStack, VStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";

export function PositionSettingsPage() {
  const data = useSoccerData();
  const [draft, setDraft] = createStore({ ...DEFAULT_POSITION_LABELS });
  const [pending, setPending] = createSignal(false);
  const [saved, setSaved] = createSignal(false);
  let initialized = false;
  createEffect(() => {
    const labels = data.snapshot()?.positionLabels;
    if (!labels || initialized) return;
    setDraft(labels);
    initialized = true;
  });
  const valid = createMemo(() => POSITIONS.every((position) => draft[position.key].trim().length > 0));
  const dirty = createMemo(() => POSITIONS.some((position) => draft[position.key] !== (data.snapshot()?.positionLabels ?? DEFAULT_POSITION_LABELS)[position.key]));

  const updateName = (key: PositionKey, value: string) => {
    setSaved(false);
    setDraft(key, value);
  };

  const save = async () => {
    if (!valid() || !dirty()) return;
    setPending(true);
    try {
      await data.run("updatePositionLabels", { positionLabels: { ...draft } });
      setSaved(true);
    } finally {
      setPending(false);
    }
  };

  return <>
    <PageHeader
      eyebrow="Team settings"
      title="Position names"
      description="Change the labels coaches and players see. Position IDs stay fixed so existing and future schedules continue to work."
      actions={<Button loading={pending()} disabled={!valid() || !dirty()} onClick={() => void save()}><Save size={16} /> Save names</Button>}
    />
    <Card.Root maxW="4xl">
      <Card.Header>
        <Card.Title>Field positions</Card.Title>
        <Card.Description>Each scheduling position has one permanent ID and one editable display name.</Card.Description>
      </Card.Header>
      <Card.Body>
        <VStack alignItems="stretch" gap="4">
          <Grid gridTemplateColumns="minmax(12rem, .7fr) minmax(0, 1fr)" gap="4" display={{ base: "none", md: "grid" }}>
            <Text textStyle="xs" color="fg.muted" fontWeight="semibold">POSITION ID</Text>
            <Text textStyle="xs" color="fg.muted" fontWeight="semibold">DISPLAY NAME</Text>
          </Grid>
          <For each={POSITIONS}>{(position) => (
            <Grid gridTemplateColumns={{ base: "1fr", md: "minmax(12rem, .7fr) minmax(0, 1fr)" }} gap={{ base: "2", md: "4" }} alignItems="center">
              <HStack gap="2"><Badge>{position.short}</Badge><Text fontFamily="mono" textStyle="sm">{position.key}</Text></HStack>
              <Field.Root required invalid={!draft[position.key].trim()}>
                <Field.Label srOnly>{position.key} display name</Field.Label>
                <Input value={draft[position.key]} maxLength={40} onInput={(event) => updateName(position.key, event.currentTarget.value)} />
                <Field.ErrorText>Enter a position name.</Field.ErrorText>
              </Field.Root>
            </Grid>
          )}</For>
        </VStack>
      </Card.Body>
      <Card.Footer justifyContent="space-between">
        <Text textStyle="sm" color="fg.muted">Names apply everywhere this position is shown.</Text>
        <Show when={saved() && !dirty()}><HStack color="grass.solid.bg"><Check size={16} /><Text textStyle="sm" fontWeight="medium">Saved</Text></HStack></Show>
      </Card.Footer>
    </Card.Root>
  </>;
}
