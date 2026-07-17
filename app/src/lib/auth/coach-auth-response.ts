const unavailableMessage =
  "Coach sign-in is temporarily unavailable. Check the server configuration and try again.";

export function coachAuthUnavailable(error: unknown) {
  console.error("Coach authentication is unavailable.", error);
  return Response.json({ error: unavailableMessage }, { status: 503 });
}
