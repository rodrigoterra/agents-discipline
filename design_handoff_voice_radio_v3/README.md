# Handoff · Voice Radio PoC — v3 "Final direction"

## Overview

This package is the **production design spec** for the Voice Radio PoC UI redesign.
It replaces the current single-page UI in `apps/web/src/App.tsx` with a four-screen
mission-console interface that follows one coherent design system across:

- **Console** — channel-strip mixer, scene brief, FX scene picker, spectrogram
- **Voice Lab** — voice cards, parameter detail, TTS instruction JSON, take auditioning
- **FX Lab** — five DSP groups (Quindar, Voice Band, Hiss, Scintillation, Granular), A/B compare
- **Stitch & Export** — multi-lane timeline, per-utterance A/B, manifest, export targets

> All four screens share the same top bar, left rail, right context panel, bottom transport,
> palette, type, and component vocabulary. **The whole UI is one product, not four.**

## ALPHA2 Compatibility Note

This v3 package remains the visual-system baseline, but ALPHA2 has moved beyond the original four-screen shape. For current ALPHA2 work, read `../design_handoff_voice_radio_alpha2/README.md` and `../design_handoff_voice_radio_alpha2/screens.md` first.

Important ALPHA2 deltas:

- the app now has Narrative and Audio lanes, not only Console / Voice / FX / Stitch
- Radio FX Fine DSP is role-stacked: CAPCOM and SHIP side by side now, dynamic roles later
- Stitch is a DAW-like assembly surface with role lanes, QD markers, FX/environment bed, stale legend, and per-utterance A/B controls
- the old persistent right-rail cards `Now Playing`, `Scene Brief`, and `NASA Reference` are not part of the current ALPHA2 UI

Use this v3 bundle for tokens, typography, chrome language, card density, speaker colors, and component vocabulary. Do not use it to undo the ALPHA2 workflow structure.

---

## About the design files in this bundle

The `reference/` folder is a **design reference written in HTML/JSX**. It is not production
code to be copied directly into `apps/web/`. Treat it as a high-fidelity prototype that
defines exactly how the redesigned UI should look and behave.

**Your task** is to recreate these screens inside the existing voice-radio-poc codebase
(React + Vite + TS, see `apps/web/src/App.tsx`), using its existing libraries, state, and API
surface. Do **not** add new heavy frameworks (no Tailwind plugins, no MUI, no Three/p5 in the
final build — those were prototype-only). Do use plain CSS modules / vanilla CSS following the
token file in `tokens.css`.

To preview the source designs locally:

```bash
cd design_handoff_voice_radio_v3/reference
python3 -m http.server 8000
# open http://localhost:8000/round-5.html
```

---

## Fidelity

**High-fidelity.** Pixel-accurate. Use the exact hex values from `tokens.css`, the
exact pixel spacing, the exact font sizes/weights/letter-spacing, and the exact component
shapes. The HTML reference is the source of truth — when this README and the reference
disagree, the reference wins.

---

## Design tokens

See `tokens.css` for the canonical CSS custom properties and `tokens.json` for the same
values as data. Quick cheat sheet:

### Colors

| Role             | Hex        | Usage |
|------------------|------------|-------|
| `--bg`           | `#0c0d10`  | App background |
| `--panel`        | `#14161b`  | Card surfaces |
| `--panel-hi`     | `#1c1f26`  | Raised / hover surfaces |
| `--panel-lo`     | `#0f1115`  | Recessed / inputs / readouts |
| `--hair`         | `#262a33`  | 1px dividers, card borders |
| `--hair-hi`      | `#373c47`  | Knob/control bezel borders |
| `--text`         | `#ebe7d8`  | Primary text (warm off-white) |
| `--muted`        | `#8a8b86`  | Labels, secondary text |
| `--dim`          | `#4d4f54`  | Disabled / inactive ticks |
| `--copper`       | `#e07a3c`  | **Single accent**: active, primary CTAs, knob indicators |
| `--copper-dim`   | `#a35a28`  | Copper button border |
| `--copper-glow`  | `rgba(224,122,60,0.18)` | Card-active shadow |
| `--green`        | `#7ad99a`  | Ready / processed / valid / SHIP speaker |
| `--red`          | `#e85d4a`  | Stale / error / mute / clip |
| `--amber`        | `#d9a857`  | Solo / batch / quindar / CAPCOM speaker |
| `--blue`         | `#6c92d8`  | NASA reference |

**Speaker colors are semantic, not aesthetic.** Always map CAPCOM→amber and SHIP→green.

### Typography

```css
--font-display: 'Space Grotesk', system-ui, sans-serif;  /* labels, headings, button text */
--font-mono:    'JetBrains Mono', ui-monospace, monospace; /* values, JSON, transcripts, time */
--font-pixel:   'VT323', 'JetBrains Mono', monospace;    /* OPTIONAL nostalgic readouts */
```

Load via Google Fonts:
```
https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Space+Grotesk:wght@400;500;700&family=VT323&display=swap
```

**Type scale (specific to this UI — not a general scale):**

| Token | Size | Weight | Letter-spacing | Used for |
|-------|------|--------|----------------|----------|
| `display-xl` | 22px | 700 | -0.01em | Page titles (h1) |
| `display-md` | 13px | 700 | 0.02em | Card title text, channel labels |
| `tag`        | 9px  | 700 | 0.18em (uppercase) | All section labels, tag chips, button text |
| `tag-sm`     | 8px  | 700 | 0.18em (uppercase) | Tiny labels (knob captions, fader marks) |
| `body-mono`  | 11px | 400 | 0 | Transcripts, scene brief copy |
| `value-mono` | 13px | 600 | 0.04em | Big readouts (METER, TIME, dB) |
| `meta-mono`  | 10px | 400 | 0 | Meta text in panels |
| `small-mono` | 9–9.5px | 400 | 0 | Footnotes, ruler labels |

### Spacing

Card padding: 14px default, 10px dense, 0 when content provides its own
Card title bar: 9px 12px (default), 6px 10px (dense)
Gaps between cards: 12px (column), 10px (row)
Between major sections: 16px page padding
Component gap inside cards: 8–14px

### Radii

```css
--r-sm: 2px;  /* tags, tiny chips, fader caps, meter bars */
--r-md: 3px;  /* buttons, dropdowns, readouts */
--r-lg: 4px;  /* cards, nav items */
```

### Borders & shadows

- Card border: `1px solid var(--hair)`
- Active card: `1px solid rgba(224,122,60,0.3)` + glow `0 0 0 1px var(--copper-glow)`
- Inset highlight on cards: `inset 0 1px 0 rgba(255,255,255,0.02)`
- Knob shadow: `inset 0 1px 1px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4)`

---

## Shared chrome (every screen)

Every screen is wrapped in the same shell. Build it once as `<AppShell active={...}>`.

### Top bar (52px)

`linear-gradient(180deg, var(--panel), var(--panel-lo))` background, `1px solid var(--hair)` bottom.

Left → right:
1. **Logo mark**: 22×22 copper square w/ "V" in 11px 800 black; right of it stacked: `Voice Radio Pipeline` (13/700) + `v3.0 · console` (mono 9 muted).
2. Vertical 24×1 hair divider.
3. **Mission tag** (filled copper): `Mission · Odyssey 2026-05`.
4. Mono session id: `session VRP-2026-05-07-01`.
5. Spacer.
6. **MET readout** (mono 13, copper) showing UTC time `HH:MM:SS`, label "MET".
7. **BPM readout** "120.0".
8. **Status pill**: blinking green LED + "Stitching · 3 / 4" in 10/700/0.16em uppercase green.
9. Vertical hair divider.
10. User name + 24×24 copper avatar circle "MC".

### Left rail (64px)

Background `var(--panel-lo)`. Vertical stack of 48×48 nav buttons.

**Primary nav** (top, in order): Console (▣), Voice (◉), FX (≋), Stitch (▦)
**Secondary nav** (bottom, dimmed): Library (□), NASA (◬), Log (≡)

Active state: copper-tinted bg `rgba(224,122,60,0.14)`, copper border, copper text/icon, **2px copper bar at left edge** of the button. Icon 16px above 8px label (700/0.16em uppercase).

### Right rail (280px) — persistent context

Three stacked cards, padding 12, gap 10:
1. **"Now playing"** (accent card) — current utterance speaker tag + transcript (mono 11, 1.45 line-height) + 28px-tall waveform + time/duration row + A/B/repeat button trio.
2. **"Scene brief · pt-BR"** — 10.5px mono brief copy + Edit / Re-gen buttons.
3. **"NASA reference"** — slug `AS11-LM-22-37-PTC` + 24px blue waveform + filename + A/B button.
4. Bottom: 3-line muted mono stats (Render queue, Storage, Last save).

### Bottom bar (52px) — transport + batch

Left to right:
1. Transport buttons: ⏮ (ghost), **▶ Play** (primary copper), ⏭ (ghost), ● (ghost).
2. Time `0:04.2`.
3. Multi-utterance segment timeline, 20px tall, with copper playhead at ~32%. Each segment colored by speaker, dimmed if not yet processed, red-bordered if stale.
4. Time total.
5. **Batch pill** (panel surface, hair border): amber LED + "Batch" label + "U4 · TTS" + "62%".
6. Stitch (secondary) and Export (primary) buttons.

---

## Component library

All components target a small flat surface — no inset-3D illusions, no bevels, no gradient buttons except the meter scale. Build once, use everywhere.

### `<Card>`

```
props: title, sub, action, children, pad=14, dense=false, accent=false
```

- Background `--panel`, border `1px solid --hair`, radius 4.
- Optional header: 9–10px tag-style title + ` / sub` mono muted on right of title; right side holds `action` slot for buttons.
- `accent={true}` → border `rgba(224,122,60,0.3)` + copper glow.

### `<Btn>`

```
variant: primary | secondary | ghost | danger
size: sm (h24) | md (h30) | lg (h38)
```

- Tag-style typography (display 9–12, 700, 0.12em uppercase).
- **Primary**: copper bg, near-black text. **Secondary**: panel-hi bg, text color. **Ghost**: transparent bg, hair border, muted text. **Danger**: transparent bg, red text/border.
- Active state: copper bg, near-black text (overrides variant).

### `<Tag>`

```
color: muted | copper | green | red | amber | blue
filled: bool
```

9px/700/0.16em uppercase. Filled = solid bg with near-black text. Outline = transparent bg, color border at 33% opacity, color text.

### `<Drop>` — dropdown chip

Panel-lo bg, hair border, radius 3. Tag-style label on left (muted), mono value on right with `▾`. Use for parameter pickers (Group, Speaker, Cadence, Tone, etc.).

### `<Slider>` — labeled horizontal slider

Label row with tag-style label left + mono value right (with optional unit in muted gray). Track is 4px tall, panel-lo bg, hair border. Fill is gradient `accentColor88 → accentColor`. Handle is 4px wide, full white. **At ≥98% the fill becomes solid + glow + value turns accent color** — this is the "peak" state.

### `<Knob>` (compact)

44–48px circle, panel-hi to panel-lo radial gradient, hair-hi border. Eleven tick marks around a 270° arc (lit copper if below current value, dim otherwise). 2px copper indicator line with copper glow. Inner 40% panel-hi cap. Optional 8px tag label below.

### `<Readout>`

Stacked label + value box. Label tag-style 8px muted, value mono 13/600. Used in top bar (MET/BPM) and FX meters.

### `<LED>`

Circle, default 6px. `on` → solid color + box-shadow same color (sized to diameter). `off` → `--dim`. `blink` → on/off every 600ms.

### `<Speaker>`

Inline pill: 7×7 colored square + name (display 10/700/0.18em). CAPCOM=amber, SHIP=green, default=muted. Optional `· sub` muted mono.

### `<Wave>`

Inline svg with N vertical bars, deterministic shape from a seed integer. Used for transcript wave previews, NASA reference, FX bus lane. Heights: 24/26/28/36 typical.

### Channel strip (Console only)

10px padding, hair right border, vertical flex stack. Top: label + status LED. Then speaker pill. Voice tag + optional Solo tag. FX chip (panel-lo box with FX label and copper FX scene name). Pan strip with center tick. Then a horizontal pair: 8px LED-style meter (gradient green→amber→red) + fader column with 5 horizontal tick lines and a draggable cap. dB readout below. M/S/FX small buttons row.

### Spectrogram

Panel-lo box, 8px padding, 180px tall. 80×18 grid of cells, copper opacity scaled to bin energy. Frequency labels (8k/4k/1k/250) on left in 8px mono muted. Copper playhead vertical line.

### Timeline lanes (Stitch screen)

70px label gutter on left + flexible track on right. Lane label = 8×8 colored square + tag-style lane name. Track = panel-lo bg, hair border, 38px tall. Utterance blocks are speaker-colored gradients; STALE = red border + tiny "STALE" pill.

---

## Screens

For each screen there is a markdown spec in `screens/` with detailed layout, props,
and content. Quick summary:

| File | Title | Job |
|---|---|---|
| [`screens/01-console.md`](screens/01-console.md) | Console | Live mixer view of the current scene. The default landing screen. |
| [`screens/02-voice-lab.md`](screens/02-voice-lab.md) | Voice Lab | Pick voice, dial parameters, generate TTS, audition takes, keep best. |
| [`screens/03-fx-lab.md`](screens/03-fx-lab.md) | FX Lab | Tune all five DSP groups, switch profile, A/B vs NASA reference, save scene. |
| [`screens/04-stitch.md`](screens/04-stitch.md) | Stitch & Export | Assemble timeline, A/B per segment, render manifest + WAV/JSON. |

---

## State, data, and API mapping

The redesign **does not change the API**. It re-presents existing data:

| UI element | Source |
|---|---|
| Top-bar mission tag, session id | `spec.sessionId`, scene metadata |
| Right-rail "Now playing" | `currentUtteranceId` + `utterances[id]` |
| Right-rail scene brief | scene brief textarea state |
| Right-rail NASA reference | spectrogram pane / NASA reference file |
| Console channel strips | one strip per utterance, plus QD bus + master |
| Voice Lab voice cards | `voices[]` from `audio-core` |
| Voice Lab TTS instruction JSON | composed instruction shipped to OpenAI TTS |
| FX Lab DSP groups | `dspGroups` (5 groups, 32 controls) — see `apps/web/src/App.tsx` `getProfileControls()` |
| FX Lab channel profile | profile picker — `audio-presets` |
| FX Lab degradation modes | `audio-presets` degradation modes (`off|subtle|nominal|severe|collapse`) |
| Stitch timeline | utterances ordered by index; per-utterance status (`processed`, `stale`, `stitched`) |
| Stitch export | existing stitch + export endpoints |

Wire the existing app state to the new components — do not reshape the data model.

---

## Interactions

- **Click a channel strip** → focuses that utterance (sets currentUtteranceId).
- **Knob/slider drag** → live update of underlying control state; debounce DSP re-render at 120ms idle.
- **A/B button** → toggle local `previewMode: "dry" | "fx"` for that utterance/timeline cell. `B` highlights copper.
- **NASA button** → cross-fade preview into NASA reference clip.
- **Generate batch (Voice Lab)** → calls existing TTS endpoint per pending utterance; status pill in top bar reflects progress (`Stitching · N / total`).
- **Save scene (FX Lab)** → persist current control state as a user profile in `channelProfiles` (family: "user").
- **Export now (Stitch)** → existing stitch + export pipeline; show stale-warning callout if any utterance has `stale: true`.

### Stale tracking

A utterance becomes `stale: true` when any control it depends on changes after it was last rendered. Show this with a red ring around the timeline block and a "STALE" chip on the per-utterance row, plus a callout in the export panel. Block export if anything is stale (or warn loudly).

---

## Out-of-scope cleanup tasks

- Remove the legacy `apps/web/src/styles.css` flat dark theme — replace with token-based styles.
- Drop the inline `body { font-family: Arial }` default — use `--font-display`.
- Fold per-screen state into a small store (Zustand or plain React context — your call).

---

## File list

```
design_handoff_voice_radio_v3/
├── README.md                         ← you are here
├── tokens.css                        ← canonical design tokens
├── tokens.json                       ← same, as data (for tooling)
├── screens/
│   ├── 01-console.md
│   ├── 02-voice-lab.md
│   ├── 03-fx-lab.md
│   └── 04-stitch.md
├── components.md                     ← detailed component contracts
└── reference/                        ← high-fidelity HTML prototypes
    ├── round-5.html                  ← all 4 screens in a design canvas
    ├── design-canvas.jsx
    ├── v3-app.jsx
    ├── data/fixtures.jsx
    └── components/
        ├── v3-system.jsx             ← tokens + atoms (Card, Btn, Tag, Drop, Slider, Knob, Readout, LED, Speaker, Wave)
        ├── v3-shell.jsx              ← top bar, left rail, right rail, bottom bar
        ├── v3-screen-1-console.jsx
        ├── v3-screen-2-voice.jsx
        ├── v3-screen-3-fx.jsx
        └── v3-screen-4-stitch.jsx
```

---

## Suggested implementation order

1. **Tokens + base reset** — drop in `tokens.css`, swap body font, set background.
2. **Atoms** — `Card`, `Btn`, `Tag`, `Drop`, `Slider`, `Knob`, `Readout`, `LED`, `Speaker`, `Wave`. Match the reference visually before moving on.
3. **AppShell** — top bar / left rail / right rail / bottom bar, all wired to existing state.
4. **Console screen** — replace the current `App.tsx` body with the channel-strip mixer.
5. **Voice Lab** + **FX Lab** + **Stitch** — port one at a time.
6. **Hook up routing** — left-rail buttons switch screens (`useState` or `react-router` — your call, but the rail must stay sticky).
7. **Stale tracking** — add the dependency graph between controls and rendered utterances.
8. **Export warnings** — surface stale state in the export panel.

---

## Git workflow

This handoff folder lives at the repo root: `voice-radio-poc/design_handoff_voice_radio_v3/`.
Suggested branch flow:

```bash
git checkout -b feat/v3-redesign
git add design_handoff_voice_radio_v3
git commit -m "design: handoff package for v3 redesign"
git push -u origin feat/v3-redesign
# implement, then PR into work / main
```

The reference HTML inside this folder is fine to commit — it is documentation. You can
delete it once the implementation lands.
