import { For, Show, createSignal } from "solid-js";
import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-solid";
import { Badge, Button, Popover, SimplePopover, Text } from "~/components/ui";
import type { ScheduleQuality } from "~/lib/soccer/scheduling";
import { HStack, VStack } from "styled-system/jsx";

const hasQualityWarnings = (quality?: ScheduleQuality) =>
  !!quality && (
    quality.minuteSpread > 7 ||
    quality.midfieldExceptions > 0 ||
    quality.goalkeeperExceptions > 0 ||
    quality.goalkeeperOveruse > 0 ||
    quality.substituteOveruse > 0
  );

const qualityColor = (hardErrorCount: number, hasWarnings: boolean) => {
  if (hardErrorCount > 0) return "red" as const;
  return hasWarnings ? "orange" as const : "grass" as const;
};

const qualityLabel = (hardErrorCount: number) => {
  if (hardErrorCount === 0) return "Quality checks";
  return `${hardErrorCount} schedule ${hardErrorCount === 1 ? "error" : "errors"}`;
};

export function ScheduleQualityPopover(props: { quality?: ScheduleQuality }) {
  const [open, setOpen] = createSignal(false);
  const hardErrorCount = () => props.quality?.hardViolations.length ?? 0;

  return (
    <SimplePopover
      open={open()}
      onClose={() => setOpen(false)}
      placement="bottom-end"
      portalled={false}
      anchor={
        <Button
          variant="outline"
          colorPalette={qualityColor(hardErrorCount(), hasQualityWarnings(props.quality))}
          onClick={() => setOpen(true)}
        >
          <Show when={hardErrorCount() > 0} fallback={<ShieldCheck size={16} />}>
            <AlertTriangle size={16} />
          </Show>
          {qualityLabel(hardErrorCount())}
        </Button>
      }
      style={{ width: "min(24rem, calc(100vw - 2rem))" }}
    >
      <Popover.Body>
        <Popover.Title>Schedule quality</Popover.Title>
        <Popover.Description>Blocking errors must be resolved before publishing.</Popover.Description>
        <VStack alignItems="stretch" gap="3" mt="4">
          <Show
            when={hardErrorCount() > 0}
            fallback={
              <HStack color="grass.fg" gap="2">
                <CheckCircle2 size={16} />
                <Text textStyle="sm" fontWeight="medium">No blocking errors</Text>
              </HStack>
            }
          >
            <VStack alignItems="stretch" gap="2">
              <For each={props.quality?.hardViolations}>
                {(error) => (
                  <HStack alignItems="start" gap="2" p="2" borderRadius="l2" bg="red.subtle.bg" color="red.subtle.fg">
                    <AlertTriangle size={14} />
                    <Text textStyle="sm">{error}</Text>
                  </HStack>
                )}
              </For>
            </VStack>
          </Show>
          <ScheduleQualityMetrics quality={props.quality} />
        </VStack>
      </Popover.Body>
    </SimplePopover>
  );
}

function ScheduleQualityMetrics(props: { quality?: ScheduleQuality }) {
  const minuteSpread = () => props.quality?.minuteSpread ?? 0;
  const midfieldExceptions = () => props.quality?.midfieldExceptions ?? 0;
  const goalkeeperExceptions = () => props.quality?.goalkeeperExceptions ?? 0;
  const goalkeeperOveruse = () => props.quality?.goalkeeperOveruse ?? 0;
  const substituteOveruse = () => props.quality?.substituteOveruse ?? 0;

  return (
    <VStack alignItems="stretch" gap="2" pt="3" borderTopWidth="1px" borderColor="border">
      <QualityMetric label="Minute spread" value={`${minuteSpread()} min`} good={minuteSpread() <= 7} />
      <QualityMetric label="Midfield repeats" value={midfieldExceptions()} good={midfieldExceptions() === 0} />
      <QualityMetric label="Goalkeeper changes" value={goalkeeperExceptions()} good={goalkeeperExceptions() === 0} />
      <QualityMetric label="Players over 14 min in goal" value={goalkeeperOveruse()} good={goalkeeperOveruse() === 0} />
      <QualityMetric label="Players over 14 min as sub" value={substituteOveruse()} good={substituteOveruse() === 0} />
    </VStack>
  );
}

function QualityMetric(props: { label: string; value: string | number; good: boolean }) {
  return (
    <HStack justifyContent="space-between">
      <Text textStyle="sm" color="fg.muted">{props.label}</Text>
      <Badge colorPalette={props.good ? "grass" : "orange"}>{props.value}</Badge>
    </HStack>
  );
}
