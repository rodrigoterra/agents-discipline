# Voice Radio ALPHA Workflow Handoff

## Current Baseline

Repository root:

`/Users/rodrigoterra/Projeto_Games_Local/Teste-Voice-Radio`

Project:

`voice-radio-poc/`

Committed baseline:

`ed06dcac Add environment simulator and enhanced FX lab workflow`

Branch at handoff:

`codex/local-audio-presets-voice-controls`

Validation from the committed PoC milestone:

- `npm install` completed.
- `npm run test` passed: 8 files, 45 tests.
- `npm run build` passed.
- `npm run test:e2e` passed: 1 test.
- `npm audit` reports 6 moderate dev-tool advisories from `vite/esbuild/vitest/tsx`. Do not run `npm audit fix --force` unless intentionally accepting breaking dependency upgrades.

## What The PoC Now Contains

- Voice generation and role casting for CAPCOM and SHIP.
- Enhanced FX Lab workflow with role-targeted radio FX assignment.
- Mission geometry and space weather environment simulator.
- Static event-envelope approximations that resolve into existing DSP controls.
- Spectrogram generation and NASA reference comparison structure.
- Stitch and export workflow with Quindar tone controls and silence gap controls.
- Security/review hardening from Claude Code review, including GitHub workflows and server/unit tests.

## ALPHA Goal

Move from PoC toward a more modular radio-instrument workflow:

1. Better live sound-design interaction.
2. More explicit role-based FX stacks.
3. Cleaner separation between voice casting, radio channel design, environment simulation, fine DSP, spectrogram analysis, and final stitch/export.
4. Prepare for AudioWorklet or another live-audio architecture so parameter changes can be heard without repeated server renders.

## Recommended Agent Roles

### Claude Design

Owns design source of truth only.

Deliverables:

- `design_handoff_voice_radio_alpha/`
- `CODEX_TASKS.md`
- screen-by-screen HTML references
- `components.md`
- interaction-state notes
- tokens and visual rules
- screenshots or static references

Claude Design should not rewrite application logic. Its output should describe:

- what screens exist
- component contracts
- visual layout rules
- interaction states
- expected empty/loading/error/success states
- what must remain unchanged from the PoC

### Codex

Owns implementation.

Responsibilities:

- inspect architecture before changes
- implement task-by-task from `CODEX_TASKS.md`
- preserve existing tests and flows
- add tests for new behavior
- run validation commands
- keep work scoped to the ALPHA branch

### Claude Code

Owns reviewer role.

Responsibilities:

- review security, server paths, schemas, generated-file handling, and race risks
- review UX/data-flow regressions
- review test gaps
- produce prioritized findings before commit
- avoid making design decisions unless asked

## Recommended Branch Model

Use separate branches for implementation and design handoff if the design handoff will evolve independently.

Recommended:

- Implementation branch:
  `codex/alpha-radio-instrument-workflow`

- Optional design handoff branch:
  `design/alpha-voice-radio-handoff`

Use the design branch if Claude Design will iterate multiple rounds before Codex implements. If the design package is already stable and final, it can be added directly to the Codex ALPHA branch.

## ALPHA Branch Start Commands

From repo root:

```bash
cd /Users/rodrigoterra/Projeto_Games_Local/Teste-Voice-Radio
git checkout codex/local-audio-presets-voice-controls
git status
git checkout -b codex/alpha-radio-instrument-workflow
```

If you want a separate design branch first:

```bash
cd /Users/rodrigoterra/Projeto_Games_Local/Teste-Voice-Radio
git checkout codex/local-audio-presets-voice-controls
git checkout -b design/alpha-voice-radio-handoff
```

Then add Claude Design output under:

```text
voice-radio-poc/design_handoff_voice_radio_alpha/
```

Commit the design package:

```bash
git add voice-radio-poc/design_handoff_voice_radio_alpha
git commit -m "Add alpha design handoff for voice radio workflow"
```

Then create the implementation branch from the PoC baseline and merge the design branch:

```bash
git checkout codex/local-audio-presets-voice-controls
git checkout -b codex/alpha-radio-instrument-workflow
git merge --no-ff design/alpha-voice-radio-handoff
```

## Recommended New Chat Prompt For Codex

```text
We are starting ALPHA from committed PoC baseline ed06dcac.

Repo root:
/Users/rodrigoterra/Projeto_Games_Local/Teste-Voice-Radio

Project:
voice-radio-poc/

Read:
voice-radio-poc/AGENTS.md
voice-radio-poc/CLAUDE.md
voice-radio-poc/docs/handoff/alpha-workflow-handoff.md
voice-radio-poc/design_handoff_voice_radio_alpha/CODEX_TASKS.md

Do not rewrite the whole app.
Preserve the current PoC flows:
- script generation/validation
- voice casting and TTS
- FX role assignment
- environment simulator
- spectrograms
- stitch/export
- tests

Implement the next ALPHA task incrementally, validate with:
nvm use 22
npm install
npm run test
npm run build
npm run test:e2e
```

## Recommended Claude Design Prompt

```text
You are Claude Design. Create the ALPHA design handoff for the existing Voice Radio PoC.

Do not implement React code.
Create a design handoff package under:
voice-radio-poc/design_handoff_voice_radio_alpha/

Use the current v3 design language as the baseline, but improve the ALPHA workflow for:
- Voice casting
- role-based FX stack design
- environment simulation
- fine DSP parameters
- spectrogram comparison
- stitch/export

Deliver:
- CODEX_TASKS.md
- components.md
- screen reference HTML files
- interaction state notes
- tokens or token deltas
- clear task order for Codex

Make each task independently implementable.
```

## Recommended Claude Code Review Prompt

```text
You are Claude Code acting as reviewer only.

Review the ALPHA branch for:
- server/API security
- schema compatibility
- path traversal or generated-file risks
- race conditions
- audio processing regressions
- UX/data-flow breaks
- missing tests
- docs drift

Lead with findings ordered by severity.
Do not rewrite the app unless asked.
```

## Known ALPHA Technical Direction

- Current event envelopes are static approximations.
- Future live manipulation should move toward AudioWorklet or another browser-side/live-audio architecture.
- Server-rendered FX remains valid for export-quality batch processing.
- The UI should make stale processed audio explicit whenever raw audio or FX parameters change.
- Spectrogram metadata should become a first-class session artifact for later comparison and NASA reference matching.

## Commit Discipline

For each ALPHA increment:

```bash
nvm use 22
npm install
npm run test
npm run build
npm run test:e2e
git diff --check
git status
```

Commit only after tests pass or failures are clearly documented.

