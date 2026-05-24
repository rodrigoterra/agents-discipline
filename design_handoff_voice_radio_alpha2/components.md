# Component contracts · ALPHA2

All v3 + ALPHA atoms (`ACard`, `ABtn`, `ATag`, `ADrop`, `ASlider`, `AKnob`, `AReadout`, `ALED`, `ASpeaker`, `AWave`, `AModeToggle`, `ARoleTab`, `ARoleLane`, `AFxStackTile`, `AFxStackChain`, `AStaleChip`) carry forward **unchanged** — see `/design_handoff_voice_radio_alpha/components.md` for those contracts.

This file documents **only the new or changed components** ALPHA2 introduces. Everything else uses the ALPHA version verbatim.

---

## 1. `<AShell2>` — supersedes `<AShell>`

```ts
type AShell2Props = {
  active: "mc" | "flight" | "comms" | "weather"
        | "voice" | "dialogue" | "fx" | "spectro" | "stitch"
        | "seis";
  mode: "live" | "render";
  monitoringRole?: "CAPCOM" | "SHIP" | null;
  situation?: SituationCardData;           // overrides default Situation in right rail
  fxPresets?: FxPresetRow[];               // optional FX preset card under Situation
  noRightRail?: boolean;                    // hide right rail entirely (Seismograph)
  children: ReactNode;
  screenLabel?: string;                     // for [data-screen-label]
};
```

Visual deltas from `<AShell>`:

- **Top bar** — wordmark uses the handcrafted ASCII sigil in copper + Japanese subtitle. Build tag rendered in `HaxrCorp4089`.
- **Left rail** — **three lanes** (NARRATIVE / AUDIO / TOOLS) with HaxrCorp4089 lane labels. Each nav tile shows the screen's handcrafted ASCII sigil inline + label in HelvB08.
- **Right rail** — Situation Card replaces the v3 trio of Now Playing / Scene Brief / NASA Reference. FX preset card is contextual (only on Radio FX). Pass `noRightRail` to skip the whole column (Seismograph).
- **Bottom bar** — transport unchanged from ALPHA.

---

## 2. `<ScreenH1>` — handcrafted-sigil screen header

```ts
type ScreenH1Props = {
  glyph: GlyphId;        // index into window.ALPHA2_GLYPHS
  title: string;
  sub: string;
  jp?: string;           // override; defaults to glyphs[glyph].jp
  tags?: Array<{ label: string; color?: string; filled?: boolean }>;
  actions?: ReactNode;
};
```

Renders a sigil (3–5 line monospace ASCII) on the left, English title + JP subtitle to its right, then tags + sub line below, with action buttons trailing right. JP subtitle uses Hiragino / Yu Gothic / Noto Sans JP stack.

---

## 3. `<GlyphSigil>` — standalone sigil renderer

```ts
type GlyphSigilProps = {
  glyph: GlyphId;
  size?: "sm" | "md" | "lg";   // 8 / 11 / 14 px font
  inline?: boolean;
  color?: ColorToken;          // overrides the glyph's default color
};
```

Used independently in left-rail nav tiles, Voice portrait slots, Mission Control downstream cards, weather page tabs.

---

## 4. `<GlyphPanel>` — ASCII art block with caption

```ts
type GlyphPanelProps = {
  art: string;             // \n-separated lines, monospace alignment
  caption?: string;
  accent?: ColorToken;     // border-left + text color
};
```

Used for the Mission Control generated-setup block, COMMS dish glyph, COMMS path diagram, Stitch manifest preview, and a few empty-state placeholders.

---

## 5. `<RoleBadge>` — portal-sigil role marker

```ts
type RoleBadgeProps = {
  role: "CAPCOM" | "SHIP";
  size?: "sm" | "md";
  sub?: string;            // optional voice/take subtitle
};
```

5-line portal sigil (`window.ALPHA2_GLYPHS.capcom` / `.ship`) in monospace + role label (HaxrCorp4089) + optional sub. Replaces `<ASpeaker>` wherever a portrait-style mark is wanted (Stitch A/B rows, Radio FX stack headers, Situation Card, Voice card portrait slots).

---

## 6. `<NarrativeSignalDraft>` / `<NarrativeDraftWithControls>`

```ts
type NarrativeSignalDraftProps = {
  phase: string;
  flight: string;
  comms: string;
  earth: string;
  space: string;
  suggested: string;
};
```

5-row read-only readout + suggested-action paragraph. `NarrativeDraftWithControls` wraps it with state `draft | used | rejected` + 3 actions (Use draft / Compare A/B / Reject). Used on Space Weather (read-only) and Radio FX (interactive).

---

## 7. `<NaturalEarthMap>` — equirectangular base

```ts
type NaturalEarthMapProps = {
  width?: number;          // default 720
  height?: number;         // default 360
  graticule?: boolean;
  bgLayer?: ReactNode;
  preLand?: ReactNode;
  postLand?: ReactNode;
  dayNight?: boolean;      // pulls /api/terminator
  satelliteTiles?: boolean;
  tileProvider?: "nasa" | "google" | "google-hybrid" | "esri";
  children?: ReactNode;
};
```

Renders water → optional satellite tiles → land polygons → graticule → equator → optional day/night → custom children → live/static badge. Auto-fetches Natural Earth GeoJSON from the sidecar at `127.0.0.1:8765`, falls back to a 15-feature embedded fixture.

---

## 8. `<TileLayer>` — satellite imagery

```ts
type TileLayerProps = {
  width: number;
  height: number;
  provider: "nasa" | "google" | "google-hybrid" | "esri";
  zoom?: number;           // default 2
  opacity?: number;        // default 0.85
};
```

NASA mode renders a single Blue Marble image (equirectangular, perfect alignment). The other 3 providers tile in Web Mercator within the visible ±85° band — slight equirectangular misalignment is by design.

---

## 9. `<SatelliteTrackLayer>` — ground tracks + footprints

```ts
type SatelliteTrackLayerProps = {
  alias: string;           // catalog id from window.SAT_CATALOG
  color?: string;          // defaults to colorForSat(alias)
  showFootprint?: boolean; // default true
  width?: number;
  height?: number;
  dim?: boolean;
};
```

Pulls `/api/satellites/{alias}/track` + `/footprint` from the sidecar, falls back to a procedurally-generated track that matches the satellite's published inclination + altitude (SGP4-style orbital mechanics, Earth-rotation-aware ground projection). Dashed track, filled footprint, pulsing subpoint marker.

---

## 10. `<EarthquakeLayer>` — USGS quakes on a NaturalEarthMap

```ts
type EarthquakeLayerProps = {
  feed: GeoJsonFeatureCollection;   // from useUsgsQuakes()
  width?: number;
  height?: number;
  minMag?: number;                  // 0 by default
  focus?: GeoJsonFeature | null;
  onPick?(f: GeoJsonFeature): void;
};
```

Renders every quake whose `mag >= minMag`. Magnitude → color via `window.magColor()` (cyan/green/amber/orange/red). Radius via `window.magRadius()`. Shallow (<35 km) events get a depth stem. M5+ events get a pulsing ring; M6+ adds a second offset ring. Focused event renders white-bordered with a crosshair + readout.

---

## 11. `<EarthDsnMap>` — DSN coverage + optional overlays

```ts
type EarthDsnMapProps = {
  selectedId?: "GDS" | "MAD" | "CAN";
  onSelect?(id: string): void;
  showCorridor?: boolean;            // default true — dashed great-circle between stations
  weatherLayer?: "rain" | "storm" | "typhoon" | null;
  satellites?: string[];              // sat aliases to draw tracks for
  satelliteTiles?: boolean;           // initial Vector/Satellite mode
  initialProvider?: TileProvider;
  dayNight?: boolean;
  earthquakes?: boolean;              // draws USGS layer on top of land
  quakeMinMag?: number;               // initial filter
  showProviderSwitch?: boolean;       // default true
  height?: number;
};
```

Composes `<NaturalEarthMap>` + `<EarthquakeLayer>` + `<SatelliteTrackLayer>` + weather overlay + the 3 DSN station markers + SHIP marker. Includes its own internal Vector/Satellite switch and provider picker (top-left), and a tier-filter legend (top-right) when `earthquakes` is on.

---

## 12. `<LiveOrbitMap>` — Flight's main visualisation

```ts
type LiveOrbitMapProps = {
  initialTracked?: string[];   // default ["ISS", "TERRA"]
  satelliteTiles?: boolean;
  dayNight?: boolean;
  height?: number;
};
```

The codebase's `/apps/web/src/space/LiveOrbitView.tsx` re-implemented in plain JSX so the design canvas behaves identically to the production view. Click any sat to toggle its track.

---

## 13. `<MissionTrajectory>` — Earth ↔ Moon waypoint visualisation

Earth/Moon inset with a dashed transfer ellipse + 7 mission waypoints. Click any waypoint to select. Doesn't talk to the sidecar — it's a narrative artifact, not a tracker.

---

## 14. `<SpaceWeatherMap>` — solar-system layout

Sun + corona + solar wind + CME front + Earth magnetosphere + SHIP + 5 selectable events. Independent vocabulary from the Earth map — uses a different projection (centered on the Sun) and a different color set (amber Sun + red CME + blue ionosphere).

---

## 15. `<RoleStack>` (Radio FX)

Per-role DSP rack:
- Header strip with `<RoleBadge>` + EDITING / VIEW · LOCKED tag.
- Vertical chain of 5 `<AFxStackTile>`s with hair pipes between.
- When `editing && expanded === tile.id`, renders the expanded variant with full sliders.
- VIEW state: 0.78 opacity + centered "⌬ VIEW MODE · CLICK MAKE EDITABLE TO MODIFY" overlay + lock affordance via `⌥ Make editable` button.
- Editing footer: per-utterance override chip row + `Apply to all`.

---

## 16. `<FxCommitStation>` (Radio FX)

Terminal-style block + 3-button stack (Bypass all · All ON · Process {editRole}). Mirrors the FX diff + A/B preview in shell prose. Read-only; processing runs through the right column.

---

## 17. Seismograph dashboard (`<ScreenSeismograph>`, `<FeedColumn>`, `<FocusColumn>`, `<TierStrip>`)

Forked from the Seismograph project's §05 wireframe. See `screens/10-seismograph.md` for the full structural spec. The internal `<SeismographMap>` carries its own Vector/Satellite + provider + Day/Night toggle (3-row switch panel, top-left).

---

## 18. `<PaintedTrajectory>` — astrolabe glyph globe (Relative deck)

```ts
type PaintedTrajectoryProps = {
  height?: number;
  selectedWaypoint?: string;
  onSelect?(id: string): void;
};
```

Dotted lat/lon mesh + magenta ecliptic + phosphor green tropics + white horizon + planetary glyphs (`☿ ♀ ⊕ ♂ ☉ ☽`) on the rim + astrolabe markers (MC / Asc / IC / Dsc / N) + 7 mission waypoints rendered as `✦` glyphs in tier color. Active waypoint shows an animated crosshair reticle. Two `<GlyphShip>`s top-right + bottom-left.

The previous Pioneer-painted Jupiter version is gone — palette now coheres with the rest of the Relative deck (cyan / magenta / phosphor green / gold).

## 19. `<DeorbitalDescentPanel>` — Nostromo wireframe Earth (Relative deck)

```ts
type DeorbitalDescentPanelProps = {
  por?: string; heading?: string; groundSpeed?: string;
  conditionCode?: string; past?: string; system?: string;
  autoCount?: string; systemCode?: string;
  height?: number;
};
```

Sidebar (HaxrCorp4089 cyan headers + HelvB08 cyan values) + top bar (cyan title + yellow COMMENCE FINAL) + orthographic wireframe Earth with red/amber Natural Earth coastlines + white crosshair + EST. EARTH RELATIVE tag + NOT DEEPNAV PRECISE warning.

## 20. `<SmithReflectionPanel>` — HP-style impedance CRT (Relative deck)

```ts
type SmithReflectionPanelProps = {
  frequency?: string;
  freqUnit?: string;
  impedance?: { real: number; imag: number };
  nH?: number;
  height?: number;
};
```

Smith chart at R = 0.2/0.5/1/2/5 + X = ±0.5/1/2/5, all dashed phosphor green on `#001a06`. Procedural reflection sweep. Marker + readouts. Right sidebar with `More Markers / All Off / Marker Functions / Marker Search` labels. Subtle scanline overlay.

---

## 18. Shared hooks (sidecar / USGS-aware)

```ts
useNaturalEarth():    { data: GeoJsonFC, live: boolean, err: string|null }
useSatTrack(alias):   { data: SatelliteTrack | null, live, err }
useSatFootprint(alias): { data: SatelliteFootprint | null, live, err }
useTerminator():      { data: { ring, subsolar }, live, err }
useSidecarHealth():   { data: { ok }, live, err }
useUsgsQuakes(ms?):   { data: GeoJsonFC, live, err }   // 60 s default poll
```

All hooks try the network endpoint first (sidecar or USGS) and silently fall back to embedded fixtures so the canvas always renders. `live: true` means the last successful fetch came from the network; `false` means we're on fixtures.

---

## Helpers

```ts
window.magColor(m): string        // cyan/green/amber/orange/red
window.magRadius(m): number       // px, near-exponential
window.magTier(m): string         // TRACE | NOTABLE | STRONG | MAJOR | CRITICAL
window.colorForSat(alias): string // from SAT_PALETTE
window.geoProject(lon, lat, w?, h?): [x, y]
window.pathFromRing(ring, close?, w?, h?): string
window.pathFromPolyline(ring, w?, h?): string
window.pathFromPolygons(polygons, w?, h?): string
```
