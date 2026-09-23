# Codex council: verified configuration facts

Checked on 2026-09-23. Codex sources are files in the official `openai/codex` repository
(read through Context7) and the official Codex subagents documentation. Claude Code sources are
the official Claude Code documentation. Re-check before relying on anything here for a Codex or
Claude Code version much newer than that date.

## Contents
1. Codex settings used by the council
2. How Codex finds and applies roles
3. Config layers, trust and restarts
4. Running a council from the command line
5. Claude Code seats
6. Troubleshooting

## 1. Codex settings used by the council

| Setting | Status | Source |
|---------|--------|--------|
| Top-level `model`, `model_reasoning_effort` | Valid; sets the lead | `codex-rs/config/src/config_toml.rs` |
| `model_context_window`, `model_auto_compact_token_limit` | Valid integers; when unset, the model's catalog values apply. Working settings, not capacity claims | `codex-rs/core/src/config/mod.rs` |
| `[features] multi_agent` | Valid, stable, **on by default**; the line is explicit rather than required | `codex-rs/features/src/lib.rs` |
| `[features] child_agents_md` | **Unconfirmed.** It existed (renamed from `hierarchical_agents`) but was absent from the current feature list checked. Unknown feature keys only log `unknown feature key in config`; delete the line if you see that | github.com/openai/codex commit b0b0c81; `codex-rs/features/src/lib.rs` |
| `[agents] enabled`, `max_concurrent_threads_per_session` (alias `max_threads`), `max_depth`, `default_subagent_model`, `default_subagent_reasoning_effort` | Valid. Other keys: `job_max_runtime_seconds`, `interrupt_message` | `codex-rs/config/src/config_toml.rs` |
| `[agents.<role>]` tables with `description`, `config_file`, `nickname_candidates` | Valid alternative way to declare roles; the council uses standalone files instead | `codex-rs/config/src/config_toml.rs` |
| Reasoning efforts | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, `max`, `ultra`, `persistent`. Availability depends on the model | `codex-rs/protocol/src/openai_models.rs` |
| `sandbox_mode` | `read-only`, `workspace-write`, `danger-full-access` | `codex-rs/protocol/src/config_types.rs` |

`max_concurrent_threads_per_session` is the saved setting; the effective limit can differ by
client. `max_depth = 2` allows bounded nesting, but the council's instructions forbid further
delegation unless the lead assigns it.

## 2. How Codex finds and applies roles

- Standalone role files live in `agents/*.toml` under `$CODEX_HOME` (usually `~/.codex`),
  under `/etc/codex`, and under a project's `.codex/`. Every `.toml` there is loaded.
  Source: `codex-rs/config/src/state.rs`; learn.chatgpt.com/docs/agent-configuration/subagents.
- Each file must define `name`, `description` and `developer_instructions`. `name` is the
  source of truth; matching the file name is only a convention. Source: the subagents docs.
- Role files reject unknown keys (`deny_unknown_fields`). One typo makes the role unusable.
  Source: `codex-rs/agent-roles/src/agent_role_config.rs`.
- User roles are resolved before the built-in `default`, `worker` and `explorer`, so the
  council's files replace them. If one of those three files fails to load, Codex falls back to
  its built-in role of the same name, which is easy to miss. Source:
  `codex-rs/core/src/agent/role.rs`.
- Model and effort resolution: a value in the role file wins. Otherwise Codex uses the spawn
  request, then the `[agents]` default, then the parent's value. Settings the file omits, such
  as `sandbox_mode`, are inherited from the parent session. So in a `codex exec -s read-only`
  session every role without its own `sandbox_mode` is read-only too. Source: the subagents docs.

## 3. Config layers, trust and restarts

- Precedence, lowest to highest: system (`/etc/codex/config.toml`), user
  (`$CODEX_HOME/config.toml`), profile, project (`.codex/config.toml` found from the working
  directory up to the repository root), then runtime flags such as `-c key=value`.
  Source: `codex-rs/config/src/loader/mod.rs`.
- Project layers are **loaded but disabled while the project is untrusted**. Trust a project
  by accepting Codex's prompt, or in the user config:
  ```toml
  [projects."/absolute/path/to/repo"]
  trust_level = "trusted"
  ```
  Source: `codex-rs/config/src/loader/mod.rs`, `codex-rs/core/src/config/mod.rs`.
- Roles load once, when a session starts. Start a new session after any change.
  Source: `codex-rs/core/src/config/mod.rs`.
- Codex concatenates AGENTS.md files from the project root down to the working directory and
  caps them at `project_doc_max_bytes` (32 KiB by default). Keep the council block lean.
  Source: `codex-rs/core/src/agents_md.rs`.
- TOML itself: every key after a `[table]` header belongs to that table until the next header,
  and defining the same table twice is an error that invalidates the whole file.

## 4. Running a council from the command line

`codex exec [OPTIONS] [PROMPT]` runs without the interactive interface. With `-` (or no
prompt), it reads the prompt from stdin. Useful options:

| Option | Meaning |
|--------|---------|
| `-s, --sandbox read-only / workspace-write` | Sandbox for commands the agents run |
| `-C, --cd DIR` | Working root |
| `-m, --model MODEL` | Override the lead model for this run |
| `-c, --config key=value` | One-off config override |
| `-o, --output-last-message FILE` | Save the lead's final message (the council report) |
| `--json` | Stream events as JSON lines |

Source: `codex-rs/exec/src/cli.rs`, `codex-rs/utils/cli/src/shared_options.rs`.
`codex exec review --base BRANCH` also exists, but it cannot take a custom prompt together with
`--base`, so council runs use plain `codex exec` with the brief.

## 5. Claude Code seats

| Fact | Source |
|------|--------|
| Subagent `model` accepts aliases (`opus`, `sonnet`, `haiku`, `fable`, `inherit`) and full IDs such as `claude-opus-5-5` | code.claude.com/docs/en/sub-agents |
| `effort` accepts `low`, `medium`, `high`, `xhigh`, `max`, depending on the model. The plugins reference lists fewer values, so `xhigh` carries a small risk | code.claude.com/docs/en/sub-agents; code.claude.com/docs/en/plugins-reference |
| `tools` is an allowlist; `Read, Grep, Glob` makes a seat read-only | code.claude.com/docs/en/sub-agents |
| `omitClaudeMd: true` starts a subagent without user, project and local CLAUDE.md or AGENTS.md (Claude Code v2.1.271+) | code.claude.com/docs/en/sub-agents |
| A non-fork subagent never receives the parent conversation | code.claude.com/docs/en/sub-agents |
| Plugin agents load from `agents/` and are named `<plugin>:<name>`; a manifest `agents` field would replace that folder | code.claude.com/docs/en/plugins-reference |

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Codex rejects `config.toml` at startup | A table defined twice, or a syntax error after a merge | Run the checker; restore `config.toml.bak-*` if needed |
| The lead ignores `model = ...` | The key sits below a `[table]` header | Move it above the first header |
| A role shows Codex's built-in description | Its file failed to load, usually an unknown key | Run the checker; fix the key it names |
| `agent type is currently not available` | The role's file or model could not be applied | Check the file, then whether the model is on the account |
| `unknown agent_type '<name>'` | No role with that `name` is loaded | Check the `name` field and start a new session |
| Two roles with one name, odd behavior | A `*.proposed.toml` or a copy left in `agents/` | Rename proposals to `<name>.toml.proposed` |
| Project roles ignored | The project is untrusted | Trust it (section 3) |
| `unknown feature key in config: child_agents_md` | The flag no longer exists in this Codex version | Delete that line |
| The report has no council log | Subagents did not run in `codex exec` | Rerun interactively with `codex` |
