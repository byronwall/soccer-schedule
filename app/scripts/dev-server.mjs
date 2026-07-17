import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { hostname, platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "node:timers";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import {
  createInactiveManifest,
  createRunningManifest,
  detectServerUrl,
  writeManifestAtomic,
} from "./dev-server-manifest.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, "..");
const repoRoot = resolve(appRoot, "..");
const manifestPath = resolve(repoRoot, "live-server-details.json");
const serverLockPath = resolve(repoRoot, "live-server.lock");
const serverLockOwnerPath = resolve(serverLockPath, "owner.json");
const packageJson = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8"));
const appName = packageJson.name;
const startedAt = new Date();
const recentOutput = [];
const command = { executable: "vinxi", args: ["dev"], display: "vinxi dev" };

let child;
let detectedUrl = process.env.SERVER_BASE_URL || null;
let status = "starting";
let finalized = false;
let forceKillTimer;
let writing = Promise.resolve();

const lockOwner = await acquireServerLock();
if (!lockOwner.acquired) {
  const location = lockOwner.url ? ` at ${lockOwner.url}` : "";
  process.stdout.write(
    `Coach Companion's shared dev server is already ${lockOwner.status}${location} (wrapper PID ${lockOwner.wrapperPid}). Reuse it instead of starting another server.\n`,
  );
  process.exit(0);
}

await writeCurrentManifest();

child = spawn(command.executable, command.args, {
  cwd: appRoot,
  env: process.env,
  stdio: ["inherit", "pipe", "pipe"],
});

status = "running";
await writeCurrentManifest();

const heartbeat = setInterval(() => void writeCurrentManifest(), 5_000);

child.stdout.on("data", (chunk) => recordOutput("stdout", chunk, process.stdout));
child.stderr.on("data", (chunk) => recordOutput("stderr", chunk, process.stderr));
child.once("error", (error) => {
  recordOutput("error", error.message, process.stderr);
  void finalize("error", null, null, 1);
});
child.once("exit", (code, signal) => {
  void finalize("likely-not-running", code, signal, code ?? (signal ? 1 : 0));
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => void stopChild(signal));
}

async function stopChild(signal) {
  if (finalized) return;
  if (status === "stopping") {
    child?.kill("SIGKILL");
    return;
  }
  status = "stopping";
  await writeCurrentManifest();
  child?.kill(signal);
  forceKillTimer = setTimeout(() => child?.kill("SIGKILL"), 5_000);
}

function recordOutput(stream, chunk, destination) {
  destination.write(chunk);
  const lines = stripVTControlCharacters(String(chunk))
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  for (const line of lines) {
    recentOutput.push({ at: new Date().toISOString(), stream, line });
    detectedUrl ||= detectServerUrl(line);
  }
  recentOutput.splice(0, Math.max(0, recentOutput.length - 40));
  void writeCurrentManifest();
}

function writeCurrentManifest() {
  writing = writing.catch(() => undefined).then(() => {
    const updatedAt = new Date().toISOString();
    return writeManifestAtomic(
      manifestPath,
      createRunningManifest({
        app: appName,
        status,
        url: detectedUrl,
        startedAt,
        updatedAt,
        repoRoot,
        appRoot,
        command,
        processDetails: {
          wrapperPid: process.pid,
          serverPid: child?.pid ?? null,
          node: process.version,
          platform: platform(),
          release: release(),
          hostname: hostname(),
        },
        environment: {
          NODE_ENV: process.env.NODE_ENV ?? null,
          BASE_PATH: process.env.BASE_PATH ?? null,
          SERVER_BASE_URL: process.env.SERVER_BASE_URL ?? null,
          APP_DATA_DIR: process.env.APP_DATA_DIR ?? null,
        },
        recentOutput,
      }),
    );
  });
  return writing;
}

async function acquireServerLock() {
  const advertised = await readAdvertisedServer();
  if (advertised?.alive) return { acquired: false, ...advertised };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await mkdir(serverLockPath);
      await writeFile(
        serverLockOwnerPath,
        `${JSON.stringify({ wrapperPid: process.pid, startedAt: startedAt.toISOString() }, null, 2)}\n`,
        "utf8",
      );
      return { acquired: true };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const existing = await readExistingServerOwner();
      if (existing?.alive) return { acquired: false, ...existing };
      await rm(serverLockPath, { recursive: true, force: true });
    }
  }
  throw new Error("Could not acquire the shared dev-server lock.");
}

async function readExistingServerOwner() {
  let owner;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    owner = await readFile(serverLockOwnerPath, "utf8")
      .then(JSON.parse)
      .catch(() => null);
    if (owner?.wrapperPid) break;
    await new Promise((resolveWait) => setTimeout(resolveWait, 25));
  }
  if (!owner?.wrapperPid) return null;

  const manifest = await readManifest();
  return {
    alive: isProcessAlive(owner.wrapperPid),
    wrapperPid: owner.wrapperPid,
    status: manifest?.status ?? "starting",
    url: manifest?.url ?? null,
  };
}

async function readAdvertisedServer() {
  const manifest = await readManifest();
  const wrapperPid = manifest?.process?.wrapperPid;
  if (!manifest?.serverLikelyRunning || !wrapperPid) return null;
  return {
    alive: isProcessAlive(wrapperPid),
    wrapperPid,
    status: manifest.status ?? "running",
    url: manifest.url ?? null,
  };
}

async function readManifest() {
  return readFile(manifestPath, "utf8")
    .then(JSON.parse)
    .catch(() => null);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

async function finalize(finalStatus, exitCode, exitSignal, processCode) {
  if (finalized) return;
  finalized = true;
  clearInterval(heartbeat);
  clearTimeout(forceKillTimer);
  const stoppedAt = new Date();
  writing = writing.catch(() => undefined).then(() =>
    writeManifestAtomic(
      manifestPath,
      createInactiveManifest({
        app: appName,
        status: finalStatus,
        stoppedAt,
        updatedAt: stoppedAt.toISOString(),
        repoRoot,
        appRoot,
        exitCode,
        exitSignal,
      }),
    ),
  );
  await writing;
  await rm(serverLockPath, { recursive: true, force: true });
  process.exit(processCode);
}
