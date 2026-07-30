import { RefreshCw } from "lucide-solid";
import { Card, Text } from "~/components/ui";
import { VStack } from "styled-system/jsx";

export function ScheduleEmptyState() {
  return (
    <Card.Root>
      <Card.Body>
        <VStack py="10">
          <RefreshCw size={38} />
          <Text fontWeight="semibold">No rotation yet</Text>
          <Text color="fg.muted">
            Create or reopen a draft to begin assigning players.
          </Text>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
