import { For } from "solid-js";
import { LockKeyhole, TriangleAlert } from "lucide-solid";
import { Text } from "~/components/ui";
import type {
  PositionDisposition,
} from "~/lib/soccer/schemas";
import { Box, HStack } from "styled-system/jsx";

const ITEMS: Array<{
  label: string;
  disposition: PositionDisposition;
  color: string;
}> = [
  { label: "Preferred fit", disposition: "prefer", color: "var(--colors-green-subtle-bg)" },
  { label: "Avoided fit", disposition: "avoid", color: "var(--colors-orange-subtle-bg)" },
  { label: "Neutral fit", disposition: "neutral", color: "var(--colors-bg-default)" },
];

function RingKey(props: { label: string; dashed?: boolean; color?: string }) {
  return (
    <HStack gap="1">
      <Box
        boxSize="3"
        borderRadius="sm"
        style={{
          outline: `2px ${props.dashed ? "dashed" : "solid"} ${props.color ?? "var(--colors-blue-9)"}`,
          "outline-offset": "-2px",
        }}
      />
      <Text textStyle="xs" color="fg.muted">{props.label}</Text>
    </HStack>
  );
}

export function SchedulePreferenceLegend() {
  return (
    <HStack
      as="section"
      aria-label="Assignment preference and state legend"
      gap="3"
      flexWrap="wrap"
    >
      <Text textStyle="xs" fontWeight="semibold">Cell legend</Text>
      <For each={ITEMS}>
        {(item) => (
          <HStack gap="1">
            <Box
              boxSize="3"
              borderWidth="1px"
              borderColor="border"
              borderRadius="sm"
              style={{ "background-color": item.color }}
              data-preference={item.disposition}
            />
            <Text textStyle="xs" color="fg.muted">{item.label}</Text>
          </HStack>
        )}
      </For>
      <HStack gap="1">
        <Box boxSize="3" borderWidth="1px" borderColor="border" borderRadius="sm" bg="bg.default" display="grid" placeItems="center">
          <Text textStyle="xs" color="fg.muted" lineHeight="1">—</Text>
        </Box>
        <Text textStyle="xs" color="fg.muted">Empty</Text>
      </HStack>
      <HStack gap="1" color="fg.muted">
        <LockKeyhole size={12} />
        <Text textStyle="xs">Locked</Text>
      </HStack>
      <HStack gap="1" color="orange.fg">
        <TriangleAlert size={12} />
        <Text textStyle="xs" color="fg.muted">Warning</Text>
      </HStack>
      <RingKey label="Selected" />
      <RingKey label="Generated change" dashed />
      <RingKey label="Drag target" color="var(--colors-grass-9)" />
      <Text textStyle="xs" color="fg.muted">
        Player colors carry across the schedule.
      </Text>
    </HStack>
  );
}
