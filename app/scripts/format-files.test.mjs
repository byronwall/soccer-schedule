import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const script = resolve(scriptDirectory, "format-files.mjs");
const repoRoot = resolve(scriptDirectory, "../..");

describe("format-files explicit paths", () => {
  it("formats only a selected file when its path contains spaces", async () => {
    const fixtureRoot = await mkdtemp(join(repoRoot, "docs/format-files-"));
    const selected = join(fixtureRoot, "selected file.ts");
    const unrelated = join(fixtureRoot, "unrelated file.md");
    try {
      await writeFile(selected, "const value={a:1}", "utf8");
      await writeFile(unrelated, "# Unchanged\n", "utf8");
      await execFileAsync(process.execPath, [script, "--write", selected]);
      expect(await readFile(selected, "utf8")).toBe("const value = { a: 1 };\n");
      expect(await readFile(unrelated, "utf8")).toBe("# Unchanged\n");
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a path outside the checkout", async () => {
    await expect(
      execFileAsync(process.execPath, [script, "--check", join(tmpdir(), "outside.md")]),
    ).rejects.toMatchObject({ code: 1 });
  });
});
