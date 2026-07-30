import { A, useNavigate, useParams } from "@solidjs/router";
import { createStore } from "solid-js/store";
import { Show, createSignal } from "solid-js";
import { ArrowRight, CalendarCheck, Pencil, Trash2 } from "lucide-solid";
import { Button, Card, Field, Input, SimpleDialog } from "~/components/ui";
import { useSoccerData } from "~/features/soccer/SoccerDataProvider";
import { Box, Grid, HStack } from "styled-system/jsx";
import { PageHeader } from "./PageHeader";
import { CompletedGameSummary } from "./CompletedGameSummary";
import { ScheduledGamePlanningDetails } from "./ScheduledGamePlanningDetails";

const localDateTime = (date = new Date(Date.now() + 7 * 86_400_000)) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
export function NewGamePage() {
  const data = useSoccerData(); const navigate = useNavigate(); const [pending, setPending] = createSignal(false);
  const [draft, setDraft] = createStore({ opponentName: "", venueName: "", venueAddress: "", startsAt: localDateTime(), arrivalAt: localDateTime(new Date(Date.now() + 7 * 86_400_000 - 45 * 60_000)) });
  const save = async () => { setPending(true); const result = await data.run("createGame", { ...draft }) as { gameId?: string }; setPending(false); if (result?.gameId) navigate(`/games/${result.gameId}`); };
  return <><PageHeader eyebrow="Schedule" title="Plan a new game" description="Add the match logistics first. Every active player begins with unknown availability."/><Card.Root maxW="3xl"><Card.Body><Grid gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4"><Field.Root required><Field.Label>Opponent</Field.Label><Input value={draft.opponentName} onInput={(e) => setDraft("opponentName", e.currentTarget.value)} /></Field.Root><Field.Root required><Field.Label>Venue</Field.Label><Input value={draft.venueName} onInput={(e) => setDraft("venueName", e.currentTarget.value)} /></Field.Root><Field.Root><Field.Label>Venue address</Field.Label><Input value={draft.venueAddress} onInput={(e) => setDraft("venueAddress", e.currentTarget.value)} /></Field.Root><Box/><Field.Root required><Field.Label>Game start</Field.Label><Input type="datetime-local" value={draft.startsAt} onInput={(e) => setDraft("startsAt", e.currentTarget.value)} /></Field.Root><Field.Root><Field.Label>Arrival time</Field.Label><Input type="datetime-local" value={draft.arrivalAt} onInput={(e) => setDraft("arrivalAt", e.currentTarget.value)} /></Field.Root></Grid></Card.Body><Card.Footer><HStack><Button variant="outline" onClick={() => navigate("/")}>Cancel</Button><Button loading={pending()} disabled={!draft.opponentName || !draft.venueName} onClick={save}>Create game <ArrowRight size={16}/></Button></HStack></Card.Footer></Card.Root></>;
}

export function GameDetailPage() {
  const data = useSoccerData(); const params = useParams(); const navigate = useNavigate();
  const [editOpen, setEditOpen] = createSignal(false); const [editDraft, setEditDraft] = createStore({ opponentName: "", venueName: "", venueAddress: "", startsAt: "", arrivalAt: "" });
  const game = () => data.snapshot()?.games.find((item) => item.id === params.gameId);
  const availability = () => {
    const snapshot = data.snapshot();
    if (!snapshot) return [];
    const activePlayerIds = new Set(
      snapshot.players.filter((player) => player.active).map((player) => player.id),
    );
    return snapshot.availability.filter(
      (item) =>
        item.gameId === params.gameId && activePlayerIds.has(item.playerId),
    );
  };
  const count = (status: "unknown" | "available" | "unavailable") => availability().filter((item) => item.status === status).length;
  const canBuildSchedule = () => count("unknown") === 0 && count("available") >= 7;
  const openEditor = () => { const current = game(); if (!current) return; setEditDraft({ opponentName: current.opponentName, venueName: current.venueName, venueAddress: current.venueAddress ?? "", startsAt: localDateTime(new Date(current.startsAt)), arrivalAt: current.arrivalAt ? localDateTime(new Date(current.arrivalAt)) : "" }); setEditOpen(true); };
  const saveGame = async () => { const current = game(); if (!current) return; await data.run("updateGame", { id: current.id, ...editDraft }); setEditOpen(false); };
  return (
    <Show when={game()}>
      {(current) => (
        <>
          <PageHeader
            eyebrow={current().status === "completed" ? "Post-game" : "Game plan"}
            title={`vs. ${current().opponentName}`}
            description={`${new Date(current().startsAt).toLocaleString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })} · ${current().venueName}`}
            actions={
              <HStack flexWrap="wrap">
                <Show when={current().status !== "completed"}>
                  <Show
                    when={canBuildSchedule()}
                    fallback={
                      <Button disabled>
                        <CalendarCheck size={16} /> Build schedule
                      </Button>
                    }
                  >
                    <A href={`/games/${current().id}/schedule`}>
                      <Button>
                        <CalendarCheck size={16} /> Build schedule
                      </Button>
                    </A>
                  </Show>
                </Show>
                <Show when={current().status !== "completed"}>
                  <Button variant="outline" onClick={openEditor}>
                    <Pencil size={16} /> Edit game
                  </Button>
                </Show>
                <Button
                  variant="plain"
                  colorPalette="red"
                  onClick={() => {
                    void data.run("deleteGame", { id: current().id })
                      .then(() => navigate("/"));
                  }}
                >
                  <Trash2 size={16} /> Delete game
                </Button>
              </HStack>
            }
          />
          <Show
            when={current().status === "completed"}
            fallback={
              <>
                <ScheduledGamePlanningDetails game={current()} />
                <SimpleDialog
                  open={editOpen()}
                  onOpenChange={setEditOpen}
                  title="Edit game"
                  footer={
                    <HStack>
                      <Button
                        variant="outline"
                        onClick={() => setEditOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={saveGame}>Save game</Button>
                    </HStack>
                  }
                >
                  <Grid
                    gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
                    gap="4"
                  >
                    <Field.Root required>
                      <Field.Label>Opponent</Field.Label>
                      <Input
                        value={editDraft.opponentName}
                        onInput={(event) => setEditDraft(
                          "opponentName",
                          event.currentTarget.value,
                        )}
                      />
                    </Field.Root>
                    <Field.Root required>
                      <Field.Label>Venue</Field.Label>
                      <Input
                        value={editDraft.venueName}
                        onInput={(event) => setEditDraft(
                          "venueName",
                          event.currentTarget.value,
                        )}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Venue address</Field.Label>
                      <Input
                        value={editDraft.venueAddress}
                        onInput={(event) => setEditDraft(
                          "venueAddress",
                          event.currentTarget.value,
                        )}
                      />
                    </Field.Root>
                    <Box />
                    <Field.Root required>
                      <Field.Label>Game start</Field.Label>
                      <Input
                        type="datetime-local"
                        value={editDraft.startsAt}
                        onInput={(event) => setEditDraft(
                          "startsAt",
                          event.currentTarget.value,
                        )}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Arrival time</Field.Label>
                      <Input
                        type="datetime-local"
                        value={editDraft.arrivalAt}
                        onInput={(event) => setEditDraft(
                          "arrivalAt",
                          event.currentTarget.value,
                        )}
                      />
                    </Field.Root>
                  </Grid>
                </SimpleDialog>
              </>
            }
          >
            <CompletedGameSummary gameId={current().id} />
          </Show>
        </>
      )}
    </Show>
  );
}
