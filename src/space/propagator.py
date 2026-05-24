"""Satellite math: instantaneous state, ground track, footprint polygon."""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

from skyfield.api import EarthSatellite, wgs84

from src.space.tle import TLEStore

EARTH_RADIUS_KM = 6378.137


def _to_skyfield_time(store: TLEStore, when: datetime):
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return store.ts.from_datetime(when)


def state_at(store: TLEStore, alias: str, when: datetime) -> dict:
    """Lat/lon/altitude/velocity for a satellite at one instant."""
    sat: EarthSatellite = store.get(alias)
    t = _to_skyfield_time(store, when)
    geocentric = sat.at(t)
    sub = wgs84.subpoint_of(geocentric)
    lat = sub.latitude.degrees
    lon = sub.longitude.degrees
    alt_km = wgs84.height_of(geocentric).km
    # Velocity magnitude in km/s, from the ICRF velocity vector.
    vx, vy, vz = geocentric.velocity.km_per_s
    speed = math.sqrt(vx * vx + vy * vy + vz * vz)
    return {
        "alias": alias,
        "name": sat.name,
        "norad_id": int(sat.model.satnum),
        "epoch": when.astimezone(timezone.utc).isoformat(),
        "lat": float(lat),
        "lon": float(lon),
        "alt_km": float(alt_km),
        "speed_kmps": float(speed),
    }


def ground_track(
    store: TLEStore,
    alias: str,
    start: datetime,
    duration_minutes: float = 95.0,
    step_seconds: float = 30.0,
) -> list[tuple[float, float]]:
    """Sampled (lon, lat) points along the satellite's sub-track.

    Defaults to ~1 ISS orbit (95 min) at 30 s resolution → 190 points.
    Caller should split the polyline whenever |lon[i+1] - lon[i]| > 180
    before drawing, to handle the antimeridian wrap.
    """
    sat = store.get(alias)
    n = max(2, int(duration_minutes * 60.0 / step_seconds))
    out: list[tuple[float, float]] = []
    for i in range(n + 1):
        t_dt = start + timedelta(seconds=i * step_seconds)
        t = _to_skyfield_time(store, t_dt)
        sub = wgs84.subpoint_of(sat.at(t))
        out.append((float(sub.longitude.degrees), float(sub.latitude.degrees)))
    return out


def _gc_destination(lat_deg: float, lon_deg: float, bearing_deg: float, ang_rad: float
                    ) -> tuple[float, float]:
    """Great-circle destination point given start, initial bearing, angular distance."""
    lat1 = math.radians(lat_deg)
    lon1 = math.radians(lon_deg)
    b = math.radians(bearing_deg)
    sin_lat2 = math.sin(lat1) * math.cos(ang_rad) + math.cos(lat1) * math.sin(ang_rad) * math.cos(b)
    lat2 = math.asin(max(-1.0, min(1.0, sin_lat2)))
    y = math.sin(b) * math.sin(ang_rad) * math.cos(lat1)
    x = math.cos(ang_rad) - math.sin(lat1) * math.sin(lat2)
    lon2 = lon1 + math.atan2(y, x)
    return math.degrees(lat2), ((math.degrees(lon2) + 540.0) % 360.0) - 180.0


def footprint(store: TLEStore, alias: str, when: datetime, points: int = 96) -> dict:
    """Polygon (as a list of [lon,lat]) of the satellite's visible-horizon circle on Earth.

    Returns a GeoJSON-ish dict so the frontend can render it directly.
    """
    s = state_at(store, alias, when)
    alt = max(s["alt_km"], 1.0)
    ang_rad = math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + alt))
    ring: list[list[float]] = []
    for i in range(points):
        bearing = 360.0 * i / points
        lat, lon = _gc_destination(s["lat"], s["lon"], bearing, ang_rad)
        ring.append([lon, lat])
    ring.append(ring[0])
    return {
        "alias": alias,
        "subpoint": [s["lon"], s["lat"]],
        "alt_km": alt,
        "horizon_half_angle_deg": math.degrees(ang_rad),
        "ring": ring,  # caller may need to split at antimeridian for 2D draws
    }
