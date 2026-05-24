export type TwilightLevel = "day" | "civil" | "nautical" | "astronomical";

export interface SidecarHealth {
  ok: boolean;
  now: string;
}

export interface SatelliteCatalogEntry {
  alias: string;
  name: string;
  norad_id: number;
  note?: string | null;
}

export interface SatelliteCatalog {
  satellites: SatelliteCatalogEntry[];
}

export interface SatelliteState {
  alias: string;
  name: string;
  norad_id: number;
  epoch: string;
  lat: number;
  lon: number;
  alt_km: number;
  speed_kmps: number;
}

export interface SatelliteTrack {
  alias: string;
  points: Array<[number, number]>;
}

export interface SatelliteFootprint {
  alias: string;
  subpoint: [number, number];
  alt_km: number;
  horizon_half_angle_deg: number;
  ring: Array<[number, number]>;
}

export interface TerminatorRing {
  epoch: string;
  subsolar: [number, number];
  twilight: TwilightLevel;
  depth_deg: number;
  ring: Array<[number, number]>;
}

export interface SunPosition {
  epoch: string;
  lat: number;
  lon: number;
}

export interface PositionFrame {
  epoch: string;
  satellites: Array<{
    alias: string;
    name: string;
    lat: number;
    lon: number;
    alt_km: number;
    speed_kmps: number;
  }>;
}

export interface GeoJsonMultiPolygon {
  type: "MultiPolygon";
  coordinates: Array<Array<Array<[number, number]>>>;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: Array<Array<[number, number]>>;
}

export type GeoJsonGeometry = GeoJsonMultiPolygon | GeoJsonPolygon;

export interface GeoJsonFeature {
  type: "Feature";
  id?: number;
  geometry: GeoJsonGeometry;
  properties: Record<string, unknown>;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export type ConnectionStatus = "connecting" | "open" | "closed" | "error";
