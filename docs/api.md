# API

## GET /health
Returns `{ ok: true }` for simple liveness checks.

## GET /api/health
Returns `{ ok, now, openaiConfigured }`. The key status is boolean only; secrets are never returned.

## CORS
The server accepts localhost/127.0.0.1 development origins by default. Set `CORS_ORIGIN` to a comma-separated allowlist for additional origins.

## POST /api/script/generate
Input: `{ sceneBrief, defaults? }`  
Output: `{ cached, script }` or `{ error }`

## POST /api/script/validate
Input: `{ candidate }`  
Output: `{ valid, data, errors }`

## POST /api/tts/utterance
Input: `{ utterance, voice?, voiceProfile?, instructions?, model?, speed?, responseFormat?, sessionId? }`  
Output: `{ cached, path, meta }`

## POST /api/tts/batch
Input: `{ utterances[], voice?, voiceProfile?, instructions?, model?, speed?, responseFormat?, sessionId? }`  
Output: `{ success[], failed[] }`

## POST /api/audio/process
Legacy input: `{ inputPath, controls, sessionId?, utteranceId? }` where controls is macro DSP config plus optional explicit DSP values (`channelProfile`, `signalQuality`, `quindarMode`, `telemetryLevel`, `quindarToneMs`, `quindarDrive`, filter, bitcrusher, scintillation, granular, datamosh, reflection, organic hiss, packetLossDynamics, and dynamics controls).
Environment input is also accepted: `{ inputPath, controls?, macro?, environment?, sessionId?, utteranceId? }`, where `environment` may include `baseProfile`, `missionGeometry`, and `spaceWeather`.
Output: `{ ok, path, processedPath, resolvedEnvironment?, resolvedMacro }`

## POST /api/audio/stitch
Input: `{ processedPaths[], rawPaths?, gapMs?, sessionId? }`  
Output: `{ path }`

## GET /api/spectrogram/health
Output: `{ ffmpegAvailable, outputRoot }`

## POST /api/spectrogram/utterance
Input: `{ sessionId, utteranceId }`  
Generates raw and processed utterance PNGs plus comparison JSON. Output: `{ ok, paths, publicUrls }`

## POST /api/spectrogram/batch
Input: `{ sessionId }`  
Generates spectrogram pairs for utterances with both raw and processed WAV artifacts. Output: `{ ok, results[] }`

## POST /api/spectrogram/final
Input: `{ sessionId }`  
Generates final raw and processed stitched spectrograms if final WAV artifacts exist. Output: `{ ok, paths, publicUrls }`

## GET /api/nasa-reference/list
Lists local NASA reference audio files from `artifacts/audio/nasa-reference/`. Output: `{ ok, files: [{ filename, slug, publicUrl }] }`

## POST /api/spectrogram/nasa-reference
Input: `{ nasaSlug, source? }`  
Uses local files from `artifacts/audio/nasa-reference/`. Direct URL import is intentionally disabled in v1. Output includes `publicUrls.nasaAudio` and `publicUrls.nasaSpectrogram` so the frontend can play and inspect the same local reference.

---

## Space sidecar (`src/space/`)

The orbital-tracking sidecar is a separate Python process (`voice-radio-poc/src/space`, FastAPI + Skyfield). It listens on **`http://127.0.0.1:8765`** by default and is started with `./scripts/run_sidecar.sh`. The Node 22 backend does not embed it — they communicate over local HTTP/WebSocket only. CORS on the sidecar is set to `allow_origins=["*"]` for local development.

Override the sidecar URL on the Node side with `SPACE_SIDECAR_URL`; raise the probe timeout with `SPACE_SIDECAR_TIMEOUT_MS` (default 1500 ms, floor 250 ms).

### GET /api/space/health  *(Node-side proxy)*
Probes the sidecar's `/api/health` with a 1.5 s timeout and reports its liveness so the UI can degrade gracefully when the Python process isn't running.
Output:
```jsonc
{
  "ok": true,
  "sidecarUrl": "http://127.0.0.1:8765",
  "sidecar": { "ok": true, "now": "2026-05-18T02:52:24.359589+00:00" },
  "status": 200,
  "latencyMs": 7
}
```
Returns 503 with `{ ok: false, error, sidecarUrl, latencyMs }` if the sidecar is unreachable or the request times out.

### Sidecar endpoints  *(consumed directly by the frontend at `SIDECAR_HTTP`)*

| Method | Path | Output sketch |
|---|---|---|
| `GET` | `/api/health` | `{ ok, now }` |
| `GET` | `/api/satellites` | `{ satellites: [{ alias, name, norad_id, note }] }` (20 entries, fixed catalog) |
| `GET` | `/api/satellites/{alias}/state?at=ISO` | `{ alias, name, norad_id, epoch, lat, lon, alt_km, speed_kmps }` |
| `GET` | `/api/satellites/{alias}/track?at=ISO&minutes=95&step_seconds=30` | `{ alias, points: [[lon, lat], ...] }` (~190 points for one ISS orbit) |
| `GET` | `/api/satellites/{alias}/footprint?at=ISO` | `{ alias, subpoint, alt_km, horizon_half_angle_deg, ring: [[lon, lat], ...] }` |
| `GET` | `/api/terminator?at=ISO&twilight=day\|civil\|nautical\|astronomical` | `{ epoch, subsolar: [lon, lat], twilight, depth_deg, ring: [[lon, lat], ...] }` (181 pts) |
| `GET` | `/api/sun?at=ISO` | `{ epoch, lat, lon }` (sub-solar point) |
| `GET` | `/api/land` | GeoJSON `FeatureCollection` of Natural Earth `ne_110m_land` (cached forever, ~150 KB) |

`at` defaults to "now" (UTC). Aliases are case-insensitive.

### WebSocket /ws/positions
```
ws://127.0.0.1:8765/ws/positions?ids=ISS,CSS,HST,NOAA20&fps=1
```
- `ids` — 1 to 20 catalog aliases (defaults to the full 20-entry catalog).
- `fps` — frames per second, clamped to `settings.ws_max_fps` (4).

Each frame:
```jsonc
{
  "epoch": "2026-05-18T02:52:29.857558+00:00",
  "satellites": [
    { "alias": "ISS", "name": "ISS (ZARYA)", "lat": -49.70, "lon": 101.85, "alt_km": 440.2, "speed_kmps": 7.65 }
  ]
}
```

### Antimeridian
`ring` / `points` arrays are raw `[lon, lat]` rings; whenever `|Δlon| > 180` between consecutive points, the consumer must split the polyline before rendering on a 2D equirectangular map. The frontend helper at `apps/web/src/space/projection.ts` does this. On a 3D globe the ring can be fed in directly.

### Smoke test
```
cd voice-radio-poc
./scripts/run_sidecar.sh                 # terminal A
node examples/node_client.mjs            # terminal B
```
The Node 22 client exercises `/api/health`, `/api/satellites`, `/api/satellites/ISS/state`, `/api/terminator`, and `/ws/positions` end-to-end. A green run is the canonical proof the sidecar is healthy.
