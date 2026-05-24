# Screen 02 — Flight

> 飛行 · spacecraft position, telemetry, and live satellite tracking

Mission-control view of the ship and the orbital environment around it. Two visualisation modes share the same big card: **Live orbit** (Natural Earth equirectangular world + 10-satellite catalog with click-to-track) and **Trajectory** (Earth ↔ Moon ellipse with mission waypoints).

`<AShell2 active="flight">`.

## Header

```
<GlyphSigil flight> · h1 "Flight" + jp "飛行 ・ ひこう"
                    + Tag(amber, filled) "Lunar flyby"
                    + Tag(muted)         "phase 4 / 7"
                    + Tag(blue)          "10 sats"

sub: "spacecraft position · telemetry · live satellite tracking"
actions: Btn "Preset · Apollo 13" + Btn(primary) "Save flight"
```

## Big card — Live orbit / Trajectory (full-width)

`<ACard>` with action row containing the view toggle:

- `<Btn variant="primary">Live orbit</Btn>` · `<Btn>Trajectory</Btn>` · `<Btn>Top</Btn>` · `<Btn>Side</Btn>`

Switches between two child components:

### Live orbit (default)

`<LiveOrbitMap height={360} initialTracked={["ISS","TERRA"]} dayNight>`

- `<NaturalEarthMap dayNight>` base — sidecar `/api/land` if reachable, embedded NE-110m otherwise.
- 10-satellite catalog rendered as dots. Click a dot to toggle its ground track + footprint.
- Tracked satellites get dashed ground tracks (per-alias color from `SAT_PALETTE`).
- Top-right HUD: `LIVE ORBIT · 軌道` title + LIVE/STATIC sidecar status + clickable sat-alias grid.
- Catalog matches `src/space/config.py`: ISS · CSS · HST · NOAA-19 · NOAA-20 · METEOR-M2 · TERRA · AQUA · SENTINEL-2A · LANDSAT-9.

### Trajectory (alt)

`<MissionTrajectory selectedWaypoint={wp} onSelect={setWp} height={360}>`

- Earth (left) ↔ Moon (right) with a dashed transfer ellipse between.
- 7 waypoints: W0 LEO insertion · W1 TLI burn · W2 Midcourse · **W3 Approach burn (active)** · W4 Lunar orbit ins. · W5 Far-side LOS · W6 Re-acquire DSN.
- Done states render green, active is copper (with ship glyph), pending is muted.
- Bottom-left waypoint detail card: id · label · state · MET · delta-v · integrity.

## Row 2 — Nav terminal · Telemetry · Integrity (1.2fr / 1fr grid)

### Nav terminal (left)

`<ACard pad={0}>` containing a green-on-black terminal block.

```
> flight.status
  phase = lunar_flyby
  waypoint = W3  (approach_burn)
  delta_v_remaining = 27.8 m/s

> space.health
  sidecar = http://127.0.0.1:8765
  land_geojson = ne_110m_land
  catalog = 10 satellites
  ws_fps = 1.0  ·  status = open|idle

> flight.burn.preview --waypoint W4
  prograde burn · 18.3 s
  expected ∆v · 12.4 m/s
  safety margin · 2.1 σ

> integrity.scan
  OK propulsion
  OK comm s-band
  WARN radiation · CME ramp_up

> _   ← copper blinking caret (alpha2-pulse)
```

The `status` keyword toggles open ↔ idle based on the view toggle above.

### Telemetry (right top)

`<ACard title="Telemetry" sub="modifiable · live">` with two 2-col grids of `<AReadout>`:

| readout | value | accent |
|---|---|---|
| VEL | 2 412 m/s | green |
| ALT | 184 km · AGL | copper |
| THRUST | 0.62 × | amber |
| FUEL | 68 % | — |
| Δv USED | 14.2 m/s | — |
| Δv BUDGET | 42.0 m/s | — |
| ATTITUDE | prograde | — |
| SPIN | 0.014 rad/s | — |

Below: 3 timer readouts (LAUNCH T-14d 02:14 · LANDING T+04d 18:42 · REENTRY T+04d 17:08 window 38m).

### Integrity (right bottom)

7 system rows: PRO Propulsion · PWR Power · ECS Life support · **RAD Radiation hull (WARN, 62%)** · COM Comm · NAV Navigation · THR Thermal. Each row: state Tag · system id · proportional bar · % readout (color = state).

## State

| key | shape | source |
|---|---|---|
| `wp` | `"W0"..."W6"` | local `useState` (default `W3`) |
| `view` | `"live" \| "trajectory"` | local `useState` (default `live`) |
| `tracked` | `Set<alias>` | inside `<LiveOrbitMap>` |
| `sidecar.land` / `sidecar.tracks` / `sidecar.terminator` | sidecar | `window.use*` hooks |

## Rules

- Switching `view` doesn't lose the waypoint selection — `wp` persists across modes.
- The nav-terminal `space.health` line is the single source of truth for the sidecar's reachability — same status as the map's NE badge.
