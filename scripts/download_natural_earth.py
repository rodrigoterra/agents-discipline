"""Download Natural Earth 1:110m land polygons into data/natural_earth/.

Natural Earth is public domain (https://www.naturalearthdata.com/about/terms-of-use/).
"""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

import requests

SOURCE_URL = "https://naciscdn.org/naturalearth/110m/physical/ne_110m_land.zip"
FALLBACK_URLS = [
    "https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/110m/physical/ne_110m_land.zip",
    "https://github.com/nvkelso/natural-earth-vector/raw/master/zips/ne_110m_land.zip",
]
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "natural_earth"
USER_AGENT = "voice-radio-poc/0.1 (orbital tracking demo)"


def fetch(url: str) -> bytes:
    resp = requests.get(url, timeout=30, headers={"User-Agent": USER_AGENT}, allow_redirects=True)
    resp.raise_for_status()
    return resp.content


def main() -> int:
    DEST.mkdir(parents=True, exist_ok=True)
    last_err: Exception | None = None
    for url in [SOURCE_URL, *FALLBACK_URLS]:
        try:
            print(f"Downloading {url}")
            payload = fetch(url)
            break
        except requests.exceptions.RequestException as exc:
            print(f"  failed: {exc}")
            last_err = exc
    else:
        raise SystemExit(f"All Natural Earth mirrors failed; last error: {last_err}")
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        zf.extractall(DEST)
    print(f"Extracted to {DEST}")
    print("Files present:")
    for p in sorted(DEST.iterdir()):
        print(f"  {p.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
