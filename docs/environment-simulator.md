# Environment Simulator

The Environment Simulator adds a high-level layer above the existing DSP presets. It does not replace voice generation, radio presets, stitching, or spectrograms. `gpt-4o-mini-tts` remains the recommended TTS default for controlled utterance generation; the simulator shapes the radio link after TTS audio exists.

## Model

The resolved audio path is:

1. Base channel profile
2. Mission geometry / link condition
3. Space weather event
4. Explicit low-level macro overrides

This lets the PoC apply coherent mission conditions such as `ship_comm + lunar_flyby + solar_flare_onset` without manually tuning many unrelated DSP controls.

The current implementation resolves events into static `MacroControls`. Event duration and envelope metadata are already modeled for future temporal modulation, but v1 does not yet modulate intensity per sample inside `audio-fx`.

## Mission Geometry

| Mission Geometry | What it means | Main affected parameters | Sonic result |
| --- | --- | --- | --- |
| LEO Pass | Clean near-Earth link. | `signalQuality`, `scintillationDepth`, `dropoutProbability`, `noise`, `hpHz`, `lpHz` | Clean voice band, low hiss, minimal dropouts. |
| Trans-Lunar Injection | Energetic departure phase with moderate link stress. | `compression`, `noise`, `phaseScintillationMs`, `reflectionDelayMs`, `pttClipMs` | Compressed operational voice with mild phase smear. |
| Midcourse Correction | Procedural link with mild instability. | `jitterAmount`, `repeatProbability`, `scintillationDepth`, `compression` | Subtle repeats and light scintillation while preserving clarity. |
| Lunar Flyby | More distant and bandwidth-constrained lunar pass. | `signalQuality`, `lpHz`, `scintillationDepth`, `jitterAmount`, `telemetryEnabled`, `quindarMode` | Narrower top end, more shimmer, Quindar cues. |
| Far-Side Occlusion | Edge of lunar occultation and signal loss. | `dropoutProbability`, `plcStutter`, `jitterAmount`, `signalQuality`, `granularDensity`, `lpHz` | Dropouts, stutter, lower bandwidth, intermittent packets. |
| Low Elevation DSN | Earth receiving angle degraded by low elevation. | `scintillationDepth`, `noiseLfoDepth`, `phaseScintillationMs`, `reflectionMix`, `brownNoise`, `pinkNoise` | Rolling atmospheric instability and low-frequency hiss. |
| High-Gain Misalignment | Antenna pointing instability. | `signalQuality`, `noiseLfoDepth`, `scintillationDepth`, `dropoutProbability`, `phaseScintillationMs`, `jitterAmount` | Pulsing fades and partial packet loss. |
| Emergency Low-Gain | Poor backup communication path. | `hpHz`, `lpHz`, `downsample`, `compression`, `noise`, `bitDepth`, `signalQuality` | Narrower, grainier, poorer backup link that remains intelligible. |

## Space Weather Events

| Space Weather Event | What it means | Main affected parameters | Sonic result |
| --- | --- | --- | --- |
| Calm Link | Stable baseline. | `signalQuality`, `noise`, `dropoutProbability`, `scintillationDepth`, `packetLossDynamics` | Stable radio with low packet movement. |
| Solar Flare Onset | Rising noisy interference. | `noise`, `whiteNoise`, `downsample`, `datamoshAmount`, `dropoutProbability`, `signalQuality`, `bitDepth` | Growing white hiss and short digital stress. |
| CME Front Arrival | Strong disturbed propagation. | `scintillationDepth`, `scintillationRate`, `phaseScintillationMs`, `jitterAmount`, `repeatProbability`, `dropoutProbability`, `granularDensity`, `signalQuality` | Strong shimmer, phase smear, packet repeats and dropouts. |
| Radiation Burst | Short violent corruption. | `bitDepth`, `downsample`, `datamoshAmount`, `pttClipMs`, `dropoutProbability`, `packetLossDynamics` | Harsh burst-like corruption, not continuous weather. |
| Plasma Bubble Pass | Rolling ionospheric fade. | `scintillationDepth`, `noiseLfoDepth`, `phaseScintillationMs`, `reflectionDelayMs`, `reflectionMix` | Slow moving fade and phase instability. |
| Lunar Far-Side Edge | Progressive approach to loss of signal. | `signalQuality`, `lpHz`, `granularDensity`, `dropoutProbability`, `plcStutter`, `repeatProbability`, `jitterAmount` | Speech fragments break apart as coverage fades. |
| Blackout Window | Severe signal loss. | `dropoutProbability`, `plcStutter`, `granularDensity`, `datamoshAmount`, `signalQuality`, `noise` | Mostly gaps and fragments, not loud noise. |
| DSN Reacquisition | Recovery after loss. | `signalQuality`, `dropoutProbability`, `granularDensity`, `scintillationDepth`, `telemetryLevel`, `quindarDrive` | Link becomes more readable and telemetry clearer. |

## Intensity

Intensity is clamped from `0.0` to `1.0`. Each resolver mixes from the base profile value toward an event-specific target. Blackout and codec-collapse scenarios are allowed to reduce intelligibility; other scenarios preserve speech readability as the priority.

## Spectrogram Workflow

Use spectrograms to compare:

- raw TTS before environment processing
- processed radio audio after mission/weather conditions
- NASA reference audio placed in `artifacts/audio/nasa-reference/`

In the UI, use **Process + Generate Spectrograms** from the Environment Simulator to process the selected utterance and request raw/processed spectrograms.

## Known Limitations and Next Iteration Notes

Event envelopes are currently static approximations. The API and schema already carry `durationMode` and `envelope`, but `audio-fx` does not yet compute event intensity per sample or per frame. This keeps the current v0.1/v0.2 flow stable while leaving a clean path for temporal modulation.

Recommended next iteration:

1. Add a deterministic `eventEnvelopeAt(position01, envelope)` helper.
2. Pass the selected event config through the processing path alongside resolved `MacroControls`.
3. Apply temporal modulation first to scintillation, packet loss, granular density, datamosh, and noise bed.
4. Keep seeded deterministic randomness so renders and tests stay repeatable.
5. Add tests for `ramp_up`, `ramp_down`, `bell`, `pulse_train`, and `collapse_then_recover`.
6. Use raw/processed spectrogram pairs to verify that temporal events create visible changing bands, dropouts, or fragments.
7. Later, port the same envelope helper to an AudioWorklet for real-time preview.

Validation before committing environment/audio UI changes should use Node 22 to avoid engine mismatch warnings:

```bash
nvm use 22
npm install
npm run test
npm run build
npm run test:e2e
```

The enhanced FX Lab was implemented incrementally inside the existing app. A broader v3 refactor into the full `AppShell`, atom library, screen store, and routeable screens should be treated as a separate follow-up after this FX Lab validation and commit.
