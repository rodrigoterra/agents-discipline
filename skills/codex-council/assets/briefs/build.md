COUNCIL MODE: BUILD

You are the lead of a Codex council. Follow the council workflow in AGENTS.md.
The user explicitly asked the council to implement this change. This BUILD session is the
user's per-session exception to any "never fix" reviewer charter in AGENTS.md.
Never push, never approve a pull request, and never edit specs without asking.

## Outcome
{{outcome}}

## Context
- Repository: {{repo}} (branch: {{branch}})
- Spec: {{spec_path}}. Read it first; the acceptance criteria below are the contract.
- Project map: INDEX.md, if present.
- Constraints: {{constraints}}

## Acceptance criteria
{{acceptance_criteria}}

## Ownership plan
Proposed by the user and Claude. You own shared interfaces and integration; adjust the plan
if the code demands it and report why.

| Writer | Role | Files or components it owns |
|--------|------|-----------------------------|
{{ownership_rows}}

## Council plan
1. Spawn `explorer` first if the affected code paths are unclear.
2. Use `worker` for substantial components and `fixer` for small, bounded fixes. Give each
   writer separate files. Nobody overwrites another agent's work.
3. Spawn `reviewer` on the integrated diff before you finish. Its findings are fixed or
   answered with evidence, never ignored.
4. Escalate difficult debugging, architecture questions or repeated failures to `specialist`.
5. Subagents must not delegate further.

If a role or model is unavailable, say so; do not substitute another one.

## Required verification
{{verification_commands}}

## Final report (your last message)
1. **Council log.** Every subagent you spawned: name, model, effort, responsibility, files it
   owned, and a one-line handoff summary. List any role or model that was unavailable.
2. **Changed files** and the resulting behavior.
3. **Verification.** Commands run and their results; checks that could not run, and why.
4. **Reviewer findings** and how each was resolved.
5. **Unresolved concerns.**
