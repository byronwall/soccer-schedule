import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { mutateStore, readStore } from "./store-persistence";

const MASTER_USER_ID = "super-user";
const PASSWORD_KEY_LENGTH = 64;
const usernameSchema = z.string().trim().min(1).max(40).regex(/^[a-zA-Z0-9._-]+$/);
const displayNameSchema = z.string().trim().min(1).max(60);
const passwordSchema = z.string().min(1).max(200);

const masterCredentials = () => {
  const password = process.env.MASTER_PASSWORD
    || (process.env.NODE_ENV === "development" ? "development-master-password" : undefined);
  if (!password) {
    throw new Error("MASTER_PASSWORD must be configured.");
  }
  return {
    id: MASTER_USER_ID,
    username: (process.env.MASTER_USERNAME?.trim() || "admin").toLowerCase(),
    displayName: process.env.MASTER_DISPLAY_NAME?.trim() || "Administrator",
    password,
  };
};

const credentialVersion = () =>
  process.env.AUTH_CREDENTIAL_VERSION?.trim()
  || process.env.COACH_CREDENTIAL_VERSION?.trim()
  || "1";

const derivePassword = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, PASSWORD_KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

const passwordMatches = async (password: string, salt: string, expectedHex: string) => {
  const expected = Buffer.from(expectedHex, "hex");
  const supplied = await derivePassword(password, salt);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};

const masterPasswordMatches = (supplied: string, expected: string) => {
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
};

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const createSession = async (coach: {
  id: string;
  displayName: string;
  isSuperUser: boolean;
}) => {
  const token = randomBytes(32).toString("base64url");
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((item) =>
      Date.parse(item.expiresAt) > Date.now()
      && item.credentialVersion === credentialVersion());
    store.sessions.push({
      tokenHash: hashToken(token),
      coachId: coach.id,
      coachDisplayName: coach.displayName,
      isSuperUser: coach.isSuperUser,
      credentialVersion: credentialVersion(),
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
  });
  return { token, coach };
};

export const loginCoach = async (usernameInput: string, password: string) => {
  const master = masterCredentials();
  const username = usernameInput.trim().toLowerCase();
  if (username === master.username && masterPasswordMatches(password, master.password)) {
    return createSession({
      id: master.id,
      displayName: master.displayName,
      isSuperUser: true,
    });
  }

  const user = (await readStore()).users.find((item) => item.username === username);
  if (!user || !await passwordMatches(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }
  return createSession({
    id: user.id,
    displayName: user.displayName,
    isSuperUser: false,
  });
};

export const listAuthUsers = async () => {
  const master = masterCredentials();
  const users = (await readStore()).users.map(({ id, username, displayName, createdAt }) => ({
    id,
    username,
    displayName,
    createdAt,
    isSuperUser: false as const,
  }));
  return [{
    id: master.id,
    username: master.username,
    displayName: master.displayName,
    createdAt: null,
    isSuperUser: true as const,
  }, ...users];
};

export const createAuthUser = async (input: {
  username: string;
  displayName: string;
  password: string;
}) => {
  const master = masterCredentials();
  const username = usernameSchema.parse(input.username).toLowerCase();
  const displayName = displayNameSchema.parse(input.displayName);
  const password = passwordSchema.parse(input.password);
  if (username === master.username) throw new Error("That username is reserved.");

  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = (await derivePassword(password, passwordSalt)).toString("hex");
  return mutateStore((store) => {
    if (store.users.some((item) => item.username === username)) {
      throw new Error("That username already exists.");
    }
    const user = {
      id: randomUUID(),
      username,
      displayName,
      passwordSalt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    store.users.push(user);
    return { id: user.id, username, displayName, createdAt: user.createdAt, isSuperUser: false as const };
  });
};

export const deleteAuthUser = async (userId: string) => {
  if (userId === MASTER_USER_ID) throw new Error("The master user cannot be deleted.");
  return mutateStore((store) => {
    const before = store.users.length;
    store.users = store.users.filter((item) => item.id !== userId);
    if (store.users.length === before) throw new Error("User not found.");
    store.sessions = store.sessions.filter((item) => item.coachId !== userId);
  });
};

export const getCoachForToken = async (token?: string) => {
  if (!token) return null;
  const session = (await readStore()).sessions.find((item) =>
    item.tokenHash === hashToken(token)
    && item.credentialVersion === credentialVersion()
    && Date.parse(item.expiresAt) > Date.now());
  return session ? {
    id: session.coachId,
    displayName: session.coachDisplayName,
    isSuperUser: session.isSuperUser,
  } : null;
};

export const logoutToken = async (token?: string) => {
  if (!token) return;
  await mutateStore((store) => {
    store.sessions = store.sessions.filter((item) => item.tokenHash !== hashToken(token));
  });
};
