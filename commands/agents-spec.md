---
description: Scaffold a new spec file at specs/<feature>.md from the SPEC-TEMPLATE.
argument-hint: <feature-slug>
---

Create a new spec for the feature described by the user.

## Steps
1. If no argument was given, ask the user for a short kebab-case feature slug.
2. If `specs/` does not exist, create it.
3. If `specs/<slug>.md` already exists, stop and warn the user. Do not overwrite.
4. Copy `${CLAUDE_PLUGIN_ROOT}/templates/specs/SPEC-TEMPLATE.md` from this plugin to `specs/<slug>.md`.
5. Pre-fill the `# <Feature Title>` heading and the date.
6. Open the file in the conversation and ask the user to fill **Why** and **Acceptance Criteria** first — those two sections drive everything else.

## Reminder
Spec first. Claude is far better at honoring a written contract than at guessing intent from a one-liner.
