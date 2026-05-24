"""Sub-solar point and day/night terminator polygons.

Twilight bands match what termtrack draws when -n is on:
  * civil       (sun elevation  0° to  -6°)
  * nautical    ( -6° to -12° )
  * astronomical (-12° to -18° )
  * night       (< -18°)

Each band is rendered as the ring at angular distance (90° + |elev|°) from the
sub-solar point.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone
from functools import lru_cache

from skyfield.api import Loader, wgs84

from src.space.config import SKYFIELD_CACHE_DIR, ensure_dirs, settings
from src.space.propagator import _gc_destination


@lru_cache(maxsize=1)
def _ephemeris():
    ensure_dirs()
    loader = Loader(str(SKYFIELD_CACHE_DIR))
    ts = loader.timescale()
    eph = loader(settings.ephemeris_kernel)
    return loader, ts, eph


def subsolar(when: datetime) -> tuple[float, float]:
    """Lat/lon (degrees) of the point on Earth where the Sun is directly overhead."""
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    _, ts, eph = _ephemeris()
    t = ts.from_datetime(when)
    geocentric_sun = (eph["sun"] - eph["earth"]).at(t)
    sub = wgs84.subpoint_of(geocentric_sun)
    return sub.latitude.degrees, sub.longitude.degrees


def terminator_polygon(when: datetime, twilight: str = "civil", points: int = 180) -> dict:
    """Ring around the sub-solar point at the chosen twilight depth.

    The ring is the *night-side boundary* — outside it is day.
    twilight ∈ {'day', 'civil', 'nautical', 'astronomical'} → angular radius
    of 90°, 96°, 102°, 108° respectively.
    """
    depth = {"day": 90.0, "civil": 96.0, "nautical": 102.0, "astronomical": 108.0}
    if twilight not in depth:
        raise ValueError(f"twilight must be one of {list(depth)}")

    lat0, lon0 = subsolar(when)
    ang = math.radians(depth[twilight])
    ring: list[list[float]] = []
    for i in range(points):
        bearing = 360.0 * i / points
        lat, lon = _gc_destination(lat0, lon0, bearing, ang)
        ring.append([lon, lat])
    ring.append(ring[0])

    return {
        "epoch": when.astimezone(timezone.utc).isoformat(),
        "subsolar": [lon0, lat0],
        "twilight": twilight,
        "depth_deg": depth[twilight],
        "ring": ring,
    }
