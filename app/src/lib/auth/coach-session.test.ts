import type { APIEvent } from "@solidjs/start/server";
import { describe, expect, it } from "vitest";
import { coachForRequest, DEVELOPMENT_COACH } from "./coach-session";

const eventWithoutSession = {
  request: new Request("http://localhost/api/soccer"),
} as APIEvent;

describe("coach session environment policy", () => {
  it("provides a synthetic coach in development", async () => {
    await expect(coachForRequest(eventWithoutSession, true)).resolves.toEqual(DEVELOPMENT_COACH);
  });

  it("requires a real session outside development", async () => {
    await expect(coachForRequest(eventWithoutSession, false)).resolves.toBeNull();
  });
});
