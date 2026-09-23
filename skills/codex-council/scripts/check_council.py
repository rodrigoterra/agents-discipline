#!/usr/bin/env python3
"""Check a Codex council install for drift and mistakes.

Cross-checks three layers that must agree:
  1. config.toml       lead model, [features] and [agents] settings
  2. agents/*.toml     one file per council role (the source of truth)
  3. AGENTS.md         the council block and its roster table

Standard library only (Python 3.11+ for tomllib).

Usage:
  python3 check_council.py                     # $CODEX_HOME, or ~/.codex
  python3 check_council.py --codex-home DIR    # e.g. <repo>/.codex for a project install
  python3 check_council.py --agents-md FILE    # AGENTS.md holding the council block
  python3 check_council.py --bundled           # the files shipped with the skill

Exit code 0: no errors (warnings may still print). Exit code 1: errors found.
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    import tomllib
except ModuleNotFoundError:  # Python older than 3.11
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ModuleNotFoundError:
        sys.exit("check_council.py needs Python 3.11 or newer (or run: pip install tomli).")

# Values accepted by Codex (codex-rs/protocol/src/openai_models.rs, config_types.rs).
EFFORTS = {"none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra", "persistent"}
SANDBOXES = {"read-only", "workspace-write", "danger-full-access"}

# Council policy: these roles investigate or review and must never edit files.
READ_ONLY_ROLES = {"explorer", "reviewer"}

REQUIRED_ROLE_KEYS = ("name", "description", "developer_instructions")

# Keys verified for role files. Codex accepts other config.toml keys too, but it rejects
# unknown ones, so anything outside this list is reported as a possible typo.
KNOWN_ROLE_KEYS = {
    "name", "description", "nickname_candidates", "developer_instructions",
    "model", "model_reasoning_effort", "model_context_window",
    "model_auto_compact_token_limit", "sandbox_mode", "mcp_servers", "skills",
}

# Scalar settings of the [agents] table (codex-rs/config/src/config_toml.rs).
AGENTS_SCALAR_KEYS = {
    "enabled", "max_concurrent_threads_per_session", "max_threads", "max_depth",
    "default_subagent_model", "default_subagent_reasoning_effort",
    "job_max_runtime_seconds", "interrupt_message",
}
AGENT_ROLE_DECLARATION_KEYS = {"description", "config_file", "nickname_candidates"}

# Keys that belong above the first [table] header in config.toml.
TOP_LEVEL_KEYS = {
    "model", "model_reasoning_effort", "model_context_window", "model_auto_compact_token_limit",
}

START_MARKER = "<!-- codex-council:start -->"
END_MARKER = "<!-- codex-council:end -->"
AGENTS_MD_BUDGET = 32 * 1024  # Codex truncates AGENTS.md past project_doc_max_bytes (32 KiB default).


@dataclass
class Finding:
    level: str  # "ERROR" or "WARN"
    where: str
    message: str


def _load_toml(path: Path, findings: list[Finding], where: str) -> dict | None:
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as exc:
        findings.append(Finding("ERROR", where, f"is not valid TOML ({exc})"))
        return None


def check_config(path: Path) -> tuple[list[Finding], dict | None]:
    """Check config.toml. Returns findings and the lead's {model, effort}, if set."""
    findings: list[Finding] = []
    where = path.name
    if not path.is_file():
        findings.append(Finding("WARN", where, "not found; skipping the lead and [agents] checks"))
        return findings, None
    data = _load_toml(path, findings, where)
    if data is None:
        return findings, None

    lead = None
    if "model" in data:
        lead = {"model": data["model"], "effort": data.get("model_reasoning_effort", "(unset)")}
    else:
        findings.append(Finding("WARN", where, "no top-level `model`; the lead uses Codex's default model"))

    effort = data.get("model_reasoning_effort")
    if effort is not None and effort not in EFFORTS:
        findings.append(Finding("ERROR", where, f"`model_reasoning_effort = \"{effort}\"` is not a known effort ({', '.join(sorted(EFFORTS))})"))

    tables = {}
    for table in ("agents", "features"):
        value = data.get(table, {})
        if not isinstance(value, dict):
            findings.append(Finding("ERROR", where, f"`{table}` must be a [{table}] table, not a single value"))
            value = {}
        tables[table] = value
        for key in TOP_LEVEL_KEYS & set(value):
            findings.append(Finding(
                "ERROR", where,
                f"`{key}` sits inside [{table}]. In TOML every key after a [table] header belongs "
                f"to that table, so this key does not set the lead. Move it above the first [table] header.",
            ))

    agents = tables["agents"]
    for key, value in agents.items():
        if key in TOP_LEVEL_KEYS:
            continue  # already reported above
        if isinstance(value, dict):
            unknown = set(value) - AGENT_ROLE_DECLARATION_KEYS
            if unknown:
                findings.append(Finding("WARN", where, f"[agents.{key}] has unrecognised keys: {', '.join(sorted(unknown))}"))
        elif key not in AGENTS_SCALAR_KEYS:
            findings.append(Finding("ERROR", where, f"[agents] has an unknown setting `{key}`"))
    effort = agents.get("default_subagent_reasoning_effort")
    if effort is not None and effort not in EFFORTS:
        findings.append(Finding("ERROR", where, f"[agents] default_subagent_reasoning_effort \"{effort}\" is not a known effort"))
    return findings, lead


def check_roles(agents_dir: Path) -> tuple[list[Finding], dict[str, dict]]:
    """Check agents/*.toml. Returns findings and roles keyed by their `name`."""
    findings: list[Finding] = []
    roles: dict[str, dict] = {}
    if not agents_dir.is_dir():
        findings.append(Finding("ERROR", "agents/", "folder not found; no council roles are installed"))
        return findings, roles

    for pending in sorted(agents_dir.glob("*.toml.proposed")):
        findings.append(Finding("WARN", f"agents/{pending.name}", "pending review: compare it with the live file, then merge or delete it"))

    owners: dict[str, list[str]] = {}
    for path in sorted(agents_dir.glob("*.toml")):
        where = f"agents/{path.name}"
        data = _load_toml(path, findings, where)
        if data is None:
            continue
        for key in REQUIRED_ROLE_KEYS:
            if not isinstance(data.get(key), str) or not data[key].strip():
                findings.append(Finding("ERROR", where, f"missing required `{key}`"))
        for key in sorted(set(data) - KNOWN_ROLE_KEYS):
            findings.append(Finding(
                "WARN", where,
                f"`{key}` is not in the checker's list of verified keys. Codex rejects unknown keys in "
                f"role files, so confirm the spelling for your Codex version.",
            ))
        effort = data.get("model_reasoning_effort")
        if effort is not None and effort not in EFFORTS:
            findings.append(Finding("ERROR", where, f"`model_reasoning_effort = \"{effort}\"` is not a known effort ({', '.join(sorted(EFFORTS))})"))
        sandbox = data.get("sandbox_mode")
        if sandbox is not None and sandbox not in SANDBOXES:
            findings.append(Finding("ERROR", where, f"`sandbox_mode = \"{sandbox}\"` is not one of {', '.join(sorted(SANDBOXES))}"))

        name = data.get("name")
        if not isinstance(name, str):
            continue
        if name != path.stem:
            findings.append(Finding("WARN", where, f"`name = \"{name}\"` differs from the file name; Codex uses `name`"))
        if name in READ_ONLY_ROLES and sandbox != "read-only":
            findings.append(Finding("ERROR", where, f"the {name} role must keep `sandbox_mode = \"read-only\"`"))
        owners.setdefault(name, []).append(path.name)
        roles[name] = {**data, "_file": path.name}

    for name, files in owners.items():
        if len(files) > 1:
            findings.append(Finding(
                "ERROR", "agents/",
                f"duplicate role name \"{name}\" in {', '.join(files)}. Codex loads every .toml in agents/; "
                f"keep proposals as <name>.toml.proposed.",
            ))
    return findings, roles


def parse_roster(block: str) -> dict[str, dict[str, str]]:
    """Read the roster table (Role | Model | Effort | Sandbox | ...) inside the council block."""
    rows: dict[str, dict[str, str]] = {}
    header: list[str] | None = None
    for raw in block.splitlines():
        line = raw.strip()
        if not line.startswith("|"):
            if header is not None and rows:
                break  # the table ended
            continue
        cells = [cell.strip().strip("`").strip() for cell in line.strip("|").split("|")]
        if header is None:
            lowered = [cell.lower() for cell in cells]
            if {"role", "model", "effort", "sandbox"} <= set(lowered):
                header = lowered
            continue
        if all(set(cell) <= set("-: ") for cell in cells):
            continue  # separator row
        row = dict(zip(header, cells))
        rows[row["role"]] = row
    return rows


def check_agents_md(path: Path, roles: dict[str, dict], lead: dict | None) -> list[Finding]:
    """Check the council block in AGENTS.md and compare its roster with the role files."""
    findings: list[Finding] = []
    where = path.name
    if not path.is_file():
        return [Finding("ERROR", where, "not found; the council workflow block is not installed")]
    text = path.read_text(encoding="utf-8")
    if len(text.encode("utf-8")) > AGENTS_MD_BUDGET:
        findings.append(Finding("WARN", where, "is larger than 32 KiB; Codex truncates AGENTS.md past project_doc_max_bytes"))

    starts, ends = text.count(START_MARKER), text.count(END_MARKER)
    if starts == 0 and ends == 0:
        return findings + [Finding("ERROR", where, f"has no council block ({START_MARKER} ... {END_MARKER})")]
    if starts != 1 or ends != 1 or text.index(START_MARKER) > text.index(END_MARKER):
        return findings + [Finding("ERROR", where, f"council markers are broken: found {starts} start and {ends} end marker(s); expected one of each, start first")]

    block = text[text.index(START_MARKER):text.index(END_MARKER)]
    roster = parse_roster(block)
    if not roster:
        return findings + [Finding("ERROR", where, "the council block has no roster table (Role | Model | Effort | Sandbox)")]

    for role, row in roster.items():
        if role == "lead":
            if lead is None:
                continue
            for field, actual in (("model", lead["model"]), ("effort", lead["effort"])):
                if row.get(field) != actual:
                    findings.append(Finding("ERROR", where, f"roster drift: lead {field} is '{row.get(field)}' in AGENTS.md but '{actual}' in config.toml"))
            continue
        data = roles.get(role)
        if data is None:
            findings.append(Finding("ERROR", where, f"roster drift: '{role}' is in the roster but no role file defines it"))
            continue
        expected = {
            "model": data.get("model", "(unset)"),
            "effort": data.get("model_reasoning_effort", "(unset)"),
            "sandbox": data.get("sandbox_mode", "inherit"),
        }
        for field, actual in expected.items():
            if row.get(field) != actual:
                findings.append(Finding("ERROR", where, f"roster drift: {role} {field} is '{row.get(field)}' in AGENTS.md but '{actual}' in agents/{data['_file']}"))

    for name, data in roles.items():
        if name not in roster:
            findings.append(Finding("ERROR", where, f"roster drift: role '{name}' (agents/{data['_file']}) is missing from the roster table"))
    return findings


def run(codex_home: Path, agents_md: Path, config: Path) -> list[Finding]:
    """Run every check and return all findings."""
    config_findings, lead = check_config(config)
    role_findings, roles = check_roles(codex_home / "agents")
    return config_findings + role_findings + check_agents_md(agents_md, roles, lead)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check a Codex council install for drift and mistakes.")
    parser.add_argument("--codex-home", type=Path, help="folder with config.toml and agents/ (default: $CODEX_HOME or ~/.codex)")
    parser.add_argument("--agents-md", type=Path, help="AGENTS.md with the council block (default: <codex-home>/AGENTS.md)")
    parser.add_argument("--config", type=Path, help="config.toml to check (default: <codex-home>/config.toml)")
    parser.add_argument("--bundled", action="store_true", help="check the files shipped with the skill")
    args = parser.parse_args(argv)

    if args.bundled:
        home = Path(__file__).resolve().parent.parent / "assets" / "codex"
        config, agents_md = home / "config.fragment.toml", home / "AGENTS.council.md"
    else:
        home = (args.codex_home or Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")).expanduser()
        config = args.config or home / "config.toml"
        agents_md = args.agents_md or home / "AGENTS.md"

    findings = run(home, agents_md, config)
    errors = [f for f in findings if f.level == "ERROR"]
    warnings = [f for f in findings if f.level == "WARN"]

    print(f"codex-council check: {home}")
    for finding in errors + warnings:
        print(f"  {finding.level:<5}  {finding.where}: {finding.message}")
    if not findings:
        print("  OK     config, role files and the AGENTS.md roster agree.")
    print(f"Result: {len(errors)} error(s), {len(warnings)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
