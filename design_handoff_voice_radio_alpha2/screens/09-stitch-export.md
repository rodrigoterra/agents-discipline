# Screen 09 — Stitch · Export

> 編集と書き出し · final DAW assembly + session package

The end of the pipeline. A compact DAW timeline shows clips on four lanes (CAPCOM / SHIP / QD / FX), each clip carries its own stale state, and the per-utterance A/B list sits underneath. The session package preview lives in the right column.

`<AShell2 active="stitch">`.

## Header

```
<GlyphSigil stitch> · h1 "Stitch · Export" + jp "編集と書き出し ・ へんしゅう"
                    + Tag(copper, filled) "4 utt · 14.3s"
                    + Tag(red, filled)    "2 stale"

sub: "DAW · timeline · stale reasons · session package"
actions: Btn "Re-stitch all" · Btn "Re-render stale (2)" · Btn(primary) "Export · WAV + JSON"
```

## Block 1 — Stale reasons legend

`<StitchStaleLegend>` — 4-column grid:

| letter | word | color | desc |
|---|---|---|---|
| V | voice | text | voice or audition changed |
| E | env | blue | environment changed |
| C | capcom-fx | capcom | CAPCOM FX changed |
| S | ship-fx | ship | SHIP FX changed |

Each row: 16 px red-bordered letter tile + word (role-colored) + 9 px mono description.

## Block 2 — DAW timeline

`<DawTimeline>` — `<ACard title="DAW timeline" sub="4 utt · 14.3s · 2 stale" pad={0}>`.

Time ruler at the top: marks at 0, 2, 4, 6, 8, 10, 12, 14 seconds across the full timeline width.

4 lanes, top to bottom:

| lane | color | tag | height | clips |
|---|---|---|---|---|
| CAPCOM | --capcom (amber) | filled | 36 | U1, U3 |
| SHIP | --ship (green) | filled | 36 | U2, U4 |
| QD | --amber | open | 36 | QD1 (intro, t=0), QD2 (outro, t=14) |
| FX | --copper | open (33%-alpha fill) | 28 | BED (full length, "STORM '65 / LO-ORBIT · environment bed") |

Each clip:
- Positioned by `left%` + `width%` against the 14.3s window.
- Ready clips: gradient fill in lane color + dark text.
- Stale clips: transparent fill, red border, **pulse animation** (`alpha-stale-pulse` keyframe), `<AStaleChip compact>` in the top-right of the clip.

Sample data:

| id | lane | start | width | text | stale |
|---|---|---|---|---|---|
| U1 | CAPCOM | 1% | 24% | "Odyssey, Houston…" | — |
| U2 | SHIP | 26% | 26% | "Houston, Odyssey…" | [V] |
| U3 | CAPCOM | 53% | 22% | "Copy mark…" | [E][C] |
| U4 | SHIP | 76% | 22% | "Throttling now…" | — |

## Block 3 — Per-utterance A/B + Session package (1.4fr / 1fr)

### Per-utterance A / B

`<PerUtteranceAB>` — per-row grid `50px / 1fr / 140px / 130px`.

Each row:
- LED (green/red, blink if stale) + utterance id (copper if active)
- `<RoleBadge role={speaker} sub={voice} size="sm">` with role-colored portal sigil
- `<AWave seed color>` colored by role; 0.4 opacity when stale
- 4 buttons: A · B (primary) · ▶ · ↻

U3 (CAPCOM, ash) is `active` — gets a copper left accent + faint copper background.

### Session package

`<SessionPackage>` — preview of what `Export · WAV + JSON` produces.

`<GlyphPanel>` with a copy-paste manifest:

```
>_ vrp export · VRP-26-05-13
 model     gpt-4o-mini-tts
 voices    ash · coral
 dsp       QND VBE HIS SCT [GRN-byp]
 env       lunar_flyby × cme @ 0.62×
 utt       4 / 4   stale 2
 size      11.4 MB · 14.3 s
 sha1      8f2a91c0…c01e6b3a
```

Below the panel, 4 file rows (filename · size · description) in a grid; the optional `spectro-snapshots.zip` row is dimmed when no spectrograms exist:

| filename | size | label |
|---|---|---|
| odyssey-scene-03.wav | 11.4 MB | audio · stitched |
| odyssey-scene-03.manifest.json | 2.1 KB | metadata · sha1 |
| U1-U4_stems.zip | 32.8 MB | per-utt stems + dry |
| spectro-snapshots.zip | 1.4 MB | optional · skipped (dimmed) |

## State

| key | shape | source |
|---|---|---|
| `utterances` | array | `VRP_ALPHA_FIXTURES.utterances` |
| `clips` | derived | from utterances + lane mapping above |
| `manifest` | derived | from all upstream state (voices, env, fx, utterances) |

## Rules

- Stitch is the only screen where `[V][E][C][S]` reason letters render together — they're the multi-source stale legend.
- Spectrogram is **never** a prerequisite. The `spectro-snapshots.zip` row stays dimmed unless the user actively visited screen 08.
- `Re-render stale (N)` only renders clips with a non-empty stale array; `Re-stitch all` re-runs the timeline assembly only (clips reused).
- `Export · WAV + JSON` writes the manifest + wav atomically. Failure rolls back.
