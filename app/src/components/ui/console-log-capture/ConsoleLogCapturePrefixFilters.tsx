import { For, Show, createEffect, createSignal } from "solid-js";
import { HStack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { useConsoleLogCapturePanel } from "./ConsoleLogCapturePanel.context";
import { tooltipContentProps } from "./consoleLogCapture.styles";

export const ConsoleLogCapturePrefixFilters = () => {
  const panel = useConsoleLogCapturePanel();
  let prefixPillsEl: HTMLDivElement | undefined;
  const [hasHiddenPrefixes, setHasHiddenPrefixes] = createSignal(false);
  const activePrefix = () => panel.state.filters.prefix;

  createEffect(() => {
    panel.prefixes();
    panel.prefixCounts();
    activePrefix();
    void panel.displayedEntries().length;

    queueMicrotask(() => {
      const el = prefixPillsEl;
      if (!el) return;
      setHasHiddenPrefixes(el.scrollHeight > el.clientHeight + 1);
    });
  });

  return (
    <HStack gap="2" alignItems="flex-start" minW="0">
      <HStack
        ref={prefixPillsEl}
        gap="1"
        flexWrap="wrap"
        maxH="4.5rem"
        overflow="hidden"
        flex="1"
        minW="0"
      >
        <Tooltip
          portalled={false}
          contentProps={tooltipContentProps}
          content="Show all logs"
          showArrow
        >
          <Button
            size="xs"
            variant={activePrefix() === "all" ? "subtle" : "plain"}
            onClick={() => panel.actions.setPrefixFilter("all")}
            fontFamily="mono"
          >
            All ({panel.displayedEntries().length})
          </Button>
        </Tooltip>

        <Show when={(panel.prefixCounts().get("untyped") ?? 0) > 0}>
          <Tooltip
            portalled={false}
            contentProps={tooltipContentProps}
            content="Show logs without a prefix"
            showArrow
          >
            <Button
              size="xs"
              variant={activePrefix() === "untyped" ? "subtle" : "plain"}
              onClick={() => panel.actions.setPrefixFilter("untyped")}
              fontFamily="mono"
            >
              Untyped ({panel.prefixCounts().get("untyped") ?? 0})
            </Button>
          </Tooltip>
        </Show>

        <For each={panel.prefixes()}>
          {(prefix) => (
            <Tooltip
              portalled={false}
              contentProps={tooltipContentProps}
              content={`Filter by [${prefix}]`}
              showArrow
            >
              <Button
                size="xs"
                variant={activePrefix() === prefix ? "subtle" : "plain"}
                onClick={() => panel.actions.setPrefixFilter(prefix)}
                fontFamily="mono"
              >
                [{prefix}] ({panel.prefixCounts().get(prefix) ?? 0})
              </Button>
            </Tooltip>
          )}
        </For>
      </HStack>

      <Show when={hasHiddenPrefixes()}>
        <Tooltip
          portalled={false}
          contentProps={tooltipContentProps}
          content="Some prefix pills are hidden. Use search to find/filter prefixes not shown."
          showArrow
        >
          <Text
            fontSize="lg"
            lineHeight="1"
            color="yellow.10"
            fontWeight="bold"
            flexShrink="0"
            whiteSpace="nowrap"
            mt="1.5"
          >
            *
          </Text>
        </Tooltip>
      </Show>
    </HStack>
  );
};
