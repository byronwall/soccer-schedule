import { Show } from "solid-js";
import { Box, Stack } from "styled-system/jsx";
import { CloseButton } from "~/components/ui/close-button";
import { Text } from "~/components/ui/text";
import { Tooltip } from "~/components/ui/tooltip";
import { ConsoleLogCaptureList } from "./ConsoleLogCaptureList";
import {
  ConsoleLogCapturePanelProvider,
  useConsoleLogCapturePanel,
} from "./ConsoleLogCapturePanel.context";
import { ConsoleLogCapturePanelShell } from "./ConsoleLogCapturePanelShell";
import { ConsoleLogCapturePrefixFilters } from "./ConsoleLogCapturePrefixFilters";
import { ConsoleLogCaptureTopControls } from "./ConsoleLogCaptureTopControls";
import {
  consoleLogCaptureEnabled,
} from "./consoleLogCapture.store";
import { tooltipContentProps } from "./consoleLogCapture.styles";

type ConsoleLogCapturePanelProps = {
  open: boolean;
  onClose: () => void;
};

export const ConsoleLogCapturePanel = (props: ConsoleLogCapturePanelProps) => {
  return (
    <ConsoleLogCapturePanelProvider open={props.open}>
      <ConsoleLogCapturePanelView
        onClose={props.onClose}
        open={props.open}
      />
    </ConsoleLogCapturePanelProvider>
  );
};

const ConsoleLogCapturePanelView = (props: ConsoleLogCapturePanelProps) => {
  const panel = useConsoleLogCapturePanel();

  return (
    <ConsoleLogCapturePanelShell
      open={props.open}
      onClose={props.onClose}
      ariaLabel="Console log panel"
      width="min(96vw, 820px)"
    >
      <Stack h="full" minH="0" gap="0" fontFamily="mono" position="relative">
        <Box position="absolute" top="2.5" right="4" zIndex="1">
          <Tooltip portalled={false} contentProps={tooltipContentProps} content="Close panel" showArrow>
            <CloseButton size="xs" onClick={props.onClose} />
          </Tooltip>
        </Box>

        <Stack px="4" py="2.5" gap="2" borderBottomWidth="1px" borderColor="border">
          <Text fontSize="xs" color="fg.muted">
            Captures browser console output with prefix filters and expandable row details.
          </Text>
          <ConsoleLogCaptureTopControls />
          <ConsoleLogCapturePrefixFilters />
        </Stack>

        <Box flex="1" minH="0" overflowY="auto" px="4" py="2.5">
          <Show when={consoleLogCaptureEnabled()} fallback={<CaptureOffMessage />}>
            <Show when={panel.displayedEntries().length > 0} fallback={<NoMatchingLogsMessage />}>
              <ConsoleLogCaptureList />
            </Show>
          </Show>
        </Box>
      </Stack>
    </ConsoleLogCapturePanelShell>
  );
};

const CaptureOffMessage = () => (
  <Box borderWidth="1px" borderColor="black.a3" borderRadius="l2" p="3" bg="bg.subtle">
    <Text fontSize="sm" color="fg.default">
      Capture is off. Turn it on to start recording console output.
    </Text>
  </Box>
);

const NoMatchingLogsMessage = () => (
  <Box borderWidth="1px" borderColor="black.a3" borderRadius="l2" p="3" bg="bg.subtle">
    <Text fontSize="sm" color="fg.muted">
      No logs match this filter/search.
    </Text>
  </Box>
);
