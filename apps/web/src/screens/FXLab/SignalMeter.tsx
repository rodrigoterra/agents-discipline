import { V3Icon } from "../../components/atoms";
import type { CSSProperties } from "react";

export function SignalMeter({ signal }: { signal: number; tick?: number }) {
  const clamped = Math.max(0, Math.min(1, signal));
  const lit = Math.round(clamped * 6);
  const color = clamped < 0.4 ? "#e85d4a" : clamped < 0.75 ? "#d9a857" : "#7ad99a";
  const status = clamped < 0.4 ? "DEGRADED" : clamped < 0.75 ? "DROPS" : "LOCK";

  return (
    <div className="v3-signal-meter" aria-label={`Uplink signal ${(clamped * 100).toFixed(0)} percent`}>
      <V3Icon name="dish" size={17} color="#e07a3c" pulse={clamped < 0.7} />
      <div className="v3-signal-bars">
        {Array.from({ length: 6 }, (_, index) => (
          <i
            key={index}
            className={index < lit ? "lit" : ""}
            style={{ height: `${5 + index * 2.2}px`, "--signal-color": color } as CSSProperties}
          />
        ))}
      </div>
      <strong>{(clamped * 100).toFixed(0)}%</strong>
      <span><em>UPLINK</em><b style={{ color }}><V3Icon name="zap" size={9} color={color} /> {status}</b></span>
    </div>
  );
}
