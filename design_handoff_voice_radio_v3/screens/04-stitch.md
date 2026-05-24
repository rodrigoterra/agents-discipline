# Screen 04 — Stitch & Export

**Final assembly.** Multi-lane timeline, per-utterance A/B, export targets + manifest.

## ALPHA2 delta

For ALPHA2, this screen is not just an export panel. It is the final audio-instrument surface where the user inspects timing, silence, rendered clips, stale reasons, stems, and narrative relationships before export.

Recent implementation:

- Full-width DAW strip inside the Stitch card.
- Time ruler across the top.
- CAPCOM lane for CAPCOM clips.
- SHIP lane for SHIP clips.
- QD lane for Quindar markers.
- FX lane for the scene/environment bed.
- Clip badges show ready, stale, or needs render.
- Stale-reason legend sits above the timeline.
- Per-utterance A/B dry-vs-FX controls remain below the DAW strip.

Use the v3 lane spec below for density, colors, and timeline mechanics. Do not reduce ALPHA2 Stitch back to a generic export form.

Layout: full shell, page padding 16, vertical flex 12px.

## Header

```
H1 "Stitch & Export"
sub "{N} utterances · {totalSeconds}s · {ready}/{total} ready · {staleCount} stale FX"

Right: [Re-stitch all ghost] [Preview master secondary] [Export · WAV + JSON primary]
```

## Timeline card — pad 0

Title "Timeline" sub "{N} utterances". Header actions:
```
"Crossfade" muted | [− ghost] [120ms] [+ ghost] | [Snap ghost] [Quindar gaps ghost]
```

Body: padding 14, top hair border.

### Time ruler (height 18, mb 6)
Tick marks at 0, 2, 4, 6, 8, 10, 12, 14 seconds.

### Lanes (4 lanes, 6px gap)

```
| 70px label gutter | 1fr track |
```

Lanes (in order, top to bottom):

1. **CAPCOM** — speaker color `--amber`. Items: utterances where speaker=CAPCOM.
2. **SHIP** — `--green`. Items: speaker=SHIP.
3. **QUINDAR** — `--amber`. 4px-wide markers at start/end of any utterance with `quindar.intro` / `quindar.outro`.
4. **FX BUS** — `--copper`. Dense waveform overlay across the full track.

Lane gutter: 8×8 colored square + tag-style lane name.

Track: 38px tall, panel-lo bg, hair border, radius 2.

Utterance block on its lane:
- absolute-positioned by start/duration % of `totalMs`.
- bg: `linear-gradient(180deg, speakerColor*cc, speakerColor*66)` if processed; panel-lo otherwise.
- border: `speakerColor`, OR `--red` if `stale: true`.
- contents: top row "U{n}" (display 9/700, near-black) + optional `STALE` red pill; second row truncated transcript (mono 8, black @ 0.85 opacity).

Copper playhead vertical line spans all lanes at the current playhead position.

### Time triplet below lanes
`00:00.000 | ▶ 00:04.612 (copper) | {totalMs}s`

## Bottom row — `grid-template-columns: 2fr 1fr`

### Left — Per-utterance A / B card (pad 0)

Title "Per-utterance A / B" sub "dry vs FX vs NASA reference". Each row:

```
| 60  | 1fr        | 90        | 90    | 80     | 130                  |
| U{n}+LED | speaker+text  | duration  | wave  | status | A B ▶ ↻ buttons     |
```

- Active row: copper-tinted bg.
- LED: green if processed, red if stale.
- Status column shows two stacked tags:
  - Top: `Stale` (red filled) | `Ready` (green filled) | `Pending` (muted)
  - Bottom: `Stitched` (copper outline) | `Loose` (muted outline)

### Right — Export card (pad 0)

Three internal sections:

1. **Targets** (with hair border bottom). Tag-style label "Targets". List of 5 export targets, each row:
   - 18×18 toggle box (copper bg + ✓ if on, panel-lo + nothing if off).
   - 1fr name (mono 11) + format (mono 9.5 muted).
   ```
   master.wav        24-bit · 48 kHz · stereo            ON
   stems/            per-utterance · WAV                 ON
   manifest.json     all parameters · NASA refs          ON
   spectro.png       1920×540 · post-FX                  ON
   preview.mp4       audio + spectro · 30 fps            OFF
   ```

2. **Manifest preview** — tag-style label + 7 mono lines (`label: value`):
   ```
   session:   VRP-2026-05-07-01
   scene:     "approach burn"
   profile:   "ship_comm"          (copper)
   fx_scene:  "STORM '65"          (copper)
   nasa_ref:  AS11-LM-22-37-PTC    (blue)
   utterances: 4 · stale: 1        (1 in red)
   match:     0.84                  (green)
   ```

3. **Actions** — stacked: [Export now primary, full] [Save preset secondary, full]. Followed by stale callout when any utterance has `stale: true`:
   - Panel-lo bg, `1px solid rgba(232,93,74,0.3)` border.
   - Red blinking LED + "U{n} FX is stale." (red bold) + "Re-render before export." (muted).

## State

- A/B per-row → preview that single utterance dry vs FX.
- ▶ → audition that utterance from the timeline.
- ↻ → re-render that utterance (FX pass), clearing its stale flag.
- Crossfade − / + → adjust global crossfade in 20ms steps, range 0–500ms.
- "Re-stitch all" → clear all stale flags by re-rendering and re-stitching.
- "Export now" → existing stitch + export pipeline; if any stale, show modal confirm "Export anyway?".
