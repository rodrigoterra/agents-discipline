# Screen 03 — FX Lab

**Tune all five DSP groups.** Channel profile, degradation modes, A/B vs NASA reference, save scene.

## ALPHA2 delta

For ALPHA2, this screen has evolved into the **Radio FX / FX-DSP Review Rack**. Keep the v3 component language, colors, and DSP group vocabulary, but do not keep the single anonymous DSP grid as the final ALPHA2 structure.

Recent implementation:

- Fine DSP is split into role stacks.
- Current role stacks: CAPCOM and SHIP.
- Future behavior: render one stack per story/casting role.
- Active role stack is editable.
- Inactive role stacks remain visible as locked preview/context.
- CAPCOM keeps amber semantics; SHIP keeps green semantics.
- Stale/current state must remain visible because processed audio can become stale after role FX edits.

Claude Design should refine the two-stack layout using the existing ALPHA2/v3 aesthetic, not the WIP reference screenshot styling.

Layout: full shell, page padding 16, vertical flex 12px.

## Header

```
H1 "FX Lab"
sub "5 DSP groups · 32 controls · profile {profile.replace('_',' ')}"
   (last word in copper)

Right: [↺ Reset ghost] [A · Dry secondary] [B · FX primary] [Save scene primary]
```

## Profile + degradation strip — single Card pad 10

Single horizontal flex row (wraps), gap 16:

1. **Channel profile** label (tag-style) + Btn-style chip group:
   - `SHIP COMM` (stock)
   - `EARTH/CAPCOM CLEAN` (stock)
   - `DEEP SPACE LOSSY` (stock)
   - `LUNAR RELAY` (stock)
   - `EMERGENCY BAND` (stock)
   - `USER · STORM '65` (user — small ` · ` after label, opacity 0.6)
   - `USER · LO-ORBIT` (user)

   Selected → copper bg, near-black text. Stock vs user chip styling identical except
   for the small dot after user-defined names.

2. Vertical hair divider 24×1.

3. **Degradation** label + chip group: `off | subtle | nominal | severe | collapse`. Same chip style.

4. Spacer (`margin-left: auto`).

5. Right side: Tag(green, filled) "32 / 32 active" + mono 10 muted "CPU 12% · 24-bit · 48 kHz".

## DSP groups grid — 3 columns × 2 rows, gap 10

Six cells: 5 DSP group cards + 1 A/B preview card.

Each DSP group card:

```
title  (tag-style)        sub "{n} ctrl"
header action: tag-pill ON (groupAccent bg @ 13%, accent text, accent@33% border) + ↻ button
body: 3-col (or 4 if controls > 6) Slider grid, gap "10px 12px"
```

Group accent map:

| group | id | title | accent | controls |
|---|---|---|---|---|
| Quindar | `quindar` | QUINDAR TONE PATH | amber | TEL LVL, TONE MS (unit ms), DRIVE |
| Voice band | `voiceband` | VOICE BAND + ENCODER | copper | HP HZ, LP HZ, BIT, DOWN×, COMP, DRIVE, NOISE (7) |
| Hiss | `hiss` | ORGANIC HISS BED | green | WHT, PNK, BRN, LFO HZ, LFO DP, GATE, G-DP (7) |
| Scintillation | `scint` | SCINTILLATION + PATH | blue | SCN DP, SCN HZ, PHA MS, RFL MS, RFL MX, PTT MS (6) |
| Granular | `granular` | GRANULAR CODEC FAILURE | red | DROP, P-LOSS, REPEAT, JITTER, GRN MS, GRN DN, PLC ST, MOSH (8) |

All ranges + defaults are in `apps/web/src/App.tsx → getProfileControls()`. Use those.

### Sixth cell — A / B Preview (accent card)

Title "A / B Preview", sub "U3 · CAPCOM".

Stack:
- **A · Dry** Tag + dB readout right + 28px muted Wave
- **B · FX** Tag(copper, filled) + dB readout + 28px copper Wave
- **NASA ref** Tag(blue) + slug right + 28px blue Wave
- Btn row: [▶ A ghost, ▶ B primary, "Match NASA" ghost right]
- Diff readout panel (panel-lo, hair border, mono 10):
  ```
  Δ Spectral:   +2.4 dB @ 1.2 kHz
  Δ Loudness:   +3.1 LUFS
  Match score:  0.84 / 1.00
  ```

## State

- Profile chip click → sets `activeProfileId`. Slider values reset to that profile's defaults.
- Degradation chip click → sets `degradationMode`; layered on top of profile (multiplier on noise/granular groups).
- Slider drag → updates `controls[group][key]`, marks dependent utterances `stale: true`.
- "Save scene" → push current profile state to `channelProfiles` as a new `family: "user"` entry.
- "Match NASA" → run match algorithm; populate the diff readout block.
