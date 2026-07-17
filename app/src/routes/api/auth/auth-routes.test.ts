import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { POST } from "./coach-login";
import { GET } from "./coaches";

const configuredCredentials = process.env.COACH_CREDENTIALS_JSON;
const configuredDataDirectory = process.env.APP_DATA_DIR;
let dataDirectory = "";

beforeAll(async () => {
  dataDirectory = await mkdtemp(path.join(tmpdir(), "coach-auth-routes-test-"));
  process.env.APP_DATA_DIR = dataDirectory;
});

afterAll(async () => {
  if (configuredDataDirectory === undefined) delete process.env.APP_DATA_DIR;
  else process.env.APP_DATA_DIR = configuredDataDirectory;
  await rm(dataDirectory, { recursive: true, force: true });
});

afterEach(() => {
  if (configuredCredentials === undefined) delete process.env.COACH_CREDENTIALS_JSON;
  else process.env.COACH_CREDENTIALS_JSON = configuredCredentials;
});

describe("coach auth API", () => {
  it("returns a JSON service error when credentials are not configured", async () => {
    delete process.env.COACH_CREDENTIALS_JSON;

    const response = GET();

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

    const response = await POST({ request } as APIEvent);

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Enter your coach and password." });
  });

  it("never includes credential secrets in a successful login response", async () => {
    process.env.COACH_CREDENTIALS_JSON = JSON.stringify([
      { id: "coach-one", displayName: "Coach One", password: "private-password-one" },
      { id: "coach-two", displayName: "Coach Two", password: "private-password-two" },
    ]);
    const request = new Request("http://localhost/api/auth/coach-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coachId: "coach-one", password: "private-password-one" }),
    });

    const response = await POST({ request } as APIEvent);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      coach: { id: "coach-one", displayName: "Coach One" },
    });
  });
});
