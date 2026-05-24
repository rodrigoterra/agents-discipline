# Voice Radio PoC Index

This is the living map for the `voice-radio-poc` monorepo. Use it before
searching blindly.

## Product Shape

Voice Radio ALPHA2 is a local-first narrative radio instrument:

1. Narrative lane: Mission Control, Flight, COMMS, Weather with Earth Weather
   and Space Weather internal pages.
2. Audio lane: Voice Archetypes, Dialogue, Radio FX, optional Spectrogram,
   Stitch + Export. Utterance rendering is folded into Radio FX + Dialogue
   (no standalone Render screen).
3. TOOLS lane (inspection, not production): Seismograph, Relative. Read-only
   instruments; they do not feed the creative chain or session package.
4. Python sidecar: orbital tracking and day/night geometry for Flight.

Primary product spec:

- `docs/alpha/ALPHA2_CANONICAL_FLOW.md`
- `docs/alpha/ALPHA2_IMPLEMENTATION_PLAN.md` - phased build plan + decision log.
- `docs/alpha/ALPHA2_NARRATIVE_INSTRUMENT_FLOW.md` - earlier planning spec.

Current ALPHA2 contract:

- Render decisions are real data, not labels. Processing resolves each
  utterance from Narrative Draft, Role Stack, Preset Override, or Manual
  Override and includes that choice in the signature.
- Stitch/export blocks missing or stale processed clips. It never exports old
  audio silently.
- Stale reason chips are `[V][E][C][S]`: voice/text/raw source, environment or
  narrative context, CAPCOM stack, SHIP stack.
- Earth Weather and Space Weather both feed the Narrative Signal Draft; Earth
  Weather also contributes macro overrides to the resolved environment audio.

## Entry Points

- `apps/web/src/App.tsx` - main ALPHA2 React shell and local session state.
- `apps/web/src/styles.css` - current app styling and ALPHA2 placeholders.
- `apps/web/src/screens/FXLab/` - Radio FX/DSP review rack.
- `apps/web/src/screens/Space/` - Flight-side orbital map surface.
- `apps/web/src/space/` - browser client for the Python sidecar.
- `apps/web/src/workflow/audioStatus.ts` - processed audio current/stale state
  and `[V][E][C][S]` stale reasons.
- `apps/web/src/workflow/renderDecisions.ts` - render decision resolution and
  signature shape.
- `apps/web/src/workflow/stitchReadiness.ts` - Stitch hard gate for current
  processed clips.
- `apps/web/src/workflow/narrativeAudio.ts` - Narrative/Weather bridge into
  dialogue prompts and environment macro overrides.
- `apps/server/src/index.ts` - Express API for scripts, TTS, FX, stitch,
  spectrograms, and sidecar health proxy.
- `packages/schema/src/index.ts` - Zod schema for Radio Dialogue JSON.
- `packages/audio-core/` - macro controls, presets, environment simulation.
- `packages/audio-fx/` - deterministic DSP and WAV stitch logic.
- `packages/voice-core/` - voice archetypes and TTS instruction helpers.
- `src/space/` - Python FastAPI + Skyfield sidecar.

## Agent And Design Files

- `AGENTS.md` - shared rules, commands, validation, and definition of done.
- `CLAUDE.md` - Claude Code project memory.
- `CLAUDE.local.example.md` - template for private local preferences.
- `.claude/settings.json` - shared Claude Code permission allowlist.
- `.claude/settings.local.example.json` - template for personal permissions.
- `.claude/rules/` - scoped agent rules by domain.
- `.claude/output-styles/writing.md` - preferred answer style for Claude Code.
- `specs/` - feature contracts and acceptance criteria.
- `design_handoff_voice_radio_alpha2/` - Claude Design handoff.

## Commands

Run from `voice-radio-poc/` unless noted.

```bash
npm install
npm run test
npm run test -- audio-status render-decisions narrative-audio stitch-readiness
npm run build
git diff --check
npm run dev -- --host 127.0.0.1
```

Sidecar:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-sidecar.txt
python scripts/download_natural_earth.py
./scripts/run_sidecar.sh
```

Browser:

```text
http://localhost:5173/
```

If port 5173 is already used, Vite may move to 5174 or later. Read the
terminal output.

## Test Map

- `tests/unit/audio-status.test.ts` - stale/current processed audio state.
- `tests/unit/render-decisions.test.ts` - render decision source resolution.
- `tests/unit/stitch-readiness.test.ts` - Stitch blocking for stale/missing
  processed clips.
- `tests/unit/narrative-audio.test.ts` - Earth Weather and Narrative Signal
  Draft bridge into audio/generation data.
- `tests/unit/audio-core.test.ts` - DSP macro controls and environment logic.
- `tests/unit/audio-fx.test.ts` - deterministic audio FX.
- `tests/unit/schema.test.ts` - Radio Dialogue JSON schema.
- `tests/unit/server.test.ts` - Express routes with mocked dependencies.
- `tests/e2e/smoke.spec.ts` - mocked happy-path UI smoke.

## Generated And Local Data

- `fixtures/generated/` - generated audio fixture output.
- `artifacts/audio/nasa-reference/` - local reference audio for spectrograms.
- `artifacts/spectrograms/` - generated spectrogram images.
- `data/natural_earth/`, `data/tle_cache/`, `data/skyfield_cache/` - sidecar
  data/cache, gitignored.
