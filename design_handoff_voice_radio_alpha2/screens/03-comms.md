# Screen 03 — COMMS

> 通信 · select the communication route that shapes story and radio FX

Operators pick the route the rest of the system will reason about: which DSN ground station is uplinking, what the SHIP antenna is doing, expected latency, blackout windows. This is where geography turns into the FX/DSP narrative draft on screen 07.

`<AShell2 active="comms">`.

## Header

```
<GlyphSigil comms> · h1 "COMMS" + jp "通信 ・ つうしん"
                   + Tag(blue, filled) "S-band · 8.4 GHz"
                   + Tag(muted)        "lat 1.6 s"

sub: "select the route that later shapes story and radio FX"
actions: Btn "Preset · DSN handoff" + Btn(primary) "Lock route"
```

## Row 1 — DSN map · Signal path (1.6fr / 1fr grid)

### DSN · ground antennas

`<EarthDsnMap selectedId={dsn} onSelect={setDsn} earthquakes={showQuakes}>` at height 300.

Card-header actions:
- `+ Quakes` (ghost/primary toggle) — overlays USGS feed on the corridor
- `DSN` · `Relay` · `Laser` — pretend mode switch (currently visual only)

### Signal path

`<ACard title="Signal path" sub="${dsn} → SHIP">`

Top: 2-col grid of 6 `<AReadout>`:

| readout | value | accent |
|---|---|---|
| FREQ | 8.4 GHz | blue |
| LAT | 1.6 s | copper |
| BANDW | 2 Mbps | — |
| POWER | 20 kW · −82 dBm | — |
| EIRP | 98 dBm | — |
| MARGIN | 6.4 dB | green |

Below: ASCII signal-path diagram inside `<GlyphPanel>` showing GROUND {dsn} ↔ SHIP with frequency + RTT + scintillation index.

## Row 2 — Ground antenna cards (3-column grid)

`<GroundAntennaCard>` × 3, one per DSN site. Click to select.

| id | name | dish | el | state | noise | region |
|---|---|---|---|---|---|---|
| GDS | Goldstone | 70m / 34m × 4 | 42° | uplink (green) | 26 K | Mojave · USA |
| **MAD** | Madrid | 70m / 34m × 3 | 61° | **active (copper)** | 24 K | Robledo · ESP |
| CAN | Canberra | 70m / 34m × 4 | 28° | standby (amber) | 29 K | Tidbinbilla · AUS |

Card body: 2-col grid of `<AReadout>` (DISH / EL / NOISE T / POWER) + a small dish-glyph `<GlyphPanel>` with the station id rendered as the antenna mark.

## Row 3 — SHIP antennas · Blackout windows (1.2fr / 1fr grid)

### SHIP antennas

3 antenna cards in a row, each with state tag + el/gain/aim-err readouts:

| id | state | el | gain | accent |
|---|---|---|---|---|
| HGA | tracking | +82° | +38 dB | green |
| MGA | warm     | +12° | +18 dB | amber |
| LGA | standby  | omni | +0 dB  | muted |

### Blackout windows

`<ACard title="Blackout windows" sub="upcoming · 4 hours" pad={0}>`

3-row list, each row: start (colored by sev) · duration · reason · severity tag.

| start | dur | reason | sev |
|---|---|---|---|
| T+02:48 | 12m | Lunar occultation | hard |
| T+03:24 | 3m  | DSN handoff GDS → MAD | soft |
| T+04:11 | 8m  | Ionospheric S4 spike | soft |

## State

| key | shape | source |
|---|---|---|
| `dsn`        | `"GDS" \| "MAD" \| "CAN"` | local (default `MAD`) |
| `showQuakes` | boolean                   | local (default `false`) |

## Rules

- Selecting a ground antenna updates `dsn` everywhere — the signal-path readouts, blackout reasons that name a station, and the FX Narrative Signal Draft.
- The COMMS state feeds the Radio FX Narrative Signal Draft `comms` line verbatim: `"DSN {dsn} → SHIP S-band · 8.4 GHz"`.
- Blackout windows here will be cross-referenced by the Stitch screen later (clips that fall inside a blackout window get a stale `[E]` reason).
