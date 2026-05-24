# AGENTS.md — voice-radio-poc / src/space (orbital-tracking sidecar)

Read this first if you're working anywhere under `voice-radio-poc/src/space/`,
`voice-radio-poc/scripts/{run_sidecar.sh,download_natural_earth.py}`,
`voice-radio-poc/examples/node_client.mjs`, or
`voice-radio-poc/requirements-sidecar.txt`. The parent
`voice-radio-poc/AGENTS.md` still applies for the PoC at large — this file
adds the sidecar-specific rules.

## Scope
A Python service that lives **inside** the voice-radio-poc tree but runs as
a **separate process** from the Node 22 backend. Communication is one-way:
the Node app calls the Python service over `http://127.0.0.1:8765`. No FFI,
no shared runtime, no Python imported from Node.

## Workflow
1. From `voice-radio-poc/`:
   - `python3 -m venv venv && source venv/bin/activate`
   - `pip install -r requirements-sidecar.txt`
   - `python scripts/download_natural_earth.py` (one-time, ~150 KB)
2. Run: `./scripts/run_sidecar.sh` — uvicorn on `127.0.0.1:8765`,
   reload watches `src/space/` only (do not widen this — `--reload` over
   `node_modules/` will spam restarts).
3. Smoke test: `node examples/node_client.mjs` (Node 22 built-ins only,
   no npm install).
4. When changing the HTTP/WebSocket surface, update the endpoint table in
   `src/space/README.md` in the same diff. Keep the Node consumer (when it
   lands in `apps/web` or `apps/server`) in sync.

## Constraints
- **No GPL/copyleft deps.** This module exists precisely because
  termtrack is GPL-3.0 and would copyleft the MIT PoC if vendored. Allowed
  building blocks: Skyfield (MIT), pyshp (MIT), Natural Earth (public domain),
  FastAPI (MIT), Uvicorn (BSD-3), requests (Apache-2.0). Verify any new dep's
  licence before adding it to `requirements-sidecar.txt`.
- **CelesTrak User-Agent is required.** TLE fetches in `tle.py` set
  `User-Agent: voice-radio-poc/0.1 (orbital tracking demo)` — CelesTrak
  refuses default Python/curl UAs. Don't strip the header. The
  `http_user_agent` field in `src/space/config.py` is the single source.
- **Skyfield → numpy casts.** Skyfield returns `Angle` / `Distance` objects
  whose `.radians` / `.km` are numpy scalars but not always plain `float64`.
  Before `np.degrees(...)` or arithmetic mixed with Python floats, cast:
  `np.asarray(angle.radians, dtype=np.float64)`. This bug bit `propagator.py`
  and `terminator.py` once already — see git history.
- **Antimeridian handling is the frontend's job.** Rings (ground tracks,
  footprints, terminator) are returned as raw `[lon, lat]` arrays. Do not
  pre-split at ±180° on the server — the consumer renders on either a 2D
  equirectangular projection (needs split) or a 3D globe (doesn't).
- **No API keys, no secrets.** This sidecar talks to CelesTrak only.
  Anything that needs auth in the future goes through env vars sourced from
  `voice-radio-poc/.env`, never hardcoded.
- **Cache paths are relative to voice-radio-poc.** `ROOT` in `config.py`
  resolves to `voice-radio-poc/` via `Path(__file__).resolve().parents[2]`.
  Cache writes go to `voice-radio-poc/data/{tle_cache,skyfield_cache,
  natural_earth}/`. All three are gitignored. Don't move the package without
  updating `parents[N]`.
- **TLE freshness.** Cache TTL is 8 h, max-age 24 h. Don't make this
  user-configurable per request — CelesTrak rate-limits aggressively.
- **Hardcoded catalog is intentional.** `DEFAULT_SATELLITES` in
  `config.py` is 20 satellites by NORAD ID. Adding satellites is a config
  edit, not an API parameter — frontend should not be able to ask for
  arbitrary NORAD IDs (rate-limit / abuse vector).
- **Imports use the `src.space.*` namespace.** Run uvicorn from
  `voice-radio-poc/` as cwd so `from src.space.config import ...` resolves
  via Python 3.3+ namespace packages. There is no `src/__init__.py` — don't
  add one.

## Definition of Done
- `/api/health` returns `{ok: true, now: <iso>}`.
- `/api/satellites` returns the 10-entry catalog.
- `/api/satellites/{ISS,CSS,HST,NOAA20}/state` returns finite lat/lon/alt/speed.
- `/api/satellites/ISS/track` returns ~191 samples for a 95-minute window at
  30 s step.
- `/api/satellites/ISS/footprint` returns a closed ring with >32 points.
- `/api/terminator?twilight=civil` returns a 181-point ring + subsolar
  lat/lon.
- `/api/land` serves `ne_110m_land` GeoJSON (`scripts/download_natural_earth.py`
  has been run at least once).
- `/ws/positions?ids=ISS,CSS,HST,NOAA20&fps=1` opens, streams 10 frames
  cleanly, closes without traceback.
- `node examples/node_client.mjs` end-to-end run prints all of the above
  without error. This is the canonical smoke test.
- `src/space/README.md` matches the actual endpoint surface.
- No reload spam on startup (watcher must be scoped to `src/space/`).

## Out of scope (don't add these without a separate discussion)
- Auth, multi-user, or remote-deployable variants.
- Vendoring termtrack source.
- TLE provider fallbacks (Space-Track, N2YO).
- Pass prediction / overpass alerts.
- Caching at the HTTP layer (Skyfield is already fast; cache is on the
  TLE/JPL ephemeris side only).
- Storing API keys anywhere in `src/space/`.
