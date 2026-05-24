# Screen 10 — Seismograph

> 地震計 · live USGS earthquake dashboard · tools lane

The first item in the **TOOLS** lane. Seismograph is a focused single-purpose dashboard that forks the standalone Seismograph project's §05 HUD layout into the ALPHA2 shell. Used to inspect what's happening on the planet while a mission is in flight.

`<AShell2 active="seis" noRightRail>` — the right rail is suppressed so the focused-event column takes its place.

## Header

```
<GlyphSigil seismograph> · h1 "Seismograph · Live" + jp "地震計 ・ じしんけい"
                         + Tag(green|muted, filled) "LIVE|STATIC"
                         + Tag(muted) "${features.length} events"
                         + Tag(red|amber|green, filled) "max M${maxMag}"

sub: "USGS all_day feed · 24h window · poll 60s · forked from Seismograph proposal"
actions: Btn "Refresh now" · Btn "Share permalink" · Btn(primary) "Open in USGS"
```

The status tag flips between `LIVE` (sidecar reached) and `STATIC` (fixture). The max-mag tag is colored by tier.

## Three-column body (260px / 1fr / 280px)

### Column 1 — Feed

`<FeedColumn>` — `<ACard title="Feed · last 24h" sub="USGS · all_day" pad={0}>`.

#### Stat strip (top)

2-col grid:
- `TOTAL EVENTS` — large green numeral (Space Grotesk 26px)
- `MAX MAG` — same size, colored by `magColor(maxMag)`

#### Sparkline

24-bucket events-per-hour sparkline rendered in green with a 18%-opacity area fill. Anchored to the bottom hair line.

#### Sort + filter chrome

`SORT · MAG · TIME` + a `clear M${minMag}+` ghost button when a filter is active.

#### Event list (scrollable)

Up to 60 rows. Each row:
- Magnitude column (44 px): `M${mag.toFixed(1)}` in `HaxrCorp4089` 13px, colored by tier.
- Place + meta (1fr): place name + `${ago}m|h · ${depth}km` in `HelvB08`.
- Selected row: copper left border, `rgba(91,243,138,0.08)` background.

### Column 2 — Map

`<MapColumn>` — `<ACard title="World · USGS overlay" sub="…">`.

Body: `<SeismographMap>` containing:
- `<NaturalEarthMap>` with its own internal Vector/Satellite switch and provider picker (top-left).
- `<EarthquakeLayer>` reading the same `features` array.
- Corner brackets (1 px green, 14 px arm) — proposal §03 REF/01 vocabulary.

Card-header actions: `Robinson` · `Equirectangular` (primary; Robinson is a visual placeholder).

### Column 3 — Focused event

`<FocusColumn q={focused}>`.

When **no event selected**: dim centered text "NO EVENT SELECTED · 選択されていない" + sub note "biggest auto-selects on next refresh".

When **event selected**:

1. **Magnitude block** (top) — `MAGNITUDE` label · `M${mag}` rendered at Space Grotesk 48 px, colored + glowing by tier · place name below.
2. **Coordinates block** — 4 rows (COORD / DEPTH / WHEN / TIER) in two-column key-value layout. DEPTH gets the tier color when shallow (`<35 km`). TIER appends `· shallow` or `· deep` (300+ km).
3. **Depth cross-section** — SVG 224 × 88 with surface band at top + 5 depth reference lines (35 / 70 / 150 / 300 / 700 km) + the event plotted as a colored dot at its actual depth, sized by magnitude. Dashed vertical line connects surface to event.
4. **CTA** — `Open in USGS →` button (full-width).

## Bottom — Tier strip

`<TierStrip>` — full-width `<ACard>` with a 6-column grid:

| label | jp | min mag | color |
|---|---|---|---|
| ALL      | 全 | 0 | text |
| TRACE    | 微 | 0 | #54E5FF |
| NOTABLE  | 注 | 3 | #5BF38A |
| STRONG   | 強 | 5 | #FFB547 |
| MAJOR    | 大 | 6 | #FF8A3D |
| CRITICAL | 危 | 7 | #FF4D5E |

Each cell: title (HaxrCorp4089) + JP marker (HelvB08) + count (Space Grotesk 22 px) + percentage bar.

Click any cell → sets `minMag` to its threshold. ALL resets to 0. Active cell gets a colored top border + 11%-alpha background.

## State

| key | shape | source |
|---|---|---|
| `usgs` | GeoJSON | `window.useUsgsQuakes()` — 60 s poll, fixture fallback |
| `focused` | feature | local (auto-set to biggest on first feed) |
| `minMag` | 0 / 3 / 5 / 6 / 7 | local (default 0) |
| `sortMode` | `"mag" \| "time"` | local (default `mag`) |
| `satOn` / `provider` | toggle / id | local inside `<SeismographMap>` |

## Rules

- The Map column uses its own internal Vector/Satellite switch — independent of the main `<EarthDsnMap>` switch on narrative-lane screens.
- Filter ticks are exclusive: clicking STRONG hides everything below M5.
- `focused` survives filter changes; if the focused event is filtered out, the map still renders it (the filter doesn't touch `focus`).
- Auto-focus runs **once per feed change** (on `features.length` dep) — manual selections aren't overwritten by polls.
- This screen has no right rail and no Situation Card; the focused-event column replaces them.
