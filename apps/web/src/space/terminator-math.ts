/**
 * Client-side day/night terminator math.
 *
 * Termtrack derives `night_factor` per pixel from sun_alt; we use the same
 * spherical law of cosines but only along longitude samples and then connect
 * them with straight segments. For the day/night boundary (sun_alt = 0) the
 * latitude per longitude has a closed-form solution:
 *
 *   lat = atan(-cos(lat0) * cos(lon - lon0) / sin(lat0))
 *
 * which is the great circle exactly 90° from the sub-solar point. Projected
 * to equirectangular this is the familiar sine-shaped wave that termtrack's
 * terminator follows.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SAMPLES = 361; // 1° resolution

export interface DayNight {
  /** Sampled day/night boundary as [lon°, lat°] tuples, lon strictly in [-180, 180]. */
  curve: Array<[number, number]>;
  /** True when the sub-solar point is in the northern hemisphere. */
  sunInNorth: boolean;
}

export function computeDayNight(
  subsolarLatDeg: number,
  subsolarLonDeg: number,
  samples: number = SAMPLES
): DayNight {
  const lat0 = subsolarLatDeg * DEG2RAD;
  const lon0 = subsolarLonDeg * DEG2RAD;
  let sinLat0 = Math.sin(lat0);
  // Near-zero perturbation gives the equinox limit for free (terminator → vertical at lon0 ± 90°).
  if (Math.abs(sinLat0) < 1e-6) sinLat0 = sinLat0 >= 0 ? 1e-6 : -1e-6;
  const cosLat0 = Math.cos(lat0);
  const curve: Array<[number, number]> = [];
  for (let i = 0; i <= samples; i += 1) {
    const lonDeg = -180 + (360 * i) / samples;
    const lon = lonDeg * DEG2RAD;
    const latRad = Math.atan((-cosLat0 * Math.cos(lon - lon0)) / sinLat0);
    curve.push([lonDeg, latRad * RAD2DEG]);
  }
  return { curve, sunInNorth: subsolarLatDeg >= 0 };
}
