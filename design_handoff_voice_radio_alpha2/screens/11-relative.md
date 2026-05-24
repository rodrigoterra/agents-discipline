# Screen 11 — Relative

> 相対 · three reference-derived instruments on one deck

A focused instrument deck for "Earth ↔ ship" relative-position reasoning. Composes three coherent panels — each forked from a canonical visual reference — onto a single 1440×900 canvas. Sits in the TOOLS lane next to Seismograph.

`<AShell2 active="rel" noRightRail>` — right rail is suppressed so the three panels take full deck width.

## Header

```
<GlyphSigil relative> · h1 "Relative" + jp "相対 ・ そうたい"
                     + Tag(copper, filled) "INSTRUMENT"
                     + Tag(muted)          "EST · 推定"
                     + Tag(muted)          "1979 / 1973 / 1969"

sub: "three instruments · one frame · Earth ↔ ship across the deck"
actions: Btn "Recalibrate" · Btn "DEEPNAV PRECISE" · Btn(primary) "Snapshot frame"
```

The year tags credit the three references: 1979 (Alien Nostromo HUD), 1973 (Pioneer 10 mission art), 1969 (HP impedance analyzers).

## Layout

```
┌──────────────────────────────┬─────────────────────────┐
│                              │  DEORBITAL DESCENT      │
│   MISSION TRAJECTORY         │  · wireframe Earth      │
│   · astrolabe glyph globe    │  · sidebar telemetry    │
│   (PaintedTrajectory)        │  (DeorbitalDescentPanel)│
│                              ├─────────────────────────┤
│                              │  SMITH · REFLECTION     │
│                              │  · phosphor CRT         │
│                              │  · marker readouts      │
│                              │  (SmithReflectionPanel) │
└──────────────────────────────┴─────────────────────────┘
```

Grid: `1.1fr 1fr` columns × `1fr auto` rows. The trajectory column spans both rows.

## Panels

### Mission Trajectory (left, full-height)

`<PaintedTrajectory selectedWaypoint={wp} onSelect={setWp}>` — astrolabe-style glyph globe.

- Dotted lat/lon mesh in cyan + phosphor green (orthographic projection, ~3000 dots).
- White great-circle horizon band with 60 hash marks.
- 4 dotted curves: 2 magenta ecliptic + 2 phosphor-green tropics, dashed `0.5 3`.
- 6 planetary glyphs on the rim: `☿ ♀ ⊕ ♂ ☉ ☽` with HelvB08 abbreviations (MERC / VENU / EARTH / MARS / SUN / MOON).
- Astrolabe rim markers: `MC / Asc / IC / Dsc / N` with radial tick lines.
- 7 mission waypoints (W0–W6) sitting on the magenta ecliptic, each rendered as a ✦ glyph in tier-color (done=green, active=gold, pending=cyan). The active waypoint shows a crosshair reticle + animated pulse ring.
- Two `<GlyphShip>` Voyager silhouettes at top-right (gold) and bottom-left (phosphor green) — built from `⊹` glyph + horizontal data lines + velocity arrow + "PROBE" caption.
- Date/coord stamp at bottom: `MET hh:mm:ss · UTC · ${lon}°E ${lat}°N · ODYSSEY 2026·05`.
- Title overlay top-left in magenta: `MISSION TRAJECTORY · 軌道計画`.
- Legend bottom-right: `ECLIPTIC · MAGENTA ◆ TROPICS · GREEN ◆ HORIZON · WHITE`.

### Deorbital Descent (top-right)

`<DeorbitalDescentPanel>` — Nostromo, 1979.

- Top bar: cyan `DEORBITAL DESCENT` + yellow `COMMENCE FINAL` box + amber `SYSTEM :BL: 76.75 :OB`.
- Left sidebar (140 px): cyan `HaxrCorp4089` headers above HelvB08 cyan-on-`#001020` values. Fields: TIME FROM #1 / PRESENT P.O.R. / HEADING / GROUND SPEED / CONDITION CODE + PAST=8 / SYSTEM #4 / AUTODECOUNT. TIME FROM #1 updates every second from local clock.
- Wireframe Earth disc with cyan lat/lon mesh (latitude every 15°, meridians every 30°), red+amber Natural Earth coastline strokes (orthographic projection, no fill).
- White crosshair reticle at the sub-satellite point.
- Centered cyan tag: `EST. EARTH RELATIVE` in HaxrCorp4089, drop-shadow-glowing.
- Red badge below: `NOT DEEPNAV PRECISE`.
- Amber corner ticks (top-left/right + bottom-left/right) and 8 radial hash marks around the disc.
- Subtle cyan scanline overlay for CRT feel.

### Smith · Reflection (bottom-right)

`<SmithReflectionPanel>` — HP/Agilent phosphor CRT.

- Procedurally drawn Smith chart at impedance R = 0.2 / 0.5 / 1 / 2 / 5 + reactance X = ±0.5 / 1 / 2 / 5, clipped to the unit disc.
- All chart lines dashed `2 3` in phosphor green at 35–85% opacity. Unit circle gets a solid green stroke.
- Procedural reflection sweep traced in glowing phosphor green (drop-shadow).
- Marker dot with horizontal+vertical tick crosshair.
- Top labels: `▸1: Reflection` · `Smith` · `1 U FS` · `▸2: Off`.
- Left readout: `Mkr 1 = ${frequency} MHz`.
- Axis numerals: `10 25 50 100 250` along the real axis, `±j50 ±j100 ±j250` along the imaginary axis.
- Right sidebar (140 px): `C? │ MEAS 1 / MKR / MHz` header + impedance readouts for markers 1 and 2 (frequency · resistance kn · reactance n · nH) + dimmed `3: off / 4: off` rows + the canonical `More / Markers / All Off / Marker / Functions / Marker / Search` labels.
- Subtle phosphor-green scanline overlay on a `#001a06` background.

## Shared palette

| token | hex | role across all 3 panels |
|---|---|---|
| bg | `#02030a` / `#000` / `#001a06` | deep field |
| structure | `#54E5FF` | lat/lon grid, sidebar headers, instrument frame |
| ecliptic | `#c45ab6` | primary curves on trajectory |
| data | `#5BF38A` | tropics, Smith trace, completed waypoints |
| limb | `#ffffff` | horizon, great circle, reticle |
| accent | `#FFD66B` | active markers, MC pointer, COMMENCE FINAL box |
| warn | `#FF4D5E` | NOT DEEPNAV PRECISE, critical states |

All three panels render on the same near-black backdrop with the same vocabulary of dotted/dashed structural lines + phosphor glows + monospace caps labels. Coherent at a glance even though the instruments are unrelated.

## State

| key | shape | source |
|---|---|---|
| `wp` | `"W0"..."W6"` | local (default `W3`) — passed only into PaintedTrajectory |

The DeorbitalDescent + Smith panels are fully self-contained — their state is internal (clock tick, marker position) and they share no state with each other or with the trajectory.

## Rules

- The Relative screen is a **read-only instrument deck**. Recalibrate / DEEPNAV PRECISE / Snapshot are header actions that don't yet wire to backend state — they're affordances for future mission ops integration.
- The Mission Trajectory does NOT share waypoint state with Flight (screen 02). They're independent picks per the existing convention.
- "Snapshot frame" (header action) would capture the current 1440×900 viewport as a PNG for mission archive — not implemented in canvas.
- The screen suppresses the right rail entirely; the three panels take full deck width to read as instrument hardware.

## Where the references live

- **Nostromo "DEORBITAL DESCENT"** (Alien, 1979) → `<DeorbitalDescentPanel>` · `reference/alpha2-panels.jsx`
- **Pioneer 10 / Voyager mission art** (1973–1979) → `<PaintedTrajectory>` (replaced with astrolabe glyph globe per palette pass)
- **HP impedance analyzer Smith chart** (~1969) → `<SmithReflectionPanel>`
- **Astrolabe / dotted celestial sphere** (1971-era ASCII astrology software) → trajectory globe vocabulary after the design pass
