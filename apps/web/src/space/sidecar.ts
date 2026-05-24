import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ConnectionStatus,
  GeoJsonFeatureCollection,
  PositionFrame,
  SatelliteCatalog,
  SatelliteFootprint,
  SatelliteState,
  SatelliteTrack,
  SidecarHealth,
  SunPosition,
  TerminatorRing,
  TwilightLevel
} from "./types";

const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
export const SIDECAR_HTTP = env.VITE_SIDECAR_HTTP ?? "http://127.0.0.1:8765";
export const SIDECAR_WS = env.VITE_SIDECAR_WS ?? SIDECAR_HTTP.replace(/^http/, "ws");

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${SIDECAR_HTTP}${path}`, { signal });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

function usePolledJson<T>(path: string | null, intervalMs?: number): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    const controller = new AbortController();
    async function tick() {
      try {
        const value = await getJson<T>(path!, controller.signal);
        if (alive) {
          setData(value);
          setError(null);
        }
      } catch (e) {
        if (alive && (e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      }
    }
    tick();
    const id = intervalMs ? window.setInterval(tick, intervalMs) : undefined;
    return () => {
      alive = false;
      controller.abort();
      if (id) window.clearInterval(id);
    };
  }, [path, intervalMs]);
  return { data, error };
}

export function useSidecarHealth(intervalMs = 5000) {
  return usePolledJson<SidecarHealth>("/api/health", intervalMs);
}

export function useLand() {
  return usePolledJson<GeoJsonFeatureCollection>("/api/land");
}

export function useSatelliteCatalog() {
  return usePolledJson<SatelliteCatalog>("/api/satellites");
}

export function useTerminator(twilight: TwilightLevel = "civil", intervalMs = 60_000) {
  return usePolledJson<TerminatorRing>(`/api/terminator?twilight=${twilight}`, intervalMs);
}

export function useSun(intervalMs = 60_000) {
  return usePolledJson<SunPosition>("/api/sun", intervalMs);
}

export function useSatelliteState(alias: string | null, intervalMs = 5000) {
  return usePolledJson<SatelliteState>(alias ? `/api/satellites/${alias}/state` : null, intervalMs);
}

export function useSatelliteTrack(
  alias: string | null,
  minutes = 95,
  stepSeconds = 30,
  intervalMs = 60_000
) {
  const path = alias ? `/api/satellites/${alias}/track?minutes=${minutes}&step_seconds=${stepSeconds}` : null;
  return usePolledJson<SatelliteTrack>(path, intervalMs);
}

export function useSatelliteFootprint(alias: string | null, intervalMs = 10_000) {
  return usePolledJson<SatelliteFootprint>(alias ? `/api/satellites/${alias}/footprint` : null, intervalMs);
}

export interface PositionsOptions {
  ids?: string[];
  fps?: number;
  enabled?: boolean;
}

export function useSatellitePositions({ ids, fps = 1, enabled = true }: PositionsOptions = {}) {
  const [frame, setFrame] = useState<PositionFrame | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const idsKey = useMemo(() => ids?.slice().sort().join(",") ?? "", [ids]);

  useEffect(() => {
    if (!enabled) {
      setStatus("closed");
      wsRef.current?.close();
      return;
    }
    let alive = true;
    let retryHandle: number | undefined;
    let attempts = 0;
    const params = new URLSearchParams();
    if (idsKey) params.set("ids", idsKey);
    params.set("fps", String(fps));
    const url = `${SIDECAR_WS}/ws/positions?${params.toString()}`;

    function connect() {
      if (!alive) return;
      attempts += 1;
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        if (!alive) return;
        attempts = 0;
        setStatus("open");
      };
      ws.onmessage = (event) => {
        if (!alive) return;
        try {
          setFrame(JSON.parse(typeof event.data === "string" ? event.data : event.data.toString()));
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onerror = () => {
        if (alive) setStatus("error");
      };
      ws.onclose = () => {
        if (!alive) return;
        setStatus("closed");
        const backoff = Math.min(15_000, 1000 * 2 ** Math.min(attempts, 4));
        retryHandle = window.setTimeout(connect, backoff);
      };
    }

    connect();
    return () => {
      alive = false;
      if (retryHandle) window.clearTimeout(retryHandle);
      wsRef.current?.close();
    };
  }, [enabled, idsKey, fps]);

  return { frame, status };
}
