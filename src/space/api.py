"""FastAPI sidecar — REST snapshots + a WebSocket position stream.

Run:
    uvicorn src.space.api:app --host 127.0.0.1 --port 8765

From Node 22, see examples/node_client.mjs.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from src.space.config import CATALOG_BY_ALIAS, DEFAULT_CATALOG, settings
from src.space.landmass import LandfileMissing, load_land_geojson
from src.space.propagator import footprint, ground_track, state_at
from src.space.terminator import subsolar, terminator_polygon
from src.space.tle import TLENotFound, TLEStore

log = logging.getLogger("space.api")

app = FastAPI(title="Chase for the Multiverse — space sidecar", version="0.1.0")

# Liberal CORS for local dev; tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

store = TLEStore()


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def _parse_when(s: str | None) -> datetime:
    if not s:
        return _now()
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Bad ISO timestamp: {e}") from e


def _resolve_aliases(ids: str | None) -> list[str]:
    if not ids:
        return [s.alias for s in DEFAULT_CATALOG]
    requested = [a.strip().upper() for a in ids.split(",") if a.strip()]
    if not 1 <= len(requested) <= 20:
        raise HTTPException(status_code=400, detail="Pick between 1 and 20 satellites")
    bad = [a for a in requested if a not in CATALOG_BY_ALIAS]
    if bad:
        raise HTTPException(status_code=400, detail=f"Unknown alias(es): {bad}")
    return requested


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "now": _now().isoformat()}


@app.get("/api/satellites")
def satellites() -> dict:
    return {
        "satellites": [
            {"alias": s.alias, "name": s.name, "norad_id": s.norad_id, "note": s.note}
            for s in DEFAULT_CATALOG
        ]
    }


@app.get("/api/satellites/{alias}/state")
def satellite_state(alias: str, at: str | None = None) -> dict:
    alias = alias.upper()
    if alias not in CATALOG_BY_ALIAS:
        raise HTTPException(status_code=404, detail=f"Unknown alias {alias}")
    try:
        return state_at(store, alias, _parse_when(at))
    except TLENotFound as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.get("/api/satellites/{alias}/track")
def satellite_track(
    alias: str,
    at: str | None = None,
    minutes: float = Query(95.0, ge=1.0, le=24 * 60),
    step_seconds: float = Query(30.0, ge=1.0, le=600.0),
) -> dict:
    alias = alias.upper()
    if alias not in CATALOG_BY_ALIAS:
        raise HTTPException(status_code=404, detail=f"Unknown alias {alias}")
    pts = ground_track(store, alias, _parse_when(at), minutes, step_seconds)
    return {"alias": alias, "points": [[lon, lat] for lon, lat in pts]}


@app.get("/api/satellites/{alias}/footprint")
def satellite_footprint(alias: str, at: str | None = None) -> dict:
    alias = alias.upper()
    if alias not in CATALOG_BY_ALIAS:
        raise HTTPException(status_code=404, detail=f"Unknown alias {alias}")
    return footprint(store, alias, _parse_when(at))


@app.get("/api/terminator")
def terminator(
    at: str | None = None,
    twilight: str = Query("civil", pattern="^(day|civil|nautical|astronomical)$"),
) -> dict:
    return terminator_polygon(_parse_when(at), twilight=twilight)


@app.get("/api/sun")
def sun(at: str | None = None) -> dict:
    when = _parse_when(at)
    lat, lon = subsolar(when)
    return {"epoch": when.isoformat(), "lat": lat, "lon": lon}


@app.get("/api/land")
def land() -> dict:
    """Natural Earth 1:110m land polygons as GeoJSON. Cached in-process."""
    try:
        return load_land_geojson()
    except LandfileMissing as e:
        raise HTTPException(status_code=503, detail=str(e)) from e


@app.websocket("/ws/positions")
async def ws_positions(ws: WebSocket) -> None:
    """Streams `{epoch, satellites:[{alias, lat, lon, alt_km, speed_kmps}, ...]}` snapshots.

    Query params:
      ids   – comma-separated aliases (defaults to the full catalog)
      fps   – frames per second, clamped to settings.ws_max_fps (defaults to 1)
    """
    await ws.accept()
    try:
        ids = ws.query_params.get("ids")
        fps = float(ws.query_params.get("fps", "1"))
    except ValueError:
        await ws.close(code=1003)
        return
    try:
        aliases = _resolve_aliases(ids)
    except HTTPException as e:
        await ws.send_json({"error": e.detail})
        await ws.close(code=1003)
        return

    fps = max(0.1, min(settings.ws_max_fps, fps))
    period = 1.0 / fps
    log.info("ws_positions opened (%d sats, %.2f fps)", len(aliases), fps)

    try:
        while True:
            when = _now()
            snapshot = {
                "epoch": when.isoformat(),
                "satellites": [
                    {
                        "alias": a,
                        **{
                            k: v
                            for k, v in state_at(store, a, when).items()
                            if k in ("lat", "lon", "alt_km", "speed_kmps", "name")
                        },
                    }
                    for a in aliases
                ],
            }
            await ws.send_json(snapshot)
            await asyncio.sleep(period)
    except WebSocketDisconnect:
        log.info("ws_positions client disconnected")
