# ALPHA2 Narrative Instrument Flow Spec

## Goal

Implement Voice Radio as narrative software, narrative art game, and digital
instrument while preserving the working PoC audio path.

Source of truth:

- `docs/alpha/ALPHA2_CANONICAL_FLOW.md`

## User Flow

Narrative lane:

1. Mission Control creates Narrative Setup JSON.
2. Flight enriches the setup with orbit, telemetry, timers, maps, and sidecar
   context.
3. COMMS chooses antenna route, relay mode, signal parameters, and blackout
   risk.
4. Weather stays one nav tab but splits into Earth Weather and Space Weather.
   Earth Weather handles ground maps, rain/storms, earthquakes, and DSN-region
   effects. Space Weather handles solar, ionosphere, magnetic, and blackout
   effects.

Audio lane:

1. Voice Archetypes casts role voices before final dialogue.
2. Dialogue creates, edits, and validates Radio Dialogue JSON.
3. Radio FX reviews the Narrative Signal Draft, role stacks, fine DSP, presets,
   and stale/current state.
4. Utterance rendering is folded into Dialogue + Radio FX: Dialogue can
   regenerate text/raw source; Radio FX processes the committed render
   decision into the processed clip.
5. Spectrogram is optional and non-blocking.
6. Stitch + Export assembles timeline gaps, stems, relationship notes, and the
   final session package.

## Data / State

Required state objects:

- Narrative Setup JSON
- Situation Card
- Radio Dialogue JSON
- Character / Voice Archetype JSON
- Render Decisions
- Session Package metadata

Freshness rules:

- Narrative, Flight, COMMS, or Weather changes can stale Dialogue and FX draft.
- Voice changes can stale raw TTS and processed audio.
- Dialogue text changes stale raw TTS and processed audio.
- FX/DSP changes stale processed audio.
- Render decision changes stale processed audio.
- Stitch timing changes stale final export.

Stale reason chips:

- `[V]` voice, raw source, or utterance text changed.
- `[E]` environment or Narrative Draft context changed.
- `[C]` CAPCOM stack/render decision changed.
- `[S]` SHIP stack/render decision changed.

## UI Surfaces

Mission Control:

- World map placeholder with active layers.
- NASA/live/cached report cards.
- Flight, COMMS, Weather mirrors.
- Narrative Setup JSON preview.

Flight:

- Earth/SHIP/Moon relative map.
- landing/reentry image placeholders.
- terminal/navigation panel.
- telemetry controls.
- Space sidecar surface.

COMMS:

- DSN map placeholder.
- ground antenna, SHIP antenna, and relay cards.
- signal path diagram.
- frequency, latency, bandwidth, power, blackout risk controls.

Weather:

- Earth Weather page with an Earth Reference Map, ground corridor, DSN exposure,
  rain/storms, typhoon-ready layer, earthquakes, report cards, and ground-side
  chain parameters.
- Space Weather page with a Space Reference Map, solar flare, ionosphere,
  magnetic anomalies, blackout zones, event intensity/duration/envelope/scope,
  report cards, Narrative Signal Draft, and DSP draft preview.
- shared live/cached mode.

Voice:

- role archetype cards.
- portrait prompt slot.
- personality prompt and voice parameters.
- audition controls.

Dialogue:

- dialogue tree.
- dialogue cards.
- per-line storyboard image slot.
- text editor and validation controls.

Radio FX:

- Narrative Signal Draft.
- CAPCOM/SHIP stacks.
- environment influence and fine DSP parameters.
- preset compare/save.
- stale/current render state.

Rendering surfaces:

- per-utterance source decision.
- raw/FX play buttons.
- regenerate raw, render FX, clear FX, clear all.
- processing resolves from the explicit render decision; render decision mode
  and preset are part of the processing signature.

Spectrogram:

- optional raw/processed/final/reference analysis.

Stitch + Export:

- timeline lanes.
- silence gaps and manual timing.
- character relationship graph.
- session package summary.
- stem/final export actions.

## Acceptance Criteria

- Existing script -> TTS -> FX -> stitch flow still works.
- ALPHA2 screens are reachable from grouped left navigation.
- Screenshot-highlighted old right-rail cards are absent from Mission Control.
- Mission Control shows a map/report surface, not a spectrogram preview.
- Radio FX reads explicit render decisions instead of guessing.
- Stitch blocks stale/missing utterance FX and exports only current processed
  clips.
- Optional Spectrogram does not block export.

## Validation

```bash
npm run test
npm run build
git diff --check
```

For UI smoke:

```bash
npm run dev -- --host 127.0.0.1
```

Then open `http://localhost:5173/`.
