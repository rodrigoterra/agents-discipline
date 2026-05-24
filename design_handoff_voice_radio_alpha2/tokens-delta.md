# Tokens delta · ALPHA2

ALPHA2 reuses the v3 / ALPHA token set wholesale. This file documents only what's **added**, **renamed**, or **removed** in this iteration. Source: `voice-radio-poc/design_handoff_voice_radio_v3/tokens.{css,json}` baseline.

---

## Type tokens

### Added

```css
--font-pixel-chunky: "HaxrCorp4089", "JetBrains Mono", monospace;
--font-pixel-small:  "HelvB08", "JetBrains Mono", monospace;
--font-jp:           "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP",
                     -apple-system, BlinkMacSystemFont, sans-serif;
```

**Where they're applied:**

| token | usage |
|---|---|
| `--font-pixel-chunky` | Lane labels (NARRATIVE / AUDIO / TOOLS), map titles (EARTH · DSN), commit-station labels, expanded-tile group titles, Seismograph stat labels, station id labels on maps, OLED panel headers |
| `--font-pixel-small` | Tiny captions, station Japanese names, hover hints, status badges (STATIC · NE110m), env-overlay notes, tier strip JP markers |
| `--font-jp` | Japanese subtitles on every `<ScreenH1>`, station JP names in DSN cards, tier strip JP markers, wordmark subtitle |

All pixel-font sites set `WebkitFontSmoothing: none` for crisp rendering.

### Unchanged (carry forward from v3)

```css
--font-display: "Space Grotesk", system-ui, sans-serif;
--font-mono:    "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
--font-pixel:   "VT323", "JetBrains Mono", monospace;   /* legacy v3 — unused in alpha2 */
```

---

## Color tokens

### Added

```css
/* Earthquake magnitude ramp (Seismograph proposal §04.C) */
--quake-trace:    #54E5FF;   /* M<3   · trace    */
--quake-notable:  #5BF38A;   /* M3-4.9 · notable */
--quake-strong:   #FFB547;   /* M5-5.9 · strong  */
--quake-major:    #FF8A3D;   /* M6-6.9 · major   */
--quake-critical: #FF4D5E;   /* M7+   · critical */

/* Seismograph project's primary signal (slightly hotter than ALPHA --green) */
--seis-signal:    #5BF38A;

/* Relative deck — shared palette across the 3 reference panels */
--rel-structure:  #54E5FF;   /* lat/lon grid, sidebar headers, instrument frame */
--rel-ecliptic:   #c45ab6;   /* primary curves on trajectory globe */
--rel-data:       #5BF38A;   /* tropics, Smith trace, completed waypoints */
--rel-limb:       #ffffff;   /* horizon, great circle, reticle */
--rel-accent:     #FFD66B;   /* active markers, MC pointer, COMMENCE FINAL box */
--rel-warn:       #FF4D5E;   /* NOT DEEPNAV PRECISE, critical states */
--rel-bg:         #02030a;   /* deep field */
--rel-bg-phosphor:#001a06;   /* Smith chart deep green */
--rel-bg-cyan:    #001020;   /* Deorbital sidebar value backdrop */
```

Helper: `window.magColor(m)` returns the appropriate token directly — components don't normally consume these as CSS vars, they go through the helper.

### Unchanged

All ALPHA / v3 colours are still in use:

```css
--bg, --panel, --panel-hi, --panel-lo, --hair, --hair-hi,
--text, --muted, --dim,
--copper, --copper-dim, --copper-glow,
--green, --red, --amber, --blue,
--capcom, --ship, --capcom-bg, --ship-bg,
--env-overlay, --env-overlay-track,
--spectro-bg,
--mode-live, --mode-render
```

### Notes on harmonisation

The Seismograph project ramp is **brighter** than ALPHA's `--green` (#7ad99a). They coexist:

- ALPHA's `--green` stays the role color for SHIP and "ready" states.
- `--quake-notable` / `--seis-signal` (#5BF38A) is reserved for the Seismograph dashboard's brand accent and the M3–M4.9 quake tier.

Both look right because they're never adjacent. SHIP green appears in Cast, Radio FX, Stitch; Seismograph green appears only on the Tools-lane screen.

---

## Spacing / radius / shadow

No additions. All v3 + ALPHA values carry forward unchanged.

---

## Motion tokens

### Added keyframes

```css
@keyframes alpha2-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 1; }
}
```

Used by:
- Blinking caret in terminal blocks (Flight nav terminal, FX Commit Station).
- Active-DSN coverage ring (overrides with SMIL `<animate>` for the radius sweep).

`alpha-stale-pulse` (from ALPHA) carries forward for stale clip outlines.

---

## Layout grid

### Added

| token | value | usage |
|---|---|---|
| `--rail-w-2lane` | 76 px | Left rail width in ALPHA2 (vs 64 px in v3/ALPHA — accommodates the sigil + label combo) |
| `--lane-gap` | 8 px | Vertical gap between lane bands in the left rail |

### Unchanged

| token | value |
|---|---|
| `--artboard-w` | 1440 |
| `--artboard-h` | 900 |
| `--topbar-h` | 56 (was 52 in ALPHA — added 4 px for the JP wordmark) |
| `--bottombar-h` | 52 |
| `--right-rail-w` | 280 |

---

## Removed / deprecated

Nothing removed from v3/ALPHA. The right-rail components `<NowPlayingCard>`, `<SceneBriefCard>`, `<NasaReferenceCard>` (from v3) are **not used** in ALPHA2 per the README's right-rail policy. They still exist as atoms for backwards-compat with the v3 prototype.

---

## Sidecar / network endpoints

Not technically design tokens, but pinned constants the design canvas uses:

```js
window.SIDECAR_HTTP = "http://127.0.0.1:8765";
window.GEO_MAP_W    = 720;
window.GEO_MAP_H    = 360;
```

Endpoints consumed:

| path | source | hook |
|---|---|---|
| `/api/health`                                    | space sidecar | `useSidecarHealth()` |
| `/api/land`                                      | space sidecar | `useNaturalEarth()` |
| `/api/satellites/{alias}/track?minutes=95&step_seconds=30` | space sidecar | `useSatTrack()` |
| `/api/satellites/{alias}/footprint`              | space sidecar | `useSatFootprint()` |
| `/api/terminator?twilight=civil`                 | space sidecar | `useTerminator()` |
| `https://earthquake.usgs.gov/.../all_day.geojson` | USGS direct  | `useUsgsQuakes()` |

Tile providers (raster only):

| provider | URL pattern |
|---|---|
| `nasa` | `https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg` (single image, equirectangular) |
| `google` | `https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}` |
| `google-hybrid` | `https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}` |
| `esri` | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` |
