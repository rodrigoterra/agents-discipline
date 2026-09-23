<!-- codex-council:start -->
<!-- Managed by the codex-council skill (agents-discipline plugin). The role files in agents/ are the source of truth: edit them, then re-run the skill. check_council.py fails when this roster drifts from them. -->
## Native subagent workflow (Codex council)

- The primary agent is the technical lead and owns integration and final verification.
- Keep small or tightly coupled tasks with the lead. For substantial tasks, use
  two or three native subagents when independent work improves speed or quality.
- Use the roles and models in the council roster below. Keep the lead and the
  default fallback on the models it lists.
- Announce each subagent's name, model, and responsibility. Report significant
  progress, blockers, and completion.
- Give each subagent the outcome, relevant context, file ownership, constraints,
  acceptance criteria, required verification, and expected handoff.
- Assign writers separate files or components. The lead owns shared interfaces
  and integration. Never overwrite another agent's work.
- Use fresh or bounded-context spawns when selecting a different role, model,
  or reasoning level; full-history forks can inherit the parent's settings.
- Require concise handoffs: findings or changed files, checks performed, and
  unresolved concerns. The lead verifies consequential claims.
- Use an independent reviewer for meaningful changes. Prioritize reproducible
  defects, regressions, and missing behavioral coverage.
- Escalate ambiguous or repeatedly failing work to the specialist.
- Subagents must not delegate further unless the lead explicitly assigns it.
- Read each project's own AGENTS.md. Continue routine implementation
  autonomously; ask about material ambiguity or consequential product choices.
- Report unavailable roles or models rather than silently substituting them.

### Council roster

| Role | Model | Effort | Sandbox | Use for |
|------|-------|--------|---------|---------|
| lead | gpt-6-astra | high | session | Defines the approach and shared interfaces, integrates, runs final checks |
| default | gpt-6-astra | high | inherit | General-purpose fallback |
| worker | gpt-6-sol | medium | inherit | Substantial implementation |
| explorer | gpt-6-sol | xhigh | read-only | Focused investigation |
| fixer | gpt-6-sol | medium | inherit | Small, well-understood fixes |
| reviewer | gpt-6-sol | xhigh | read-only | Independent review |
| specialist | gpt-6-astra | max | inherit | Difficult debugging, architecture, and escalation |

### Council modes

The user names the mode in the first prompt of every council session.

- **REVIEW** (the default when no mode is named). Someone else built the change and
  the council attacks it. Spawn only `explorer`, `reviewer` and, on escalation,
  `specialist`. Nobody edits files. If this repository's AGENTS.md has a reviewer
  charter, follow it and report findings in its format.
- **BUILD**. The user explicitly asked the council to implement. `worker` and `fixer`
  may edit only the files the lead assigns to them, and `reviewer` still reviews the
  integrated result independently. A reviewer charter that says "never fix" keeps
  governing REVIEW sessions; BUILD is the user's explicit, per-session exception.
- In both modes: never push, never approve a pull request, and never edit specs
  without asking. Claude runs its own blind reviewer and a process auditor outside
  this session, and the auditor reads your final report, so list every subagent you
  spawned with its model, effort, responsibility and handoff summary. The user
  decides when the loop ends.
<!-- codex-council:end -->
