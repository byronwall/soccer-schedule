import { spawn } from "node:child_process";
import { platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executableSuffix = platform() === "win32" ? ".cmd" : "";
const checks = [
  ["Prettier", "scripts/format-files.mjs", ["--check"]],
  ["TypeScript", "tsc", ["--noEmit"]],
  ["Vitest", "vitest", ["run"]],
  ["ESLint", "eslint", ["."]],
];

for (const [label, executable, args] of checks) {
  process.stdout.write(`\n[verify] ${label}\n`);
  const code = executable.endsWith(".mjs")
    ? await runNodeScript(executable, args)
    : await runLocalBinary(executable, args);
  if (code !== 0) process.exit(code);
}

process.stdout.write("\n[verify] All checks passed.\n");

function runNodeScript(script, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [resolve(appRoot, script), ...args], {
      cwd: appRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        process.stderr.write(`[verify] ${script} stopped by ${signal}.\n`);
        resolveRun(1);
        return;
      }
      resolveRun(code ?? 1);
    });
  });
}

function runLocalBinary(executable, args) {
  const binary = resolve(appRoot, "node_modules", ".bin", `${executable}${executableSuffix}`);
  return new Promise((resolveRun, reject) => {
    const child = spawn(binary, args, { cwd: appRoot, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        process.stderr.write(`[verify] ${executable} stopped by ${signal}.\n`);
        resolveRun(1);
        return;
      }
      resolveRun(code ?? 1);
    });
  });
}
