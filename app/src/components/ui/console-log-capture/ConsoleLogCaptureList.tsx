import { CheckIcon, CopyIcon } from "lucide-solid";
import { For, Show } from "solid-js";
import { Box, HStack, Stack } from "styled-system/jsx";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { useConsoleLogCapturePanel } from "./ConsoleLogCapturePanel.context";
import {
  detailsClass,
  levelChipClass,
  prefixChipClass,
  rowClass,
  rowTitleClass,
  tooltipContentProps,
} from "./consoleLogCapture.styles";
import { formatTime } from "./consoleLogCapture.utils";

export const ConsoleLogCaptureList = () => {
  const panel = useConsoleLogCapturePanel();

  return (
    <Stack gap="0.5">
      <For each={panel.displayedEntries()}>
        {(entry) => {
          const expanded = () => panel.expandedIds().has(entry.id);
          return (
            <Box class={rowClass(expanded())}>
              <HStack
                role="button"
                tabIndex={0}
                gap="2"
                minW="0"
                alignItems="center"
                onClick={() => panel.actions.toggleExpanded(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    panel.actions.toggleExpanded(entry.id);
                  }
                }}
              >
                <Text
                  fontSize="2xs"
                  color="fg.subtle"
                  flexShrink="0"
                  fontFamily="mono"
                >
                  {formatTime(entry.timestamp)}
                </Text>
                <span class={levelChipClass(entry.level)}>{entry.level}</span>
                <Show when={entry.prefix}>
                  {(prefix) => (
                    <span class={prefixChipClass}>[{prefix()}]</span>
                  )}
                </Show>
                <Text
                  fontSize="sm"
                  flex="1"
                  truncate
                  textAlign="left"
                  class={rowTitleClass}
                >
                  {entry.summary}
                </Text>
                <Tooltip
                  portalled={false}
                  contentProps={tooltipContentProps}
                  content={
                    panel.copiedRowId() === entry.id
                      ? "Copied row JSON"
                      : "Copy this row JSON"
                  }
                  showArrow
                >
                  <IconButton
                    class="log-row-copy"
                    size="xs"
                    variant="plain"
                    color="fg.subtle"
                    aria-label="Copy this row JSON"
                    onClick={(event) => {
                      event.stopPropagation();
                      panel.actions.copySingleEntry(entry);
                    }}
                  >
                    <Show
                      when={panel.copiedRowId() === entry.id}
                      fallback={<CopyIcon size={12} />}
                    >
                      <CheckIcon size={12} />
                    </Show>
                  </IconButton>
                </Tooltip>
              </HStack>
              <Show when={expanded()}>
                <Box as="pre" class={detailsClass}>
                  {entry.details}
                </Box>
              </Show>
            </Box>
          );
        }}
      </For>
    </Stack>
  );
};
