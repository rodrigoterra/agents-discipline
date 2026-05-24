# Voice Radio ALPHA Feature Spec

## Status

This is the working feature spec for ALPHA. It should grow as new feature ideas are shared, evaluated, accepted, deferred, or rejected.

## Current Feature Themes

### 1. Clearer Workflow Stations

Creative intent:

Make the app feel like a real production chain, where each station has a purpose.

Implementation meaning:

- Keep voice casting, role FX, environment simulation, DSP, spectrograms, and stitch/export as distinct workflow areas.
- Make data handoff between those areas visible in code and predictable in UI.
- Avoid hiding too much behavior inside one large screen or state object.

### 2. Explicit Stale Audio State

Creative intent:

When the user changes the recipe, the app should say whether the current audio has been cooked with that recipe yet.

Implementation meaning:

- Track when rendered or processed audio no longer matches current inputs.
- Mark audio stale after changes to source voice, role FX, environment settings, DSP values, or stitch settings that affect output.
- Give the UI a clear state for "current preview is old" versus "current preview matches these settings."

### 3. Role-Based FX Stacks

Creative intent:

CAPCOM and SHIP should have intentional radio identities, like characters with different costumes and microphones.

Implementation meaning:

- Keep each role's FX settings separate.
- Make it clear which role owns which preset and DSP values.
- Prevent accidental cross-role overwrites.
- Support future expansion while preserving current CAPCOM and SHIP constraints.

### 4. Live Audio Preview Boundary

Creative intent:

Turning sound knobs should eventually feel immediate, like working in a studio.

Implementation meaning:

- Keep final export rendering reliable.
- Identify which effects could preview live in the browser.
- Avoid coupling server-rendered export logic too tightly to preview-only behavior.
- Prepare for AudioWorklet or another browser-side audio path when suitable.

### 5. DSP And Library Expansion

Creative intent:

New audio libraries may unlock richer radio textures, analysis tools, or live interaction.

Implementation meaning:

- Evaluate libraries before adding them.
- Separate useful DSP concepts from risky dependencies.
- Prefer libraries that work locally, predictably, and without cloud services.
- Add tests around new audio mapping or processing behavior.

## Feature Intake Template

Use this format when sharing a feature idea:

```text
Feature name:

Creative goal:
What should the user be able to feel, hear, compare, or control?

Current pain:
What is confusing, slow, missing, or too technical in the PoC?

Desired flow:
Describe the steps like a scene or studio workflow.

Inputs:
What does the feature need? Script, role, audio file, preset, environment, reference, etc.

Outputs:
What should it produce? Preview, rendered file, metadata, spectrogram, preset, comparison, etc.

Must preserve:
What existing behavior must not break?

Nice to have:
What can wait?

References:
Links, screenshots, documents, sound examples, or library docs.
```

## Decision States

Each proposed feature should move through one of these states:

- `proposed`: idea received, not evaluated yet.
- `accepted`: useful for ALPHA and ready to specify.
- `deferred`: good idea, but not for the next increment.
- `research`: needs technical evaluation first.
- `rejected`: does not fit the project direction or creates too much risk.
