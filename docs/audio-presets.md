# Audio FX Controls and Profiles

The audio renderer resolves profile presets plus explicit DSP controls into deterministic WAV output. The current PoC still renders on the server; these controls are shaped so the next PoC can move the same stages into Web Audio / AudioWorklet nodes.

The Environment Simulator now sits above these profiles. Mission geometry and space weather choices resolve into the same `MacroControls` listed below, then explicit low-level overrides can still be applied. See [Environment Simulator](environment-simulator.md).

## DSP chain order
1. PTT/VOX onset clipping
2. Voice bandpass
3. Bit depth quantization and sample-hold downsampling
4. Ionospheric scintillation: stochastic amplitude fade plus phase smear
5. Short reflection delay
6. Packet loss and PLC repeat
7. Granular codec failure: scatter, density gaps, static-buffer stutter
8. Datamosh fold
9. Organic hiss bed: white, pink, and brown noise with LFO and gate
10. Master compression, drive, and noise glue
11. Separate Quindar intro/outro tone bracketing

## Exposed controls
- `hpHz`, `lpHz`: voice passband, typically around 300-3000 Hz.
- `bitDepth`, `downsample`: quantization and sample rate reduction.
- `compression`, `drive`, `noise`: final codec/radio coloration and last-stage noise glue.
- `whiteNoise`, `pinkNoise`, `brownNoise`: independent background hiss colors.
- `noiseLfoRate`, `noiseLfoDepth`: slow modulation for breathing/rolling hiss.
- `noiseGateThreshold`, `noiseGateDepth`: voice-reactive hiss ducking so background noise moves around utterances.
- `scintillationDepth`, `scintillationRate`, `phaseScintillationMs`: ionospheric fading and phase corrugation.
- `reflectionDelayMs`, `reflectionMix`: short spacecraft/channel reflection.
- `dropoutProbability`, `repeatProbability`: packet loss and packet-loss concealment repeat.
- `packetLossDynamics`: second degradation axis that fine-tunes bit depth, downsampling, packet loss, jitter, PLC stutter, granular density, and datamosh together.
- `jitterAmount`, `grainSizeMs`, `granularDensity`, `plcStutter`: granular model for network jitter, dropouts, and failed receiver buffers.
- `datamoshAmount`: non-linear corrupted-codec folding.
- `pttClipMs`: clipped speech onset from PTT/VOX timing.
- `quindarMode`: intro/outro/off placement for each clip.
- `telemetryLevel`, `quindarToneMs`, `quindarDrive`: the three dedicated Quindar processing variables.
- `telemetryOffsetMs`: placement offset before a generated Quindar tone.

## Quindar tone behavior
Quindar tones are modeled as hard-gated sine waves:
- Intro: 2525 Hz for 250 ms
- Outro: 2475 Hz for 250 ms

The tones are generated in a separate tone path after the voice path is processed. They are not bitcrushed, packet-dropped, datamoshed, hiss-gated, or compressed with the voice. The envelope is intentionally not faded, matching the abrupt switching described in the reference PDF.

## Built-in profiles
- `earth_capcom`: clean ground-side radio with low hiss.
- `ship_comm`: moderate spacecraft saturation, hiss, reflection, and light scintillation.
- `deep_space_degraded`: lower SNR with stronger fading, dropouts, and codec stress.
- `apollo_heritage_clean`: PDF figure preset with 16-bit clarity, classic passband, and Quindar bracketing.
- `throttled_s_band_lunar`: PDF figure preset for quantized lunar S-band with reduced sample rate and mild packet loss.
- `ionospheric_storm_s4`: PDF figure preset emphasizing deep stochastic fading and phase smear.
- `codec_failure_datamosh`: PDF figure preset with sparse granular packets, PLC stutter, jitter, and harsh folding.

## Custom profiles
The web app can save the current Audio FX panel values as a custom profile in browser local storage. Custom profiles are local to the browser and are sent to the server as expanded control values when processing a clip.
