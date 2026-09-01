import { execFile, spawn } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import { promisify } from "node:util";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "..");
const changedPaths = await readChangedPaths();

if (changedPaths.length === 0) {
  console.log("[docs] No changed files. Documentation gate passed.");
  process.exit(0);
}

const unknownPaths = changedPaths.filter((filePath) => !isDocumentationPath(filePath));
const existingMarkdown = await existingFiles(
  changedPaths.filter((filePath) => isMarkdown(filePath)),
);
const existingFlows = await existingFiles(changedPaths.filter((filePath) => isFlow(filePath)));

if (unknownPaths.length > 0) {
  console.log("[docs] Mixed or uncertain changes detected; running the full application gate.");
  for (const filePath of unknownPaths) console.log(`[docs] Full gate includes ${filePath}`);
  await runDocumentationChecks(existingMarkdown, existingFlows);
  process.exit(await runNodeScript(resolve(appRoot, "scripts/verify.mjs")));
}

console.log(`[docs] Documentation-only gate: ${changedPaths.length} changed file(s).`);
await runDocumentationChecks(existingMarkdown, existingFlows);

console.log("[docs] Documentation gate passed.");

async function runDocumentationChecks(markdownFiles: string[], flowFiles: string[]) {
  if (markdownFiles.length > 0) {
    await runCheck(
      process.execPath,
      [resolve(appRoot, "scripts/format-files.mjs"), "--check", ...markdownFiles],
      "Markdown formatting",
    );
    await checkMarkdownLinks(markdownFiles);
  }
  if (flowFiles.length > 0) {
    await checkFlowIndex();
    const flow = await findFlowExecutable();
    await runCheck(flow, ["format", "--check", ...flowFiles], "Flow formatting");
    await runCheck(flow, ["check", ...flowFiles], "Flow structure");
  }
}

function isDocumentationPath(filePath: string) {
  return isMarkdown(filePath) || isFlow(filePath);
}

function isMarkdown(filePath: string) {
  return extname(filePath).toLowerCase() === ".md";
}

function isFlow(filePath: string) {
  return extname(filePath).toLowerCase() === ".diagram";
}

async function readChangedPaths() {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--short", "--untracked-files=all", "-z"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  const fields = stdout.split("\0").filter(Boolean);
  const paths: string[] = [];
  for (let index = 0; index < fields.length; ) {
    const record = fields[index++];
    const status = record.slice(0, 2);
    const path = record.slice(3);
    if (path) paths.push(path);
    if (status.includes("R") || status.includes("C")) {
      const destination = fields[index++];
      if (destination) paths.push(destination);
    }
  }
  return [...new Set(paths)].sort();
}

async function existingFiles(paths: string[]) {
  const result: string[] = [];
  for (const filePath of paths) {
    const absolutePath = resolveInsideRepo(filePath);
    try {
      const details = await stat(absolutePath);
      if (details.isFile()) result.push(absolutePath);
    } catch {
      // Deleted documentation remains part of change classification, but has no content to check.
    }
  }
  return result;
}

function resolveInsideRepo(filePath: string) {
  const absolutePath = resolve(repoRoot, filePath);
  const pathFromRoot = relative(repoRoot, absolutePath);
  if (
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    pathFromRoot.includes(`${sep}.git${sep}`)
  ) {
    throw new Error(`[docs] Refusing path outside the checkout: ${filePath}`);
  }
  return absolutePath;
}

async function checkMarkdownLinks(files: string[]) {
  const failures: string[] = [];
  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    for (const target of markdownTargets(source)) {
      if (isExternalTarget(target)) continue;
      const localTarget = decodeTarget(target);
      if (!localTarget) continue;
      const absoluteTarget = resolve(dirname(filePath), localTarget);
      const pathFromRoot = relative(repoRoot, absoluteTarget);
      if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
        failures.push(`${displayPath(filePath)} -> ${target} (outside checkout)`);
        continue;
      }
      try {
        await access(absoluteTarget);
      } catch {
        failures.push(`${displayPath(filePath)} -> ${target}`);
      }
    }
  }
  if (failures.length > 0) {
    console.error("[docs] Broken local Markdown links:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
}

async function checkFlowIndex() {
  const indexPath = resolve(repoRoot, "docs/flows/README.md");
  try {
    const source = await readFile(indexPath, "utf8");
    if (!source.includes("## Source map")) {
      console.error("[docs] docs/flows/README.md must retain its Source map section.");
      process.exit(1);
    }
  } catch {
    console.error("[docs] Flow changes require docs/flows/README.md as the navigation index.");
    process.exit(1);
  }
}

function markdownTargets(source: string) {
  const targets: string[] = [];
  const linkPattern = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g;
  for (const match of source.matchAll(linkPattern)) {
    const rawTarget = match[1];
    targets.push(rawTarget.startsWith("<") ? rawTarget.slice(1, -1) : rawTarget);
  }
  return targets;
}

function isExternalTarget(target: string) {
  return /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target);
}

function decodeTarget(target: string) {
  const withoutFragment = target.split("#", 1)[0];
  if (!withoutFragment) return "";
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

async function findFlowExecutable() {
  try {
    const { stdout } = await execFileAsync("sh", ["-lc", "command -v flow"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const executable = stdout.trim();
    if (executable) return executable;
  } catch {
    // Report a useful failure below instead of relying on shell lookup in the check.
  }
  throw new Error(
    "[docs] Flow CLI not found. Install or expose the Flow CLI, then rerun the gate.",
  );
}

async function runCheck(executable: string, args: string[], label: string) {
  const code = await runProcess(executable, args);
  if (code !== 0) {
    console.error(`[docs] ${label} failed.`);
    process.exit(code);
  }
}

async function runNodeScript(script: string) {
  return runProcess(process.execPath, [script]);
}

function runProcess(executable: string, args: string[]) {
  return new Promise<number>((resolveProcess) => {
    const child = spawn(executable, args, {
      cwd: repoRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      console.error(`[docs] Could not start ${executable}: ${error.message}`);
      resolveProcess(1);
    });
    child.once("exit", (code, signal) => resolveProcess(signal ? 1 : code ?? 1));
  });
}

function displayPath(filePath: string) {
  return relative(repoRoot, filePath);
}
