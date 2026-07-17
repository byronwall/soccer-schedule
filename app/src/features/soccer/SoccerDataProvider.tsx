import { createContext, createResource, createSignal, onMount, useContext, type JSX } from "solid-js";
import { DEFAULT_POSITION_LABELS, resolvePositions } from "~/lib/soccer/fixed-game";
import type { Availability, Game, LiveState, Player, PositionLabels, Schedule } from "~/lib/soccer/schemas";

export type SoccerSnapshot = {
  teamDisplayName: string; seasonName: string; positionLabels: PositionLabels; players: Player[]; games: Game[]; availability: Availability[];
  schedules: Schedule[]; liveGames: LiveState[]; coach: { id: string; displayName: string; isSuperUser: boolean };
};
type SoccerContextValue = {
  snapshot: () => SoccerSnapshot | undefined; loading: () => boolean; error: () => string | undefined;
  positions: () => ReturnType<typeof resolvePositions>;
  run: (action: string, payload?: Record<string, unknown>) => Promise<unknown>; refresh: () => Promise<unknown>;
};
const SoccerContext = createContext<SoccerContextValue>();

export function SoccerDataProvider(props: { children: JSX.Element }) {
  const [ready, setReady] = createSignal(false);
  const [actionError, setActionError] = createSignal<string>();
  onMount(() => setReady(true));
  const [resource, { refetch }] = createResource(ready, async (enabled) => {
    if (!enabled) return undefined;
    const response = await fetch("/api/soccer");
    if (response.status === 401) { window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`); return undefined; }
    if (!response.ok) throw new Error("Could not load team data.");
    return response.json() as Promise<SoccerSnapshot>;
  });
  const run = async (action: string, payload: Record<string, unknown> = {}) => {
    setActionError();
    const response = await fetch("/api/soccer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, payload }) });
    const body = await response.json() as { error?: string; result?: unknown };
    if (!response.ok) { setActionError(body.error ?? "Action failed."); throw new Error(body.error ?? "Action failed."); }
    await refetch();
    return body.result;
  };
  const refresh = async () => { await refetch(); };
  return <SoccerContext.Provider value={{ snapshot: () => resource.latest, positions: () => resolvePositions(resource.latest?.positionLabels ?? DEFAULT_POSITION_LABELS), loading: () => resource.loading && !resource.latest, error: () => actionError() ?? (resource.error instanceof Error ? resource.error.message : undefined), run, refresh }}>{props.children}</SoccerContext.Provider>;
}
export const useSoccerData = () => {
  const value = useContext(SoccerContext);
  if (!value) throw new Error("useSoccerData must be used within SoccerDataProvider.");
  return value;
};
