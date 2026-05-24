import { useMemo, useState } from "react";
import {
  useLand,
  useSatellitePositions,
  useSatelliteFootprint,
  useSatelliteTrack,
  useSidecarHealth,
  useSun
} from "./sidecar";
import { MAP_HEIGHT, MAP_WIDTH, pathFromPolygons, pathFromPolyline, pathFromRing, project } from "./projection";
import { computeDayNight, type DayNight } from "./terminator-math";
import type { GeoJsonFeature, PositionFrame } from "./types";
import "./LiveOrbitView.css";

/**
 * Twenty distinct accent colours for multi-satellite tracks. Picked to stay
 * readable on the dark map background and against each other when several
 * satellites are selected at once. Index = position in the catalog so a given
 * satellite always gets the same track colour, regardless of selection order.
 */
const TRACK_PALETTE = [
  "#e07a3c", "#7ad99a", "#6c92d8", "#d9a857", "#e85d4a",
  "#b67ad9", "#7adcc5", "#f4a261", "#2a9d8f", "#c45ab6",
  "#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#ffba08",
  "#43aa8b", "#f3722c", "#f9c74f", "#90be6d", "#577590"
];

function colorForAlias(alias: string, catalogAliases: ReadonlyArray<string>): string {
  const idx = catalogAliases.indexOf(alias);
  return TRACK_PALETTE[(idx >= 0 ? idx : 0) % TRACK_PALETTE.length];
}

function hexToRgba(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const r = parseInt(v.substring(0, 2), 16);
  const g = parseInt(v.substring(2, 4), 16);
  const b = parseInt(v.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function nightSvgPath(geom: DayNight | null): string {
  if (!geom || geom.curve.length === 0) return "";
  const closingY = geom.sunInNorth ? MAP_HEIGHT : 0;
  const pts = geom.curve.map(([lon, lat]) => project(lon, lat));
  const firstX = pts[0][0];
  const lastX = pts[pts.length - 1][0];
  let d = `M${firstX.toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  d += `L${lastX.toFixed(1)} ${closingY}L${firstX.toFixed(1)} ${closingY}Z`;
  return d;
}

function terminatorSvgPath(geom: DayNight | null): string {
  if (!geom || geom.curve.length === 0) return "";
  const pts = geom.curve.map(([lon, lat]) => project(lon, lat));
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i += 1) {
    d += `L${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  }
  return d;
}

function geometryToPolygons(feature: GeoJsonFeature): Array<Array<Array<[number, number]>>> {
  if (feature.geometry.type === "Polygon") return [feature.geometry.coordinates];
  return feature.geometry.coordinates;
}

interface SatelliteTrackLayerProps {
  alias: string;
  color: string;
}

/**
 * Renders one satellite's footprint + dashed ground track. Each selected
 * satellite gets its own instance so the WebSocket / REST hooks stay simple
 * and the React hook rules are respected (no calling hooks in a loop).
 */
function SatelliteTrackLayer({ alias, color }: SatelliteTrackLayerProps) {
  const track = useSatelliteTrack(alias, 95, 30);
  const footprint = useSatelliteFootprint(alias, 5000);
  const trackPath = useMemo(
    () => (track.data ? pathFromPolyline(track.data.points) : ""),
    [track.data]
  );
  const footprintPath = useMemo(
    () => (footprint.data ? pathFromRing(footprint.data.ring, true) : ""),
    [footprint.data]
  );
  return (
    <g aria-label={`${alias} track`}>
      {footprintPath && (
        <path
          d={footprintPath}
          fill={hexToRgba(color, 0.08)}
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={0.75}
        />
      )}
      {trackPath && (
        <path
          d={trackPath}
          fill="none"
          stroke={color}
          strokeOpacity={0.85}
          strokeWidth={1.4}
          strokeDasharray="2 4"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

export interface LiveOrbitViewProps {
  /** Aliases to subscribe to via WebSocket and render on the map. If empty,
   *  no satellites are streamed. Defaults to the full sidecar catalog. */
  ids?: ReadonlyArray<string>;
  fps?: number;
  height?: number;
  className?: string;
  enabled?: boolean;
  /** Order of aliases in the sidecar catalog — used for stable track colours.
   *  When omitted, track colours are assigned by `ids` order. */
  catalogOrder?: ReadonlyArray<string>;
}

export function LiveOrbitView({
  ids,
  fps = 1,
  height,
  className,
  enabled = true,
  catalogOrder
}: LiveOrbitViewProps) {
  const visibleIds = ids ?? [];
  const wsEnabled = enabled && visibleIds.length > 0;
  const health = useSidecarHealth(enabled ? 5000 : 0);
  const positions = useSatellitePositions({ ids: visibleIds as string[], fps, enabled: wsEnabled });
  const land = useLand();
  const sun = useSun();
  const orderForPalette = catalogOrder ?? visibleIds;

  const [tracked, setTracked] = useState<Set<string>>(new Set());

  // Prune tracked entries that are no longer visible.
  const activeTracked = useMemo(() => {
    const visibleSet = new Set(visibleIds);
    return Array.from(tracked).filter((alias) => visibleSet.has(alias));
  }, [tracked, visibleIds]);

  const landPath = useMemo(() => {
    if (!land.data) return "";
    const polys = land.data.features.flatMap(geometryToPolygons);
    return pathFromPolygons(polys);
  }, [land.data]);

  const dayNight = useMemo(() => {
    if (!sun.data) return null;
    return computeDayNight(sun.data.lat, sun.data.lon);
  }, [sun.data?.lat, sun.data?.lon]);

  const nightPath = useMemo(() => nightSvgPath(dayNight), [dayNight]);
  const terminatorPath = useMemo(() => terminatorSvgPath(dayNight), [dayNight]);

  const sats: PositionFrame["satellites"] = positions.frame?.satellites ?? [];
  const statusLabel = describeStatus(positions.status, health.data, land.error || sun.error, visibleIds.length);

  function toggleTrack(alias: string) {
    setTracked((current) => {
      const next = new Set(current);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  }

  return (
    <div className={`space-live-orbit${className ? ` ${className}` : ""}`}>
      <header className="space-live-orbit__head">
        <div>
          <strong>Live Orbit View</strong>
          <em>Skyfield sidecar · day/night + sub-satellite tracks</em>
        </div>
        <div className={`space-live-orbit__status status-${positions.status}`}>
          <span className="dot" aria-hidden />
          {statusLabel}
        </div>
      </header>
      <svg
        className="space-live-orbit__svg"
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        style={height ? { height } : undefined}
        role="img"
        aria-label="Live orbit view — Earth equirectangular map with satellites, day/night terminator, and selected satellite ground tracks."
      >
        <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#0a1a30" />

        {landPath && (
          <path d={landPath} fill="#27496f" stroke="#3a6592" strokeWidth={0.5} />
        )}

        {nightPath && <path d={nightPath} fill="rgba(4, 12, 28, 0.65)" />}

        {terminatorPath && (
          <path
            d={terminatorPath}
            fill="none"
            stroke="rgba(255, 200, 140, 0.45)"
            strokeWidth={0.9}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Per-satellite tracks + footprints */}
        {activeTracked.map((alias) => (
          <SatelliteTrackLayer
            key={alias}
            alias={alias}
            color={colorForAlias(alias, orderForPalette)}
          />
        ))}

        {/* Satellite dots */}
        {sats.map((sat) => {
          const [x, y] = project(sat.lon, sat.lat);
          const isTracked = tracked.has(sat.alias);
          const color = isTracked ? colorForAlias(sat.alias, orderForPalette) : "#ffb066";
          return (
            <g
              key={sat.alias}
              className={`sat-dot${isTracked ? " sat-dot--tracked" : ""}`}
              onClick={() => toggleTrack(sat.alias)}
              role="button"
              tabIndex={0}
            >
              <circle
                cx={x}
                cy={y}
                r={isTracked ? 4.5 : 3}
                fill={color}
                stroke="#1a0c00"
                strokeWidth={0.5}
              />
              <text x={x + 5} y={y - 4} fontSize={8} fill={color}>
                {sat.alias}
              </text>
              {isTracked && (
                <text x={x + 5} y={y + 8} fontSize={7} fill={color}>
                  {sat.alt_km.toFixed(0)} km · {sat.speed_kmps.toFixed(2)} km/s
                </text>
              )}
            </g>
          );
        })}

        {/* Graticule reference (every 30°) */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth={0.4} fill="none">
          {[-60, -30, 0, 30, 60].map((lat) => {
            const [, y] = project(0, lat);
            return <line key={`p${lat}`} x1={0} y1={y} x2={MAP_WIDTH} y2={y} />;
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => {
            const [x] = project(lon, 0);
            return <line key={`m${lon}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
          })}
        </g>
      </svg>
      <footer className="space-live-orbit__legend">
        <span className="legend-pill">
          <i style={{ background: "#ffb066" }} /> satellite
        </span>
        <span className="legend-pill">
          <i style={{ background: "rgba(255, 200, 140, 0.45)" }} /> terminator
        </span>
        {activeTracked.length > 0 && (
          <>
            {activeTracked.slice(0, 5).map((alias) => (
              <span key={alias} className="legend-pill">
                <i style={{ background: colorForAlias(alias, orderForPalette) }} /> {alias}
              </span>
            ))}
            {activeTracked.length > 5 && (
              <span className="legend-pill">+{activeTracked.length - 5} more</span>
            )}
            <button type="button" className="legend-clear" onClick={() => setTracked(new Set())}>
              Clear all tracks ({activeTracked.length})
            </button>
          </>
        )}
        {activeTracked.length === 0 && (
          <em>Click satellites to draw their ground tracks + footprints.</em>
        )}
      </footer>
    </div>
  );
}

function describeStatus(
  status: "connecting" | "open" | "closed" | "error",
  health: { ok: boolean } | null,
  fetchError: string | null,
  visibleCount: number
): string {
  if (visibleCount === 0) return "no satellites selected";
  if (status === "open" && health?.ok) return `online · ${visibleCount} sats · 1 Hz`;
  if (status === "open") return `streaming · ${visibleCount} sats`;
  if (status === "connecting") return "connecting…";
  if (status === "error") return fetchError ? `error: ${fetchError}` : "connection error";
  return "offline · sidecar not reachable";
}
