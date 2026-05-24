# Screen 01 — Console

**Default landing screen.** Live mixer view of the current scene.

Layout: full shell. Page padding 16. Vertical flex with 12px gap.

## Header row

```
H1  "Mission Console"  + Tag(muted) "Scene 03 · Approach burn"  + Tag(green, filled) "Live"
sub "4 utterances · 14.3s · pt-BR · CAPCOM ↔ SHIP" (mono muted)

Right: tag-style "FX SCENE" label + Btn group ["STORM '65" primary, "LO-ORBIT" ghost, "EMERGENCY" ghost, "+ NEW" ghost]
```

## Two-column row

### Left card — Spectrogram (sub: "U3 · CAPCOM · post-FX")

- Header action: Btn group [Dry ghost, FX primary, NASA ghost]
- Body: 180px copper spectrogram (panel-lo bg) with 80×18 bin grid, freq labels (8k/4k/1k/250) on left, copper playhead ~32%.
- Below spectro: 4-col grid of metric Readouts: PEAK -3.2 dB (copper), RMS -12.4 dB, SNR 42.1 dB (green), ROLLOFF 3.4 kHz.

### Right card — Voice / Take (sub: "U3 · ash")

- Header action: Btn ghost "Open lab →" (links to Voice Lab).
- Top: speaker pill CAPCOM · ash · masc, transcript copy in mono 11.5 (the current utterance text), tag row [Calm, Procedural, 0.95×, "Quindar ↻" copper].
- Right column: two stacked Knobs — Level 0.78, Quindar 0.42.
- Bottom: 2×2 Slider grid: Speed 0.95, Intensity 0.25, Organic 0.62, Clarity 1.0 (last shows PEAK state).

## Channel strip rail

Card title "Channels" sub "6 strips · master right" with header actions [+ Add, Group, Reset].

Body: `display: grid; grid-template-columns: repeat(6, 1fr); border-top: 1px solid hair`. Six strips:

| label | speaker | voice | level | pan | fx scene | flags |
|---|---|---|---|---|---|---|
| U1 | CAPCOM | ash | 0.78 | -0.2 | STORM '65 | processed |
| U2 | SHIP   | coral | 0.62 | +0.3 | LO-ORBIT | processed |
| U3 | CAPCOM | ash | 0.84 | -0.2 | STORM '65 | processed, **active**, solo |
| U4 | SHIP   | coral | 0.55 | +0.3 | LO-ORBIT | pending |
| QD | —      | tone | 0.42 | 0.0  | QUINDAR | processed |
| BUS | —     | —    | 0.92 | 0.0  | MASTER  | **master** |

See `components.md` `ChannelStripProps` for the strip's contents (label/speaker pill/voice tag/FX chip/pan/meter+fader/dB/M-S-FX buttons).

## State

- `currentUtteranceId` selects the active strip (and drives the voice/spectro cards).
- Dragging the fader updates `levels[utteranceId]`. Debounce 120ms before re-rendering DSP.
- M / S / FX buttons toggle local flags. M and S are mutually independent (S takes audio precedence).
