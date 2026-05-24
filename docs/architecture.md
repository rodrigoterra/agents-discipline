# Architecture

The PoC is a local monorepo with npm workspaces.

Flow:
1. Browser sends scene brief to `/api/script/generate`.
2. Server calls OpenAI Responses API using Structured Outputs JSON schema.
3. Script is validated by shared Zod schema and cached.
4. Browser requests per-utterance or batch TTS via `/api/tts/*`.
5. Server calls OpenAI speech endpoint (`gpt-4o-mini-tts`) and caches WAVs.
6. Browser sends macro DSP controls to `/api/audio/process`.
7. Server resolves macro controls through `@voice-radio/audio-core` and renders deterministic DSP in `@voice-radio/audio-fx`.
8. Browser requests final stitch via `/api/audio/stitch`.
9. Static WAV assets are served from `/generated/*` for preview/export.
10. When a session ID is provided, raw, processed, and final WAV mirrors are written to `artifacts/audio/*`.
11. Spectrogram routes call FFmpeg `showspectrumpic` and serve generated PNGs from `/artifacts/spectrograms/*`.

## Audio subsystem modules
- `@voice-radio/audio-core`: macro control types + preset resolution mapping
- `@voice-radio/audio-fx`: deterministic DSP pipeline modules and WAV render
  - PTT/VOX onset clipping
  - Quindar intro/outro tone stage
  - voice bandpass stage
  - bitcrusher stage
  - stochastic scintillation + phase smear stage
  - short reflection stage
  - packet-loss/PLC stage
  - granular jitter/dropout/stutter stage
  - datamosh stage
  - organic white/pink/brown hiss bed with LFO + gate
  - master dynamics stage
- `apps/server/src/audio/spectrogram.ts`: FFmpeg command builder, artifact path safety, raw/processed/final/NASA spectrogram generation

Guardrails:
- hash-based cache for script and TTS
- usage log written to `fixtures/generated/usage-log.jsonl`
- hard-stop by request count or estimated spend thresholds
- spectrogram input/output paths are constrained to the local `artifacts` tree
