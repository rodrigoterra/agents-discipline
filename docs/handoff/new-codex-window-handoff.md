# Handoff for New Codex Window

Last updated: 2026-05-12

## Current Status

The current work spans the Voice Radio PoC environment simulator, FX Lab UX pass, and a backend safety review. A context compaction happened during this round, so this handoff should be considered active if a new Codex window takes over before commit.

The repo is not committed yet. Do not reset, clean, checkout, or stash unless Rodrigo explicitly asks.

## Implemented Since The Last Stable Commit

- Added mission geometry and space weather environment resolution in `packages/audio-core`.
- Extended schema support for optional environment defaults and utterance-level environment config.
- Added backend environment resolution metadata for audio processing.
- Added the v3 UI shell and enhanced FX Lab screen.
- Improved FX Lab flow with role assignment, numbered test-bench actions, functional OLED readouts, stack tracker text, save/delete preset actions, and extra Preview FX entry points.
- Added a TTS Scratchpad Source panel inside FX Lab so the user can see the selected utterance text, CAPCOM/SHIP voice assignments, audition a scratchpad line, and generate the raw test clip before applying radio FX.
- Added clearer process/preview feedback for FX Lab buttons. Missing raw TTS now reports a visible status instead of feeling like a dead click.
- Added a global visual debug/error panel, plus local FX button error text, so failed preview/play/process actions are visible outside the Console screen.
- Unlocked channel/degradation crossing: loading a channel preset now preserves the current degradation layer, and degradation changes no longer force the UI back to `manual`.
- Added explicit Channel/Degradation test actions: `Process Channel Test`, `Preview FX`, and `Play Channel FX`.
- Clarified `Use Live Rack` vs role assignment: Live Rack follows every current rack change; Assign creates/updates a role snapshot.
- Reframed the old resolved environment summary as an Environment Commit Station that explains what changes sound, what only previews, and what updates Stitch/spectrogram output.
- Added NASA reference audio discovery and URLs so the FX comparison panel can find/play local files such as `artifacts/audio/nasa-reference/manual-smoke.wav`.
- Added OpenAI script-composer JSON parse guards.
- Hardened server request-limit env parsing, local CORS defaults, OpenAI client handling, cache read errors, generated-path realpath checks, and cost-slot reservation timing.
- Replaced fixed 44-byte WAV assumptions with RIFF chunk parsing for 16-bit mono PCM.
- Pinned Docker base image to `node:22.10-bookworm-slim`.
- Added/updated tests for audio-core, schema, audio-fx, script-composer, server routes, and e2e smoke coverage.
- Updated docs including `docs/api.md`, `docs/environment-simulator.md`, `docs/audio-presets.md`, `docs/radio-controls-web-audio-spec.md`, `CLAUDE.md`, and `llms.txt`.

## Validation Already Run

From `voice-radio-poc/`:

```bash
npm run build
npm run test
npm run test:e2e
git diff --check
grep -RInE '^(<<<<<<<|=======|>>>>>>>)' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=test-results .
```

Observed results:

- `npm run build` passed.
- `npm run test` passed: 8 files, 44 tests.
- `npm run test:e2e` passed when run outside the sandbox: 1/1 Playwright smoke.
- `git diff --check` passed.
- Merge-marker scan returned no tracked-source conflicts.
- Browser visual check of `http://localhost:5173/` confirmed the FX Lab renders with the TTS Scratchpad Source panel, Environment Commit Station, button status, and missing-raw feedback.
- Final browser check intentionally clicked `5 Play Processed FX` without processed audio and confirmed visible `Action Error` plus local button-status error text.

Note: the first sandboxed e2e/dev attempts failed with `listen EPERM` from `tsx`/Vite. That was sandbox-only. The escalated e2e run passed.

## Known Runtime Context

- Ports `3001` and `5173` were already in use by existing local dev processes during the latest visual QA and were left alone.
- The current shell reported Node `v25.9.0`; use Node 22 for the final pre-commit validation pass.

## Next Window Checklist

1. Start by checking:

```bash
cd /Users/rodrigoterra/Projeto_Games_Local/Teste-Voice-Radio/voice-radio-poc
git status --short
git branch --show-current
```

2. If continuing validation before commit, rerun:

```bash
npm run build
npm run test
npm run test:e2e
```

3. If visually reviewing the app:

```bash
npm run dev
```

If the sandbox blocks local ports, rerun with permission. Open the Vite URL printed by the terminal.

4. Before commit, inspect the large diff by theme:

```bash
git diff --stat
git diff -- apps/server/src/index.ts packages/audio-fx/src/index.ts packages/script-composer/src/index.ts
git diff -- apps/web/src/App.tsx apps/web/src/screens/FXLab apps/web/src/styles.css
git diff -- docs tests packages/audio-core packages/schema
```

## Suggested Commit Message

```text
Improve FX Lab flow and harden voice-radio pipeline safety
```

## Next Iteration Notes

- Event envelopes are still static approximations. The config shape is ready for future temporal modulation inside `audio-fx` or an AudioWorklet.
- A future modulation system should connect the environment envelope model to time-varying DSP stages instead of only resolving static macro controls.
- For the Alpha/v1 live-FX version, move the preview/tweak loop toward an `AudioWorklet` architecture (and evaluate supporting Web Audio/DSP helper libraries) so channel, degradation, environment, and Fine DSP changes can be heard continuously instead of requiring server-side reprocessing after each change.
- Consider deeper server-route integration tests that exercise real audio and OpenAI failure paths beyond the current mocked e2e smoke.
- Keep Node 22 for final commit validation to avoid engine mismatch warnings.
