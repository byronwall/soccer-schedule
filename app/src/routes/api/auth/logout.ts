import type { APIEvent } from "@solidjs/start/server";
import { clearCoachCookie, revokeCoach } from "~/lib/auth/coach-session";

export async function POST(event: APIEvent) {
  await revokeCoach(event);
  return Response.json(
    { ok: true },
    {
      headers: {
        "set-cookie": clearCoachCookie(),
      },
    },
  );
}
