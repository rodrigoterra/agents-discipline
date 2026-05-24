# Screen 08 — Spectrogram

> スペクトログラム · optional analysis · never blocks export

A side-by-side comparison surface. Operators check Raw / Processed / Stitched against a NASA reference, look at the per-band match, and read comparison notes. **This screen is optional.** Skip it and export still works.

`<AShell2 active="spectro">`.

## Header

```
<GlyphSigil spectro> · h1 "Spectrogram" + jp "スペクトログラム"
                     + Tag(copper, filled) "U3 · CAPCOM"
                     + Tag(muted)          "Optional"

sub: "optional analysis · never blocks export"
actions: Btn "Side-by-side" + Btn "Overlay" + Btn(primary) "Match NASA"
```

## Two-column body (1.4fr / 1fr)

### Column 1 — 4 spectrogram panels (stacked)

`<SpectroPanel>` × 4, each `flex: 1`:

| label | color | state |
|---|---|---|
| RAW · pre-FX · 3.2s | copper | green LED |
| PROCESSED · post-FX | copper | `<AStaleChip reasons=["env"]>` |
| STITCHED · final | green | green LED |
| NASA · A13-OXYGEN-COMM-04 | blue | green LED |

Body: 100×12 grid of cells, energy from a deterministic gaussian-plus-sinusoid formula. Opacity scaled to the energy value × 0.92.

### Column 2 — Match · diff + comparison notes

#### Match · diff

`<ACard title="Match · diff" sub="processed vs NASA">`

Top: 4 readouts:
- Δ SPECT +2.4 dB (blue)
- Δ LUFS +3.1 (amber)
- MATCH 0.84 (green)
- GEN 18:42

Below: per-band match bars — 8 frequency bands (120 / 250 / 500 / 1k / 2k / 4k / 8k / 16k), each a vertical bar colored by score (green > 0.8, amber > 0.7, red ≤ 0.7) with the score floating above the bar.

#### Comparison notes

`<ACard title="Comparison notes" sub="optional commentary">`

Read-only `<pre>` text:

```
Processed FX matches NASA at 0.84.
1.2 kHz peak is +2.4 dB hotter — the
voice-band drive is tracking too high
under CME ramp. Try drop drive by 0.05
or raise comp threshold by 1 dB.

This screen is optional. Skip it and
export still works.
```

## State

The screen reads `spectrogramMeta[selectedUtteranceId]` and `nasaReferences`. Currently hard-coded to U3 · CAPCOM · A13-OXYGEN-COMM-04 in the canvas.

## Rules

- The screen is never required before Stitch / Export — confirmed by both the header tag and the notes copy.
- Side-by-side vs Overlay vs Match NASA are display modes, not states (no commit action here).
- "Match NASA" (primary) flips on the diff overlay between Processed and NASA. Doesn't modify any FX state.
