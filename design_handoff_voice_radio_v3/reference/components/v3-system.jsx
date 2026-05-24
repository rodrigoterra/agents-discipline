// VRP v3 — coherent design system tokens + shared atoms.
// One vocabulary, used across all four final screens.

window.V3 = (() => {
  const T = {
    bg: "#0c0d10",
    panel: "#14161b",
    panelHi: "#1c1f26",
    panelLo: "#0f1115",
    hair: "#262a33",
    hairHi: "#373c47",
    text: "#ebe7d8",
    muted: "#8a8b86",
    dim: "#4d4f54",
    copper: "#e07a3c",
    copperDim: "#a35a28",
    copperGlow: "rgba(224,122,60,0.18)",
    green: "#7ad99a",
    red: "#e85d4a",
    amber: "#d9a857",
    blue: "#6c92d8",
    capcom: "#e0b85a", // amber-yellow for CAPCOM speaker
    ship: "#7ad99a",   // green for SHIP speaker
  };

  const F = {
    display: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    pixel: "'VT323', 'JetBrains Mono', monospace",
  };

  return { T, F };
})();

const { T: V3T, F: V3F } = window.V3;
const { useState: V3US, useEffect: V3UE, useRef: V3UR } = React;

// ───────── PRIMITIVES ─────────

window.V3Card = function V3Card({ title, sub, action, children, pad = 14, style = {}, accent = false, dense = false }) {
  return (
    <section style={{
      background: V3T.panel,
      border: `1px solid ${accent ? "rgba(224,122,60,0.3)" : V3T.hair}`,
      borderRadius: 4,
      boxShadow: accent ? `0 0 0 1px ${V3T.copperGlow}, 0 1px 0 rgba(255,255,255,0.02) inset` : "0 1px 0 rgba(255,255,255,0.02) inset",
      ...style,
    }}>
      {title && (
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: dense ? "6px 10px" : "9px 12px",
          borderBottom: `1px solid ${V3T.hair}`,
          background: V3T.panelLo,
          borderRadius: "4px 4px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: V3F.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
              color: accent ? V3T.copper : V3T.text, textTransform: "uppercase",
            }}>{title}</span>
            {sub && (
              <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted, letterSpacing: "0.05em" }}>
                / {sub}
              </span>
            )}
          </div>
          {action}
        </header>
      )}
      <div style={{ padding: dense ? 10 : pad }}>{children}</div>
    </section>
  );
};

window.V3Btn = function V3Btn({ children, variant = "ghost", size = "md", icon, active, onClick, style = {}, full }) {
  const sizes = {
    sm: { h: 24, px: 8, fs: 10, gap: 5 },
    md: { h: 30, px: 12, fs: 11, gap: 6 },
    lg: { h: 38, px: 16, fs: 12, gap: 8 },
  };
  const variants = {
    primary: { bg: V3T.copper, fg: "#0c0d10", bd: V3T.copperDim, hov: "#e98a4c" },
    secondary: { bg: V3T.panelHi, fg: V3T.text, bd: V3T.hairHi, hov: V3T.panelHi },
    ghost: { bg: "transparent", fg: V3T.muted, bd: V3T.hair, hov: V3T.panelHi },
    danger: { bg: "transparent", fg: V3T.red, bd: "rgba(232,93,74,0.4)", hov: V3T.panelHi },
  };
  const s = sizes[size]; const v = variants[variant];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: s.gap,
      height: s.h, padding: `0 ${s.px}px`, width: full ? "100%" : "auto",
      background: active ? V3T.copper : v.bg, color: active ? "#0c0d10" : v.fg,
      border: `1px solid ${active ? V3T.copperDim : v.bd}`, borderRadius: 3,
      fontFamily: V3F.display, fontSize: s.fs, fontWeight: 600, letterSpacing: "0.12em",
      textTransform: "uppercase", cursor: "pointer", transition: "background 120ms",
      ...style,
    }}>
      {icon}<span>{children}</span>
    </button>
  );
};

window.V3Tag = function V3Tag({ children, color = "muted", filled = false }) {
  const palette = {
    muted: V3T.muted, copper: V3T.copper, green: V3T.green, red: V3T.red, amber: V3T.amber, blue: V3T.blue,
  };
  const c = palette[color] || color;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 6px", borderRadius: 2,
      fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
      textTransform: "uppercase",
      background: filled ? c : "transparent",
      color: filled ? "#0c0d10" : c,
      border: `1px solid ${filled ? c : c + "55"}`,
    }}>{children}</span>
  );
};

window.V3Drop = function V3Drop({ label, value, w, hot, full }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 9px", background: V3T.panelLo,
      border: `1px solid ${hot ? "rgba(224,122,60,0.4)" : V3T.hair}`, borderRadius: 3,
      width: full ? "100%" : (w || "auto"), minWidth: w || 0,
      cursor: "pointer",
    }}>
      <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: V3F.mono, fontSize: 11, color: hot ? V3T.copper : V3T.text }}>
        {value}<span style={{ color: V3T.muted, fontSize: 9 }}>▾</span>
      </span>
    </div>
  );
};

// Sleek slider with label + value, single accent color, peak indicator at 1.0
window.V3Slider = function V3Slider({ label, value, min = 0, max = 1, unit, accent = "copper", w }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const accentColor = V3T[accent] || accent;
  const isPeak = pct >= 0.98;
  const display = unit === "ms" || unit === "Hz" ? Math.round(value) : value.toFixed(2);
  return (
    <div style={{ width: w || "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: V3T.muted, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontFamily: V3F.mono, fontSize: 10, color: isPeak ? accentColor : V3T.text, fontWeight: 600 }}>
          {display}{unit ? <span style={{ color: V3T.muted, marginLeft: 2 }}>{unit}</span> : null}
        </span>
      </div>
      <div style={{ position: "relative", height: 4, background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: `${pct * 100}%`,
          background: isPeak ? accentColor : `linear-gradient(90deg, ${accentColor}88 0%, ${accentColor} 100%)`,
          boxShadow: isPeak ? `0 0 6px ${accentColor}` : "none",
        }} />
        <div style={{
          position: "absolute", top: -2, bottom: -2, left: `calc(${pct * 100}% - 2px)`, width: 4,
          background: V3T.text,
          boxShadow: isPeak ? `0 0 4px ${accentColor}` : "0 0 2px rgba(0,0,0,0.6)",
        }} />
      </div>
    </div>
  );
};

// Compact knob (CSS only). Always orange indicator.
window.V3Knob = function V3Knob({ value = 0.5, size = 44, label, accent = "copper" }) {
  const pct = Math.max(0, Math.min(1, value));
  const angle = -135 + pct * 270;
  const accentColor = V3T[accent] || accent;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${V3T.panelHi}, ${V3T.panelLo})`,
        border: `1px solid ${V3T.hairHi}`,
        position: "relative",
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4)`,
      }}>
        {/* tick ring */}
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 11 }, (_, i) => {
            const a = (-135 + i * 27) * Math.PI / 180;
            const r1 = size / 2 - 2, r2 = size / 2 - 5;
            const cx = size / 2, cy = size / 2;
            const lit = (i / 10) <= pct;
            return <line key={i}
              x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1}
              x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2}
              stroke={lit ? accentColor : V3T.dim} strokeWidth={1} />;
          })}
        </svg>
        {/* indicator */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          width: 2, height: size / 2 - 8,
          background: accentColor, transformOrigin: "top center",
          transform: `translate(-50%, 0) rotate(${angle}deg)`,
          boxShadow: `0 0 4px ${accentColor}`,
        }} />
        {/* center */}
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: size * 0.4, height: size * 0.4, borderRadius: "50%",
          background: V3T.panelHi, border: `1px solid ${V3T.hair}`,
        }} />
      </div>
      {label && <span style={{ fontFamily: V3F.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase" }}>{label}</span>}
    </div>
  );
};

window.V3Readout = function V3Readout({ value, label, w = 90, mono = true, accent }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", padding: "4px 8px",
      background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 3,
      minWidth: w,
    }}>
      {label && <span style={{ fontFamily: V3F.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: V3T.muted, textTransform: "uppercase", marginBottom: 1 }}>{label}</span>}
      <span style={{ fontFamily: mono ? V3F.mono : V3F.display, fontSize: 13, color: accent || V3T.text, fontWeight: 600, letterSpacing: "0.04em" }}>{value}</span>
    </div>
  );
};

window.V3LED = function V3LED({ on = true, color = "green", size = 6, blink = false }) {
  const [tick, setTick] = V3US(0);
  V3UE(() => { if (!blink) return; const t = setInterval(() => setTick(x => x + 1), 600); return () => clearInterval(t); }, [blink]);
  const isOn = on && (!blink || tick % 2 === 0);
  const c = V3T[color] || color;
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: isOn ? c : V3T.dim,
      boxShadow: isOn ? `0 0 ${size}px ${c}` : "none",
    }} />
  );
};

window.V3Speaker = function V3Speaker({ name, sub }) {
  const c = name === "CAPCOM" ? V3T.capcom : name === "SHIP" ? V3T.ship : V3T.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: 1, background: c }} />
      <span style={{ fontFamily: V3F.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: c }}>{name}</span>
      {sub && <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.muted }}>· {sub}</span>}
    </span>
  );
};

window.V3Wave = function V3Wave({ height = 36, seed = 1, color, dense = false }) {
  const w = 100, n = dense ? 80 : 56;
  const bars = Array.from({ length: n }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.4 + seed) + Math.sin(i * 0.13 + seed * 2)) * 0.4 + Math.abs(Math.cos(i * 0.07)) * 0.2;
    return Math.max(0.08, Math.min(1, v));
  });
  const c = color || V3T.copper;
  return (
    <svg viewBox={`0 0 ${w} 24`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {bars.map((b, i) => {
        const x = (i / n) * w;
        const h = b * 22;
        return <rect key={i} x={x} y={12 - h / 2} width={(w / n) * 0.6} height={h} fill={c} opacity={0.85} />;
      })}
    </svg>
  );
};
