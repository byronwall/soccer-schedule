# Repo Cleanse Checklist

Run from `/Users/byronwall/Projects/data-and-glyphs` unless noted.

## Baseline

```bash
git status --short
git log --oneline --grep='Cleanse-Sentinel: true' --all
```

If a sentinel exists:

```bash
git diff --name-status <sentinel>..HEAD
git diff --stat <sentinel>..HEAD
```

## Core Checks

Discovery pass:

```bash
pnpm -C app knip
pnpm -C app lint
pnpm -C app type-check
```

Automatic fix pass:

```bash
pnpm -C app knip --fix --fix-type dependencies,exports,types,catalog --format
pnpm -C app lint:fix
```

If `app/package.json` has a formatter script, run it before `lint:fix`:

```bash
pnpm -C app format
# or
pnpm -C app format:fix
```

Only after manual review of unused-file candidates:

```bash
pnpm -C app knip --fix --fix-type files --allow-remove-files --format
```

Final verification pass:

```bash
pnpm -C app knip
pnpm -C app lint
pnpm -C app type-check
pnpm -C app test
pnpm -C app build
```

Use `pnpm -C app install` first only when dependencies or the lockfile require it.

## Docs And Context Drift

Search for stale references:

```bash
rg -n "TODO|FIXME|HACK|deprecated|legacy|temporary|remove later|soon|old|obsolete" AGENTS.md app/src app/README.md app/AGENTS.MD app/.env.example
rg -n "pnpm|npm|yarn|bun|knip|eslint|tsc|vitest|vinxi|panda|OpenAI|AI SDK|model|gpt-" AGENTS.md app/src app/README.md app/AGENTS.MD app/.env.example
```

Compare docs against source-of-truth files:

- scripts and dependencies: `app/package.json`
- environment variables: `app/.env.example`
- routes: `app/src/routes/**`
- websocket setup: `app/app.config.ts`, `app/src/ws/**`
- generated style guidance: `app/panda.config.ts`, `app/src/theme/**`, `app/styled-system/**`
- repo agent guidance: `AGENTS.md`, `.agents/skills/**`

## Sentinel Commit

Only after cleanup changes are committed and the user wants a baseline:

```bash
git commit --allow-empty -m "chore(cleanse): sentinel YYYY-MM-DD" -m "Cleanse-Sentinel: true"
```

Do not create the sentinel before the cleanup commit, because future diffs should start after the cleanup state.
