# Screen 01 — Mission Control

> ミッション・コントロール · narrative-lane dashboard & story creation console

The default landing screen. Mission Control is where the story starts: it shows the world map with DSN coverage, a story prompt area for generating Narrative Setup JSON, and pending/ready summaries for every downstream narrative panel.

`<AShell2 active="mc">` · top bar + 3-lane left rail + main + Situation right rail.

## Header

```
<GlyphSigil mc> · h1 "Mission Control" + jp "ミッション・コントロール"
                + Tag(copper, filled) "ALPHA2"
                + Tag(muted)          "Scene 03 · Approach burn"
                + Tag(green, filled)  "Live · 4 utt · 14.3s"

sub: "dashboard · story · downstream summaries" (mono muted)
actions: Btn "Preset · Apollo 13" + Btn(primary) "Generate setup"
```

## Row 1 — World map · Story prompt (1.5fr / 1fr grid)

### World · DSN coverage

`<ACard>` wrapping `<EarthDsnMap>` at height 300.

- `selectedId` / `onSelect` — interactive DSN selection (GDS / MAD / CAN)
- Default station is **MAD** (Madrid).
- Card header action: `+ Quakes` (primary when active) toggles `earthquakes` on the map. When on, the legend swaps to the **USGS · 地震** tier legend and the bottom-left card switches from DSN station info to a focused quake.
- `<ProviderSwitch>` lives top-left of the map (Vector / Satellite + provider picker).

### Story prompt

`<ACard title="Story prompt" sub="Narrative Setup JSON">`

- Multiline `<textarea>` bound to local `storyText` state — default copy: "Approach burn for lunar flyby. CAPCOM speaks first, SHIP confirms throttling and reports light scintillation."
- 6 preset chips below: `Apollo 11`, `Apollo 13` (primary), `Lunar far-side`, `DSN handoff`, `Solar max`, `Custom`.
- `<GlyphPanel>` shows a generated `Narrative Setup JSON` block — read-only, copper accent, caption "generated setup · validates against schema".

## Row 2 — Downstream cards (4-column grid)

`<DownstreamCard>` × 4 — one per downstream narrative panel.

| glyph | title | status | summary[0..2] |
|---|---|---|---|
| flight       | Flight   | ready   | lunar_flyby · 0.62× thrust · Δv 14.2 m/s |
| comms        | COMMS    | ready   | DSN {dsn} · S-band · 8.4 GHz · lat ~1.6 s |
| earthWeather | Weather  | partial | Earth light rain · Space CME ramp · S4 0.71 |
| dialogue     | Dialogue | pending | awaiting prompt validation · 4 utt · — |

Status colours: `ready` → green, `partial` → amber, `pending` → muted. Border accent matches.

## Row 3 — Report preview strip (5 columns, full-width card)

5 cells in one `<ACard>`. Each cell: small sigil + label + state tag + "last sync · 14s ago" sub.

| cell | glyph | state |
|---|---|---|
| Story prompt | mc | ready |
| Flight state | flight | ready |
| Comm route   | comms  | ready |
| Earth wx     | earthWeather | live |
| Space wx     | spaceWeather | cached |

Each `state` maps to a `<ATag color={…} filled>`: ready=green, live=copper, cached=blue, partial=amber, pending=muted.

## State

| key | shape | source |
|---|---|---|
| `dsn`        | `"GDS" \| "MAD" \| "CAN"` | local `useState` (default `MAD`) |
| `storyText`  | string                    | local `useState` |
| `showQuakes` | boolean                   | local `useState` (default `false`) |
| `usgsFeed`   | GeoJSON FeatureCollection | `window.useUsgsQuakes()` (shared) |
| `landGeo`    | GeoJSON FC                | `window.useNaturalEarth()` (shared) |

## Rules

- Downstream cards never claim "ready" unless their underlying state validates. The Dialogue card stays `pending` until Story prompt validates.
- The DSN station selected here flows into COMMS (active DSN antenna) and the FX Narrative Signal Draft (`comms:` line).
- Toggling `+ Quakes` does not affect any other screen — quake overlay is per-screen by design.
