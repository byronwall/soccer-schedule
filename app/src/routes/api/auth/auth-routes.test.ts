import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { POST as LOGIN } from "./coach-login";
import { GET as GET_USERS, POST as CREATE_USER } from "./users";

const configuredMasterPassword = process.env.MASTER_PASSWORD;
const configuredDataDirectory = process.env.APP_DATA_DIR;
const configuredNodeEnvironment = process.env.NODE_ENV;
let dataDirectory = "";

beforeAll(async () => {
  dataDirectory = await mkdtemp(path.join(tmpdir(), "coach-auth-routes-test-"));
  process.env.APP_DATA_DIR = dataDirectory;
  process.env.NODE_ENV = "production";
});

afterAll(async () => {
  if (configuredDataDirectory === undefined) delete process.env.APP_DATA_DIR;
  else process.env.APP_DATA_DIR = configuredDataDirectory;
  if (configuredNodeEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = configuredNodeEnvironment;
  await rm(dataDirectory, { recursive: true, force: true });
});

afterEach(() => {
  if (configuredMasterPassword === undefined) delete process.env.MASTER_PASSWORD;
  else process.env.MASTER_PASSWORD = configuredMasterPassword;
});

describe("coach auth API", () => {
  it("returns a JSON service error when credentials are not configured", async () => {
    delete process.env.MASTER_PASSWORD;

    const request = new Request("http://localhost/api/auth/coach-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password" }),
    });
    const response = await LOGIN({ request } as APIEvent);

    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({
      error: "Coach sign-in is temporarily unavailable. Check the server configuration and try again.",
    });
  });

  it("returns a JSON validation error for malformed login input", async () => {
    const request = new Request("http://localhost/api/auth/coach-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });

    const response = await LOGIN({ request } as APIEvent);

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Enter your username and password." });
  });

  it("never includes credential secrets in a successful login response", async () => {
    process.env.MASTER_USERNAME = "admin";
    process.env.MASTER_DISPLAY_NAME = "Administrator";
    process.env.MASTER_PASSWORD = "private-password-one";
    const request = new Request("http://localhost/api/auth/coach-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "private-password-one" }),
    });

    const response = await LOGIN({ request } as APIEvent);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      coach: { id: "super-user", displayName: "Administrator", isSuperUser: true },
    });
  });

  it("creates and lists safe user records for the super-user flow", async () => {
    process.env.MASTER_USERNAME = "admin";
    process.env.MASTER_PASSWORD = "private-password-one";
    const loginResponse = await LOGIN({
      request: new Request("http://localhost/api/auth/coach-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "private-password-one" }),
      }),
    } as APIEvent);
    const cookie = loginResponse.headers.get("set-cookie");
    expect(cookie).toBeTruthy();

    const createResponse = await CREATE_USER({
      request: new Request("http://localhost/api/auth/users", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie ?? "" },
        body: JSON.stringify({
          username: "assistant",
          displayName: "Assistant Coach",
          password: "assistant-private-password",
        }),
      }),
    } as APIEvent);
    expect(createResponse.status).toBe(201);
    expect(JSON.stringify(await createResponse.json())).not.toContain("passwordHash");

    const listResponse = await GET_USERS({
      request: new Request("http://localhost/api/auth/users", {
        headers: { cookie: cookie ?? "" },
      }),
    } as APIEvent);
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual({
      users: expect.arrayContaining([
        expect.objectContaining({ username: "admin", isSuperUser: true }),
        expect.objectContaining({ username: "assistant", isSuperUser: false }),
      ]),
    });
  });
});
