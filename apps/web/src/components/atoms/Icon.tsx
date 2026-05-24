import {
  AlertTriangle,
  Filter,
  RadioTower,
  Satellite,
  SatelliteDish,
  Scissors,
  Signal,
  SignalLow,
  SignalZero,
  Waves,
  WifiOff,
  Zap
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type V3IconName =
  | "satellite"
  | "dish"
  | "tower"
  | "signal"
  | "sigLow"
  | "sigZero"
  | "wifiOff"
  | "waves"
  | "alert"
  | "zap"
  | "scissors"
  | "filter"
  | "noise";

type LucideComponent = ComponentType<SVGProps<SVGSVGElement>>;

function iconForName(name: V3IconName): LucideComponent {
  switch (name) {
    case "satellite": return Satellite;
    case "dish": return SatelliteDish;
    case "tower": return RadioTower;
    case "signal": return Signal;
    case "sigLow": return SignalLow;
    case "sigZero": return SignalZero;
    case "wifiOff": return WifiOff;
    case "waves": return Waves;
    case "alert": return AlertTriangle;
    case "zap": return Zap;
    case "scissors": return Scissors;
    case "filter": return Filter;
    case "noise": return Waves;
  }
}

export function V3Icon({
  name,
  size = 14,
  color = "currentColor",
  strokeWidth = 1.8,
  spin = false,
  pulse = false
}: {
  name: V3IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  spin?: boolean;
  pulse?: boolean;
}) {
  const IconComponent = iconForName(name);
  return (
    <IconComponent
      aria-hidden="true"
      className={`${spin ? "v3-icon-spin" : ""}${pulse ? " v3-icon-pulse" : ""}`}
      color={color}
      height={size}
      strokeWidth={strokeWidth}
      width={size}
    />
  );
}

