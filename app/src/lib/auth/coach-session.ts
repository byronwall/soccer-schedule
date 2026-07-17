import type { APIEvent } from "@solidjs/start/server";
import { getCoachForToken, logoutToken } from "~/lib/soccer/store";

export const COACH_COOKIE = "coach_companion_session";
export const DEVELOPMENT_COACH = {
  id: "development-coach",
  displayName: "Development Coach",
  isSuperUser: true,
} as const;

export const cookieToken = (request: Request) => request.headers.get("cookie")?.split(";").map((item) => item.trim().split("=")).find(([name]) => name === COACH_COOKIE)?.[1];
export const coachForRequest = (event: APIEvent, development: boolean) =>
  development
    ? Promise.resolve(DEVELOPMENT_COACH)
    : getCoachForToken(cookieToken(event.request));
export const currentCoach = (event: APIEvent) => coachForRequest(event, import.meta.env.DEV);
export const revokeCoach = (event: APIEvent) => logoutToken(cookieToken(event.request));
export const sessionCookie = (token: string) => `${COACH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`;
export const clearCoachCookie = () => `${COACH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
