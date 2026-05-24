# ALPHA Milestone 1 - Workflow Clarity And Audio State

## Milestone Goal

Milestone 1 turns the working PoC into a clearer production flow.

The creative goal is simple: the user should always understand which station they are working in, what each station controls, and whether the audio they hear matches the current choices.

This milestone does not require Claude Design. Design-system work can happen in parallel later. Milestone 1 is about feature logic, flow clarity, and safer foundations for future sound-design expansion.

## Creative Explanation

Think of the app as a mission-radio studio.

Right now the PoC proves that the whole studio can record, process, analyze, and export. Milestone 1 labels the tables, separates the cables, and adds warning lights when something has changed but the audio has not been re-rendered yet.

## Scope

Milestone 1 covers:

- Voice casting
- Role FX
- Environment simulation
- DSP controls
- Spectrograms
- Stitch/export
- Stale processed audio state
- Role-based FX data flow
- Browser-side/live-preview preparation
- Test preservation and incremental tests

Milestone 1 does not yet cover:

- Full Tone.js integration
- Full AudioWorklet implementation
- New visual design system from Claude Design
- New roles beyond CAPCOM and SHIP
- Replacing the server-side export renderer

## 1. Modularize The Workflow

Creative meaning:

The app should feel like a set of connected studio stations instead of one large control panel.

Implementation meaning:

- Name the workflow stations clearly in docs and code.
- Move shared workflow helpers out of the large app screen where practical.
- Keep each station responsible for its own kind of decision.

Initial module map:

```text
Script / Mission Brief
-> Voice Casting
-> Role FX Stack
-> Environment Simulation
-> Fine DSP
-> Spectrogram Analysis
-> Stitch / Export
```

Current PoC evidence:

- `App.tsx` already contains the full flow, but state for all stations lives together.
- `audio-core` already owns preset resolution and environment mapping.
- `audio-fx` already owns server-side PCM processing.
- `spectrogram.ts` already owns spectrogram artifact generation.

Milestone 1 task:

Create small workflow utility modules before large UI rewrites. The first candidates are:

- processed audio freshness/status helpers
- role FX assignment helpers
- browser preview capability types

## 2. Make Stale Processed Audio Explicit

Creative meaning:

If the user changes the sound recipe, the app should clearly say whether the audio has been baked with that recipe yet.

Implementation meaning:

- Define a reusable status for each utterance.
- Compare the current audio recipe with the recipe used during the last processing pass.
- Show that state consistently in FX, Stitch, and future preview areas.

Recommended status names:

```text
missing_raw
needs_processing
current
stale
```

Current PoC evidence:

- The Stitch screen already compares a `processedMetaMap` signature against the current processing signature.
- This logic is useful but local to `App.tsx`.

Milestone 1 task:

Extract this into a tested helper so every screen can ask the same question:

```text
Does this processed clip still match the current voice source, role FX, environment, and DSP settings?
```

## 3. Improve Role-Based FX Stack Data Flow

Creative meaning:

CAPCOM and SHIP should keep their own radio identities. Changing one role's costume should not quietly change the other role's costume.

Implementation meaning:

- Make role FX assignments explicit data.
- Make the source of a role's current FX clear:
  - assigned role stack
  - live panel fallback
  - generated environment influence
  - per-utterance Quindar override
- Add tests that CAPCOM and SHIP settings do not overwrite each other.

Current PoC evidence:

- `roleFxAssignments` already stores role-specific controls.
- `clipControlsForUtterance` already chooses role-assigned controls or falls back to the live FX panel.

Milestone 1 task:

Extract role FX resolution into a named helper:

```text
utterance + role assignments + live panel + Quindar
-> final controls for this clip
```

This makes the handoff easier to reason about before we add more DSP possibilities.

## 4. Prepare Live-Audio Architecture Boundaries

Creative meaning:

We are not building the live-audio instrument yet, but we are marking where the future live knobs will plug in.

Implementation meaning:

- Keep server render as the trusted export path.
- Define browser-preview concepts separately from final rendering.
- Avoid mixing preview-only audio behavior into export logic.

Recommended boundary:

```text
Server render path:
source WAV + resolved controls -> exported processed WAV

Browser preview path:
source audio URL + preview chain config -> live audition in browser
```

Current PoC evidence:

- `radio-controls-web-audio-spec.md` already describes a future Web Audio pass.
- The current app still uses native `Audio` playback and server-rendered FX.
- Tone.js was evaluated as the first likely preview prototype candidate, not as a final renderer.

Milestone 1 task:

Add a small preview architecture spec and types before installing any live-audio library. This gives Tone.js or AudioWorklet a clean target later.

## 5. Preserve Current PoC Flows And Tests

Creative meaning:

The studio is already working. We are renovating it while keeping the microphones, tape machine, and export desk usable.

Must preserve:

- script generation and validation
- CAPCOM/SHIP voice casting
- raw TTS generation
- role FX assignment
- environment simulator
- server-side audio processing
- spectrogram generation
- stitch/export
- Playwright smoke coverage
- existing unit tests

Milestone 1 rule:

Any code movement must keep behavior equivalent unless the change is intentionally specified.

## 6. Add Tests Incrementally

Creative meaning:

Each time we label a cable or add a warning light, we add a small continuity check.

Recommended first tests:

- processed status returns `missing_raw` when there is no raw source
- processed status returns `needs_processing` when raw exists but processed audio does not
- processed status returns `current` when signatures match
- processed status returns `stale` when the current recipe differs from the last processed recipe
- CAPCOM role FX controls do not overwrite SHIP controls
- SHIP role FX controls do not overwrite CAPCOM controls

## Implementation Order

### Step 1 - Documentation And Contracts

Create this milestone spec and define the first helper boundaries.

Status:

`in_progress`

### Step 2 - Extract Processed Audio Status Helper

Move stale-audio decision logic into a reusable utility and test it.

Expected files:

- `apps/web/src/workflow/audioStatus.ts`
- `tests/unit/audio-status.test.ts`

### Step 3 - Extract Role FX Resolution Helper

Move role FX control resolution into a reusable utility and test role separation.

Expected files:

- `apps/web/src/workflow/roleFx.ts`
- `tests/unit/role-fx-workflow.test.ts`

### Step 4 - Add Browser Preview Boundary Spec

Define preview-chain terms without installing Tone.js yet.

Expected files:

- `apps/web/src/workflow/browserPreview.ts`
- possibly `docs/alpha/BROWSER_PREVIEW_ARCHITECTURE.md`

### Step 5 - Wire Helpers Back Into The Current App

Use the extracted helpers inside the existing UI with minimal visual change.

Expected outcome:

The app should look and behave almost the same, but the flow logic is now named, tested, and ready for expansion.

## Definition Of Done

Milestone 1 is complete when:

- workflow status helpers are extracted and tested
- role FX resolution is extracted and tested
- stale processed audio state is reusable across screens
- browser preview boundaries are documented or typed
- current PoC behavior still passes validation
- no final-render path has been replaced by preview logic

Validation:

```bash
nvm use 22
npm install
npm run test
npm run build
npm run test:e2e
git diff --check
```
