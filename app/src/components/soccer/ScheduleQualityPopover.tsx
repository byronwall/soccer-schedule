import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { AlertTriangle, CheckCircle2, CircleHelp, CircleMinus, ShieldCheck } from "lucide-solid";
import {
  Badge,
  Button,
  CloseButton,
  IconButton,
  Popover,
  SimplePopover,
  Text,
} from "~/components/ui";
import {
  buildScheduleQualityReport,
  type QualityRuleReport,
  type QualityRuleStatus,
} from "~/lib/soccer/schedule-quality-report";
import type { ScheduleQuality } from "~/lib/soccer/scheduling";
import type { Assignment } from "~/lib/soccer/schemas";
import { Box, HStack, VStack } from "styled-system/jsx";

const statusLabel: Record<QualityRuleStatus, string> = {
  pass: "Pass",
  warning: "Review",
  fail: "Error",
  "not-assessable": "Not yet assessable",
};

const statusPalette = (status: QualityRuleStatus) => {
  if (status === "fail") return "red" as const;
  if (status === "warning") return "orange" as const;
  if (status === "pass") return "grass" as const;
  return "gray" as const;
};

export function ScheduleQualityPopover(props: {
  quality: ScheduleQuality;
  assignments: Assignment[];
  eligibleIds: string[];
  playerName: (playerId: string) => string;
}) {
  const [open, setOpen] = createSignal(false);
  const rules = createMemo(() =>
    buildScheduleQualityReport({
      quality: props.quality,
      assignments: props.assignments,
      eligibleIds: props.eligibleIds,
    }),
  );
  const errors = () => rules().filter((rule) => rule.status === "fail").length;
  const warnings = () => rules().filter((rule) => rule.status === "warning").length;
  return (
    <SimplePopover
      open={open()}
      onClose={() => setOpen(false)}
      placement="bottom-end"
      portalled={false}
      anchor={
        <Button
          minH="11"
          variant="outline"
          colorPalette={errors() ? "red" : warnings() ? "orange" : "grass"}
          onClick={() => setOpen(true)}
        >
          <Show when={errors()} fallback={<ShieldCheck size={16} />}>
            <AlertTriangle size={16} />
          </Show>
          Quality checks
        </Button>
      }
      style={{
        width: "min(29rem, calc(100vw - 2rem))",
        "max-width": "calc(100vw - 2rem)",
        "max-height": "min(38rem, calc(var(--available-height, 100vh) - 1rem))",
        overflow: "hidden",
      }}
    >
      <Popover.Body minH="0" overflow="hidden" p="0">
        <Box flexShrink="0" p="3" pr="10">
          <Popover.Title>Schedule quality</Popover.Title>
          <Popover.Description>
            {props.assignments.length} of 56 assignments filled.
          </Popover.Description>
        </Box>
        <Box flex="1" minH="0" overflowX="hidden" overflowY="auto" px="3" pb="3">
          <VStack alignItems="stretch" gap="1.5">
            <For each={rules()}>
              {(rule) => <QualityRuleRow rule={rule} playerName={props.playerName} />}
            </For>
          </VStack>
        </Box>
      </Popover.Body>
      <Popover.CloseTrigger
        asChild={(triggerProps) => <CloseButton size="sm" {...triggerProps()} />}
      />
    </SimplePopover>
  );
}

function QualityRuleRow(props: {
  rule: QualityRuleReport;
  playerName: (playerId: string) => string;
}) {
  const [helpOpen, setHelpOpen] = createSignal(false);
  return (
    <Box
      minW="0"
      p="2"
      borderWidth="1px"
      borderColor={props.rule.status === "fail" ? "red.border" : "border"}
      borderRadius="l2"
      bg={props.rule.status === "fail" ? "red.subtle.bg" : "bg.subtle"}
    >
      <HStack alignItems="start" justifyContent="space-between" gap="1">
        <HStack alignItems="start" gap="1.5" minW="0">
          <Box mt="0.5" color={`${statusPalette(props.rule.status)}.fg`}>
            <QualityStatusIcon status={props.rule.status} />
          </Box>
          <VStack alignItems="start" gap="0.5" minW="0">
            <HStack gap="1.5" flexWrap="wrap">
              <Text textStyle="xs" fontWeight="semibold">
                {props.rule.label}
              </Text>
              <Badge size="sm" colorPalette={statusPalette(props.rule.status)}>
                {statusLabel[props.rule.status]}
              </Badge>
            </HStack>
            <Text textStyle="xs" color="fg.muted" overflowWrap="anywhere">
              {props.rule.summary}
            </Text>
          </VStack>
        </HStack>
        <SimplePopover
          open={helpOpen()}
          onClose={() => setHelpOpen(false)}
          placement="left-start"
          portalled={false}
          anchor={
            <IconButton
              size="xs"
              variant="plain"
              aria-label={`About ${props.rule.label}`}
              onClick={() => setHelpOpen(true)}
            >
              <CircleHelp size={16} />
            </IconButton>
          }
          style={{ width: "min(20rem, calc(100vw - 3rem))" }}
        >
          <Popover.Body>
            <Popover.Title>{props.rule.label}</Popover.Title>
            <Popover.Description>{props.rule.help}</Popover.Description>
          </Popover.Body>
        </SimplePopover>
      </HStack>
      <Show when={(props.rule.details?.length ?? 0) > 0}>
        <VStack alignItems="stretch" gap="0.5" mt="1.5" pl="5">
          <For each={props.rule.details}>
            {(item) => (
              <Text textStyle="xs" overflowWrap="anywhere">
                {formatDetail(item, props.playerName)}
              </Text>
            )}
          </For>
        </VStack>
      </Show>
    </Box>
  );
}

function QualityStatusIcon(props: { status: QualityRuleStatus }) {
  return (
    <Switch fallback={<AlertTriangle size={15} />}>
      <Match when={props.status === "pass"}>
        <CheckCircle2 size={15} />
      </Match>
      <Match when={props.status === "not-assessable"}>
        <CircleMinus size={15} />
      </Match>
    </Switch>
  );
}

const formatDetail = (value: string, playerName: (playerId: string) => string) =>
  value.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (playerId) =>
    playerName(playerId),
  );
