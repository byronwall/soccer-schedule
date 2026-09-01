import { readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPrettier, prettierConfig, prettierIgnore, prettierRoot } from "./prettier-runtime.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
const rawRequestedPaths = process.argv.slice(3);
const requestedPaths =
  rawRequestedPaths[0] === "--" ? rawRequestedPaths.slice(1) : rawRequestedPaths;
if (mode !== "--write" && mode !== "--check") {
  console.error("Usage: node scripts/format-files.mjs --write|--check [file ...]");
  process.exit(2);
}

if (requestedPaths.includes("--")) {
  console.error("Usage: node scripts/format-files.mjs --write|--check [file ...]");
  process.exit(2);
}

const prettier = loadPrettier();
const files = await collectFiles(requestedPaths);
let changed = 0;

for (const filePath of files) {
  const info = await prettier.getFileInfo(filePath, {
    ignorePath: prettierIgnore,
    withNodeModules: false,
  });
  if (info.ignored || !info.inferredParser) continue;

  const source = await readFile(filePath, "utf8");
  const options = {
    ...((await prettier.resolveConfig(filePath, { config: prettierConfig })) ?? {}),
    filepath: filePath,
  };
  const formatted = await prettier.format(source, options);
  if (formatted === source) continue;

  changed += 1;
  const displayPath = relative(prettierRoot, filePath);
  if (mode === "--check") {
    console.error(`[format] ${displayPath}`);
  } else {
    await writeFile(filePath, formatted);
    console.log(`[format] ${displayPath}`);
  }
}

if (mode === "--check" && changed > 0) {
  console.error(`\n[format] ${changed} file(s) need formatting. Run pnpm -C app format.`);
  process.exit(1);
}

console.log(
  `[format] ${mode === "--write" ? "Formatted" : "Checked"} ${files.length} candidate file(s).`,
);

async function collectFiles(paths) {
  if (paths.length > 0) return collectRequestedFiles(paths);

  const roots = [prettierRoot, resolve(prettierRoot, "docs"), appRoot];
  const files = new Set();
  for (const root of roots) {
    await walk(root, files);
  }
  return [...files].sort();
}

async function collectRequestedFiles(paths) {
  const files = new Set();
  for (const requestedPath of paths) {
    const filePath = await resolveRequestedPath(requestedPath);
    const details = await stat(filePath);
    if (details.isDirectory()) {
      await walk(filePath, files);
    } else if (details.isFile()) {
      files.add(filePath);
    } else {
      throw new Error(`[format] Unsupported path: ${requestedPath}`);
    }
  }
  return [...files].sort();
}

async function resolveRequestedPath(requestedPath) {
  const candidate = resolve(process.cwd(), requestedPath);
  const rootCandidate = resolve(prettierRoot, requestedPath);
  const filePath = (await existingPath(candidate)) ? candidate : rootCandidate;
  const canonicalRoot = await realpath(prettierRoot);
  const canonicalPath = await realpath(filePath).catch(() => filePath);
  const pathFromRoot = relative(canonicalRoot, canonicalPath);
  if (pathFromRoot === "" || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`)) {
    throw new Error(`[format] Refusing path outside the checkout: ${requestedPath}`);
  }
  return filePath;
}

async function existingPath(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDirectory(filePath, entry.name)) continue;
      await walk(filePath, files);
    } else if (entry.isFile() && extname(entry.name) !== ".lock") {
      files.add(filePath);
    }
  }
}

function shouldSkipDirectory(filePath, name) {
  if (
    [
      ".agents",
      ".codex",
      ".git",
      ".output",
      ".pnpm-store",
      ".vinxi",
      "data",
      "node_modules",
      "styled-system",
      "tmp",
      ".vite",
    ].includes(name)
  ) {
    return true;
  }
  const pathFromRoot = relative(prettierRoot, filePath);
  return pathFromRoot === "app/.output" || pathFromRoot === "app/.vinxi";
}
