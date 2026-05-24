import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

export type V3OLEDVariant = "wave" | "spectrum" | "dotgrid" | "scope";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function deterministicNoise(index: number, tick: number, seed: number) {
  const raw = Math.sin(index * 12.9898 + tick * 78.233 + seed * 37.719) * 43758.5453;
  return raw - Math.floor(raw);
}

function cellEnergy(variant: V3OLEDVariant, col: number, row: number, cols: number, rows: number, tick: number, speed: number, data?: number[]) {
  const x = cols <= 1 ? 0 : col / (cols - 1);
  const y = rows <= 1 ? 0 : row / (rows - 1);
  const t = tick * 0.14 * speed;
  if (data?.length) {
    const value = data[Math.min(data.length - 1, Math.floor(x * data.length))] ?? 0;
    return y > 1 - clamp01(value) ? 0.9 : 0.04;
  }
  if (variant === "wave") {
    const wave = 0.5 + Math.sin(x * Math.PI * 3.3 + t) * 0.2 + Math.cos(x * Math.PI * 7.4 - t * 0.7) * 0.08;
    return Math.abs(y - wave) < 0.06 ? 0.95 : Math.abs(y - wave) < 0.12 ? 0.28 : 0.04;
  }
  if (variant === "spectrum") {
    const band = 0.2 + Math.abs(Math.sin(x * Math.PI * 2.8 + t)) * 0.62;
    return y > 1 - band ? 0.18 + (1 - y) * 0.76 : 0.04;
  }
  if (variant === "dotgrid") {
    return deterministicNoise(col + row * cols, Math.floor(tick * speed), 3) > 0.72 - (1 - y) * 0.18 ? 0.72 : 0.04;
  }
  const scope = 0.5 + Math.sin(x * Math.PI * 7 + t * 1.4) * 0.16 + Math.sin(x * Math.PI * 17 - t) * 0.06;
  const burst = deterministicNoise(col, Math.floor(tick * 0.6), 8) > 0.84 ? 0.22 : 0;
  return Math.abs(y - scope) < 0.045 + burst ? 0.96 : 0.04;
}

export function V3OLED({
  width,
  height = 90,
  fluid = true,
  label,
  accent = "#e07a3c",
  dense = "med",
  variant,
  signal = 1,
  data,
  speed = 1
}: {
  width?: number;
  height?: number;
  fluid?: boolean;
  label?: ReactNode;
  accent?: string;
  dense?: "lo" | "med" | "hi";
  variant: V3OLEDVariant;
  signal?: number;
  data?: number[];
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [measuredWidth, setMeasuredWidth] = useState(width || 360);
  const [tick, setTick] = useState(0);
  const cellSize = dense === "hi" ? 6 : dense === "lo" ? 10 : 8;
  const rows = Math.max(8, Math.floor((height - 20) / cellSize));
  const cols = Math.max(18, Math.floor((fluid ? measuredWidth : width || measuredWidth) / cellSize));
  const signalLevel = clamp01(signal);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 220);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!fluid || !ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setMeasuredWidth(Math.max(120, entry.contentRect.width));
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [fluid]);

  const cells = useMemo(() => {
    return Array.from({ length: cols * rows }, (_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      let energy = cellEnergy(variant, col, row, cols, rows, tick, speed, data);
      if (signalLevel < 1) {
        const dropout = deterministicNoise(index, tick, 13);
        const noise = deterministicNoise(index, tick, 21);
        if (dropout > signalLevel + 0.18) energy = 0.015;
        else if (noise > 0.88) energy = Math.max(energy, 0.35 * (1 - signalLevel));
      }
      return clamp01(energy);
    });
  }, [cols, rows, tick, variant, speed, signalLevel, data]);

  return (
    <div
      className="v3-oled"
      ref={ref}
      style={{ "--oled-accent": accent, height, width: fluid ? "100%" : width } as CSSProperties}
    >
      <div className="v3-oled-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }}>
        {cells.map((energy, index) => <i key={index} style={{ opacity: 0.1 + energy * 0.9 }} />)}
      </div>
      <div className="v3-oled-label">{label}</div>
    </div>
  );
}
