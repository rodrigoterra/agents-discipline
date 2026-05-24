# DSP Library Evaluation

## Purpose

This document is for evaluating JavaScript audio, DSP, analysis, visualization, and Web Audio libraries before adding them to the project.

The goal is not to collect impressive libraries. The goal is to decide which ones actually help the Voice Radio workflow.

## Creative Questions

For each library, ask:

- What new sound or workflow does this make possible?
- Does it help the user hear changes faster?
- Does it help create better radio character?
- Does it help analyze or compare audio?
- Does it support the mission-radio mood without making the app harder to use?

## Technical Questions

For each library, check:

- Does it work in the browser, Node/server, or both?
- Does it use Web Audio, AudioWorklet, WASM, workers, or plain JavaScript?
- Is it suitable for real-time preview, final rendering, analysis, or visualization?
- Is it actively maintained?
- Is it small enough for the web app?
- Does it work without external services?
- Does it have a compatible license?
- Can it run deterministically enough for tests?
- Does it conflict with the current Vite/React/server setup?

## Evaluation Template

Use this format when sharing a library:

```text
Library name:

Link:

What attracted you to it:

Feature area:
DSP / live preview / analysis / visualization / sequencing / file export / other

Creative possibility:
What could this help the Voice Radio app do?

Specific effects or tools:
Examples: filters, convolution, compression, saturation, noise, vocoder, spectral analysis, waveform, spectrogram, worklet, offline render.

Known concerns:
Anything suspicious, old, heavy, commercial, unclear, or hard to use?

Docs/examples to inspect:
Paste links or notes.
```

## Evaluation Output

Each reviewed library should receive:

- `fit`: strong / possible / weak / no
- `best use`: where it belongs in the app if useful
- `risk`: low / medium / high
- `prototype recommendation`: yes / no / later
- `implementation notes`: what to test first

## Applicability Buckets

### Live Preview Candidate

Useful when the library can help users hear changes immediately in the browser.

Examples:

- filter preview
- noise preview
- distortion preview
- compression preview
- packet loss simulation preview

### Export Render Candidate

Useful when the library is better for final processing than immediate interaction.

Examples:

- higher quality offline processing
- file stitching
- loudness normalization
- batch analysis

### Analysis Candidate

Useful when the library helps understand the sound.

Examples:

- waveform
- spectrogram
- frequency analysis
- reference matching
- audio feature extraction

### Visualization Candidate

Useful when the library helps the user see signal behavior, but does not directly change audio.

Examples:

- meters
- scope displays
- spectral displays
- timeline views

### Not A Fit

The library may be interesting but not useful if it:

- depends on cloud services
- is too heavy for the browser
- is unmaintained and risky
- duplicates existing code without adding value
- makes final export less reliable

## Candidate Evaluation - Howler.js

Source:

- <https://howlerjs.com/>
- <https://github.com/goldfire/howler.js>
- <https://www.npmjs.com/package/howler>

Status:

- `fit`: possible
- `best use`: browser playback manager, preview transport, audio sprites, simple fades, grouped playback, mobile playback reliability
- `risk`: low to medium
- `prototype recommendation`: later, only if playback orchestration becomes painful

Creative read:

Howler is like a reliable studio playback deck. It is good at loading, playing, pausing, seeking, fading, looping, and organizing sound files so the app feels less fragile when previewing clips.

It is not a deep sound-design rack. It does not give us a rich set of radio DSP modules by itself.

Useful possibilities:

- More reliable browser playback for generated voice clips.
- Audio sprites for quickly auditioning segments from a longer rendered file.
- Cleaner grouped controls, such as muting or fading all preview sounds.
- Simple fades and rate changes for UI preview moments.
- Possible stereo or spatial preview if we later want "mission control vs spacecraft" placement.

Where it fits in Voice Radio:

- Preview/player layer.
- Timeline auditioning.
- Clip transport controls.
- Possibly stitch/export preview playback after files already exist.

Where it does not fit:

- It should not replace the server-side export renderer.
- It should not be treated as the main DSP expansion path.
- It does not solve AudioWorklet/live knob processing.

Technical notes:

- It defaults to Web Audio and can fall back to HTML5 Audio.
- It has zero runtime dependencies and is small compared with heavier audio frameworks.
- It has an MIT license.
- It is mature, but not a fast-moving DSP toolkit.

Decision:

Do not add Howler first. Keep it as a practical option if the native browser audio controls become messy during ALPHA preview/timeline work.

## Candidate Evaluation - Tone.js

Source:

- <https://tonejs.github.io/>
- <https://tonejs.github.io/docs/14.7.39/Transport>
- <https://www.npmjs.com/package/tone>

Status:

- `fit`: strong for browser-side preview experiments
- `best use`: live preview chains, effect auditioning, meters/analyzers, timed events, modulation, future sound-design experiments
- `risk`: medium
- `prototype recommendation`: yes, behind a small isolated browser-preview prototype

Creative read:

Tone.js is closer to a mini browser DAW. It has timing, effect modules, filters, meters, signal tools, synth tools, and ways to schedule sound events.

For Voice Radio, the exciting part is not "music making." The exciting part is fast sound-design feedback: the user turns a knob and immediately hears something closer to the intended radio texture.

Useful possibilities:

- Browser-side preview of filters, compression, distortion, delay, bitcrushing, tremolo/vibrato-like movement, pitch shifts, EQ, and convolution.
- Timed events for Quindar tones, gaps, scripted cues, and A/B preview playback.
- Live meters, FFT, waveform, and analyser views.
- Modulation experiments for signal drift, flutter, fading, and space-weather-like behavior.
- Role-specific preview chains for CAPCOM and SHIP before committing to final server render.

Where it fits in Voice Radio:

- ALPHA live-preview sandbox.
- Role FX auditioning.
- DSP comparison controls.
- Metering and visual feedback.
- Possible future bridge between static presets and live browser audio behavior.

Where it does not fit:

- It should not immediately replace the deterministic server-side PCM export pipeline.
- It should not become the only source of truth for final audio unless we prove offline render parity.
- It may be more library than we need if the first ALPHA goal is only basic playback.

Technical notes:

- It is built around Web Audio.
- It includes DAW-like transport/scheduling, effects, components, analysis helpers, and signal tools.
- It has built-in TypeScript declarations.
- It is MIT licensed.
- It is much larger than Howler and should be isolated carefully if added.
- Browser audio still requires user gesture startup, so preview UX must include a clear first user action.

Decision:

Prototype Tone.js first, but only in a contained preview module. Treat it as a live audition layer, not the final render engine.

Recommended prototype:

Build a small `browser-preview` experiment that loads an existing generated voice clip and applies a role-specific preview chain:

```text
Voice clip
-> high-pass / band-pass style filtering
-> compression
-> distortion or bitcrush
-> noise/modulation experiment
-> delay/reflection
-> meter/analyser
-> speakers
```

Success criteria:

- The user can hear obvious changes without asking the server to re-render.
- CAPCOM and SHIP can have different preview chains.
- The app can still mark the server-rendered/export audio as stale when settings change.
- The final export path remains unchanged.
- The dependency does not make build/test behavior unstable.

## Initial Recommendation

Tone.js is the better first research candidate for ALPHA because it can expand the sound-design vocabulary.

Howler.js is useful, but it solves a different problem: dependable playback orchestration. It is worth keeping in reserve for timeline/player ergonomics, not for DSP depth.
