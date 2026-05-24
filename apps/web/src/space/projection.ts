export const MAP_WIDTH = 720;
export const MAP_HEIGHT = 360;

export function project(lon: number, lat: number): [number, number] {
  const x = ((lon + 180) / 360) * MAP_WIDTH;
  const y = ((90 - lat) / 180) * MAP_HEIGHT;
  return [x, y];
}

/**
 * If a polygon's antimeridian crossing happens AT a pole (both endpoints at
 * |lat| > 85°), the straight line between (180, ±90) and (-180, ±90) is the
 * pole edge — exactly what we want to render in equirectangular. Unwrapping
 * that crossing collapses it to a degenerate point and forces the Z-close to
 * draw a long diagonal across the map (the "Antarctica upside down" bug).
 * Anything below this threshold is treated as a normal antimeridian crossing
 * and unwrapped, so satellite ground tracks (which top out around ±82°) still
 * get continuous-line rendering across the antimeridian.
 */
const POLAR_LATITUDE_THRESHOLD = 85;

function unwrapRing(
  ring: ReadonlyArray<readonly [number, number]>
): Array<[number, number]> {
  if (ring.length === 0) return [];
  const out: Array<[number, number]> = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i += 1) {
    const prev = ring[i - 1];
    const cur = ring[i];
    let dLon = cur[0] - prev[0];
    if (
      Math.abs(dLon) > 180 &&
      Math.abs(prev[1]) > POLAR_LATITUDE_THRESHOLD &&
      Math.abs(cur[1]) > POLAR_LATITUDE_THRESHOLD
    ) {
      out.push([cur[0], cur[1]]);
      continue;
    }
    while (dLon > 180) dLon -= 360;
    while (dLon < -180) dLon += 360;
    out.push([out[i - 1][0] + dLon, cur[1]]);
  }
  return out;
}

/**
 * Find every offset k*360 such that the polygon (at that offset) overlaps the
 * visible viewport [-180°, 180°]. Polygons that span more than 360° (rare,
 * but possible for multi-orbit satellite tracks) need multiple copies.
 */
function offsetsForRange(minLon: number, maxLon: number): number[] {
  const minK = Math.ceil((-180 - maxLon) / 360);
  const maxK = Math.floor((180 - minLon) / 360);
  const out: number[] = [];
  for (let k = minK; k <= maxK; k += 1) out.push(k * 360);
  return out;
}

function buildPath(
  unwrapped: ReadonlyArray<readonly [number, number]>,
  lonOffset: number,
  close: boolean
): string {
  if (unwrapped.length === 0) return "";
  const [x0, y0] = project(unwrapped[0][0] + lonOffset, unwrapped[0][1]);
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
  for (let i = 1; i < unwrapped.length; i += 1) {
    const [x, y] = project(unwrapped[i][0] + lonOffset, unwrapped[i][1]);
    d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  if (close) d += "Z";
  return d;
}

export function pathFromRing(
  ring: ReadonlyArray<readonly [number, number]>,
  close = false
): string {
  if (ring.length === 0) return "";
  const unwrapped = unwrapRing(ring);
  let minLon = unwrapped[0][0];
  let maxLon = unwrapped[0][0];
  for (const [lon] of unwrapped) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  const offsets = offsetsForRange(minLon, maxLon);
  const parts: string[] = [];
  for (const offset of offsets) {
    const d = buildPath(unwrapped, offset, close);
    if (d) parts.push(d);
  }
  return parts.join(" ");
}

export function pathFromPolygons(
  polygons: ReadonlyArray<ReadonlyArray<ReadonlyArray<readonly [number, number]>>>
): string {
  const parts: string[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const segment = pathFromRing(ring, true);
      if (segment) parts.push(segment);
    }
  }
  return parts.join(" ");
}

export function pathFromPolyline(
  ring: ReadonlyArray<readonly [number, number]>
): string {
  return pathFromRing(ring, false);
}
