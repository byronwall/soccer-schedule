---
name: post-work-doc-playbook
description: Create or update a detailed end-of-work report covering major implementation changes, design decisions, issues, verification, and process improvements. Use only when the user explicitly requests a work summary, completion report, retrospective, or postmortem; use the repository changelog workflow for ordinary completed work.
---

# Post-Work Doc Playbook

## Goal

Produce a complete implementation summary when the user explicitly requests one. Do not create a full retrospective automatically after ordinary implementation work.

For normal work, update the repository's `CHANGELOG.md` instead. Add a concise entry under `Unreleased` with the behavior changed, verification performed when notable, and an optional `Problem:` or `Follow-up:` sub-bullet. Do not create `CHANGELOG.md` inside the skill folder.

## Required Output

Write one documentation file that includes all sections below:

1. Scope and context
2. Major changes delivered
3. Design decisions and tradeoffs
4. Problems encountered and resolutions
5. Verification and validation
6. Process improvements
7. Agent/system prompt or skill improvements
8. Follow-ups and open risks

Use concrete evidence: file paths, commands run, notable before/after behavior, and constraints that shaped decisions.

If a section has no findings, explicitly say "None" and add a short reason.

## Workflow

### 1) Collect evidence

- Record `git status --short` before relying on diff output.
- Gather changed files from git diff and summarize by behavior impact.
- When changed targets are untracked, inspect those files directly and cite `git status --short`; never stage user-owned files merely to produce a diff.
- Capture key execution checks (type-check, tests, lint, manual checks).
- Capture user feedback and iteration points from the conversation.
- Capture rejected alternatives and why they were rejected.

### 2) Choose document target

- If the user specifies a location/name, use it.
- Otherwise create under `docs/` with a descriptive name such as:
  - `docs/<feature>-work-summary.md`
  - `docs/<feature>-implementation-retrospective.md`
- If the user did not explicitly request a full report, stop and use the repository changelog workflow instead.

### 3) Draft the document using the reference outline

- Start from `references/report-outline.md`.
- Keep the opening concise; prioritize decisions, issues, and outcomes.
- Prefer chronological detail only when it explains why a final design changed.

### 4) Capture process and agent improvements

Document improvements beyond code changes:

- Workflow/process improvements:
  - Better sequencing, checkpoints, or verification steps
  - Changes that reduced iteration churn
  - Review/test strategies that caught issues early
- Agent improvements:
  - Missing instructions that should be added to AGENTS or a skill
  - Prompting patterns that improved outcomes
  - Reusable heuristics discovered during implementation

For each improvement, include:

- Current pain/problem
- Proposed change
- Expected benefit
- Suggested owner/place to encode it (AGENTS, new skill, script, checklist)
- If the same recommendation already exists in `CHANGELOG.md`, update its evidence or status rather than adding a duplicate follow-up.

### 5) Run quality gate before finalizing

Use `references/quality-checklist.md` to verify:

- Coverage of all required sections
- Presence of concrete evidence
- Clarity on unresolved risks and follow-ups
- Explicit verification status (what was and was not run)

## Writing Standards

- Be precise and factual; avoid marketing language.
- Prefer behavior-level statements over implementation trivia.
- Use short headings and scannable bullets.
- Use absolute or workspace-relative file paths consistently.
- Include command names for verification steps.
- Keep claims defensible; avoid speculation without marking it as inference.

## Good Documentation Patterns

- Good: "Replaced tree connector rendering in `app/src/components/toc/TocExpandedPanel.tsx` with row background visible-state highlighting because connectors overlapped labels during nested depth rendering."
- Bad: "Improved TOC visuals."

- Good: "Locked panel height only during active search to prevent hover collapse; released lock when query cleared."
- Bad: "Fixed sizing bug."

## References

- Use `references/report-outline.md` when drafting the report structure.
- Use `references/quality-checklist.md` before finalizing.
