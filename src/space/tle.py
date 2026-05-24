"""On-disk TLE cache + Skyfield EarthSatellite construction."""

from __future__ import annotations

import time
from pathlib import Path

import requests
from skyfield.api import EarthSatellite, Loader

from src.space.config import (
    CATALOG_BY_ALIAS,
    SKYFIELD_CACHE_DIR,
    TLE_CACHE_DIR,
    ensure_dirs,
    settings,
)


class TLENotFound(RuntimeError):
    pass


class TLEStore:
    """Fetches and caches three-line TLEs from CelesTrak by NORAD id.

    Cache layout:  data/tle_cache/<norad>.tle  (UTF-8 text, 3 lines).
    """

    def __init__(self) -> None:
        ensure_dirs()
        self._loader = Loader(str(SKYFIELD_CACHE_DIR))
        self.ts = self._loader.timescale()
        self._satellites: dict[str, EarthSatellite] = {}

    def _cache_path(self, norad_id: int) -> Path:
        return TLE_CACHE_DIR / f"{norad_id}.tle"

    def _read_or_fetch(self, norad_id: int) -> str:
        cache = self._cache_path(norad_id)
        if cache.exists():
            age = time.time() - cache.stat().st_mtime
            if age < settings.tle_max_age_s:
                return cache.read_text(encoding="utf-8")

        url = settings.celestrak_url.format(norad=norad_id)
        # CelesTrak now requires an identifying User-Agent on free-tier requests.
        resp = requests.get(
            url,
            timeout=10,
            headers={"User-Agent": settings.http_user_agent},
        )
        resp.raise_for_status()
        text = resp.text.strip()
        if not text or "No GP data found" in text or len(text.splitlines()) < 3:
            # Fall back to stale cache if the network call returned nothing useful.
            if cache.exists():
                return cache.read_text(encoding="utf-8")
            raise TLENotFound(f"CelesTrak returned no TLE for NORAD {norad_id}")
        cache.write_text(text, encoding="utf-8")
        return text

    def get(self, alias: str) -> EarthSatellite:
        if alias in self._satellites:
            return self._satellites[alias]
        ref = CATALOG_BY_ALIAS.get(alias)
        if ref is None:
            raise KeyError(f"Unknown satellite alias: {alias!r}")
        text = self._read_or_fetch(ref.norad_id)
        lines = [ln for ln in text.splitlines() if ln.strip()]
        # CelesTrak returns "NAME\n1 ...\n2 ..." — name line may be absent if the
        # endpoint glitches, so default to our catalog name.
        if len(lines) >= 3 and lines[1].startswith("1 ") and lines[2].startswith("2 "):
            name, l1, l2 = lines[0].strip(), lines[1], lines[2]
        elif len(lines) >= 2 and lines[0].startswith("1 ") and lines[1].startswith("2 "):
            name, l1, l2 = ref.name, lines[0], lines[1]
        else:
            raise TLENotFound(f"Malformed TLE for NORAD {ref.norad_id}")
        sat = EarthSatellite(l1, l2, name, self.ts)
        self._satellites[alias] = sat
        return sat

    def prime(self, aliases: list[str]) -> None:
        for a in aliases:
            self.get(a)
