# Codex Council skill

- **Status:** draft
- **Owner:** rodrigoterra
- **Created:** 2026-09-23
- **Spec ID:** codex-council

## Why
Rodrigo's "Codex native subagent setup" guide defines a six-role Codex council (lead plus
`default`, `worker`, `explorer`, `fixer`, `reviewer`, `specialist`). Today it is a manual
copy-paste job, and the guide has drifted internally: its AGENTS.md workflow block disagrees
with its own role files on 4 of 6 roles. It also contradicts the agents-discipline adversarial
charter, which tells Codex "never fix, comment only", while the council has roles that write
code. A skill makes the setup repeatable, keeps the roster honest with a deterministic checker,
and plugs the council into the Claude and Codex adversarial loop in two explicit modes.

## Non-goals
- Proving that `gpt-6-astra` or `gpt-6-sol` exist on a given account. Only Codex can; the smoke
  test in the skill does it.
- Copying the owner's plugins, hooks, trust settings or account config (guide section 1).
- Rewording the role files' `developer_instructions`. They ship verbatim from the guide.
- Running Codex, or writing to `~/.codex`, without an explicit yes from the user.
- Fixing the pre-existing `codex review --branch` example in `/agents-review` (reported separately).

## Requirements
- [ ] **R1 Install.** Merge guide section 1 into `config.toml` without creating duplicate tables,
  write the six role files, and insert the council block into `AGENTS.md` between markers.
  Target is global `~/.codex` by default, or a project (`.codex/` plus the project `AGENTS.md`).
- [ ] **R2 Never overwrite.** A differing existing role file gets a sibling
  `<name>.toml.proposed`. Never `<name>.proposed.toml`: Codex loads every `.toml` in `agents/`,
  so that file would register a second role with the same name.
- [ ] **R3 One roster.** The role files are the source of truth. The AGENTS.md roster table is
  generated from them, and the checker fails when they drift.
- [ ] **R4 Ask every time.** Each invocation asks what the user wants now: install or update,
  check, council REVIEW, or council BUILD. A request that implies a mode pre-selects it but
  still asks.
- [ ] **R5 Blind Claude reviewer seat.** Claude Opus 5.5, effort `xhigh`, read-only tools. Sees
  only the spec and the diff, never the Codex findings, so it cannot anchor on them.
- [ ] **R6 Auditor seat.** Claude Fable 5.1, read-only tools, minimal context: only the run
  folder. Audits the council's process (not the code) and writes `AUDIT.md`.
- [ ] **R7 Audit trail.** Every council run writes `.council/<run-id>/` containing `run.md`,
  `brief.md`, `diff.patch`, `codex-report.md`, `blind-review.md`, `REVIEW.md` and `AUDIT.md`.
- [ ] **R8 Integration.** A `/agents-council` command, a council option inside `/agents-review`,
  and a Claude Desktop zip that carries the skill's bundled files.
- [ ] **R9 No silent substitution.** A missing Codex CLI, role, model, subagent type or seat is
  reported to the user, never quietly replaced.

## Design

| # | Decision | Alternatives | Why |
|---|----------|--------------|-----|
| D1 | Role files win the roster conflict | AGENTS.md block wins | Role files are what Codex executes; the guide says to sync the block to them. Owner decision, 2026-09-23. |
| D2 | Both modes, chosen per invocation | Review only; build only; keep separate | Owner decision, 2026-09-23. |
| D3 | Claude seats ship as plugin subagents | Ad hoc general-purpose agents with a model override | Only a subagent definition can pin the model, the effort and a read-only tool list. |
| D4 | The council block makes REVIEW the default and BUILD an explicit per-session exception; never push and never approve in both modes | Edit the adversarial charter template | Keeps the existing charter untouched and gives Codex one coherent rule set. |
| D5 | Checker uses the Python standard library only (`tomllib`, Python 3.11+) | tomlkit or other dependencies | Nothing to install. Clear message on older Python. |
| D6 | Keep `multi_agent` and `child_agents_md` verbatim, documented | Drop them | `multi_agent` is on by default anyway. `child_agents_md` could not be confirmed on current Codex, and an unknown feature key only logs a warning. |
| D7 | Run Codex as `codex exec -s <sandbox> -o <file> -` with the brief on stdin, only after the user confirms | Interactive `codex` only | Captures the lead's report for consolidation and audit. Interactive `codex` stays as the fallback. |
| D8 | Back up `config.toml` before merging, and place top-level keys above the first table header | Blind append | In TOML, a key appended after `[agents]` silently becomes part of `[agents]`. |

### Verified Codex facts this design relies on
Checked on 2026-09-23 against `openai/codex` (via Context7) and the official Codex subagents docs.

| Fact | Source |
|------|--------|
| `[agents]` accepts `enabled`, `max_concurrent_threads_per_session` (alias `max_threads`), `max_depth`, `default_subagent_model`, `default_subagent_reasoning_effort` | `codex-rs/config/src/config_toml.rs` |
| Role files load from `agents/*.toml` under `$CODEX_HOME`, `/etc/codex` and project `.codex/`, once at session start | `codex-rs/config/src/state.rs`, `codex-rs/core/src/config/mod.rs` |
| Role files need `name`, `description`, `developer_instructions`; `name` is the source of truth | learn.chatgpt.com/docs/agent-configuration/subagents |
| Role files reject unknown keys (`deny_unknown_fields`) | `codex-rs/agent-roles/src/agent_role_config.rs` |
| User roles resolve before the built-in `default`, `worker`, `explorer` | `codex-rs/core/src/agent/role.rs` |
| Efforts: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra`, `persistent` | `codex-rs/protocol/src/openai_models.rs` |
| `multi_agent` is stable and on by default; unknown feature keys log a warning | `codex-rs/features/src/lib.rs` |
| Project `.codex/config.toml` is loaded but disabled while the project is untrusted | `codex-rs/config/src/loader/mod.rs` |
| `codex exec` reads the prompt from stdin with `-`; supports `-s`, `-m`, `-c`, `-C`, `-o` | `codex-rs/exec/src/cli.rs`, `codex-rs/utils/cli/src/shared_options.rs` |
| AGENTS.md content is capped by `project_doc_max_bytes` (32 KiB default) | `codex-rs/core/src/agents_md.rs` |

### Verified Claude Code facts this design relies on
Checked on 2026-09-23 against the official Claude Code docs.

| Fact | Source |
|------|--------|
| Subagent `model` accepts aliases (`opus`, `fable`, ...) and full IDs such as `claude-opus-5-5` | code.claude.com/docs/en/sub-agents |
| Subagent `effort` accepts `low`, `medium`, `high`, `xhigh`, `max`, depending on the model (the plugins reference page lists only the first three, so treat `xhigh` as a small risk) | code.claude.com/docs/en/sub-agents, code.claude.com/docs/en/plugins-reference |
| `omitClaudeMd: true` starts a subagent without user, project and local CLAUDE.md or AGENTS.md (Claude Code v2.1.271+) | code.claude.com/docs/en/sub-agents |
| A non-fork subagent never receives the parent conversation, only its own prompt, the delegation message, CLAUDE.md files and a git status snapshot | code.claude.com/docs/en/sub-agents |
| Plugin `agents/` is scanned by default; a manifest `agents` field would replace that scan, so the manifest stays without it | code.claude.com/docs/en/plugins-reference |
| Plugin agents are namespaced `<plugin>:<name>`, e.g. `agents-discipline:council-auditor` | code.claude.com/docs/en/plugins-reference |
| Skills may use `${CLAUDE_SKILL_DIR}` to reach bundled files | code.claude.com/docs/en/skills |

### Assumptions (defaults unless the owner says otherwise)
- A1 The seats pin `claude-opus-5-5` (effort `xhigh`) and `claude-fable-5-1`. When a model is unavailable the skill reports it and asks; it never falls back silently.
- A2 The auditor uses `omitClaudeMd: true` and reads only the run folder, spot-checking cited `file:line` evidence at most.
- A3 Run folders live in `<project>/.council/<run-id>/`. The first run asks whether to add `.council/` to `.gitignore`.
- A4 Claude runs `codex exec` itself only after showing the exact command and getting a yes.
- A5 In BUILD mode the owner chooses what happens to Claude's findings: a council fixer round, Claude fixes, or accept the risk.
- A6 The Desktop zip covers install files and briefs. The Claude seats and running Codex need Claude Code; the skill says so when they are missing.

### Run flow
```
ask mode ─┬─ install/update ─► survey ─► propose diff ─► confirm ─► write ─► check ─► smoke test
          ├─ check ─────────► scripts/check_council.py ─► report
          ├─ REVIEW ─► run folder ─► Codex council (read-only roles) ┐
          │                        └► blind Claude reviewer ──────────┼► REVIEW.md ─► triage ─► auditor ─► user decides
          └─ BUILD ──► run folder ─► Codex council builds ─► diff ─► blind Claude reviewer ─► REVIEW.md ─► auditor ─► user decides
```

## Tasks
- [ ] T1 Bundle guide sections 1 to 3 as `skills/codex-council/assets/codex/`, with the roster table regenerated from the role files.
- [ ] T2 Write `scripts/check_council.py` (parse, required fields, allowed values, read-only policy, duplicate names, misplaced top-level keys, roster drift).
- [ ] T3 Write `tests/test_codex_council.py` (unittest): clean assets pass; each injected defect fails with a precise message.
- [ ] T4 Write `agents/council-blind-reviewer.md` and `agents/council-auditor.md`.
- [ ] T5 Write `skills/codex-council/SKILL.md` and `references/codex-config.md`.
- [ ] T6 Add `commands/agents-council.md`; add the council option to `commands/agents-review.md`.
- [ ] T7 Wire `plugin.json`, `marketplace.json` (1.0.0 to 1.1.0), `README.md`, the agents-discipline skill's command list, `scripts/build-desktop.sh`, `dist-desktop/`.
- [ ] T8 Run the skill-creator evals (with the skill against a baseline) if the owner wants them.

## Acceptance criteria
- [ ] Given the bundled assets, when the checker runs, then it reports 0 errors.
- [ ] Given a roster row whose effort differs from its role file, then the checker reports drift naming the role and the field.
- [ ] Given a role file with a misspelled key, then the checker warns and names the file and the key.
- [ ] Given two role files with the same `name`, then the checker errors.
- [ ] Given a role file without `developer_instructions`, then the checker errors.
- [ ] Given `model_reasoning_effort = "extreme"`, then the checker errors.
- [ ] Given a `config.toml` that defines `[agents]` twice, then the checker errors.
- [ ] Given `model = ...` appended below `[agents]`, then the checker errors and explains the TOML trap.
- [ ] Given `explorer` or `reviewer` without `sandbox_mode = "read-only"`, then the checker errors.
- [ ] Given `worker.proposed.toml` in `agents/`, then the checker errors (duplicate role); given `worker.toml.proposed`, it only warns (pending review).
- [ ] `plugin.json` and `marketplace.json` parse, share version 1.1.0, and every referenced path exists.
- [ ] Both Claude seat files declare `name`, `description`, `model` and a tool list with no write-capable tools; the blind reviewer declares effort `xhigh`.
- [ ] `dist-desktop/codex-council.zip` contains `codex-council/SKILL.md` plus its assets, references and scripts.

## Open questions
- Q: Does `codex exec` let the lead spawn subagents exactly like the interactive TUI?
  A: Expected (same core loop), not verified here because Codex is not installed in this
  environment. The skill falls back to interactive `codex` when the report shows no subagent
  announcements.
- Q: Is `child_agents_md` still a live feature key?
  A: Unconfirmed. If Codex logs `unknown feature key in config: child_agents_md`, delete the line.

## Adversarial review (Codex)
Things to specifically attack on review:
- Can Codex read the REVIEW/BUILD rule next to the "never fix" charter as a contradiction?
- Does the checker's known-key list raise false warnings for legitimate keys?
- Marker-based AGENTS.md refresh: duplicated markers, a missing end marker, user edits inside the block.
- Merge of an existing `config.toml`: comments, key order, conflicting values, a pre-existing `[agents]` table.
- Blindness of the blind reviewer: can any Codex output reach its prompt?
