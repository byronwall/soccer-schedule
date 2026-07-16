---
name: repo-clean-up
description: Run a repository cleanse to find dead code, bad code, stale docs, obsolete files, dependency drift, and post-cleanup sentinel baselines. Use when Codex is asked to clean up, cleanse, audit unused code, run Knip/lint/type-check/test/build quality gates, identify outdated documentation, or establish a commit baseline for future cleanup passes.
---

# Repo Clean Up

Use this skill to run an evidence-first cleanup pass. The goal is to identify code and documentation that can be removed, fixed, or refreshed without guessing.

## Workflow

1. Protect user work:
   - Run `git status --short`.
   - Do not revert unrelated changes.
   - Note uncommitted files that may affect findings.

2. Find the prior cleanse baseline:
   - Run `git log --oneline --grep='Cleanse-Sentinel: true' --all`.
   - If present, use the newest matching commit as the baseline for "new since last cleanse" checks.
   - If absent, treat this as the first cleanse and inspect the whole repo.

3. Run automated checks from the repo root:
   - Prefer `scripts/run-cleanse.sh` if present.
   - Otherwise run the commands listed in `references/checklist.md`.
   - Capture exit codes and summarize findings; do not paste huge logs unless requested.

4. Apply automatic fixes before manual cleanup:
   - Run a discovery pass first: `pnpm -C app knip`, `pnpm -C app lint`, and `pnpm -C app type-check`.
   - Run safe Knip fixes next: `pnpm -C app knip --fix --fix-type dependencies,exports,types,catalog --format`.
   - Do not allow file deletion by default. Use `pnpm -C app knip --fix --fix-type files --allow-remove-files --format` only after reviewing unused-file candidates and confirming they are not framework entrypoints, dynamic imports, registry-driven components, docs examples, or intentionally available assets.
   - Run formatting next if a local format script/tool exists. Prefer the repo script (`pnpm -C app format` or `pnpm -C app format:fix`) when present; otherwise do not invent a formatter.
   - Run ESLint auto-fix after Knip and formatting: `pnpm -C app lint:fix`.
   - Re-run `pnpm -C app panda codegen` if fixes touched Panda theme/config files or generated style types are stale.
   - Finish with the verification pass: `pnpm -C app knip`, `pnpm -C app lint`, `pnpm -C app type-check`, `pnpm -C app test`, and `pnpm -C app build`.

5. Inspect dead-code findings:
   - Treat Knip unused files/exports/types as candidates, not automatic deletions.
   - Check route entrypoints, dynamic imports, generated registries, docs examples, and framework conventions before recommending removal.
   - For this repo, `app/src/components/ui/**` is intentionally available on demand and should stay excluded from Knip cleanup decisions.

6. Inspect stale docs:
   - Compare docs and agent guidance against current files, package scripts, configs, env examples, and routes.
   - Search for likely drift terms: removed filenames, old scripts, obsolete model names, TODO/FIXME/HACK, "deprecated", "legacy", "temporary", "soon", and dates.
   - When docs reference external APIs or package behavior that may have changed, verify with official/current sources before editing.

7. Produce a cleanup plan or patch:
   - Start with high-confidence removals/fixes.
   - Keep compatibility shims only when a real consumer exists.
   - Update tests/docs alongside removals.
   - Re-run the relevant checks after edits.

8. Create or recommend the sentinel baseline:
   - After the cleanup is committed, create an empty sentinel commit only if the user asks to commit:
     `git commit --allow-empty -m "chore(cleanse): sentinel YYYY-MM-DD" -m "Cleanse-Sentinel: true"`
   - Future cleanse passes use this sentinel to focus on files and docs added or changed since the baseline:
     `git diff --name-status <sentinel>..HEAD`

## Output

Report:

- baseline commit or "none"
- commands run and pass/fail status
- counts by category: unused files, unused deps, unlisted deps, unused exports/types, lint, type, test, build, docs drift
- recommended fixes grouped by confidence
- any checks skipped and why
- whether a sentinel commit was created or recommended

Keep the report concise. Link important local files with absolute paths.
