import { A, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { CheckCircle2 } from "lucide-solid";
import { Badge, Button, Card, Text } from "~/components/ui";
import {
  LiveGameProvider,
  useLiveGame,
} from "~/features/soccer/LiveGameProvider";
import { Grid, HStack, VStack } from "styled-system/jsx";
import { LiveEventList } from "./LiveEventList";
import { LiveGameStatusPanel } from "./LiveGameStatusPanel";
import { LiveLineupPanel } from "./LiveLineupPanel";
import { LiveTrackerDialogs } from "./LiveTrackerDialogs";
import { PageHeader } from "./PageHeader";

function TrackerPage() {
  const tracker = useLiveGame();
  const unavailable = () =>
    tracker.live()?.actualHistoryStatus === "legacy_unavailable";
  const completed = () => tracker.live()?.status === "completed";
  const confirmed = () =>
    tracker.live()?.actualHistoryStatus === "confirmed";
  const trustHeading = () => {
    if (confirmed()) return "Actual record confirmed";
    if (unavailable()) return "Actual history unavailable";
    return "Actual record is incomplete";
  };
  const trustDescription = () => {
    if (confirmed()) {
      return "This ledger is trusted for future actual-history summaries.";
    }
    if (unavailable()) {
      return "This legacy record cannot contribute trusted actual history.";
    }
    return "It will not be used as actual history until you explicitly complete and confirm it.";
  };
  const started = () =>
    tracker.live()?.status === "running" ||
    tracker.live()?.status === "paused";

  return (
    <Show when={tracker.game()}>
      {(game) => (
        <>
          <PageHeader
            eyebrow="Game day"
            title={`vs. ${game().opponentName}`}
            description="Record only what happened. The published plan stays unchanged."
            actions={
              <A href={`/games/${game().id}/schedule`}>
                <Button variant="outline">Back to schedule</Button>
              </A>
            }
          />
          <Show
            when={tracker.schedule()}
            fallback={
              <Card.Root>
                <Card.Body>
                  <Text>Publish a valid schedule before opening game mode.</Text>
                </Card.Body>
              </Card.Root>
            }
          >
            <VStack alignItems="stretch" gap="4">
              <Show when={unavailable()}>
                <Card.Root borderColor="orange.border" borderWidth="1px">
                  <Card.Body>
                    <Text fontWeight="semibold">
                      Actual history unavailable
                    </Text>
                    <Text color="fg.muted">
                      This game used the earlier temporary tracker. Its changes
                      cannot be reconstructed as trustworthy actual history.
                    </Text>
                  </Card.Body>
                </Card.Root>
              </Show>
              <Show when={tracker.ui.successMessage}>
                {(message) => (
                  <HStack
                    p="3"
                    bg="green.subtle.bg"
                    color="green.subtle.fg"
                    borderRadius="l2"
                    role="status"
                  >
                    <CheckCircle2 size={20} />
                    <Text fontWeight="semibold">{message()}</Text>
                  </HStack>
                )}
              </Show>
              <Grid
                gridTemplateColumns={{ base: "1fr", lg: "320px 1fr" }}
                gap="4"
              >
                <LiveGameStatusPanel />
                <VStack alignItems="stretch" gap="4">
                  <LiveLineupPanel />
                  <LiveEventList />
                  <Card.Root borderColor="orange.border" borderWidth="1px">
                    <Card.Body>
                      <VStack alignItems="stretch">
                        <HStack justifyContent="space-between" flexWrap="wrap">
                          <Text fontWeight="semibold">
                            {trustHeading()}
                          </Text>
                          <Badge
                            colorPalette={confirmed() ? "green" : "orange"}
                          >
                            {confirmed() ? "Trusted" : "Not trusted"}
                          </Badge>
                        </HStack>
                        <Text color="fg.muted">
                          {trustDescription()}
                        </Text>
                        <Show
                          when={
                            !completed() && started() && !unavailable()
                          }
                        >
                          <Button
                            colorPalette="orange"
                            disabled={!!tracker.ui.pendingAction}
                            onClick={() => tracker.setCompletionOpen(true)}
                          >
                            Complete and confirm
                          </Button>
                        </Show>
                      </VStack>
                    </Card.Body>
                  </Card.Root>
                </VStack>
              </Grid>
            </VStack>
          </Show>
          <LiveTrackerDialogs />
        </>
      )}
    </Show>
  );
}

export function LivePage() {
  const params = useParams();
  return (
    <LiveGameProvider gameId={params.gameId ?? ""}>
      <TrackerPage />
    </LiveGameProvider>
  );
}
