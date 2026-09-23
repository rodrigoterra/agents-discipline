---
name: codex-council
description: Install, check and run a Codex council of native subagents (a lead plus default, worker, explorer, fixer, reviewer and specialist roles) wired into the agents-discipline adversarial loop, with a blind Claude reviewer and a Claude process auditor. Use whenever the user mentions a Codex council, Codex subagents or agent roles, ~/.codex/agents, the [agents] table of config.toml, multi-agent Codex, a subagent workflow in AGENTS.md or /agents-council, or wants Codex to attack what Claude built (REVIEW mode) or to build something Claude then attacks (BUILD mode), even if they never say "council".
license: MIT
argument-hint: "[install | check | review | build] [spec or feature]"
---

# Codex Council

A council is one Codex lead that delegates to native subagent roles, plus two Claude seats
that sit outside Codex and keep it honest.

| Seat | Runs in | Job |
|------|---------|-----|
| lead | Codex | Plans, assigns file ownership, integrates, verifies |
| default | Codex | General-purpose fallback |
| worker | Codex | Substantial implementation (BUILD only) |
| explorer | Codex, read-only | Investigation |
| fixer | Codex | Small, bounded fixes (BUILD only) |
| reviewer | Codex, read-only | Independent review |
| specialist | Codex | Hard debugging, architecture, escalation |
| blind reviewer | Claude subagent `council-blind-reviewer` | Independent review that never sees Codex's findings |
| auditor | Claude subagent `council-auditor` | Audits how the council worked, from the run record only |

Models and efforts live in one place each: the roster in `assets/codex/AGENTS.council.md`
(checked against the role files) and the frontmatter of the plugin's `agents/council-*.md`.

**Why this skill exists.** The original setup guide drifted: its AGENTS.md block disagreed
with its own role files on 4 of 6 roles. Its roles also write code, while the agents-discipline
charter tells Codex never to fix. This skill keeps one roster (the role files) with a checker
that fails on drift, and runs the council in two explicit modes so the charter and the council
never give Codex contradictory orders.

**Where it runs.** Everything works in Claude Code. In Claude Desktop there is no shell into
`~/.codex` and no plugin subagents: produce the files and briefs for the user to apply, and say
plainly which steps were skipped.

Paths below are relative to this skill's folder (`${CLAUDE_SKILL_DIR}` in Claude Code).

---

## Step 0: Survey before asking

Collect facts first so the question in step 1 is informed. Report them as a short table.

- **Codex CLI:** `codex --version` (on PATH or not).
- **Global install:** `$CODEX_HOME` if set, else `~/.codex`. Look for `config.toml`,
  `agents/*.toml`, and the `<!-- codex-council:start -->` marker in `AGENTS.md`.
- **Project install:** `<repo>/.codex/agents/*.toml` and the marker in `<repo>/AGENTS.md`.
  A project install only works while Codex trusts the project (see `references/codex-config.md`).
- **agents-discipline files:** a reviewer charter in `AGENTS.md`, `specs/`, `INDEX.md`.
- **Claude seats:** whether `council-blind-reviewer` and `council-auditor` appear among your
  available agent types (usually as `agents-discipline:council-blind-reviewer` and
  `agents-discipline:council-auditor`).
- **Git:** current branch, base branch (`origin/main`, else `main`, else `master`), and
  whether the working tree is clean.

## Step 1: Ask what the user wants, every time

Ask even when the request seems to name a mode, and pre-select that mode as the
recommendation. The owner decided that the mode is a choice made in the moment: guessing wrong
means Codex either edits code it should only attack, or only comments on code it was meant to
build. Use AskUserQuestion when it is available, plain text otherwise.

1. **Install or update** the council.
2. **Check** the council for drift and mistakes.
3. **Council REVIEW:** Claude (or a person) built it, and the Codex council attacks it.
4. **Council BUILD:** the Codex council builds it, and Claude attacks it.

For 3 and 4, also ask which Claude seats to use (blind reviewer and auditor, both on by
default) and who runs Codex: Claude runs `codex exec` after showing the exact command, or the
user runs it.

---

## Install or update

**Target.** Global: `$CODEX_HOME` or `~/.codex` (`config.toml`, `agents/`, `AGENTS.md`).
Project: `<repo>/.codex/agents/`, an optional `<repo>/.codex/config.toml`, and
`<repo>/AGENTS.md`. Global is the default.

1. **Show before you write.** Present a diff of every file you will create or change, and
   apply only after a yes. This is the user's personal Codex setup; surprises there are costly.
2. **Back up `config.toml`** as `config.toml.bak-<YYYYMMDD-HHMMSS>` before changing it.
3. **Merge `assets/codex/config.fragment.toml`** into `config.toml`:
   - Put the top-level keys (`model`, `model_reasoning_effort`, `model_context_window`,
     `model_auto_compact_token_limit`) above the first `[table]` header. In TOML every key
     after a header belongs to that table, so a `model` line appended at the bottom silently
     becomes `agents.model` and never sets the lead.
   - If `[features]` or `[agents]` already exists, add the missing keys inside it. Never write
     a second header for the same table; TOML rejects the whole file.
   - When a value conflicts (for example an existing `model = "gpt-5.5"`), show both and ask.
     Never pick silently.
   - Keep the user's comments and unrelated settings exactly as they are.
   - `model_context_window` and `model_auto_compact_token_limit` are working settings, not
     claims about model capacity. Mention that they need adjusting for any replacement model.
4. **Role files.** Copy `assets/codex/agents/*.toml` into `<target>/agents/`. When a file
   exists and differs, write the new version next to it as `<name>.toml.proposed` and show
   the diff. Never name it `<name>.proposed.toml`: Codex loads every `.toml` in `agents/`,
   so that file would register a second role with the same name.
5. **AGENTS.md block.** Insert `assets/codex/AGENTS.council.md`, markers included. If the
   markers already exist, replace only what is between them, after showing the diff and
   pointing out any hand edits inside the old block. In a project `AGENTS.md`, place the block
   before `## Current Review Target` when that heading exists, so `/agents-review` keeps
   owning the last section; otherwise append it. Create the global `AGENTS.md` if missing.
6. **Custom roster.** If the user changed any role's model or effort, regenerate the matching
   row of the roster table from their role files. The role files are the source of truth.
7. **Check.** Run the checker (next section) and fix every ERROR before calling it done.
8. **Smoke test.** Codex loads roles only at startup, so ask the user to start a new Codex
   session and try:
   > Use an explorer to identify the main entry points without editing files. Announce its
   > model and responsibility, then summarize its findings and any uncertainty.

   Also ask Codex to list the available roles with their models. A role that shows Codex's
   built-in description instead of ours failed to load (usually a typo in its file), and
   Codex quietly fell back to the built-in role of the same name.

## Check

```bash
python3 "${CLAUDE_SKILL_DIR}/scripts/check_council.py"                                   # global install
python3 "${CLAUDE_SKILL_DIR}/scripts/check_council.py" --codex-home .codex --agents-md AGENTS.md  # project install
python3 "${CLAUDE_SKILL_DIR}/scripts/check_council.py" --bundled                         # the files in this skill
```

Exit code 1 means errors. Show every ERROR and WARN line in a table, explain each in plain
words, and propose a fix; apply it only after a yes. For roster drift, ask which side is right,
with the role file as the default answer.

---

## Council run (REVIEW or BUILD)

### Shared setup
1. Run the checker first. If it reports errors, stop and offer to fix the install; a broken
   roster makes every later step unreliable.
2. Create `<repo>/.council/<run-id>/` with a run ID like `20260923-1430-rate-limit`. On the
   first run in a repository, ask whether to add `.council/` to `.gitignore`.
3. Find the spec (`specs/<feature>.md`; ask when there are several or none) and copy its
   acceptance criteria word for word. They are the contract every seat attacks or builds to.
4. Start `run.md` from the template at the end of this section and append to it as you go:
   every command run, every seat spawned with the exact inputs it received, and anything
   unavailable or skipped. The auditor audits from this record, so a gap in it is a finding.

### REVIEW mode
1. **Diff.** `git diff <base>...HEAD > .council/<run-id>/diff.patch`. Ask whether uncommitted
   changes belong in the review; if so, append `git diff HEAD`. Copy the spec and the diff
   into `seat-inputs/`.
2. **Brief.** Fill `assets/briefs/review.md` into `brief.md`. The claim is one paragraph of
   what the builder says the change does.
3. **Launch both reviews in parallel,** so neither can see the other:
   - **Codex:** show this command, run it from the repository root after a yes, in the
     background (a council can take a while):
     `codex exec -s read-only -C <repo> -o .council/<run-id>/codex-report.md - < .council/<run-id>/brief.md`
     If the user prefers to run it, they paste the brief into an interactive `codex` session
     and save the lead's final message as `codex-report.md`.
   - **Blind reviewer:** spawn `council-blind-reviewer` with only the spec path,
     `seat-inputs/diff.patch` and the claim. Save its final message as `blind-review.md`.
4. **Consolidate** both into `REVIEW.md` (rules below).
5. **Triage.** Claude built the change, so Claude is the defender here, which is exactly why
   its judgment needs a check. For each finding propose fix, push back with evidence, or
   escalate, in the Triage column. A push-back is a proposal, not a verdict; the user decides.
6. **Audit.** Spawn `council-auditor` with only the run folder path. Save its final message
   as `AUDIT.md`.
7. **Present:** finding counts, BLOCKERs first, the audit verdict, and the decisions only the
   user can make.

### BUILD mode
1. **Plan with the user:** the outcome, constraints, an ownership table (writer, role, files)
   with separate files per writer, and the verification commands. Fill `assets/briefs/build.md`
   into `brief.md`.
2. **Start clean.** Ask to commit or stash local changes first, then record
   `git rev-parse HEAD` as the start commit in `run.md`, so the diff holds only the council's
   work.
3. **Codex:** show this command, run it from the repository root after a yes, in the
   background:
   `codex exec -s workspace-write -C <repo> -o .council/<run-id>/codex-report.md - < .council/<run-id>/brief.md`
4. **Diff.** `git diff <start> > .council/<run-id>/diff.patch`, then append new untracked
   files with `git ls-files --others --exclude-standard` and `git diff --no-index /dev/null <file>`
   for each. Copy the spec and the diff into `seat-inputs/`.
5. **Blind reviewer:** spawn `council-blind-reviewer` with the spec path,
   `seat-inputs/diff.patch`, and the outcome from the brief as the claim. Never pass it the
   Codex report; it reviews the change, not the council's account of it.
6. **Consolidate** the Codex reviewer's findings (from the report) and `blind-review.md` into
   `REVIEW.md`.
7. **Triage.** Codex built it, so for each finding ask the user to choose: a council fixer
   round, Claude fixes it, or accept the risk.
8. **Audit** and **present** as in REVIEW mode.

### Consolidation rules for REVIEW.md
Consolidation is where findings quietly disappear, so it follows fixed rules:
- Every finding from every source appears exactly once. Merge two only when they share the
  location and the defect, and list every source ID (`codex#3, claude#1`).
- Keep the highest severity. Never soften or drop a finding; if you think one is wrong, keep
  it and argue in the Triage column.
- Record disagreements, such as one source calling something a BLOCKER that the other passed.
- Layout: a header (mode, sources with their finding counts, consolidated count); a table
  `# | Severity | Location | Finding | Evidence or test | Source | Triage`; then
  "Disagreements", "Verification gaps", and "Decisions for you".

### run.md template
```markdown
# Council run <run-id>
- Mode: REVIEW | BUILD
- Started: <ISO 8601 time>
- Repository: <path>  Branch: <branch>  Base or start commit: <ref>
- Spec: <path or none>
- Roster: <lead and roles with model and effort, copied from the AGENTS.md roster>
- Claude seats: blind reviewer <on/off>, auditor <on/off>
- Codex command: <exact command, and who ran it>
- Blind reviewer inputs: <exact list>
- Unavailable or skipped: <none, or what and why>

## Events
- <time> <what happened>
```

---

## When something is missing
Never substitute silently. Say what is missing, what it affects, and what the user can do.

| Missing | What to do |
|---------|------------|
| Codex CLI | Write the brief anyway and give the user the exact command to run where Codex is installed. |
| A Claude seat (e.g. in Claude Desktop, or the plugin is not enabled) | Name the seat, then ask whether to continue without it or stop. Never run a general agent in its place and call it the seat; it would have the wrong model and write access. |
| A Codex role or model | Quote what Codex reported and point to the account's model list. Never change the role files to another model without asking. |
| Subagents in `codex exec` | If the report has no council log, rerun interactively with `codex` and paste the brief. |
| Python 3.11+ | The checker explains the fix (a newer Python, or `pip install tomli`). |

## Anti-patterns
- Letting a REVIEW session spawn `worker` or `fixer`.
- Passing Codex's findings to the blind reviewer "for context". That ends its independence.
- Giving the auditor the conversation or project instructions. It audits from the record.
- Editing the roster table by hand without changing the role file. The checker will fail.
- Declaring the loop finished. The user ends it.

## Files in this skill
- `assets/codex/config.fragment.toml` holds guide section 1: lead model, `[features]`, `[agents]`.
- `assets/codex/agents/*.toml` holds guide section 2: the six role files, verbatim.
- `assets/codex/AGENTS.council.md` holds guide section 3, with the roster table and the two modes.
- `assets/briefs/review.md` and `assets/briefs/build.md` are the lead's briefs.
- `scripts/check_council.py` is the standard-library checker.
- `references/codex-config.md` lists every verified Codex and Claude Code fact with its
  source, plus troubleshooting. Read it before changing a key or when Codex behaves unexpectedly.
