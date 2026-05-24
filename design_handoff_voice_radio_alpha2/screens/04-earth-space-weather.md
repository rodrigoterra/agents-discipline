# Screen 04 — Weather (Earth + Space)

> 気象 · one nav item, two internal pages

Weather is **one** left-rail tab containing two focused pages: **Earth Weather** (ground-side conditions around the corridor) and **Space Weather** (solar / ionospheric / magnetic events along the route). The page toggle lives top-right of the header next to the action buttons.

`<AShell2 active="weather" screenLabel="04 Weather · ${page}">`.

## Shared header

```
<GlyphSigil earthWeather|spaceWeather> · h1 "Weather" + Tag(muted) "one nav · two pages"
sub: "signal-impact conditions · choose page" (mono muted)

actions:
  <PageTab earthWeather="EARTH" />  <PageTab spaceWeather="SPACE" />
  Btn "Live · ON" · Btn(primary) "Apply influence"
```

`<PageTab>` is a 2-segment band: each tab renders its own sigil inline next to the label, filled with the page color (green for Earth, amber for Space) when active.

## Page A — Earth Weather

### Row 1 — Earth reference map · Ground corridor (1.6fr / 1fr)

#### Earth reference map

`<EarthDsnMap>` with the layer toggle in the card header:

```
quakes (default, primary) · rain · storm · typhoon
```

When `layer === "earthquake"` → the live USGS overlay renders (default). When any other layer → the synthetic weather overlay renders and the quake layer is hidden.

#### Ground corridor

`<ACard title="Ground corridor" sub="DSN exposure · live feed">`

- 2-col grid of 4 `<AReadout>`: CORRIDOR (blue), DSN EXP. (green), RAIN ATT., WIND.
- **USGS terminal block** (HaxrCorp4089 label "USGS · 地震 · ALL_DAY.GEOJSON") · 4 lines: endpoint · event count · max mag (colored by tier) · LIVE/STATIC state.
- Strongest 24h list — top-3 quakes sorted by magnitude, each row magnitude-colored.

### Row 2 — 4 weather report cards

`<WeatherReport>` × 4:

| title | state | accent | rows |
|---|---|---|---|
| Rain / storms     | live   | blue   | Iberia light · S-Atl scatter · Pacific clear |
| Typhoon-ready     | live   | red    | T07 Phoenix cat 3 NW · T09 Halcyon forming · Indian O. clear |
| **Earthquakes · USGS** | live(if usgs.live)/cached | tier of max | events/24h · max mag · M5+ count |
| Source status     | ok     | green  | GFS · NOAA · USGS (live|cached) |

The Earthquakes card pulls real numbers from `window.useUsgsQuakes()`.

## Page B — Space Weather

### Row 1 — Space reference map · Narrative Signal Draft (1.6fr / 1fr)

#### Space reference map

`<SpaceWeatherMap selectedEvent={evt} onSelect={setEvt}>` at height 320.

- Sun (left) with corona + flare path, solar wind arrows, CME front arc.
- Earth (right) with magnetosphere lobes, SHIP marker beyond.
- 5 clickable events: FLR Solar flare · X1.2 · CME front · ramp_up · ION Ionosphere disturbed · BLK Blackout cone S band · MAG Magnetic anomaly.
- Default selected: **CME**.

Card-header actions: `Live` · `Cached` (mode switch, visual only).

#### Narrative Signal Draft

`<NarrativeSignalDraft>` showing the chain: phase / flight / comms / earth / space → suggested DSP. Same component that appears as the lead block on Radio FX (07).

### Row 2 — 4 space-weather report cards

| title | state | accent | rows |
|---|---|---|---|
| Solar flare       | live  | amber  | X1.2 14m ago · region 3987 active · next 24h M-class likely |
| Ionosphere        | live  | blue   | S4 0.71 · f0F2 boosted · TEC +18 TECU |
| Magnetic storm    | live  | amber  | Kp 6.3 · disturbed yes · Dst −89 nT |
| **Affected DSP**  | ready | copper | scint depth +0.20 · granular drop +0.08 · voice HP +20 Hz |

The Affected DSP card is the data hand-off into screen 07's Narrative Signal Draft.

## State

| key | shape | source |
|---|---|---|
| `page`  | `"earth" \| "space"` | local (default `earth`) |
| `layer` | `"earthquake" \| "rain" \| "storm" \| "typhoon"` | local (default `earthquake`) |
| `evt`   | `"FLR" \| "CME" \| ...` | local (default `CME`) |
| `usgs`  | GeoJSON | `useUsgsQuakes()` |

## Rules

- Page toggle preserves layer + event selections per page.
- The `evt` selected on Space Weather is the basis for the Narrative Signal Draft's `space:` line.
- Earth Weather's "Earthquakes · USGS" card and the Space Weather "Affected DSP" card are the two hand-offs into 07 Radio FX.
