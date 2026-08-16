import {
  createContext,
  createMemo,
  onCleanup,
  onMount,
  untrack,
  useContext,
  type JSX,
} from "solid-js";
import { createStore } from "solid-js/store";
import type { PositionKey } from "~/lib/soccer/fixed-game";
import { elapsedLiveSecondsAt, reconstructLiveLineup } from "~/lib/soccer/live-game";
import type { LiveEvent } from "~/lib/soccer/live-event-schemas";
import { useSoccerData } from "./SoccerDataProvider";

type LiveUiState = {
  clockTimestamp?: string;
  selectedPositionKey?: PositionKey;
  goalOpen: boolean;
  goalPlayerId: string;
  goalSubmissionId?: string;
  pendingAction?: string;
  successMessage?: string;
  voidEventId?: string;
  completionOpen: boolean;
};

type LiveGameContextValue = ReturnType<typeof createLiveGameContext>;
const LiveGameContext = createContext<LiveGameContextValue>();

const createLiveGameContext = (gameId: string) => {
  const data = useSoccerData();
  const [ui, setUi] = createStore<LiveUiState>({
    goalOpen: false,
    goalPlayerId: "",
    completionOpen: false,
  });

  const game = createMemo(() =>
    data.snapshot()?.games.find((candidate) => candidate.id === gameId),
  );
  const schedule = createMemo(() =>
    data
      .snapshot()
      ?.schedules.find(
        (candidate) => candidate.gameId === gameId && candidate.status === "published",
      ),
  );
  const live = createMemo(() =>
    data.snapshot()?.liveGames.find((candidate) => candidate.gameId === gameId),
  );
  const elapsedSeconds = createMemo(() => {
    const current = live();
    return current ? elapsedLiveSecondsAt(current, ui.clockTimestamp ?? current.updatedAt) : 0;
  });
  const lineup = createMemo(() => {
    const published = schedule();
    const current = live();
    if (!published) return {};
    return reconstructLiveLineup(
      published,
      current ?? {
        quarter: 1,
        accumulatedQuarterSeconds: 0,
        status: "not_started",
        events: [],
      },
      ui.clockTimestamp ?? current?.updatedAt,
    );
  });
  const availablePlayers = createMemo(() => {
    const snapshot = data.snapshot();
    if (!snapshot) return [];
    const availableIds = new Set(
      snapshot.availability
        .filter((item) => item.gameId === gameId && item.status === "available")
        .map((item) => item.playerId),
    );
    return snapshot.players.filter((player) => player.active && availableIds.has(player.id));
  });
  const fieldIds = createMemo(() => new Set(Object.values(lineup()).filter(Boolean)));
  const bench = createMemo(() => availablePlayers().filter((player) => !fieldIds().has(player.id)));
  const player = (playerId?: string) =>
    data.snapshot()?.players.find((candidate) => candidate.id === playerId);

  onMount(() => {
    let elapsedTicks = 0;
    setUi("clockTimestamp", new Date().toISOString());
    const timer = window.setInterval(() => {
      elapsedTicks += 1;
      setUi("clockTimestamp", new Date().toISOString());
      if (elapsedTicks % 2 === 0) void data.refresh();
    }, 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  const run = async (action: string, payload: Record<string, unknown> = {}) => {
    if (ui.pendingAction) return undefined;
    setUi({ pendingAction: action, successMessage: undefined });
    try {
      return await data.run(action, {
        gameId,
        expectedRevision: live()?.revision ?? 0,
        ...payload,
      });
    } finally {
      setUi("pendingAction", undefined);
    }
  };

  const selectPosition = (positionKey?: PositionKey) => setUi("selectedPositionKey", positionKey);
  const substitute = async (playerId: string) => {
    if (!ui.selectedPositionKey) return;
    await run("liveSubstitute", {
      positionKey: ui.selectedPositionKey,
      playerId,
    });
    setUi({
      selectedPositionKey: undefined,
      successMessage: "Substitution recorded.",
    });
  };
  const swap = async (secondPositionKey: PositionKey) => {
    if (!ui.selectedPositionKey) return;
    await run("liveSwapPositions", {
      firstPositionKey: ui.selectedPositionKey,
      secondPositionKey,
    });
    setUi({
      selectedPositionKey: undefined,
      successMessage: "Position swap recorded.",
    });
  };
  const setGoalOpen = (open: boolean) => {
    setUi({
      goalOpen: open,
      goalPlayerId: open ? ui.goalPlayerId : "",
      goalSubmissionId: open ? ui.goalSubmissionId : undefined,
    });
  };
  const setGoalPlayerId = (playerId: string) => {
    setUi({ goalPlayerId: playerId, goalSubmissionId: undefined });
  };
  const recordGoal = async () => {
    if (!ui.goalPlayerId || ui.pendingAction) return;
    const scorer = player(ui.goalPlayerId);
    const submissionId = ui.goalSubmissionId ?? crypto.randomUUID();
    setUi("goalSubmissionId", submissionId);
    await run("liveRecordGoal", {
      playerId: ui.goalPlayerId,
      submissionId,
    });
    setUi({
      goalOpen: false,
      goalPlayerId: "",
      goalSubmissionId: undefined,
      successMessage: `Goal recorded for ${scorer?.displayName ?? "player"}.`,
    });
  };
  const requestVoid = (eventId?: string) => setUi("voidEventId", eventId);
  const voidEvent = async () => {
    if (!ui.voidEventId) return;
    await run("liveVoidEvent", { targetEventId: ui.voidEventId });
    setUi({
      voidEventId: undefined,
      successMessage: "Event voided. The current lineup has been recomputed.",
    });
  };
  const completeAndConfirm = async () => {
    await run("liveCompleteAndConfirm");
    setUi({
      completionOpen: false,
      successMessage: "Game completed. Actual record confirmed.",
    });
  };

  return {
    data,
    ui,
    game,
    schedule,
    live,
    elapsedSeconds,
    lineup,
    availablePlayers,
    bench,
    player,
    run,
    selectPosition,
    substitute,
    swap,
    setGoalOpen,
    setGoalPlayerId,
    recordGoal,
    requestVoid,
    voidEvent,
    setCompletionOpen: (open: boolean) => setUi("completionOpen", open),
    completeAndConfirm,
    clearSuccess: () => setUi("successMessage", undefined),
  };
};

export function LiveGameProvider(props: { gameId: string; children: JSX.Element }) {
  const value = createLiveGameContext(untrack(() => props.gameId));
  return <LiveGameContext.Provider value={value}>{props.children}</LiveGameContext.Provider>;
}

export const useLiveGame = () => {
  const value = useContext(LiveGameContext);
  if (!value) throw new Error("useLiveGame must be used within LiveGameProvider.");
  return value;
};

export type CorrectableLiveEvent = Extract<
  LiveEvent,
  {
    type: "bench_replaced_field_player" | "field_players_swapped" | "own_team_goal_scored";
  }
>;
