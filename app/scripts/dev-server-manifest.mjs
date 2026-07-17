import { randomUUID } from "node:crypto";
import { rename, writeFile } from "node:fs/promises";
import { URL } from "node:url";

export const normalizeLocalServerUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (!["localhost", "127.0.0.1", "0.0.0.0", "[::1]"].includes(parsed.hostname)) {
      return null;
    }
    if (parsed.hostname === "0.0.0.0" || parsed.hostname === "[::1]") {
      parsed.hostname = "localhost";
    }
    return parsed.toString().replace(/\/$/u, "");
  } catch {
    return null;
  }
};

export const detectServerUrl = (line) => {
  if (!/\b(?:Local|Network):\s+/u.test(line)) return null;
  const urls = line.match(/https?:\/\/[^\s)]+/giu) ?? [];
  return urls.map(normalizeLocalServerUrl).find(Boolean) ?? null;
};

export const parsePort = (url) => {
  if (!url) return null;
  try {
    return new URL(url).port || null;
  } catch {
    return null;
  }
};

export const createRunningManifest = ({
  app,
  status,
  url,
  startedAt,
  updatedAt,
  repoRoot,
  appRoot,
  command,
  processDetails,
  environment,
  recentOutput,
}) => ({
  schemaVersion: 1,
  app,
  mode: "development",
  status,
  serverLikelyRunning: true,
  url,
  port: parsePort(url),
  startedAt: startedAt.toISOString(),
  stoppedAt: null,
  updatedAt,
  repoRoot,
  appRoot,
  command,
  process: processDetails,
  environment,
  exit: { code: null, signal: null },
  recentOutput,
});

export const createInactiveManifest = ({
  app,
  status,
  stoppedAt,
  updatedAt,
  repoRoot,
  appRoot,
  exitCode,
  exitSignal,
}) => ({
  schemaVersion: 1,
  app,
  mode: "development",
  status,
  serverLikelyRunning: false,
  url: null,
  port: null,
  startedAt: null,
  stoppedAt: stoppedAt?.toISOString() ?? null,
  updatedAt,
  repoRoot,
  appRoot,
  exit: { code: exitCode, signal: exitSignal },
  message: "The dev server is likely not running; this manifest does not advertise a server URL.",
});

export const writeManifestAtomic = async (manifestPath, payload) => {
  const temporaryPath = `${manifestPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`);
  await rename(temporaryPath, manifestPath);
};
