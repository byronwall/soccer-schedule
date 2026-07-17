import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mutateStore, readStore } from "./store-persistence";

const coachCredentialsSchema = z.array(z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  password: z.string().min(16),
})).length(2).superRefine((items, context) => {
  if (new Set(items.map((item) => item.id)).size !== 2) {
    context.addIssue({ code: "custom", message: "Coach IDs must be unique." });
  }
  if (new Set(items.map((item) => item.displayName)).size !== 2) {
    context.addIssue({ code: "custom", message: "Coach display names must be unique." });
  }
});

const credentials = () => {
  const configured = process.env.COACH_CREDENTIALS_JSON;
  if (!configured) throw new Error("COACH_CREDENTIALS_JSON must configure exactly two coaches.");
  return coachCredentialsSchema.parse(JSON.parse(configured));
};

const credentialVersion = () => process.env.COACH_CREDENTIAL_VERSION?.trim() || "1";

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const publicCoaches = () =>
  credentials().map(({ id, displayName }) => ({ id, displayName }));

export const loginCoach = async (coachId: string, password: string) => {
  const coach = credentials().find((item) => item.id === coachId);
  if (!coach) return null;
  const expected = createHash("sha256").update(coach.password).digest();
  const supplied = createHash("sha256").update(password).digest();
  if (!timingSafeEqual(expected, supplied)) return null;

  const token = randomBytes(32).toString("base64url");
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((item) =>
      Date.parse(item.expiresAt) > Date.now() &&
      item.credentialVersion === credentialVersion());
    store.sessions.push({
      tokenHash: hashToken(token),
      coachId: coach.id,
      coachDisplayName: coach.displayName,
      credentialVersion: credentialVersion(),
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
  });
  return { token, coach: { id: coach.id, displayName: coach.displayName } };
};

export const getCoachForToken = async (token?: string) => {
  if (!token) return null;
  const session = (await readStore()).sessions.find((item) =>
    item.tokenHash === hashToken(token) &&
    item.credentialVersion === credentialVersion() &&
    Date.parse(item.expiresAt) > Date.now());
  return session ? { id: session.coachId, displayName: session.coachDisplayName } : null;
};

export const logoutToken = async (token?: string) => {
  if (!token) return;
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((item) => item.tokenHash !== hashToken(token));
  });
};
