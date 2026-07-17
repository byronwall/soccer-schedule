import type { APIEvent } from "@solidjs/start/server";
import { z } from "zod";
import { currentCoach } from "~/lib/auth/coach-session";
import { applySoccerAction, getSnapshot } from "~/lib/soccer/store";

const actionSchema = z.object({ action: z.string().min(1), payload: z.record(z.string(), z.unknown()).default({}) });
export async function GET(event: APIEvent) {
  const coach = await currentCoach(event);
  if (!coach) return Response.json({ error: "unauthenticated" }, { status: 401 });
  return Response.json({ ...(await getSnapshot()), coach });
}
export async function POST(event: APIEvent) {
  const coach = await currentCoach(event);
  if (!coach) return Response.json({ error: "unauthenticated" }, { status: 401 });
  const parsed = actionSchema.safeParse(await event.request.json());
  if (!parsed.success) return Response.json({ error: "Invalid action." }, { status: 400 });
  try { const result = await applySoccerAction(parsed.data.action, parsed.data.payload); return Response.json({ ok: true, result }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Action failed." }, { status: 400 }); }
}
