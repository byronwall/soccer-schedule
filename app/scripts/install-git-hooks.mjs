import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const candidateRoot = resolve(appRoot, "..");

if (!existsSync(resolve(candidateRoot, ".git"))) {
  console.log("[hooks] Not a Git checkout; skipped hook setup.");
  process.exit(0);
}

try {
  const { stdout } = await execFileAsync("git", [
    "-C",
    candidateRoot,
    "rev-parse",
    "--show-toplevel",
  ]);
  const repoRoot = resolve(stdout.trim());
  if (repoRoot !== candidateRoot) {
    console.log("[hooks] Git root differs from this checkout; skipped hook setup.");
    process.exit(0);
  }
  await execFileAsync("git", ["-C", repoRoot, "config", "core.hooksPath", ".githooks"]);
  console.log(`[hooks] Configured ${repoRoot}/.githooks as core.hooksPath.`);
} catch (error) {
  console.warn(`[hooks] Could not configure hooks: ${error.message}`);
}
