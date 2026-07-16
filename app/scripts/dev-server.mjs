import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { hostname, platform, release } from "node:os";
import { basename, dirname, resolve } from "node:path";
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
const packageJson = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8"));
const appName = packageJson.name === "example-bare" ? basename(repoRoot) : packageJson.name;
const startedAt = new Date();
const recentOutput = [];
const command = { executable: "vinxi", args: ["dev"], display: "vinxi dev" };

let child;
let detectedUrl = process.env.SERVER_BASE_URL || null;
let status = "starting";
let finalized = false;
let forceKillTimer;
let writing = Promise.resolve();

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
  process.exit(processCode);
}
