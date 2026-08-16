import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { loadPrettier, prettierConfig, prettierIgnore, prettierRoot } from "./prettier-runtime.mjs";

const execFileAsync = promisify(execFile);
const prettier = loadPrettier();
const stagedFiles = await readStagedFiles();
const failures = [];

for (const filePath of stagedFiles) {
  const absolutePath = resolve(prettierRoot, filePath);
  const info = await prettier.getFileInfo(absolutePath, {
    ignorePath: prettierIgnore,
    withNodeModules: false,
  });
  if (info.ignored || !info.inferredParser) continue;

  const source = await readStagedBlob(filePath);
  const options = {
    ...((await prettier.resolveConfig(absolutePath, { config: prettierConfig })) ?? {}),
    filepath: absolutePath,
  };
  if (!(await prettier.check(source, options))) failures.push(filePath);
}

if (failures.length > 0) {
  console.error("[format:staged] These staged files are not formatted:");
  for (const filePath of failures) console.error(`  ${filePath}`);
  console.error("[format:staged] Run pnpm -C app format, then stage the changes.");
  process.exit(1);
}

console.log(`[format:staged] Checked ${stagedFiles.length} staged file(s).`);

async function readStagedFiles() {
  const { stdout } = await execFileAsync("git", [
    "diff",
    "--cached",
    "--name-status",
    "--diff-filter=ACMRTUXB",
    "-z",
  ]);
  const fields = stdout.split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      index += 1;
      paths.push(fields[index++]);
    } else {
      paths.push(fields[index++]);
    }
  }
  return paths;
}

async function readStagedBlob(filePath) {
  const { stdout } = await execFileAsync("git", ["show", `:${filePath}`], {
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.toString("utf8");
}
