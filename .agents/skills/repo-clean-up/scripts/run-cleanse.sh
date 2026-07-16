#!/usr/bin/env bash
set -u

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$root" || exit 1

run() {
  local name="$1"
  shift
  printf '\n## %s\n' "$name"
  printf '$'
  printf ' %q' "$@"
  printf '\n'
  "$@"
  local status=$?
  printf '\n[%s] exit=%s\n' "$name" "$status"
  return 0
}

sentinel="$(git log --format='%H %s' --grep='Cleanse-Sentinel: true' --all -n 1 | awk '{print $1}')"
doc_paths=(AGENTS.md)

for candidate in README.md docs app/src app/README.md app/AGENTS.MD app/.env.example; do
  if [[ -e "$candidate" ]]; then
    doc_paths+=("$candidate")
  fi
done

printf 'Repo: %s\n' "$root"
printf 'Sentinel: %s\n' "${sentinel:-none}"

run "git status" git status --short
run "sentinel log" git log --oneline --grep='Cleanse-Sentinel: true' --all -n 5

if [[ -n "${sentinel:-}" ]]; then
  run "changes since sentinel" git diff --name-status "$sentinel"..HEAD
  run "diff stat since sentinel" git diff --stat "$sentinel"..HEAD
fi

run "knip discovery" pnpm -C app knip
run "lint discovery" pnpm -C app lint
run "type-check discovery" pnpm -C app type-check

run "knip safe fix" pnpm -C app knip --fix --fix-type dependencies,exports,types,catalog --format

if pnpm -C app run | grep -Eq '^  format(:fix)?$'; then
  if pnpm -C app run | grep -Eq '^  format:fix$'; then
    run "format fix" pnpm -C app format:fix
  else
    run "format" pnpm -C app format
  fi
else
  printf '\n## format\nNo package format script found; skipping.\n'
fi

run "eslint fix" pnpm -C app lint:fix

run "knip verification" pnpm -C app knip
run "lint verification" pnpm -C app lint
run "type-check verification" pnpm -C app type-check
run "test" pnpm -C app test
run "build" pnpm -C app build

run "stale docs terms" rg -n "TODO|FIXME|HACK|deprecated|legacy|temporary|remove later|soon|old|obsolete" "${doc_paths[@]}"
run "tooling docs terms" rg -n "pnpm|npm|yarn|bun|knip|eslint|tsc|vitest|vinxi|panda|OpenAI|AI SDK|model|gpt-" "${doc_paths[@]}"
