# voice-radio-poc/src/space — orbital-tracking sidecar

A Python service that lives inside `voice-radio-poc/` and exposes satellite
state, ground tracks, footprints, the day/night terminator, and Natural Earth
land polygons over HTTP + WebSocket. The Node 22 backend in
`voice-radio-poc/apps/server` (or the React app in `voice-radio-poc/apps/web`)
consumes it as a separate local process — Python and Node communicate only over
`http://127.0.0.1:8765`, no FFI, no shared runtime.

## Why not just use termtrack?

[trehn/termtrack](https://github.com/trehn/termtrack) inspired this module
(credit to Torsten Rehn for the recipes — observer-relative footprint,
twilight bands, sub-solar terminator), but **termtrack is GPL-3.0 and would
copyleft this MIT-licensed repo if vendored**. Instead this module is original
code on top of the same permissive building blocks termtrack itself uses:

- [Skyfield](https://rhodesmill.org/skyfield/) (MIT) — SGP4 propagation, Sun position
- [pyshp](https://github.com/GeospatialPython/pyshp) (MIT) — shapefile reading
- [Natural Earth](https://www.naturalearthdata.com/) (public domain) — coastlines
- [FastAPI](https://fastapi.tiangolo.com/) (MIT) + Uvicorn (BSD-3) — web layer

TLEs are pulled from [CelesTrak](https://celestrak.org/) per satellite by
NORAD catalog number, cached on disk for 8 h.

## Setup

All paths below are relative to `voice-radio-poc/`. Run these from there:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-sidecar.txt
python scripts/download_natural_earth.py   # one-time; ~150 KB
./scripts/run_sidecar.sh                   # starts on 127.0.0.1:8765
```

## REST endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/satellites` | Default 20-satellite catalog |
| `GET` | `/api/satellites/{alias}/state?at=ISO` | Lat/lon/alt/speed snapshot |
| `GET` | `/api/satellites/{alias}/track?at=ISO&minutes=95&step_seconds=30` | Sampled ground track |
| `GET` | `/api/satellites/{alias}/footprint?at=ISO` | Visible-horizon polygon |
| `GET` | `/api/terminator?at=ISO&twilight=civil` | Day/night ring (day / civil / nautical / astronomical) |
| `GET` | `/api/sun?at=ISO` | Sub-solar lat/lon |
| `GET` | `/api/land` | Natural Earth `ne_110m_land` as GeoJSON |

`at` defaults to "now" (UTC). Aliases are case-insensitive.

## WebSocket

```
ws://127.0.0.1:8765/ws/positions?ids=ISS,CSS,HST,NOAA20&fps=1
```

- `ids` — 1 to 20 catalog aliases (defaults to the full 20-entry catalog)
- `fps` — frames per second, clamped to 4

Each frame:

```json
{
  "epoch": "2026-05-18T12:34:56.000+00:00",
  "satellites": [
    {"alias": "ISS", "name": "ISS (ZARYA)", "lat": -34.21, "lon": 12.7, "alt_km": 417.3, "speed_kmps": 7.66},
    ...
  ]
}
```

## Default satellite catalog

ISS, CSS (Tiangong), HST (Hubble), NOAA-19, NOAA-20, METEOR-M 2, TERRA, AQUA,
SENTINEL-2A, LANDSAT-9. Edit `src/space/config.py` to swap them out — only the
NORAD number is required.

## Smoke test from Node 22

```
node examples/node_client.mjs
```

Uses Node's built-in `fetch` and `WebSocket` — no extra npm install needed.

## Antimeridian note for the frontend

Ground tracks, footprints, and the terminator are returned as raw [lon, lat]
rings. When a polyline crosses ±180° you'll see a sudden jump in `lon`; split
the segment there before rendering on a 2D equirectangular map. On a 3D globe
you can feed the ring straight in.

## Credit

If you ship this in a public build, please mention termtrack in the about
screen — even though no code is copied, the visualisation idiom is theirs.
