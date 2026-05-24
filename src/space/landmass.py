"""Loads the Natural Earth `ne_110m_land` shapefile and serves it as GeoJSON.

Natural Earth data is in the public domain (https://www.naturalearthdata.com/about/terms-of-use/).
Termtrack happens to use the same dataset; we download it directly from
naciscdn.org rather than copying any file out of termtrack's tree.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import shapefile  # pyshp

from src.space.config import settings


class LandfileMissing(FileNotFoundError):
    pass


@lru_cache(maxsize=1)
def load_land_geojson() -> dict:
    """Return a GeoJSON FeatureCollection of every land polygon at 1:110m scale."""
    shp: Path = settings.natural_earth_land_shp
    if not shp.exists():
        raise LandfileMissing(
            f"Missing {shp}. Run: python scripts/download_natural_earth.py"
        )

    reader = shapefile.Reader(str(shp))
    features: list[dict] = []
    for idx, shape in enumerate(reader.shapes()):
        # ne_110m_land shapes are polygons; each `parts` entry is a ring boundary.
        parts = list(shape.parts) + [len(shape.points)]
        rings: list[list[list[float]]] = []
        for i in range(len(parts) - 1):
            ring = [[float(x), float(y)] for x, y in shape.points[parts[i] : parts[i + 1]]]
            if len(ring) >= 4:
                if ring[0] != ring[-1]:
                    ring.append(ring[0])
                rings.append(ring)
        if not rings:
            continue
        # Treat the first ring of each shape as outer; pyshp's ne_110m_land has
        # one outer ring per shape, so this is fine for rendering purposes.
        polygons = [[r] for r in rings]
        features.append(
            {
                "type": "Feature",
                "id": idx,
                "geometry": {"type": "MultiPolygon", "coordinates": polygons},
                "properties": {},
            }
        )
    return {"type": "FeatureCollection", "features": features}
