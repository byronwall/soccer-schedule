import type { APIEvent } from "@solidjs/start/server";
import { z } from "zod";
import { coachAuthUnavailable } from "~/lib/auth/coach-auth-response";
import { sessionCookie } from "~/lib/auth/coach-session";
import { loginCoach } from "~/lib/soccer/store";

const inputSchema = z.object({ coachId: z.string(), password: z.string().min(1) });
export async function POST(event: APIEvent) {
  const requestBody = await event.request.json().catch(() => undefined);
  const input = inputSchema.safeParse(requestBody);
  if (!input.success) return Response.json({ error: "Enter your coach and password." }, { status: 400 });
  try {
    const result = await loginCoach(input.data.coachId, input.data.password);
    if (!result) return Response.json({ error: "The coach or password did not match." }, { status: 401 });
    return Response.json({ coach: result.coach }, { headers: { "set-cookie": sessionCookie(result.token) } });
  } catch (error) {
    return coachAuthUnavailable(error);
  }
}
