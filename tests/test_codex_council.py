"""Acceptance tests for the codex-council skill (see specs/codex-council.md).

Run from the repository root (standard library only, Python 3.11+):

    python3 -m unittest discover -s tests -v
"""

from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import tomllib
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "codex-council"
ASSETS = SKILL / "assets" / "codex"
CHECKER = SKILL / "scripts" / "check_council.py"

# The roster the owner approved on 2026-09-23: the guide's role files win (spec D1).
APPROVED_ROSTER = {
    "default": ("gpt-6-astra", "high", "inherit"),
    "worker": ("gpt-6-sol", "medium", "inherit"),
    "explorer": ("gpt-6-sol", "xhigh", "read-only"),
    "fixer": ("gpt-6-sol", "medium", "inherit"),
    "reviewer": ("gpt-6-sol", "xhigh", "read-only"),
    "specialist": ("gpt-6-astra", "max", "inherit"),
}


def load_checker():
    spec = importlib.util.spec_from_file_location("check_council", CHECKER)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module  # dataclasses resolves annotations through sys.modules
    spec.loader.exec_module(module)
    return module


cc = load_checker()


def frontmatter(path: Path) -> dict[str, str]:
    """Parse the flat `key: value` YAML frontmatter used by skills, agents and commands."""
    lines = path.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "---", f"{path} must start with frontmatter"
    end = lines.index("---", 1)
    fields = {}
    for line in lines[1:end]:
        key, _, value = line.partition(":")
        fields[key.strip()] = value.strip().strip('"')
    return fields


class InstalledCouncil:
    """A throwaway CODEX_HOME holding a copy of the bundled council files."""

    def __init__(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.home = Path(self._tmp.name)
        shutil.copytree(ASSETS / "agents", self.home / "agents")
        shutil.copy(ASSETS / "config.fragment.toml", self.home / "config.toml")
        shutil.copy(ASSETS / "AGENTS.council.md", self.home / "AGENTS.md")

    def path(self, relative: str) -> Path:
        return self.home / relative

    def edit(self, relative: str, old: str, new: str) -> None:
        target = self.path(relative)
        text = target.read_text(encoding="utf-8")
        assert old in text, f"{old!r} not found in {relative}"
        target.write_text(text.replace(old, new, 1), encoding="utf-8")

    def append(self, relative: str, text: str) -> None:
        with self.path(relative).open("a", encoding="utf-8") as handle:
            handle.write(text)

    def findings(self) -> list:
        return cc.run(self.home, self.path("AGENTS.md"), self.path("config.toml"))

    def cleanup(self) -> None:
        self._tmp.cleanup()


class CheckerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.council = InstalledCouncil()
        self.addCleanup(self.council.cleanup)

    def messages(self, level: str) -> list[str]:
        return [f"{f.where}: {f.message}" for f in self.council.findings() if f.level == level]

    def assertFinding(self, level: str, *fragments: str) -> None:
        hits = [m for m in self.messages(level) if all(frag in m for frag in fragments)]
        self.assertTrue(hits, f"no {level} containing {fragments}; got {self.messages(level)}")

    def test_installed_copy_is_clean(self):
        self.assertEqual([], self.council.findings())

    def test_roster_drift_is_an_error(self):
        self.council.edit("AGENTS.md", "| reviewer | gpt-6-sol | xhigh |", "| reviewer | gpt-6-sol | high |")
        self.assertFinding("ERROR", "roster drift", "reviewer effort", "'high'", "'xhigh'")

    def test_lead_drift_against_config_is_an_error(self):
        self.council.edit("config.toml", 'model = "gpt-6-astra"', 'model = "gpt-6-sol"')
        self.assertFinding("ERROR", "roster drift", "lead model")

    def test_misspelled_role_key_warns(self):
        self.council.append("agents/worker.toml", 'model_reasoning_efort = "high"\n')
        self.assertFinding("WARN", "agents/worker.toml", "model_reasoning_efort")
        self.assertEqual([], self.messages("ERROR"))

    def test_duplicate_role_name_is_an_error(self):
        shutil.copy(self.council.path("agents/worker.toml"), self.council.path("agents/worker.proposed.toml"))
        self.assertFinding("ERROR", "duplicate role name", "worker.proposed.toml", "worker.toml")

    def test_toml_proposed_suffix_only_warns(self):
        shutil.copy(self.council.path("agents/worker.toml"), self.council.path("agents/worker.toml.proposed"))
        self.assertFinding("WARN", "worker.toml.proposed", "pending review")
        self.assertEqual([], self.messages("ERROR"))

    def test_missing_developer_instructions_is_an_error(self):
        target = self.council.path("agents/fixer.toml")
        text = target.read_text(encoding="utf-8")
        target.write_text(text[: text.index("developer_instructions")], encoding="utf-8")
        self.assertFinding("ERROR", "agents/fixer.toml", "developer_instructions")

    def test_unknown_effort_is_an_error(self):
        self.council.edit("agents/reviewer.toml", 'model_reasoning_effort = "xhigh"', 'model_reasoning_effort = "extreme"')
        self.assertFinding("ERROR", "agents/reviewer.toml", "extreme")

    def test_duplicate_agents_table_is_an_error(self):
        self.council.append("config.toml", "\n[agents]\nmax_depth = 1\n")
        self.assertFinding("ERROR", "config.toml", "not valid TOML")

    def test_top_level_key_inside_agents_table_is_an_error(self):
        self.council.append("config.toml", 'model = "gpt-6-sol"\n')  # lands inside [agents]
        self.assertFinding("ERROR", "`model` sits inside [agents]", "above the first [table] header")

    def test_agents_written_as_a_value_is_an_error_not_a_crash(self):
        target = self.council.path("config.toml")
        text = target.read_text(encoding="utf-8").replace("[agents]\nenabled = true", "[agents_settings]\nenabled = true")
        target.write_text("agents = true\n" + text, encoding="utf-8")
        self.assertFinding("ERROR", "`agents` must be a [agents] table")

    def test_read_only_roles_must_stay_read_only(self):
        for role in ("explorer", "reviewer"):
            with self.subTest(role=role):
                self.council.edit(f"agents/{role}.toml", 'sandbox_mode = "read-only"', 'sandbox_mode = "workspace-write"')
                self.assertFinding("ERROR", f"the {role} role must keep", "read-only")

    def test_role_missing_from_roster_is_an_error(self):
        target = self.council.path("agents/auditor.toml")
        target.write_text('name = "auditor"\ndescription = "d"\ndeveloper_instructions = "i"\nmodel = "gpt-6-sol"\n', encoding="utf-8")
        self.assertFinding("ERROR", "role 'auditor'", "missing from the roster")

    def test_roster_row_without_role_file_is_an_error(self):
        self.council.path("agents/fixer.toml").unlink()
        self.assertFinding("ERROR", "'fixer' is in the roster but no role file defines it")

    def test_broken_markers_are_an_error(self):
        self.council.append("AGENTS.md", "\n<!-- codex-council:end -->\n")
        self.assertFinding("ERROR", "council markers are broken")

    def test_missing_block_is_an_error(self):
        self.council.path("AGENTS.md").write_text("# AGENTS.md\n\nNo council here.\n", encoding="utf-8")
        self.assertFinding("ERROR", "has no council block")

    def test_missing_config_only_warns(self):
        self.council.path("config.toml").unlink()
        self.assertFinding("WARN", "config.toml", "not found")
        self.assertEqual([], self.messages("ERROR"))


class CheckerCliTests(unittest.TestCase):
    def run_cli(self, *args: str) -> subprocess.CompletedProcess:
        return subprocess.run([sys.executable, "-B", str(CHECKER), *args], capture_output=True, text=True)

    def test_bundled_files_pass(self):
        result = self.run_cli("--bundled")
        self.assertEqual(0, result.returncode, result.stdout + result.stderr)
        self.assertIn("0 error(s), 0 warning(s)", result.stdout)

    def test_drift_fails_with_exit_code_1(self):
        council = InstalledCouncil()
        self.addCleanup(council.cleanup)
        council.edit("AGENTS.md", "| specialist | gpt-6-astra | max |", "| specialist | gpt-6-astra | high |")
        result = self.run_cli("--codex-home", str(council.home))
        self.assertEqual(1, result.returncode, result.stdout)
        self.assertIn("roster drift: specialist effort", result.stdout)


class BundleTests(unittest.TestCase):
    def test_role_files_match_the_approved_roster(self):
        for role, (model, effort, sandbox) in APPROVED_ROSTER.items():
            with self.subTest(role=role):
                data = tomllib.loads((ASSETS / "agents" / f"{role}.toml").read_text(encoding="utf-8"))
                self.assertEqual((model, effort, sandbox), (data["model"], data["model_reasoning_effort"], data.get("sandbox_mode", "inherit")))
        self.assertEqual(set(APPROVED_ROSTER), {p.stem for p in (ASSETS / "agents").glob("*.toml")})

    def test_brief_templates_exist_and_name_their_mode(self):
        for mode in ("review", "build"):
            with self.subTest(mode=mode):
                text = (SKILL / "assets" / "briefs" / f"{mode}.md").read_text(encoding="utf-8")
                self.assertIn(f"COUNCIL MODE: {mode.upper()}", text)
        review = (SKILL / "assets" / "briefs" / "review.md").read_text(encoding="utf-8")
        self.assertIn("Do not spawn `worker` or `fixer`", review)


class PluginWiringTests(unittest.TestCase):
    def setUp(self) -> None:
        self.plugin = json.loads((ROOT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
        marketplace = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
        self.entry = next(p for p in marketplace["plugins"] if p["name"] == "agents-discipline")

    def test_versions_match(self):
        self.assertEqual("1.1.0", self.plugin["version"])
        self.assertEqual(self.plugin["version"], self.entry["version"])

    def test_manifest_paths_exist(self):
        self.assertIn("./skills/codex-council", self.plugin["skills"])
        for skill in self.plugin["skills"]:
            self.assertTrue((ROOT / skill / "SKILL.md").is_file(), skill)
        for commands in self.plugin["commands"]:
            self.assertTrue((ROOT / commands / "agents-council.md").is_file(), commands)
        # An `agents` field would replace the default agents/ scan (plugins reference).
        self.assertNotIn("agents", self.plugin)

    def test_skill_frontmatter(self):
        fields = frontmatter(SKILL / "SKILL.md")
        self.assertEqual("codex-council", fields["name"])
        self.assertTrue(0 < len(fields["description"]) <= 1024, len(fields["description"]))

    def test_claude_seats_are_pinned_and_read_only(self):
        expected = {
            "council-blind-reviewer": {"model": "claude-opus-5-5", "effort": "xhigh"},
            "council-auditor": {"model": "claude-fable-5-1", "omitClaudeMd": "true"},
        }
        for name, pinned in expected.items():
            with self.subTest(agent=name):
                fields = frontmatter(ROOT / "agents" / f"{name}.md")
                self.assertEqual(name, fields["name"])
                self.assertTrue(fields["description"])
                for key, value in pinned.items():
                    self.assertEqual(value, fields.get(key), key)
                tools = {tool.strip() for tool in fields["tools"].split(",")}
                self.assertLessEqual(tools, {"Read", "Grep", "Glob"}, "seats must not get write-capable tools")


class DesktopZipTests(unittest.TestCase):
    def test_zip_carries_the_whole_skill(self):
        with zipfile.ZipFile(ROOT / "dist-desktop" / "codex-council.zip") as bundle:
            names = set(bundle.namelist())
        required = {
            "codex-council/SKILL.md",
            "codex-council/scripts/check_council.py",
            "codex-council/references/codex-config.md",
            "codex-council/assets/codex/config.fragment.toml",
            "codex-council/assets/codex/AGENTS.council.md",
            "codex-council/assets/briefs/review.md",
            "codex-council/assets/briefs/build.md",
        } | {f"codex-council/assets/codex/agents/{role}.toml" for role in APPROVED_ROSTER}
        self.assertLessEqual(required, names)
        self.assertFalse([n for n in names if "__pycache__" in n or n.endswith(".pyc")])

    def test_zips_are_not_stale(self):
        """Rebuild with scripts/build-desktop.sh after editing either skill."""
        sources = {"codex-council": SKILL, "agents-discipline": ROOT / "skills" / "agents-discipline"}
        for skill, folder in sources.items():
            with zipfile.ZipFile(ROOT / "dist-desktop" / f"{skill}.zip") as bundle:
                for name in bundle.namelist():
                    if name.endswith("/"):
                        continue
                    with self.subTest(file=name):
                        self.assertEqual((folder / name.removeprefix(f"{skill}/")).read_bytes(), bundle.read(name))

    def test_skill_frontmatter_is_accepted_by_claude_desktop(self):
        # Claude Desktop skill uploads only allow these frontmatter keys.
        allowed = {"name", "description", "license", "allowed-tools", "compatibility", "metadata"}
        self.assertLessEqual(set(frontmatter(SKILL / "SKILL.md")), allowed)


if __name__ == "__main__":
    unittest.main()
