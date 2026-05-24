# Web Audio Radio Controls Spec (PoC+)

Goal: move from static file processing to interactive Web Audio controls that feel closer to space/deep-space transmission.

For the current server-rendered PoC, high-level Mission Geometry and Space Weather controls resolve to the same macro controls described here. Their event envelopes are currently metadata/static approximations; a later AudioWorklet/Web Audio pass can use the same config shape for per-frame modulation. See [Environment Simulator](environment-simulator.md).

## Transmission chain (recommended order)
1. Input gain trim
2. High-pass filter (rumble removal)
3. Band-pass voice shaping (narrow radio bandwidth)
4. Soft-knee compressor
5. Saturation / drive (very mild)
6. Noise/hiss bed (white, pink, brown, LFO, and gate scoped by channel)
7. Optional short delay / slap (spacecraft comm reflection)
8. Packet loss / dropouts / jitter (degraded profile only)
9. Separate Quindar tone path and final bracketing
10. Output limiter

## Minimum user-facing controls
- Preset selector (`earth_capcom_v2`, `ship_comm_v2`, `deep_space_degraded_v2`)
- Intensity master control (0..1)
- Bandwidth (Hz, or Low/Med/High)
- White, pink, and brown noise amounts
- Hiss LFO rate/depth
- Hiss gate threshold/depth
- Packet dynamics macro
- Quindar level, duration, and drive
- Distortion amount
- Compression amount
- Delay mix / time
- Degradation mode:
  - off
  - occasional dropouts
  - burst packet loss

## Advanced controls (optional)
- Auto-duck background noise while speech is active
- Squelch threshold
- PTT click (on/off)
- Random seed lock for deterministic previews
- Latency simulation (one-way delay)

## Suggested default presets

### earth_capcom_v2
- cleaner and tighter
- light compression, very low hiss
- narrow but intelligible passband

### ship_comm_v2
- slightly more saturation
- moderate hiss
- subtle short reflection

### deep_space_degraded_v2
- intermittent dropouts
- stronger band limiting
- higher hiss and mild flutter
- optional one-way delay

## PDF-derived Artemis simulator presets
- `apollo_heritage_clean`: clean 300-3000Hz passband, 16-bit, no packet loss, Quindar intro/outro.
- `throttled_s_band_lunar`: reduced bit depth, sample-rate reduction, light packet loss, moderate hiss.
- `ionospheric_storm_s4`: strong amplitude scintillation, phase smear, and rolling dropouts.
- `codec_failure_datamosh`: low density granular packets, high scatter/jitter, PLC stutter, and datamosh folding.

## UX notes
- Keep real-time controls responsive (<16ms UI response)
- Provide A/B compare (dry/wet toggle)
- Show quick waveform + loudness meter
- Offer "Reset preset" and "Save as custom preset"

## Next iteration trigger

After the enhanced FX Lab changes are validated and committed, treat temporal event modulation as the next implementation pass. The current `durationMode` and `envelope` fields are intentionally forward-compatible, but still resolve to static DSP controls. The next pass should move envelope evaluation into `audio-fx` or an AudioWorklet without changing the existing TTS, processing, stitching, or spectrogram API contracts.
