# Tests Map

Use this directory to understand where confidence comes from before changing
shared behavior.

## Unit Tests

- `unit/audio-status.test.ts` - raw/processed/current/stale status.
- `unit/render-decisions.test.ts` - render decision source resolution.
- `unit/stitch-readiness.test.ts` - Stitch blocking for stale/missing clips.
- `unit/narrative-audio.test.ts` - Narrative/Weather data feeding dialogue
  prompts and audio macro overrides.
- `unit/audio-core.test.ts` - DSP macro controls and environment presets.
- `unit/audio-fx.test.ts` - deterministic DSP and stitch helpers.
- `unit/schema.test.ts` - Radio Dialogue JSON shape.
- `unit/script-composer.test.ts` - prompt/composer behavior.
- `unit/server.test.ts` - API route behavior with mocked dependencies.
- `unit/spectrogram.test.ts` - spectrogram path and command helpers.
- `unit/tts.test.ts` - TTS wrapper behavior.
- `unit/voice-core.test.ts` - voice archetype helpers.

## E2E Tests

- `e2e/smoke.spec.ts` - mocked happy-path UI flow. This is not an OpenAI or
  DSP integration test.

## Common Commands

```bash
npm run test
npm run test -- audio-status
npm run test -- audio-status render-decisions narrative-audio stitch-readiness
npm run test:e2e
npm run build
git diff --check
```
