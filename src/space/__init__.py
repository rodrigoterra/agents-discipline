"""Skyfield-backed satellite tracking sidecar.

Inspiration: trehn/termtrack (GPL-3.0) — we share its orbital recipe ideas
but none of its source. All math here is original code on top of Skyfield
(MIT) and Natural Earth data (public domain).
"""

from src.space.config import DEFAULT_CATALOG, SatelliteRef, settings
from src.space.propagator import footprint, ground_track, state_at
from src.space.terminator import subsolar, terminator_polygon
from src.space.tle import TLEStore

__all__ = [
    "DEFAULT_CATALOG",
    "SatelliteRef",
    "settings",
    "TLEStore",
    "state_at",
    "ground_track",
    "footprint",
    "subsolar",
    "terminator_polygon",
]
