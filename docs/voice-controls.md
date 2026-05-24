# Voice Controls

The PoC uses OpenAI TTS with `gpt-4o-mini-tts` by default and keeps `wav` output so generated files remain compatible with the radio FX and stitching pipeline.

## Built-in voices
- alloy
- ash
- ballad
- coral
- echo
- fable
- nova
- onyx
- sage
- shimmer
- verse
- marin
- cedar

The UI groups voices with artistic/perceptual labels only:
- `masculine-coded`: ash, echo, onyx, verse, cedar
- `feminine-coded`: coral, nova, shimmer, marin
- `neutral-or-flexible`: alloy, ballad, fable, sage

These group labels are not official OpenAI labels and are not biological classifications.

## Auditioning
Use **Audition Voice** to generate one short sample with the current voice profile:

`Odyssey, this is CAPCOM. Confirm signal lock and proceed with vector correction.`

This does not generate the full script batch.

## Speaker Defaults
**Apply Speaker Defaults** writes per-utterance `voice` profiles into the script JSON based on each utterance speaker:
- CAPCOM: cedar, procedural CAPCOM cadence, high clarity
- SHIP: ash, cockpit cadence, moderate organic variation
- AI_SYSTEM: sage, synthetic onboard AI tone, very high clarity, low organic variation
- DISTRESS_SIGNAL: verse, fragmented weak-signal cadence, higher intensity

If an utterance already has a `voice` object, the backend uses it. Otherwise it falls back to the current global voice profile.

## Controls
- `speed`: sent to OpenAI TTS as `speed`, clamped to `0.25..4.0`.
- `cadencePreset`: plain-language pacing guidance in the `instructions` field.
- `tonePreset`: tone and emotional posture guidance.
- `deliveryPreset`: delivery mode guidance, such as operational readback or low-power transmission.
- `pauseStyle`: natural-language pause guidance. No SSML is generated.
- `intensity`: emotional energy instruction, clamped to `0..1`.
- `organicVariation`: adds slight deterministic delivery variation when above `0.3`.
- `clarityPriority`: tells TTS to preserve intelligibility before the radio FX chain.
- `accentInstruction`: optional pronunciation/accent guidance.

The instruction preview shows the natural-language prompt sent through the `instructions` request parameter.
