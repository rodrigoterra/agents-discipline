import { V3Icon } from "../../components/atoms";

export function PacketLossMarkers({ tick, signal }: { tick: number; signal: number }) {
  if (signal >= 0.9) return null;
  return (
    <>
      {Array.from({ length: 4 }, (_, index) => {
        const seed = Math.floor(tick * 0.2 + index * 7);
        if (Math.sin(seed) < (signal - 0.5) * 2) return null;
        const xPct = ((seed * 47) % 80) + 8;
        return (
          <span className="v3-packet-marker" key={index} style={{ left: `${xPct}%` }}>
            <i />
            <V3Icon name="alert" size={10} color="#e85d4a" />
          </span>
        );
      })}
    </>
  );
}

