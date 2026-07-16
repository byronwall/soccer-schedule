import { CheckIcon, CopyIcon, DownloadIcon, ListIcon } from "lucide-solid";
import { Show } from "solid-js";
import { HStack } from "styled-system/jsx";
import * as Checkbox from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Input } from "~/components/ui/input";
import { Tooltip } from "~/components/ui/tooltip";
import { useConsoleLogCapturePanel } from "./ConsoleLogCapturePanel.context";
import { consoleLogEntries } from "./consoleLogCapture.store";
import { tooltipContentProps } from "./consoleLogCapture.styles";

export const ConsoleLogCaptureTopControls = () => {
  const panel = useConsoleLogCapturePanel();
  const visibleActionsDisabled = () => panel.displayedEntries().length === 0;

  return (
    <HStack gap="2" flexWrap="wrap">
      <Input
        size="xs"
        value={panel.state.filters.searchQuery}
        onInput={(event) => panel.actions.setSearchQuery((event.currentTarget as HTMLInputElement).value)}
        placeholder="Search visible logs..."
        fontFamily="mono"
        autocomplete="off"
        autocapitalize="none"
        autocorrect="off"
        spellcheck={false}
        w={{ base: "full", sm: "280px" }}
      />

      <Tooltip
        portalled={false}
        contentProps={tooltipContentProps}
        content="Maximum logs retained in memory"
        showArrow
      >
        <Input
          size="xs"
          value={panel.state.limits.maxKeepInput}
          onInput={(event) => panel.actions.setMaxKeepInput((event.currentTarget as HTMLInputElement).value)}
          onBlur={panel.actions.applyMaxKeep}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            panel.actions.applyMaxKeep();
          }}
          placeholder="Max keep"
          fontFamily="mono"
          inputMode="numeric"
          w="7.5rem"
        />
      </Tooltip>

      <Tooltip
        portalled={false}
        contentProps={tooltipContentProps}
        content="Rows to show in the list"
        showArrow
      >
        <Input
          size="xs"
          value={panel.state.limits.rowLimitInput}
          onInput={(event) => panel.actions.setRowLimitInput((event.currentTarget as HTMLInputElement).value)}
          onBlur={panel.actions.normalizeRowLimitInput}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            panel.actions.normalizeRowLimitInput();
          }}
          placeholder="Row limit"
          fontFamily="mono"
          inputMode="numeric"
          w="7.5rem"
        />
      </Tooltip>

      <Tooltip
        portalled={false}
        contentProps={tooltipContentProps}
        content="Apply row limit per prefix using most recent rows"
        showArrow
      >
        <Checkbox.Root
          checked={panel.state.filters.samplePerPrefix}
          onCheckedChange={(details) => panel.actions.setSamplePerPrefix(details.checked === true)}
        >
          <Checkbox.HiddenInput />
          <HStack gap="1" px="1.5">
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Label fontSize="xs" color="fg.muted">
              sample prefixes
            </Checkbox.Label>
          </HStack>
        </Checkbox.Root>
      </Tooltip>

      <Tooltip
        portalled={false}
        contentProps={tooltipContentProps}
        content={
          panel.captureEnabled()
            ? "Disable console capture"
            : "Enable console capture"
        }
        showArrow
      >
        <Button
          size="xs"
          variant={panel.captureEnabled() ? "subtle" : "outline"}
          onClick={panel.actions.toggleCapture}
          fontFamily="mono"
        >
          {panel.captureEnabled() ? "Capture On" : "Capture Off"}
        </Button>
      </Tooltip>

      <Tooltip
        portalled={false}
        contentProps={tooltipContentProps}
        content="Clear captured logs"
        showArrow
      >
        <Button
          size="xs"
          variant="outline"
          onClick={panel.actions.clearEntries}
          disabled={consoleLogEntries().length === 0}
          fontFamily="mono"
        >
          Clear
        </Button>
      </Tooltip>

      <Tooltip
        portalled={false}
        contentProps={tooltipContentProps}
        content="Emit mixed test logs for previewing rendering"
        showArrow
      >
        <Button
          size="xs"
          variant="outline"
          onClick={panel.actions.emitTestLogs}
          fontFamily="mono"
        >
          Test Logs
        </Button>
      </Tooltip>

      <HStack gap="1">
        <Tooltip
          portalled={false}
          contentProps={tooltipContentProps}
          content={
            panel.copiedPrefixes()
              ? "Copied visible prefixes"
              : "Copy visible prefixes with counts"
          }
          showArrow
        >
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Copy visible prefixes with counts"
            onClick={panel.actions.copyVisiblePrefixes}
            disabled={panel.visiblePrefixCounts().length === 0}
          >
            <Show
              when={panel.copiedPrefixes()}
              fallback={<ListIcon size={12} />}
            >
              <CheckIcon size={12} />
            </Show>
          </IconButton>
        </Tooltip>

        <Tooltip
          portalled={false}
          contentProps={tooltipContentProps}
          content="Download visible logs as JSON"
          showArrow
        >
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Download visible logs as JSON"
            onClick={panel.actions.downloadVisibleLogs}
            disabled={visibleActionsDisabled()}
          >
            <DownloadIcon size={12} />
          </IconButton>
        </Tooltip>

        <Tooltip
          portalled={false}
          contentProps={tooltipContentProps}
          content={
            panel.copiedVisible()
              ? "Copied visible logs"
              : "Copy visible logs JSON"
          }
          showArrow
        >
          <IconButton
            size="xs"
            variant="outline"
            aria-label="Copy visible logs JSON"
            onClick={panel.actions.copyVisibleLogs}
            disabled={visibleActionsDisabled()}
          >
            <Show
              when={panel.copiedVisible()}
              fallback={<CopyIcon size={12} />}
            >
              <CheckIcon size={12} />
            </Show>
          </IconButton>
        </Tooltip>
      </HStack>
    </HStack>
  );
};
