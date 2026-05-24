// ALPHA2 — geo foundation.
// Mirrors voice-radio-poc/apps/web/src/space/projection.ts +
// sidecar.ts in plain Babel JSX so the design canvas uses the
// EXACT same projection + path emitters as the production app.
//
// When the Python sidecar (src/space) is running at 127.0.0.1:8765,
// the hooks auto-upgrade to real Natural Earth land + live satellite
// tracks. When it isn't reachable, embedded fixtures keep the
// canvas drawable offline.

// ─────────────────────────────────────────────────────────
// Projection (equirectangular)
// ─────────────────────────────────────────────────────────
window.GEO_MAP_W = 720;
window.GEO_MAP_H = 360;
window.SIDECAR_HTTP = "http://127.0.0.1:8765";

window.geoProject = function geoProject(lon, lat, W, H) {
  W = W || window.GEO_MAP_W; H = H || window.GEO_MAP_H;
  return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
};

const POLAR_LAT_THRESHOLD = 85;

function unwrapRing(ring) {
  if (ring.length === 0) return [];
  const out = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i++) {
    const prev = ring[i - 1], cur = ring[i];
    let dLon = cur[0] - prev[0];
    if (Math.abs(dLon) > 180
        && Math.abs(prev[1]) > POLAR_LAT_THRESHOLD
        && Math.abs(cur[1]) > POLAR_LAT_THRESHOLD) {
      out.push([cur[0], cur[1]]);
      continue;
    }
    while (dLon > 180) dLon -= 360;
    while (dLon < -180) dLon += 360;
    out.push([out[i - 1][0] + dLon, cur[1]]);
  }
  return out;
}

function offsetsForRange(minLon, maxLon) {
  const minK = Math.ceil((-180 - maxLon) / 360);
  const maxK = Math.floor((180 - minLon) / 360);
  const out = [];
  for (let k = minK; k <= maxK; k++) out.push(k * 360);
  return out;
}

function buildPath(unwrapped, lonOffset, close, W, H) {
  if (unwrapped.length === 0) return "";
  const [x0, y0] = window.geoProject(unwrapped[0][0] + lonOffset, unwrapped[0][1], W, H);
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i < unwrapped.length; i++) {
    const [x, y] = window.geoProject(unwrapped[i][0] + lonOffset, unwrapped[i][1], W, H);
    d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  if (close) d += "Z";
  return d;
}

window.pathFromRing = function pathFromRing(ring, close, W, H) {
  if (!ring || ring.length === 0) return "";
  const unwrapped = unwrapRing(ring);
  let minLon = unwrapped[0][0], maxLon = unwrapped[0][0];
  for (const [lon] of unwrapped) { if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon; }
  const offsets = offsetsForRange(minLon, maxLon);
  const parts = [];
  for (const off of offsets) {
    const d = buildPath(unwrapped, off, close, W, H);
    if (d) parts.push(d);
  }
  return parts.join(" ");
};

window.pathFromPolyline = function (ring, W, H) { return window.pathFromRing(ring, false, W, H); };

window.pathFromPolygons = function pathFromPolygons(polygons, W, H) {
  const parts = [];
  for (const polygon of polygons) for (const ring of polygon) {
    const seg = window.pathFromRing(ring, true, W, H);
    if (seg) parts.push(seg);
  }
  return parts.join(" ");
};

// ─────────────────────────────────────────────────────────
// Embedded Natural Earth fallback — coarse outlines, real
// [lon, lat] coordinates. Used when the sidecar isn't running.
// ─────────────────────────────────────────────────────────
window.NATURAL_EARTH_FALLBACK = {
  type: "FeatureCollection",
  features: [
    // North America
    { type: "Feature", id: 0, properties: { name: "North America" }, geometry: { type: "Polygon", coordinates: [[
      [-168,65],[-160,60],[-150,58],[-135,57],[-130,52],[-125,48],[-122,40],[-118,33],[-115,30],
      [-110,24],[-105,22],[-100,20],[-95,17],[-90,15],[-85,15],[-82,17],[-80,25],[-78,30],
      [-75,35],[-72,40],[-68,45],[-60,46],[-55,49],[-55,53],[-62,57],[-72,61],[-82,62],
      [-92,65],[-105,69],[-118,70],[-130,71],[-145,71],[-155,70],[-165,67],[-168,65]
    ]] } },
    // Greenland
    { type: "Feature", id: 1, properties: { name: "Greenland" }, geometry: { type: "Polygon", coordinates: [[
      [-50,82],[-30,83],[-25,80],[-22,75],[-25,70],[-35,65],[-45,60],[-52,62],[-55,68],[-58,72],[-55,78],[-50,82]
    ]] } },
    // South America
    { type: "Feature", id: 2, properties: { name: "South America" }, geometry: { type: "Polygon", coordinates: [[
      [-80,12],[-75,9],[-72,2],[-78,-5],[-80,-15],[-75,-22],[-72,-30],[-70,-40],[-72,-48],[-70,-55],
      [-65,-55],[-60,-52],[-58,-45],[-55,-35],[-50,-25],[-45,-20],[-38,-12],[-35,-8],[-38,-5],
      [-45,0],[-52,4],[-60,8],[-72,11],[-80,12]
    ]] } },
    // Europe + Scandinavia
    { type: "Feature", id: 3, properties: { name: "Europe" }, geometry: { type: "Polygon", coordinates: [[
      [-10,36],[-5,38],[-2,43],[3,43],[8,44],[12,38],[15,40],[20,40],[23,38],[28,37],
      [32,36],[36,38],[40,42],[42,46],[40,52],[38,58],[30,62],[24,66],[18,68],[20,70],
      [27,71],[33,69],[40,68],[42,64],[40,55],[32,54],[20,55],[12,55],[5,52],[-2,50],
      [-5,45],[-8,42],[-10,36]
    ]] } },
    // Africa
    { type: "Feature", id: 4, properties: { name: "Africa" }, geometry: { type: "Polygon", coordinates: [[
      [-17,21],[-15,27],[-10,32],[-3,35],[8,33],[15,32],[22,32],[28,31],[32,30],[34,28],
      [37,22],[40,18],[44,13],[48,11],[51,10],[51,2],[47,-4],[42,-12],[40,-15],[36,-20],
      [32,-25],[28,-30],[22,-33],[18,-34],[16,-30],[12,-22],[8,-15],[4,-8],[0,-2],
      [-5,2],[-8,5],[-12,10],[-15,15],[-17,21]
    ]] } },
    // Asia
    { type: "Feature", id: 5, properties: { name: "Asia" }, geometry: { type: "Polygon", coordinates: [[
      [42,50],[48,52],[55,55],[62,58],[70,62],[80,66],[90,70],[105,72],[125,72],[140,69],
      [155,65],[170,62],[178,65],[178,72],[160,75],[140,76],[120,76],[100,75],[80,72],
      [62,68],[50,62],[44,55],[42,50]
    ]] } },
    // Asia south (India, SE Asia mainland)
    { type: "Feature", id: 6, properties: { name: "Asia south" }, geometry: { type: "Polygon", coordinates: [[
      [42,38],[48,40],[54,42],[60,42],[66,38],[70,32],[75,30],[80,22],[82,15],[85,11],
      [88,15],[92,22],[95,25],[100,22],[104,15],[107,8],[109,4],[112,2],[115,5],[120,8],
      [122,12],[125,18],[128,28],[130,33],[134,38],[140,40],[142,45],[140,48],[132,48],
      [125,45],[120,40],[115,35],[110,30],[105,30],[100,33],[95,33],[90,30],[85,28],
      [78,32],[72,35],[65,36],[55,38],[48,38],[42,38]
    ]] } },
    // Australia
    { type: "Feature", id: 7, properties: { name: "Australia" }, geometry: { type: "Polygon", coordinates: [[
      [113,-22],[118,-20],[123,-17],[130,-13],[135,-12],[140,-12],[143,-12],[145,-15],[150,-22],
      [153,-26],[152,-32],[148,-37],[143,-38],[138,-36],[132,-33],[126,-32],[120,-32],
      [115,-32],[113,-28],[113,-22]
    ]] } },
    // Antarctica strip
    { type: "Feature", id: 8, properties: { name: "Antarctica" }, geometry: { type: "Polygon", coordinates: [[
      [-180,-72],[-150,-75],[-120,-74],[-90,-75],[-60,-78],[-30,-72],[0,-70],[30,-68],
      [60,-67],[90,-67],[120,-66],[150,-72],[180,-78],[180,-90],[-180,-90],[-180,-72]
    ]] } },
    // Madagascar
    { type: "Feature", id: 9, properties: { name: "Madagascar" }, geometry: { type: "Polygon", coordinates: [[
      [43,-12],[48,-15],[50,-20],[48,-25],[44,-23],[43,-18],[43,-12]
    ]] } },
    // Great Britain
    { type: "Feature", id: 10, properties: { name: "Great Britain" }, geometry: { type: "Polygon", coordinates: [[
      [-5,50],[-2,51],[1,52],[1,55],[-1,58],[-5,58],[-6,55],[-6,52],[-5,50]
    ]] } },
    // Japan
    { type: "Feature", id: 11, properties: { name: "Japan" }, geometry: { type: "Polygon", coordinates: [[
      [130,32],[135,34],[140,36],[142,40],[145,43],[143,45],[140,42],[135,37],[131,34],[130,32]
    ]] } },
    // New Zealand
    { type: "Feature", id: 12, properties: { name: "New Zealand" }, geometry: { type: "Polygon", coordinates: [[
      [167,-46],[172,-43],[175,-39],[178,-37],[175,-41],[170,-45],[167,-46]
    ]] } },
    // Indonesia main (Borneo+Sumatra+Java composite)
    { type: "Feature", id: 13, properties: { name: "Indonesia" }, geometry: { type: "Polygon", coordinates: [[
      [95,2],[100,5],[108,4],[114,5],[118,2],[118,-3],[112,-6],[105,-7],[100,-3],[95,2]
    ]] } },
    // Iceland
    { type: "Feature", id: 14, properties: { name: "Iceland" }, geometry: { type: "Polygon", coordinates: [[
      [-23,64],[-18,64],[-14,65],[-15,67],[-21,67],[-23,64]
    ]] } },
  ],
};

// ─────────────────────────────────────────────────────────
// Default 20-sat catalog mirroring src/space/config.py.
// ─────────────────────────────────────────────────────────
window.SAT_CATALOG = [
  { alias: "ISS",        name: "ISS (ZARYA)",        inc: 51.6, alt: 417,  period: 92.7 },
  { alias: "CSS",        name: "Tiangong",           inc: 41.5, alt: 388,  period: 92.0 },
  { alias: "HST",        name: "Hubble",             inc: 28.5, alt: 540,  period: 95.5 },
  { alias: "NOAA-19",    name: "NOAA-19",            inc: 99.2, alt: 870,  period: 102.0 },
  { alias: "NOAA-20",    name: "NOAA-20",            inc: 98.7, alt: 824,  period: 101.5 },
  { alias: "METEOR-M2",  name: "Meteor-M 2",         inc: 98.8, alt: 820,  period: 101.4 },
  { alias: "TERRA",      name: "Terra",              inc: 98.2, alt: 705,  period: 99.0 },
  { alias: "AQUA",       name: "Aqua",               inc: 98.2, alt: 705,  period: 99.0 },
  { alias: "SENTINEL-2A",name: "Sentinel-2A",        inc: 98.6, alt: 786,  period: 100.6 },
  { alias: "LANDSAT-9",  name: "Landsat-9",          inc: 98.2, alt: 705,  period: 99.0 },
];

window.SAT_PALETTE = [
  "#e07a3c","#7ad99a","#6c92d8","#d9a857","#e85d4a",
  "#b67ad9","#7adcc5","#f4a261","#2a9d8f","#c45ab6",
  "#ffd166","#06d6a0","#118ab2","#ef476f","#ffba08",
  "#43aa8b","#f3722c","#f9c74f","#90be6d","#577590",
];

window.colorForSat = function (alias) {
  const idx = window.SAT_CATALOG.findIndex(s => s.alias === alias);
  return window.SAT_PALETTE[(idx >= 0 ? idx : 0) % window.SAT_PALETTE.length];
};

// ─────────────────────────────────────────────────────────
// Procedural ground-track / footprint generator — matches the
// shape sidecar's propagator.py would produce. Uses an inclined
// circular orbit with Earth-rotation-aware ground projection.
// ─────────────────────────────────────────────────────────
function generateGroundTrack(sat, minutes, stepSec, startMin) {
  const out = [];
  const incRad = sat.inc * Math.PI / 180;
  const seed = sat.alias.charCodeAt(0) + sat.alias.charCodeAt(sat.alias.length - 1);
  const phase0 = (seed % 360) * Math.PI / 180;
  const lon0 = ((seed * 37) % 360) - 180;
  const earthRot = 360 / (24 * 60); // deg / min
  for (let t = startMin || 0; t < (startMin || 0) + minutes; t += stepSec / 60) {
    const theta = phase0 + (t / sat.period) * 2 * Math.PI;
    const lat = Math.asin(Math.sin(incRad) * Math.sin(theta)) * 180 / Math.PI;
    const dLon = Math.atan2(Math.cos(incRad) * Math.sin(theta), Math.cos(theta)) * 180 / Math.PI;
    let lon = lon0 + dLon - earthRot * t;
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    out.push([lon, lat]);
  }
  return out;
}

function footprintRing(lon, lat, altKm) {
  // visible-horizon polygon for spherical Earth
  const R = 6378;
  const halfAngle = Math.acos(R / (R + altKm));
  const out = [];
  for (let a = 0; a < 360; a += 6) {
    const aRad = a * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const sinLat = Math.sin(latRad) * Math.cos(halfAngle) + Math.cos(latRad) * Math.sin(halfAngle) * Math.cos(aRad);
    const lat2 = Math.asin(sinLat) * 180 / Math.PI;
    const dLon = Math.atan2(Math.sin(aRad) * Math.sin(halfAngle) * Math.cos(latRad),
                            Math.cos(halfAngle) - Math.sin(latRad) * Math.sin(sinLat)) * 180 / Math.PI;
    out.push([lon + dLon, lat2]);
  }
  out.push(out[0]);
  return out;
}

window.getSatFixture = function (alias) {
  const sat = window.SAT_CATALOG.find(s => s.alias === alias) || window.SAT_CATALOG[0];
  const track = generateGroundTrack(sat, 95, 30, 0);
  const subpoint = track[Math.floor(track.length / 2)] || [0, 0];
  return {
    alias, name: sat.name, inc: sat.inc, alt_km: sat.alt, period: sat.period,
    subpoint,
    speed_kmps: 7.66,
    track: { alias, points: track },
    footprint: { alias, subpoint, alt_km: sat.alt, horizon_half_angle_deg: 0, ring: footprintRing(subpoint[0], subpoint[1], sat.alt) },
  };
};

// ─────────────────────────────────────────────────────────
// Day/night terminator — sub-solar at a fixed plausible point.
// ─────────────────────────────────────────────────────────
window.getTerminatorFixture = function () {
  const sunLon = -50, sunLat = 18; // mid-Atlantic afternoon-ish
  const ring = [];
  for (let lon = -180; lon <= 180; lon += 4) {
    const dLon = (lon - sunLon) * Math.PI / 180;
    const sunLatRad = sunLat * Math.PI / 180;
    // ring lat where sun is on the horizon
    const lat = Math.atan(-Math.cos(dLon) / Math.tan(sunLatRad || 0.01)) * 180 / Math.PI;
    ring.push([lon, lat]);
  }
  return { ring, subsolar: [sunLon, sunLat] };
};

// ─────────────────────────────────────────────────────────
// Sidecar hooks — auto-fallback to fixtures on error/CORS.
// ─────────────────────────────────────────────────────────
const { useState: GUS, useEffect: GUE, useMemo: GUM } = React;

function useFetched(url, fallback, intervalMs) {
  const [state, setState] = GUS({ data: fallback, live: false, err: null });
  GUE(() => {
    if (!url) return;
    let alive = true;
    const c = new AbortController();
    async function tick() {
      try {
        const r = await fetch(window.SIDECAR_HTTP + url, { signal: c.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        if (alive) setState({ data: j, live: true, err: null });
      } catch (e) {
        if (alive && e.name !== "AbortError") setState({ data: fallback, live: false, err: e.message });
      }
    }
    tick();
    const id = intervalMs ? setInterval(tick, intervalMs) : null;
    return () => { alive = false; c.abort(); if (id) clearInterval(id); };
  }, [url, intervalMs]);
  return state;
}

window.useNaturalEarth = function () {
  return useFetched("/api/land", window.NATURAL_EARTH_FALLBACK);
};
window.useSatTrack = function (alias) {
  const fb = GUM(() => alias ? window.getSatFixture(alias).track : null, [alias]);
  return useFetched(alias ? `/api/satellites/${alias}/track?minutes=95&step_seconds=30` : null, fb, 60000);
};
window.useSatFootprint = function (alias) {
  const fb = GUM(() => alias ? window.getSatFixture(alias).footprint : null, [alias]);
  return useFetched(alias ? `/api/satellites/${alias}/footprint` : null, fb, 10000);
};
window.useTerminator = function () {
  return useFetched("/api/terminator?twilight=civil", window.getTerminatorFixture(), 60000);
};
window.useSidecarHealth = function () {
  return useFetched("/api/health", { ok: false }, 5000);
};

// ─────────────────────────────────────────────────────────
// USGS all_day.geojson — live earthquake feed.
// Borrowed wholesale from the Seismograph baseline + proposal:
//   - Endpoint: USGS Earthquake Hazards (no CORS issues, no auth)
//   - Same magnitude buckets the proposal recommends
//   - Same near-exponential radius scaling
//   - Depth-aware stem on shallow quakes (proposal CR-03)
//   - Pulsing rings for M5+ (matches the existing baseline)
// ─────────────────────────────────────────────────────────
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

// Offline fixture — ~30 quakes around the Pacific Ring of Fire +
// a handful of mid-Atlantic / Iberian / Caucasus events for variety.
// Used when fetch fails (CORS, offline) so the design canvas always renders.
const USGS_FIXTURE = {
  type: "FeatureCollection",
  features: [
    // [lon, lat, depth_km], mag, place, time(ms)
    ...[
      [142.3, 36.7,  42,  6.4, "Off Honshu, JP"],
      [167.2,-15.4, 116,  5.2, "Vanuatu"],
      [-70.5,-22.1,   8,  4.6, "N. Chile"],
      [-171.4,52.1,  30,  4.1, "Aleutians"],
      [21.7,38.0,    14,  2.8, "Greece"],
      [144.9,13.4,   65,  5.9, "Mariana Trench"],
      [-122.3,40.5,  12,  3.4, "N. California"],
      [-148.7,61.2,   8,  4.2, "Cook Inlet, AK"],
      [121.5,23.6,   28,  5.5, "Taiwan"],
      [-78.6,-9.2,   62,  4.8, "Off Peru"],
      [139.7,35.4,   72,  4.1, "Tokyo Bay"],
      [-87.4,15.1,    9,  6.1, "Honduras"],
      [-2.0,40.4,    18,  3.2, "Central Spain"],
      [129.4,42.1,  548,  7.1, "Sea of Japan · DEEP"],
      [-156.3,20.1,  35,  3.8, "Hawaii"],
      [178.0,-29.7,  82,  5.0, "Kermadec Is."],
      [44.3,38.6,    12,  4.3, "Iran"],
      [-69.2,18.4,   22,  3.6, "Hispaniola"],
      [-110.3,32.4,   6,  2.1, "Arizona"],
      [99.8,-1.2,    36,  5.4, "Sumatra"],
      [-71.5,46.8,    8,  3.0, "Quebec"],
      [22.8,-21.0,   28,  4.0, "Botswana"],
      [165.0,-10.1,  44,  5.7, "Solomon Is."],
      [128.5,-7.4,   72,  4.7, "Banda Sea"],
      [-104.6,18.8, 28,  3.9, "Off Jalisco, MX"],
      [-77.1,-12.0,  58,  4.5, "Peru coast"],
      [56.2,27.8,    18,  3.4, "Strait of Hormuz"],
      [73.2,-53.1,   16,  4.0, "S. Indian Ocean"],
      [-176.5,-21.2, 95,  5.1, "Tonga"],
      [-90.4,14.7,   45,  4.9, "Guatemala"],
      [42.5,12.0,    14,  4.8, "Red Sea rift"],
    ].map(([lon, lat, depth, mag, place], i) => ({
      type: "Feature",
      id: `fx-${i}`,
      geometry: { type: "Point", coordinates: [lon, lat, depth] },
      properties: {
        mag, place, time: Date.now() - i * 14 * 60 * 1000,
        url: "https://earthquake.usgs.gov",
      },
    })),
  ],
};

window.useUsgsQuakes = function (refreshMs) {
  // 60s poll matches the USGS update cadence (and the proposal CR-06 ask).
  return useFetched("__usgs_full__", USGS_FIXTURE, refreshMs || 60000);
};

// Override the fetched URL for the USGS hook specifically.
const _origUseFetched = useFetched;
function useFetchedWithUsgs(url, fallback, intervalMs) {
  if (url === "__usgs_full__") {
    return _origUseFetched.call(null, null, fallback, 0).live === undefined
      ? useFetchedAbs(USGS_URL, fallback, intervalMs)
      : useFetchedAbs(USGS_URL, fallback, intervalMs);
  }
  return _origUseFetched(url, fallback, intervalMs);
}

function useFetchedAbs(absoluteUrl, fallback, intervalMs) {
  const [state, setState] = GUS({ data: fallback, live: false, err: null });
  GUE(() => {
    let alive = true;
    const c = new AbortController();
    async function tick() {
      try {
        const r = await fetch(absoluteUrl, { signal: c.signal });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        if (alive) setState({ data: j, live: true, err: null });
      } catch (e) {
        if (alive && e.name !== "AbortError") setState({ data: fallback, live: false, err: e.message });
      }
    }
    tick();
    const id = intervalMs ? setInterval(tick, intervalMs) : null;
    return () => { alive = false; c.abort(); if (id) clearInterval(id); };
  }, [absoluteUrl, intervalMs]);
  return state;
}
window.useUsgsQuakes = function (refreshMs) {
  return useFetchedAbs(USGS_URL, USGS_FIXTURE, refreshMs || 60000);
};

// Magnitude → color (Seismograph proposal ramp · ordered).
window.magColor = function (m) {
  if (m >= 7)   return "#FF4D5E"; // red    · critical
  if (m >= 6)   return "#FF8A3D"; // orange · major
  if (m >= 5)   return "#FFB547"; // amber  · strong
  if (m >= 3)   return "#5BF38A"; // green  · notable
  return "#54E5FF";               // cyan   · trace
};

// Magnitude → radius. Near-exponential per proposal CR-02.
window.magRadius = function (m) {
  return Math.max(2, 1.5 + Math.pow(m, 2) * 0.4 - 0.5 * m);
};

// Magnitude → tier label for filters / reports.
window.magTier = function (m) {
  if (m >= 7) return "CRITICAL";
  if (m >= 6) return "MAJOR";
  if (m >= 5) return "STRONG";
  if (m >= 3) return "NOTABLE";
  return "TRACE";
};

// ─────────────────────────────────────────────────────────
// <EarthquakeLayer feed={…} width={…} height={…} mode="dots|pulse" />
// Draws every quake from a USGS GeoJSON FeatureCollection.
// ─────────────────────────────────────────────────────────
window.EarthquakeLayer = function EarthquakeLayer({ feed, width = 720, height = 360, minMag = 0, focus, onPick }) {
  if (!feed || !feed.features) return null;
  return (
    <g aria-label="USGS earthquake layer">
      {feed.features.filter(f => f.properties && f.properties.mag >= minMag).map(f => {
        const [lon, lat, depth] = f.geometry.coordinates;
        const mag = f.properties.mag || 0;
        const [x, y] = window.geoProject(lon, lat, width, height);
        const c = window.magColor(mag);
        const r = window.magRadius(mag);
        const shallow = depth != null && depth < 35;
        const isFocused = focus && focus.id === f.id;
        return (
          <g key={f.id} style={{ cursor: onPick ? "pointer" : "default" }}
             onClick={onPick ? () => onPick(f) : undefined}>
            {/* depth stem — present only for shallow events */}
            {shallow && (
              <line x1={x} y1={y} x2={x} y2={y - r - 4}
                stroke={c} strokeOpacity="0.85" strokeWidth="1" />
            )}
            {/* pulsing rings for M5+ */}
            {mag >= 5 && (
              <g opacity="0.85">
                <circle cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth="1">
                  <animate attributeName="r" from={r} to={r * 4.5} dur={(3 - Math.min(mag, 8) * 0.18) + "s"} repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.7" to="0" dur={(3 - Math.min(mag, 8) * 0.18) + "s"} repeatCount="indefinite" />
                </circle>
                {mag >= 6 && (
                  <circle cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth="0.8">
                    <animate attributeName="r" from={r * 0.5} to={r * 3.2} dur="1.8s" repeatCount="indefinite" begin="0.6s" />
                    <animate attributeName="opacity" from="0.55" to="0" dur="1.8s" repeatCount="indefinite" begin="0.6s" />
                  </circle>
                )}
              </g>
            )}
            <circle cx={x} cy={y} r={r}
              fill={c}
              fillOpacity={isFocused ? 1 : (shallow ? 0.95 : 0.7)}
              stroke={isFocused ? "#fff" : c}
              strokeOpacity={isFocused ? 1 : 0.6}
              strokeWidth={isFocused ? 1.2 : 0.4}
              style={{ filter: mag >= 5 ? `drop-shadow(0 0 ${Math.min(8, r)}px ${c})` : "none" }}
            />
            {isFocused && (
              <g>
                <line x1={x - 12} y1={y} x2={x + 12} y2={y} stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
                <line x1={x} y1={y - 12} x2={x} y2={y + 12} stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
                <text x={x + 14} y={y + 4} fill="#fff" fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.06em">
                  M{mag.toFixed(1)} · {Math.round(depth)} km
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
};

// ─────────────────────────────────────────────────────────
// <NaturalEarthMap> — drop-in base for any map screen.
// Slots: bgLayer (e.g. satellite tiles), preLand, postLand, dayNight, children.
// ─────────────────────────────────────────────────────────
window.NaturalEarthMap = function NaturalEarthMap({
  width = 720, height = 360,
  graticule = true,
  bgLayer = null,
  preLand = null,
  postLand = null,
  dayNight = false,
  satelliteTiles = false,
  tileProvider = "nasa",
  children,
}) {
  const land = window.useNaturalEarth();
  const term = dayNight ? window.useTerminator() : null;

  const landPath = GUM(() => {
    const polys = land.data.features.flatMap(f =>
      f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates
    );
    return window.pathFromPolygons(polys, width, height);
  }, [land.data, width, height]);

  const termPath = GUM(() => {
    if (!term || !term.data) return "";
    return window.pathFromPolyline(term.data.ring, width, height);
  }, [term && term.data, width, height]);

  const nightPath = GUM(() => {
    if (!term || !term.data) return "";
    const pts = term.data.ring.map(([lo, la]) => window.geoProject(lo, la, width, height));
    return `M${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map(p => `L${p[0]} ${p[1]}`).join(" ")
      + ` L${pts[pts.length-1][0]} ${height} L${pts[0][0]} ${height} Z`;
  }, [term && term.data, width, height]);

  const onSat = satelliteTiles;

  return (
    <g>
      {/* base water */}
      <rect x="0" y="0" width={width} height={height} fill={onSat ? "#020409" : "#0a1a30"} />
      {bgLayer}
      {/* real satellite imagery */}
      {onSat && <window.TileLayer width={width} height={height} provider={tileProvider} opacity={tileProvider === "nasa" ? 0.92 : 0.95} />}
      {preLand}
      {/* land — full fill on vector mode, stroke-only on satellite to keep the photo */}
      {landPath && (
        <path d={landPath}
          fill={onSat ? "none" : "#27496f"}
          stroke={onSat ? "rgba(91,243,138,0.32)" : "#3a6592"}
          strokeWidth={onSat ? 0.7 : 0.5}
          opacity={onSat ? 0.9 : 1}
        />
      )}
      {/* graticule */}
      {graticule && (
        <g stroke={onSat ? "rgba(91,243,138,0.06)" : "rgba(255,255,255,0.05)"} strokeWidth="0.4" fill="none">
          {[-60, -30, 0, 30, 60].map(lat => {
            const [, y] = window.geoProject(0, lat, width, height);
            return <line key={`p${lat}`} x1="0" y1={y} x2={width} y2={y} />;
          })}
          {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lon => {
            const [x] = window.geoProject(lon, 0, width, height);
            return <line key={`m${lon}`} x1={x} y1="0" x2={x} y2={height} />;
          })}
        </g>
      )}
      <line x1="0" x2={width} y1={height / 2} y2={height / 2}
        stroke="#e07a3c" strokeWidth="0.7" opacity="0.35" strokeDasharray="3 5" />
      {nightPath && !onSat && <path d={nightPath} fill="rgba(2,6,14,0.55)" />}
      {termPath && <path d={termPath} fill="none" stroke="rgba(255,200,140,0.55)" strokeWidth="0.9" />}
      {postLand}
      {children}
      {/* live/static badge */}
      <g transform={`translate(${width - 6} ${height - 6})`}>
        <rect x="-78" y="-12" width="76" height="10" fill="rgba(2,4,10,0.7)" stroke={land.live ? "#7ad99a" : "#8a8b86"} strokeWidth="0.5" />
        <circle cx="-72" cy="-7" r="2.2" fill={land.live ? "#7ad99a" : "#8a8b86"} />
        <text x="-66" y="-4" fill={land.live ? "#7ad99a" : "#8a8b86"}
          fontFamily="HaxrCorp4089, monospace" fontSize="9" letterSpacing="0.10em">
          {land.live ? "NE · SIDECAR" : "NE · NE110m"}{onSat ? " · " + tileProvider.toUpperCase() : ""}
        </text>
      </g>
    </g>
  );
};

function SatelliteTileSheen({ width, height }) {
  // Suggests a tiled raster surface (Google Earth satellite slot) without
  // pretending to be real imagery. Real tiles plug into bgLayer later.
  return (
    <g opacity="0.4">
      <defs>
        <pattern id="sat-tile-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="#0d1b2f" />
          <rect width="60" height="60" fill="url(#sat-noise)" />
          <line x1="0" y1="0" x2="60" y2="0" stroke="#0a1525" strokeWidth="0.4" />
          <line x1="0" y1="0" x2="0" y2="60" stroke="#0a1525" strokeWidth="0.4" />
        </pattern>
        <radialGradient id="sat-noise" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#16304d" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a1525" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#sat-tile-grid)" />
    </g>
  );
}

// ─────────────────────────────────────────────────────────
// <TileLayer> — real satellite imagery for the map base.
// Providers:
//   nasa    · NASA Blue Marble single-image (public domain, equirectangular,
//             aligns perfectly with our vector overlay)
//   google  · mt0.google.com /vt/lyrs=s  (Web Mercator tiles)
//   google-hybrid · same with road labels (lyrs=y)
//   esri    · ArcGIS World Imagery     (Web Mercator tiles, no key)
//
// Mercator tiles are placed at their native ±85.05° lat range — slight
// equirectangular misalignment near the poles is by design (the photo and
// our vector polygons are different projections; we don't pretend to reproject).
// ─────────────────────────────────────────────────────────
window.TileLayer = function TileLayer({ width = 720, height = 360, provider = "nasa", zoom = 2, opacity = 0.85 }) {
  if (provider === "nasa") {
    return (
      <image
        href="https://upload.wikimedia.org/wikipedia/commons/c/cd/Land_ocean_ice_2048.jpg"
        x="0" y="0" width={width} height={height}
        preserveAspectRatio="none" opacity={opacity}
      />
    );
  }
  const URLS = {
    google:        "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    "google-hybrid": "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    esri:          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };
  const pattern = URLS[provider] || URLS.google;
  const n = Math.pow(2, zoom);
  const mercTop = 0.0275 * height;
  const mercH   = 0.945  * height;
  const tw = width / n;
  const th = mercH / n;
  const tiles = [];
  for (let tx = 0; tx < n; tx++) {
    for (let ty = 0; ty < n; ty++) {
      const url = pattern.replace("{x}", tx).replace("{y}", ty).replace("{z}", zoom);
      tiles.push(
        <image key={`${tx}-${ty}`} href={url}
          x={tx * tw} y={mercTop + ty * th}
          width={tw + 0.5} height={th + 0.5}
          preserveAspectRatio="none" opacity={opacity}
        />
      );
    }
  }
  return <g>{tiles}</g>;
};

// ─────────────────────────────────────────────────────────
// <SatelliteTrackLayer alias="ISS" color=auto showFootprint />
// ─────────────────────────────────────────────────────────
window.SatelliteTrackLayer = function SatelliteTrackLayer({
  alias, color, showFootprint = true, width = 720, height = 360, dim = false,
}) {
  const track = window.useSatTrack(alias);
  const footprint = window.useSatFootprint(alias);
  const c = color || window.colorForSat(alias);
  const trackPath = GUM(
    () => track.data ? window.pathFromPolyline(track.data.points, width, height) : "",
    [track.data, width, height]
  );
  const fpPath = GUM(
    () => footprint.data ? window.pathFromRing(footprint.data.ring, true, width, height) : "",
    [footprint.data, width, height]
  );
  const sub = footprint.data ? footprint.data.subpoint : null;
  return (
    <g aria-label={`${alias} track`} opacity={dim ? 0.55 : 1}>
      {showFootprint && fpPath && (
        <path d={fpPath} fill={c + "20"} stroke={c} strokeOpacity="0.55" strokeWidth="0.75" />
      )}
      {trackPath && (
        <path d={trackPath} fill="none" stroke={c} strokeOpacity="0.85"
          strokeWidth="1.4" strokeDasharray="2 4" strokeLinecap="round" />
      )}
      {sub && (() => {
        const [x, y] = window.geoProject(sub[0], sub[1], width, height);
        return (
          <g>
            <circle cx={x} cy={y} r="5" fill={c} stroke="#1a0c00" strokeWidth="0.5" />
            <circle cx={x} cy={y} r="9" fill="none" stroke={c} strokeOpacity="0.6">
              <animate attributeName="r" from="5" to="14" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <text x={x + 7} y={y - 5} fill={c} fontFamily="HaxrCorp4089, monospace" fontSize="9" letterSpacing="0.06em">{alias}</text>
          </g>
        );
      })()}
    </g>
  );
};
