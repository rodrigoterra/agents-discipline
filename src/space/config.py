"""Static settings and the default 20-satellite catalog."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
NATURAL_EARTH_DIR = DATA_DIR / "natural_earth"
TLE_CACHE_DIR = DATA_DIR / "tle_cache"
SKYFIELD_CACHE_DIR = DATA_DIR / "skyfield_cache"


@dataclass(frozen=True)
class SatelliteRef:
    alias: str
    name: str
    norad_id: int
    note: str = ""


# Twenty satellites covering crewed stations, telescopes, polar weather,
# Earth observation, ocean topography, and ice/atmospheric LIDAR. Use any
# subset by passing ?ids=alias,alias on the API; the WebSocket clamps to 20.
DEFAULT_CATALOG: tuple[SatelliteRef, ...] = (
    # Crewed stations + flagship telescope
    SatelliteRef("ISS", "ISS (ZARYA)", 25544, "International Space Station"),
    SatelliteRef("CSS", "CSS (TIANHE)", 48274, "Tiangong Space Station"),
    SatelliteRef("HST", "HST", 20580, "Hubble Space Telescope"),
    # Polar weather
    SatelliteRef("NOAA19", "NOAA 19", 33591, "NOAA polar weather"),
    SatelliteRef("NOAA20", "NOAA 20", 43013, "JPSS-1 polar weather"),
    SatelliteRef("METEOR2", "METEOR-M 2", 40069, "Roshydromet polar weather"),
    SatelliteRef("SUOMINPP", "SUOMI NPP", 37849, "NASA/NOAA JPSS precursor"),
    SatelliteRef("METOPB", "METOP-B", 38771, "EUMETSAT polar weather"),
    SatelliteRef("METOPC", "METOP-C", 43689, "EUMETSAT polar weather"),
    # Earth observation imaging
    SatelliteRef("TERRA", "TERRA", 25994, "EOS AM-1 imaging"),
    SatelliteRef("AQUA", "AQUA", 27424, "EOS PM-1 imaging"),
    SatelliteRef("AURA", "AURA", 28376, "EOS atmospheric chemistry"),
    SatelliteRef("SENT1A", "SENTINEL-1A", 39634, "Copernicus C-band SAR"),
    SatelliteRef("SENT2A", "SENTINEL-2A", 40697, "Copernicus multispectral imaging"),
    SatelliteRef("SENT3A", "SENTINEL-3A", 41335, "Copernicus ocean and land color"),
    SatelliteRef("LANDSAT9", "LANDSAT 9", 49260, "USGS/NASA land imaging"),
    # Ocean topography + ice altimetry
    SatelliteRef("JASON3", "JASON-3", 41240, "NASA/CNES sea surface topography"),
    SatelliteRef("CRYOSAT2", "CRYOSAT-2", 36508, "ESA ice thickness radar altimeter"),
    SatelliteRef("ICESAT2", "ICESAT-2", 43613, "NASA ice and elevation laser altimeter"),
    # Climate LIDAR
    SatelliteRef("CALIPSO", "CALIPSO", 29108, "NASA/CNES climate aerosol LIDAR"),
)

CATALOG_BY_ALIAS: dict[str, SatelliteRef] = {s.alias: s for s in DEFAULT_CATALOG}


class Settings:
    host: str = "127.0.0.1"
    port: int = 8765
    # TLEs from CelesTrak's single-satellite query endpoint.
    celestrak_url: str = (
        "https://celestrak.org/NORAD/elements/gp.php?CATNR={norad}&FORMAT=TLE"
    )
    # Refresh cached TLEs after this many seconds (8 h is well within accuracy window).
    tle_max_age_s: int = 8 * 3600
    # Maximum streaming rate for the WebSocket.
    ws_max_fps: float = 4.0
    # Natural Earth land file — public domain, downloaded by scripts/download_natural_earth.py.
    natural_earth_land_shp: Path = NATURAL_EARTH_DIR / "ne_110m_land.shp"
    # JPL ephemeris kernel for Sun/Moon (Skyfield will fetch into skyfield_cache).
    ephemeris_kernel: str = "de421.bsp"
    # CelesTrak asks for an identifying User-Agent — set this to your project + contact.
    http_user_agent: str = (
        "chase-for-the-multiverse/0.1 (+https://github.com/rodrigoterra/chase-for-the-multiverse)"
    )


settings = Settings()


def ensure_dirs() -> None:
    for d in (DATA_DIR, NATURAL_EARTH_DIR, TLE_CACHE_DIR, SKYFIELD_CACHE_DIR):
        d.mkdir(parents=True, exist_ok=True)
