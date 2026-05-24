# Voice Radio ALPHA Plan

## Purpose

ALPHA turns the current PoC into a clearer radio production instrument.

The goal is not to rebuild the app from scratch. The goal is to keep the working PoC flows and make them easier to direct, extend, hear, compare, and export.

## Creative Model

Think of the app as a small mission-radio studio with separate stations:

- Script and voice casting decide who speaks.
- Role FX decides how each speaker's radio identity sounds.
- Environment simulation decides what the signal passes through.
- DSP controls are the fine knobs for the sound.
- Spectrograms show the sound fingerprint.
- Stitch/export assembles the final transmission.

ALPHA should make those stations feel connected, but not tangled.

## Implementation Principles

- Preserve the current PoC flows while improving their structure.
- Add features in small increments that can be tested.
- Keep CAPCOM and SHIP behavior explicit.
- Keep server-rendered audio valid for final exports.
- Prepare browser-side/live preview without forcing the whole app into that architecture immediately.
- Make old rendered audio obvious whenever settings have changed.
- Keep docs updated as workflow behavior changes.

## Phase 1 - Clarify The Existing Instrument

Focus:

- Separate the workflow into clearer conceptual modules.
- Name the state boundaries between script, voices, role FX, environment, DSP, spectrograms, and export.
- Add explicit stale-audio state when source audio or sound settings change.
- Make role FX ownership clearer in code and UI state.

Expected result:

The app still works like the PoC, but it becomes easier to understand which part of the flow owns each decision.

Primary spec:

- [Milestone 1 - Workflow Clarity And Audio State](MILESTONE_1_WORKFLOW_CLARITY.md)

## ALPHA2 - Narrative Instrument Flow

ALPHA2 reframes the project as narrative software, narrative art game, and digital instrument.

Primary spec:

- [ALPHA2 Narrative Instrument Flow](ALPHA2_NARRATIVE_INSTRUMENT_FLOW.md)

Branch:

`codex/alpha2-narrative-instrument-flow`

Base branch:

`claude/skyfield-termtrack`

## Phase 2 - Expand Role And Signal Design

Focus:

- Add more role-based FX stack possibilities.
- Allow future roles beyond the current CAPCOM and SHIP shape without breaking the strict current constraints.
- Add new DSP possibilities after library evaluation.
- Keep presets and generated DSP values traceable.

Expected result:

Each voice can have a more intentional radio identity, and new audio effects can be added without turning the workflow into a single pile of knobs.

## Phase 3 - Improve Preview And Comparison

Focus:

- Prepare a live-preview boundary for browser-side audio processing.
- Evaluate AudioWorklet or similar browser audio paths.
- Improve spectrogram metadata as a first-class session artifact.
- Make comparison between rendered output and references easier.

Expected result:

The user can make sound decisions with faster feedback, while final export still uses reliable render logic.

## Phase 4 - ALPHA Polish And Review

Focus:

- Validate the end-to-end flow.
- Run unit, build, and e2e checks.
- Review security and file-generation paths.
- Check docs for drift.
- Keep design-system refinements from Claude Design compatible with implemented behavior.

Expected result:

ALPHA is a stable creative workflow, not just a pile of experiments.

## Validation Commands

Run from `voice-radio-poc/`:

```bash
nvm use 22
npm install
npm run test
npm run build
npm run test:e2e
git diff --check
```
