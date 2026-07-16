import { afterEach, describe, expect, it } from "vitest";
import {
  getAppBaseUrl,
  getConfiguredAppBaseUrl,
  isConfiguredAppBaseUrlSecure,
} from "./base-url";

const originalServiceUrl = process.env.SERVICE_URL_APP;
const originalAppBaseUrl = process.env.APP_BASE_URL;

afterEach(() => {
  restoreEnv("SERVICE_URL_APP", originalServiceUrl);
  restoreEnv("APP_BASE_URL", originalAppBaseUrl);
});

describe("application base URL resolution", () => {
  it("prefers the Coolify service URL and removes trailing slashes", () => {
    process.env.SERVICE_URL_APP = " https://starter.example/// ";
    process.env.APP_BASE_URL = "https://fallback.example";

    expect(getConfiguredAppBaseUrl()).toBe("https://starter.example");
    expect(isConfiguredAppBaseUrlSecure()).toBe(true);
  });

  it("uses APP_BASE_URL when no service URL is configured", () => {
    delete process.env.SERVICE_URL_APP;
    process.env.APP_BASE_URL = "http://starter.example/";

    expect(getConfiguredAppBaseUrl()).toBe("http://starter.example");
    expect(isConfiguredAppBaseUrlSecure()).toBe(false);
  });

  it("falls back to the request origin and then the local default", () => {
    delete process.env.SERVICE_URL_APP;
    delete process.env.APP_BASE_URL;

    expect(getAppBaseUrl(new Request("https://request.example/api/auth"))).toBe(
      "https://request.example",
    );
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });
});

function restoreEnv(name: "SERVICE_URL_APP" | "APP_BASE_URL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
