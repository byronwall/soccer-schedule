import { Show } from "solid-js";
import { RefreshCw } from "lucide-solid";
import { Alert, Button, SimpleDialog, Text } from "~/components/ui";
import { HStack } from "styled-system/jsx";

type ScheduleRegenerationControlsProps = {
  open: boolean;
  pending: boolean;
  feedback?: string;
  changed?: boolean;
  onOpenChange: (open: boolean) => void;
  onRegenerate: () => void;
};

export function ScheduleRegenerationControls(
  props: ScheduleRegenerationControlsProps,
) {
  return (
    <>
      <Show when={props.feedback}>
        {(feedback) => (
          <Alert.Root
            role="status"
            mb="4"
            colorPalette={props.changed ? "grass" : "orange"}
          >
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>
                {props.changed ? "Schedule regenerated" : "Schedule unchanged"}
              </Alert.Title>
              <Alert.Description>{feedback()}</Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}
      </Show>
      <SimpleDialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        title="Regenerate schedule?"
        description="This creates a fresh valid rotation while preserving locked assignments. The published schedule remains available until you publish the new draft."
        footer={
          <HStack justifyContent="flex-end">
            <Button variant="outline" onClick={() => props.onOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={props.pending} onClick={props.onRegenerate}>
              <RefreshCw size={16} /> {props.pending ? "Regenerating…" : "Regenerate"}
            </Button>
          </HStack>
        }
      >
        <Text color="fg.muted">
          Use repair when you want to preserve unaffected assignments.
        </Text>
      </SimpleDialog>
    </>
  );
}
