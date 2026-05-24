# Screen 02 — Voice Lab

**Voice generation + audition.** User picks a voice, dials parameters, generates TTS instruction, auditions takes, keeps the best.

Layout: full shell, page padding 16, vertical flex 12px.

## Header

```
H1 "Voice Lab"
sub "Generation · TTS instruction synthesis · audition before commit" (mono muted)

Right: [Cast ghost] [Audition all secondary] [Generate batch primary]
```

## 3-column body — `grid-template-columns: 300px 1fr 320px`

### LEFT — Voice cards card

Title "Voices", sub "{N} presets". Header action: native `<select>` with options
[`all`, `masculine`, `feminine`, `neutral-or-flex`].

Body padding 0. Scrollable list of voice rows:

```
[border-left: 3px transparent | copper if selected]
[bg: rgba(224,122,60,0.08) if selected]

  voice.id (display 13/700, copper if selected)              Tag (group color)
  blurb (mono 10 muted, line-height 1.35)
  [if selected:]  ● Auditioned · 0:24 ago  (mono 9 green + blink LED)
```

Voices: `alloy | ash | ballad | coral | echo | sage | verse` from
`packages/audio-core/voices`. Group color: masculine=blue, feminine=amber,
neutral=muted.

### CENTER — voice detail (vertical flex, 10px gap)

#### Card 1 (accent) — `Voice · {id}` sub `{group}`
Header action: Btn primary "▶ Audition".

- 4-col `Drop` grid (8 dropdowns):
  Group / Speaker (hot=CAPCOM) / Cadence (measured) / Tone (calm) /
  Delivery (procedural) / Pause (even) / Lang (hot=pt-BR) / Accent (neutral).
- 4-col Slider grid: Speed (0.25–4, default 1.0), Intensity (0–1), Organic (0–1), Clarity (0–1).

#### Card 2 — `Take takes` sub `audition → keep`
Padding 0. Each take row is a 5-col grid:
`60px | 60px | 1fr | 60px | 110px`

| col | content |
|---|---|
| 1 | "Take {n}" mono 12 (copper if active row) |
| 2 | timestamp (mono 10 muted) |
| 3 | Wave 28px (copper if active, muted otherwise) |
| 4 | score mono 10 (green if > 0.85) |
| 5 | Btn group [▶, Keep/Kept, ✕] |

Active row gets copper-tinted bg.

### RIGHT — TTS Instruction card (padding 0)

Three internal sections divided by hair lines:

1. **Source · Brief**: tag-style label + Tag(copper) "Auto" + mono 10.5 brief copy.
2. **Synthesized**: tag-style label + green LED + "Valid JSON". `<pre>` block (panel-lo bg, hair border, padding 8, line-height 1.5, mono 10) showing the composed TTS instruction object — keys `voice`, `group`, `speaker`, `lang`, `instr`, `speed`, `intensity`, `organic`, `clarity`, `cadence`, `tone`, `delivery`, `pause`, `quindar: { in, out }`.
3. **Actions**: stacked full-width buttons:
   - "Generate selection · U{n}" primary
   - "Generate batch · {pending count}" secondary
   - Btn row [Default ghost, Random ghost, Reset danger]
   - Mono summary lines: Estimate `14.4s · 12 KB`, Cost `~$0.04`.

## State

- Selecting a voice → updates `selectedVoiceId`, recomputes JSON preview, blanks "Auditioned" timer.
- Slider/Drop change → updates instruction JSON live.
- Audition button → POST to existing TTS endpoint; new take row prepends; auto-mark as "Auditioned · just now".
- Keep → set `kept: true`, mark this voice/take as the chosen take for the active utterance.
- Generate batch → for each pending utterance, run TTS; reflect in top-bar "Stitching · N / total" pill.
