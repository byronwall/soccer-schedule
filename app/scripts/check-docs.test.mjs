import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const sourceApp = resolve(repositoryRoot, "app");
const flowAvailable = spawnSync("sh", ["-lc", "command -v flow"]).status === 0;

describe("documentation gate", () => {
  it("checks an untracked Markdown file without entering the full gate", async () => {
    const fixture = await createFixture();
    try {
      await writeFile(join(fixture, "docs/notes.md"), "# Notes\n\n[Root](../README.md)\n", "utf8");
      const result = await runGate(fixture);
      expect(result.code).toBe(0);
      expect(result.output).toContain("Documentation-only gate");
      expect(result.output).not.toContain("full application gate");
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it.skipIf(!flowAvailable)(
    "checks flow-only changes without scanning Markdown or the application",
    async () => {
      const fixture = await createFixture();
      try {
        await writeFile(
          join(fixture, "docs/flows/new.diagram"),
          'diagram 1\ntype flow\n\ngraph fixture "Fixture"\n\nnode a process "A"\nnode b deliverable "B"\n\nedge a-to-b a -> b\n',
          "utf8",
        );
        const result = await runGate(fixture);
        expect(result.code).toBe(0);
        expect(result.output).toContain("Checked 1 diagram file.");
        expect(result.output).not.toContain("[format]");
      } finally {
        await rm(fixture, { recursive: true, force: true });
      }
    },
  );

  it("rejects a broken local Markdown link", async () => {
    const fixture = await createFixture();
    try {
      await writeFile(join(fixture, "docs/broken.md"), "[Missing](missing.md)\n", "utf8");
      const result = await runGate(fixture);
      expect(result.code).toBe(1);
      expect(result.output).toContain("Broken local Markdown links");
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });

  it.skipIf(!flowAvailable)("rejects an unknown Flow relation", async () => {
    const fixture = await createFixture();
    try {
      await writeFile(
        join(fixture, "docs/flows/invalid.diagram"),
        'diagram 1\ntype flow\ngraph invalid "Invalid"\nnode a process "A"\nedge bad a -> missing\n',
        "utf8",
      );
      const result = await runGate(fixture);
      expect(result.code).not.toBe(0);
      expect(result.output).toMatch(/unknown|missing|relation/i);
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  });
});

async function createFixture() {
  const fixture = await mkdtemp(join(tmpdir(), "soccer-docs-gate-"));
  await mkdir(join(fixture, "app/scripts"), { recursive: true });
  await mkdir(join(fixture, "docs/flows"), { recursive: true });
  for (const file of ["check-docs.ts", "format-files.mjs", "prettier-runtime.mjs"]) {
    await copyFile(join(sourceApp, "scripts", file), join(fixture, "app/scripts", file));
  }
  await copyFile(join(repositoryRoot, ".prettierrc.json"), join(fixture, ".prettierrc.json"));
  await copyFile(join(repositoryRoot, ".prettierignore"), join(fixture, ".prettierignore"));
  await writeFile(join(fixture, "README.md"), "# Fixture\n", "utf8");
  await writeFile(join(fixture, "docs/flows/README.md"), "# Flows\n\n## Source map\n", "utf8");
  await symlink(join(sourceApp, "node_modules"), join(fixture, "app/node_modules"), "dir");
  await runGit(fixture, ["init", "-q"]);
  await runGit(fixture, ["config", "user.email", "fixture@example.invalid"]);
  await runGit(fixture, ["config", "user.name", "Fixture"]);
  await runGit(fixture, ["add", "."]);
  await runGit(fixture, ["commit", "-qm", "baseline"]);
  return fixture;
}

async function runGate(fixture) {
  try {
    const result = await execFileAsync(
      process.execPath,
      ["--experimental-strip-types", join(fixture, "app/scripts/check-docs.ts")],
      { cwd: fixture, encoding: "utf8" },
    );
    return { code: 0, output: `${result.stdout}${result.stderr}` };
  } catch (error) {
    return {
      code: typeof error.code === "number" ? error.code : 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function runGit(cwd, args) {
  await execFileAsync("git", args, { cwd, encoding: "utf8" });
}
