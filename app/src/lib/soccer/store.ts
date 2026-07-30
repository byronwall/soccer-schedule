import { applyLiveAction } from "./store-live-actions";
import { rosterAndGameActionHandlers } from "./store-roster-game-actions";
import { scheduleActionHandlers } from "./store-schedule-actions";
import { mutateStore, readStore } from "./store-persistence";

export {
  createAuthUser,
  deleteAuthUser,
  getCoachForToken,
  hashToken,
  listAuthUsers,
  loginCoach,
  logoutToken,
} from "./store-auth";

const actionHandlers = {
  ...rosterAndGameActionHandlers,
  ...scheduleActionHandlers,
};

export const getSnapshot = async () => {
  const store = await readStore();
  return { ...store, users: undefined, sessions: undefined };
};

export const applySoccerAction = (
  action: string,
  payload: Record<string, unknown>,
  actor = { id: "system", displayName: "System" },
) =>
  mutateStore((store) => {
    const stamp = new Date().toISOString();
    const handler = actionHandlers[action];
    if (handler) return handler(store, payload, stamp) ?? {};
    if (action.startsWith("live")) {
      return applyLiveAction(store, action, payload, stamp, actor);
    }
    throw new Error(`Unknown soccer action: ${action}`);
  });
