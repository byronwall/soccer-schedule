import type { APIEvent } from "@solidjs/start/server";
import { z } from "zod";
import { currentCoach } from "~/lib/auth/coach-session";
import { createAuthUser, deleteAuthUser, listAuthUsers } from "~/lib/soccer/store";

const createUserSchema = z.object({
  username: z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  displayName: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
});
const deleteUserSchema = z.object({ userId: z.string().uuid() });

const requireSuperUser = async (event: APIEvent) => {
  const coach = await currentCoach(event);
  return coach?.isSuperUser ? coach : null;
};

export async function GET(event: APIEvent) {
  if (!await requireSuperUser(event)) {
    return Response.json({ error: "Super user access is required." }, { status: 403 });
  }
  try {
    return Response.json({ users: await listAuthUsers() });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not load users.",
    }, { status: 503 });
  }
}

export async function POST(event: APIEvent) {
  if (!await requireSuperUser(event)) {
    return Response.json({ error: "Super user access is required." }, { status: 403 });
  }
  const input = createUserSchema.safeParse(await event.request.json().catch(() => undefined));
  if (!input.success) {
    return Response.json({
      error: "Enter a valid username, display name, and password.",
    }, { status: 400 });
  }
  try {
    return Response.json({ user: await createAuthUser(input.data) }, { status: 201 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not create user.",
    }, { status: 400 });
  }
}

export async function DELETE(event: APIEvent) {
  if (!await requireSuperUser(event)) {
    return Response.json({ error: "Super user access is required." }, { status: 403 });
  }
  const input = deleteUserSchema.safeParse(await event.request.json().catch(() => undefined));
  if (!input.success) {
    return Response.json({ error: "Choose a valid user." }, { status: 400 });
  }
  try {
    await deleteAuthUser(input.data.userId);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not delete user.",
    }, { status: 400 });
  }
}
