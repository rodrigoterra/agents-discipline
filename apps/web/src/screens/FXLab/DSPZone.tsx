import { V3Btn3D, V3Icon, V3OLED } from "../../components/atoms";
import type { V3Btn3DColor, V3IconName, V3OLEDVariant } from "../../components/atoms";
import type { CSSProperties } from "react";
import { PacketLossMarkers } from "./PacketLossMarkers";
import { SatelliteAnim } from "./SatelliteAnim";

export type DspControlSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
};

export type DspGroupSpec = {
  id: "quindar" | "voiceband" | "hiss" | "scint" | "granular";
  title: string;
  controls: DspControlSpec[];
};

export function DSPZone({
  group,
  spec,
  values,
  signal,
  tick,
  disabled = false,
  onControlChange
}: {
  group: DspGroupSpec;
  spec: { color: string; oled: V3OLEDVariant; icon: V3IconName; btn: V3Btn3DColor };
  values: Record<string, number>;
  signal: number;
  mode: string;
  tick: number;
  disabled?: boolean;
  onControlChange: (key: string, value: number) => void;
}) {
  const isDegrade = group.id === "granular" || (group.id === "scint" && signal < 0.7);
  const cols = group.controls.length > 6 ? 4 : 3;
  const oledData = Array.from({ length: 44 }, (_, index) => {
    const control = group.controls[index % group.controls.length];
    const value = values[control.key] ?? control.min;
    const normalized = (value - control.min) / Math.max(1, control.max - control.min);
    const ripple = Math.sin(index * 0.38 + tick * 0.08) * 0.08;
    return Math.max(0.04, Math.min(0.96, normalized * 0.72 + signal * 0.18 + ripple));
  });

  return (
    <section className={`v3-dsp-zone zone-${group.id}${group.id === "voiceband" ? " is-accent" : ""}${disabled ? " is-disabled" : ""}`}>
      <header>
        <div>
          <strong>{group.title}</strong>
          <em>/ {group.controls.length} ctrl</em>
        </div>
        <div className="zone-badges">
          {isDegrade && signal < 0.8 && <span className="loss-pill"><V3Icon name="alert" size={11} color="#e85d4a" pulse /> LOSS</span>}
          <span className="zone-on" style={{ "--zone-color": disabled ? "#8a8b86" : spec.color } as CSSProperties}><V3Icon name={spec.icon} size={11} color={disabled ? "#8a8b86" : spec.color} spin={!disabled && spec.icon === "satellite"} /> {disabled ? "OFF" : "ON"}</span>
        </div>
      </header>

      <div className="zone-oled-wrap">
        <V3OLED
          accent={spec.color}
          height={96}
          label={<><span><V3Icon name={spec.icon} size={11} color={spec.color} pulse={isDegrade && signal < 0.8} /> {group.id.toUpperCase()}.OUT</span><span>{(signal * 100).toFixed(0)}%</span></>}
          data={oledData}
          signal={isDegrade ? signal : 1}
          speed={group.id === "hiss" ? 0.5 : group.id === "granular" ? 1.4 : 1}
          variant={spec.oled}
        />
        {group.id === "scint" && <div className="satellite-overlay"><SatelliteAnim /></div>}
        {group.id === "granular" && <PacketLossMarkers signal={signal} tick={tick} />}
      </div>

      <div className="v3-zone-controls" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {group.controls.map((control) => {
          const value = values[control.key] ?? 0;
          const pct = ((value - control.min) / Math.max(1, control.max - control.min)) * 100;
          const display = control.suffix === "ms" || control.suffix === "Hz" || Number.isInteger(control.step) ? value.toFixed(0) : value.toFixed(2);
          return (
            <label className="v3-mini-slider" key={control.key}>
              <span>{control.label}</span>
              <output>{display}{control.suffix || ""}</output>
              <input
                style={{ "--fill": `${pct}%`, "--slider-accent": spec.color } as CSSProperties}
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={value}
                disabled={disabled}
                onChange={(event) => onControlChange(control.key, Number(event.target.value))}
              />
            </label>
          );
        })}
      </div>

      <footer>
        <V3Btn3D color={spec.btn} size="sm" label="Bypass" />
        <V3Btn3D color="white" size="sm" label="Solo" />
        <V3Btn3D color="grey" size="sm" label="A/B" />
        <V3Btn3D color="black" size="sm" iconNode={<V3Icon name="waves" size={11} color="#e07a3c" />} />
        <V3Btn3D color="black" size="sm" label="↻" style={{ marginLeft: "auto" }} />
      </footer>
    </section>
  );
}
