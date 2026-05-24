// Voice Radio ALPHA — atoms + ALPHA additions.
// v3 atoms (Card, Btn, Tag, Drop, Slider, Knob, Readout, LED, Speaker, Wave)
// PLUS alpha atoms (ModeToggle, RoleTab, RoleLane, FxStackTile, FxStackChain,
// StaleChip, EnvMatrix, ResolvedMacrosCard, SpectroTriptych, MonitoringCard).

window.A = (() => {
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
    capcom: "#d9a857",
    ship: "#7ad99a",
    capcomBg: "rgba(217,168,87,0.08)",
    capcomBd: "rgba(217,168,87,0.30)",
    shipBg: "rgba(122,217,154,0.08)",
    shipBd: "rgba(122,217,154,0.30)",
    envOverlay: "rgba(108,146,216,0.45)",
    envOverlayTrack: "rgba(108,146,216,0.18)",
    spectroBg: "#08090c",
  };
  const F = {
    display: "'Space Grotesk', system-ui, sans-serif",
    mono: "'JetBrains Mono', ui-monospace, monospace",
    pixel: "'VT323', 'JetBrains Mono', monospace",
  };
  return { T, F };
})();

const AT = A.T, AF = A.F;
const { useState: AUS, useEffect: AUE, useRef: AUR } = React;

// ───────── Card ─────────
window.ACard = function ACard({ title, sub, action, children, pad = 14, style = {}, accent = false, dense = false, borderColor }) {
  return (
    <section style={{
      background: AT.panel,
      border: `1px solid ${borderColor || (accent ? "rgba(224,122,60,0.3)" : AT.hair)}`,
      borderRadius: 4,
      boxShadow: accent ? `0 0 0 1px ${AT.copperGlow}, 0 1px 0 rgba(255,255,255,0.02) inset` : "0 1px 0 rgba(255,255,255,0.02) inset",
      display: "flex", flexDirection: "column",
      ...style,
    }}>
      {title && (
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: dense ? "6px 10px" : "9px 12px",
          borderBottom: `1px solid ${AT.hair}`,
          background: AT.panelLo,
          borderRadius: "4px 4px 0 0",
          flex: "0 0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span style={{
              fontFamily: AF.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em",
              color: accent ? AT.copper : AT.text, textTransform: "uppercase", whiteSpace: "nowrap",
            }}>{title}</span>
            {sub && (
              <span style={{ fontFamily: AF.mono, fontSize: 10, color: AT.muted, letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                / {sub}
              </span>
            )}
          </div>
          {action && <div style={{ display: "flex", gap: 6, alignItems: "center", flex: "0 0 auto" }}>{action}</div>}
        </header>
      )}
      <div style={{ padding: dense ? 10 : pad, flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  );
};

// ───────── Btn ─────────
window.ABtn = function ABtn({ children, variant = "ghost", size = "md", icon, active, onClick, style = {}, full }) {
  const sizes = {
    sm: { h: 24, px: 8, fs: 10, gap: 5 },
    md: { h: 30, px: 12, fs: 11, gap: 6 },
    lg: { h: 38, px: 16, fs: 12, gap: 8 },
  };
  const variants = {
    primary:   { bg: AT.copper, fg: "#0c0d10", bd: AT.copperDim },
    secondary: { bg: AT.panelHi, fg: AT.text, bd: AT.hairHi },
    ghost:     { bg: "transparent", fg: AT.muted, bd: AT.hair },
    danger:    { bg: "transparent", fg: AT.red, bd: "rgba(232,93,74,0.4)" },
  };
  const s = sizes[size]; const v = variants[variant];
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: s.gap,
      height: s.h, padding: `0 ${s.px}px`, width: full ? "100%" : "auto",
      background: active ? AT.copper : v.bg, color: active ? "#0c0d10" : v.fg,
      border: `1px solid ${active ? AT.copperDim : v.bd}`, borderRadius: 3,
      fontFamily: AF.display, fontSize: s.fs, fontWeight: 600, letterSpacing: "0.12em",
      textTransform: "uppercase", cursor: "pointer", whiteSpace: "nowrap",
      ...style,
    }}>
      {icon}<span>{children}</span>
    </button>
  );
};

// ───────── Tag ─────────
window.ATag = function ATag({ children, color = "muted", filled = false, style = {} }) {
  const palette = { muted: AT.muted, copper: AT.copper, green: AT.green, red: AT.red, amber: AT.amber, blue: AT.blue, capcom: AT.capcom, ship: AT.ship };
  const c = palette[color] || color;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 6px", borderRadius: 2,
      fontFamily: AF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em",
      textTransform: "uppercase", whiteSpace: "nowrap",
      background: filled ? c : "transparent",
      color: filled ? "#0c0d10" : c,
      border: `1px solid ${filled ? c : c + "55"}`,
      ...style,
    }}>{children}</span>
  );
};

// ───────── Drop ─────────
window.ADrop = function ADrop({ label, value, w, hot, full }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 9px", background: AT.panelLo,
      border: `1px solid ${hot ? "rgba(224,122,60,0.4)" : AT.hair}`, borderRadius: 3,
      width: full ? "100%" : (w || "auto"), height: 28,
      cursor: "pointer",
    }}>
      <span style={{ fontFamily: AF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: AT.muted, textTransform: "uppercase" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: AF.mono, fontSize: 11, color: hot ? AT.copper : AT.text }}>
        {value}<span style={{ color: AT.muted, fontSize: 9 }}>▾</span>
      </span>
    </div>
  );
};

// ───────── Slider ─────────
window.ASlider = function ASlider({ label, value, min = 0, max = 1, unit, accent = "copper", envOverlay = null }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const accentColor = AT[accent] || accent;
  const isPeak = pct >= 0.98;
  const display = unit === "ms" || unit === "Hz" ? Math.round(value) : value.toFixed(2);
  const envPct = envOverlay != null ? Math.max(0, Math.min(1, (envOverlay - min) / (max - min))) : null;
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: AF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: AT.muted, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontFamily: AF.mono, fontSize: 10, color: isPeak ? accentColor : AT.text, fontWeight: 600 }}>
          {display}{unit ? <span style={{ color: AT.muted, marginLeft: 2 }}>{unit}</span> : null}
          {envOverlay != null && <span style={{ color: AT.envOverlay.replace("0.45", "1"), marginLeft: 4 }}>▴</span>}
        </span>
      </div>
      <div style={{ position: "relative", height: 4, background: envOverlay != null ? AT.envOverlayTrack : AT.panelLo, border: `1px solid ${AT.hair}`, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0, width: `${pct * 100}%`,
          background: isPeak ? accentColor : `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
          boxShadow: isPeak ? `0 0 6px ${accentColor}` : "none",
        }} />
        {envPct != null && (
          <div style={{ position: "absolute", top: -1, bottom: -1, left: `${envPct * 100}%`, width: 1, background: AT.blue }} />
        )}
        <div style={{
          position: "absolute", top: -2, bottom: -2, left: `calc(${pct * 100}% - 2px)`, width: 4,
          background: AT.text,
          boxShadow: isPeak ? `0 0 4px ${accentColor}` : "0 0 2px rgba(0,0,0,0.6)",
        }} />
      </div>
    </div>
  );
};

// ───────── Knob ─────────
window.AKnob = function AKnob({ value = 0.5, size = 44, label, accent = "copper" }) {
  const pct = Math.max(0, Math.min(1, value));
  const angle = -135 + pct * 270;
  const accentColor = AT[accent] || accent;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `radial-gradient(circle at 30% 30%, ${AT.panelHi}, ${AT.panelLo})`,
        border: `1px solid ${AT.hairHi}`, position: "relative",
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.04), 0 1px 2px rgba(0,0,0,0.4)`,
      }}>
        <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 11 }, (_, i) => {
            const a = (-135 + i * 27) * Math.PI / 180;
            const r1 = size / 2 - 2, r2 = size / 2 - 5;
            const cx = size / 2, cy = size / 2;
            const lit = (i / 10) <= pct;
            return <line key={i} x1={cx + Math.cos(a) * r1} y1={cy + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cy + Math.sin(a) * r2} stroke={lit ? accentColor : AT.dim} strokeWidth={1} />;
          })}
        </svg>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: size / 2 - 8, background: accentColor, transformOrigin: "top center", transform: `translate(-50%, 0) rotate(${angle}deg)`, boxShadow: `0 0 4px ${accentColor}` }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: size * 0.4, height: size * 0.4, borderRadius: "50%", background: AT.panelHi, border: `1px solid ${AT.hair}` }} />
      </div>
      {label && <span style={{ fontFamily: AF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: AT.muted, textTransform: "uppercase" }}>{label}</span>}
    </div>
  );
};

// ───────── Readout ─────────
window.AReadout = function AReadout({ value, label, w = 90, accent, sub }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", padding: "4px 8px",
      background: AT.panelLo, border: `1px solid ${AT.hair}`, borderRadius: 3, minWidth: w,
    }}>
      {label && <span style={{ fontFamily: AF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", color: AT.muted, textTransform: "uppercase", marginBottom: 2 }}>{label}</span>}
      <span style={{ fontFamily: AF.mono, fontSize: 13, color: accent || AT.text, fontWeight: 600, letterSpacing: "0.04em" }}>{value}</span>
      {sub && <span style={{ fontFamily: AF.mono, fontSize: 9, color: AT.muted, marginTop: 1 }}>{sub}</span>}
    </div>
  );
};

// ───────── LED ─────────
window.ALED = function ALED({ on = true, color = "green", size = 6, blink = false }) {
  const [tick, setTick] = AUS(0);
  AUE(() => { if (!blink) return; const t = setInterval(() => setTick(x => x + 1), 600); return () => clearInterval(t); }, [blink]);
  const isOn = on && (!blink || tick % 2 === 0);
  const c = AT[color] || color;
  return <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: isOn ? c : AT.dim, boxShadow: isOn ? `0 0 ${size}px ${c}` : "none", flex: "0 0 auto" }} />;
};

// ───────── Speaker ─────────
window.ASpeaker = function ASpeaker({ name, sub }) {
  const c = name === "CAPCOM" ? AT.capcom : name === "SHIP" ? AT.ship : AT.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: 1, background: c }} />
      <span style={{ fontFamily: AF.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: c }}>{name}</span>
      {sub && <span style={{ fontFamily: AF.mono, fontSize: 9, color: AT.muted }}>· {sub}</span>}
    </span>
  );
};

// ───────── Wave ─────────
window.AWave = function AWave({ height = 36, seed = 1, color, dense = false, opacity = 0.85 }) {
  const w = 100, n = dense ? 80 : 56;
  const bars = Array.from({ length: n }, (_, i) => {
    const v = Math.abs(Math.sin(i * 0.4 + seed) + Math.sin(i * 0.13 + seed * 2)) * 0.4 + Math.abs(Math.cos(i * 0.07 + seed)) * 0.2;
    return Math.max(0.08, Math.min(1, v));
  });
  const c = color || AT.copper;
  return (
    <svg viewBox={`0 0 ${w} 24`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
      {bars.map((b, i) => {
        const x = (i / n) * w;
        const h = b * 22;
        return <rect key={i} x={x} y={12 - h / 2} width={(w / n) * 0.6} height={h} fill={c} opacity={opacity} />;
      })}
    </svg>
  );
};

// ═════════════════════════════════════════════════════════════
// ALPHA atoms
// ═════════════════════════════════════════════════════════════

// ───────── ModeToggle ─────────
window.AModeToggle = function AModeToggle({ mode = "render" }) {
  const seg = (id, label, color) => {
    const active = mode === id;
    return (
      <div key={id} style={{
        height: 26, padding: "0 10px",
        display: "flex", alignItems: "center", gap: 6,
        background: active ? color : "transparent",
        color: active ? "#0c0d10" : AT.muted,
        fontFamily: AF.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
        textTransform: "uppercase", cursor: "pointer",
        borderRight: id === "live" ? `1px solid ${AT.hair}` : "none",
      }}>
        <window.ALED on={active} color={active ? (id === "live" ? "green" : "copper") : "dim"} size={5} blink={active && id === "live"} />
        {label}
      </div>
    );
  };
  return (
    <div style={{ display: "flex", border: `1px solid ${AT.hair}`, borderRadius: 3, background: AT.panelLo, overflow: "hidden" }}>
      {seg("live", "Live", AT.green)}
      {seg("render", "Render", AT.copper)}
    </div>
  );
};

// ───────── RoleTab ─────────
window.ARoleTab = function ARoleTab({ active = "CAPCOM", showBoth = true }) {
  const segs = [
    { id: "CAPCOM", label: "CAPCOM", color: AT.capcom },
    { id: "SHIP",   label: "SHIP",   color: AT.ship   },
    ...(showBoth ? [{ id: "BOTH", label: "BOTH", color: AT.copper }] : []),
  ];
  return (
    <div style={{ display: "flex", border: `1px solid ${AT.hair}`, borderRadius: 3, background: AT.panelLo, overflow: "hidden" }}>
      {segs.map((s, i) => {
        const a = active === s.id;
        return (
          <div key={s.id} style={{
            height: 30, padding: "0 14px",
            display: "flex", alignItems: "center",
            background: a ? s.color : "transparent",
            color: a ? "#0c0d10" : AT.muted,
            fontFamily: AF.display, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em",
            textTransform: "uppercase", cursor: "pointer", minWidth: 80, justifyContent: "center",
            borderRight: i < segs.length - 1 ? `1px solid ${AT.hair}` : "none",
          }}>{s.label}</div>
        );
      })}
    </div>
  );
};

// ───────── RoleLane ─────────
window.ARoleLane = function ARoleLane({ role, active, title, sub, action, children, style = {} }) {
  const roleColor = role === "CAPCOM" ? AT.capcom : AT.ship;
  const bg        = role === "CAPCOM" ? AT.capcomBg : AT.shipBg;
  const bd        = active ? (role === "CAPCOM" ? AT.capcomBd : AT.shipBd) : AT.hair;
  return (
    <section style={{
      background: AT.panel, border: `1px solid ${bd}`, borderRadius: 4,
      boxShadow: active ? `0 0 0 1px ${roleColor}1f, inset 0 1px 0 rgba(255,255,255,0.02)` : "inset 0 1px 0 rgba(255,255,255,0.02)",
      display: "flex", flexDirection: "column", minHeight: 0, ...style,
    }}>
      <div style={{ height: 4, background: active ? roleColor : roleColor + "55" }} />
      <header style={{
        padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: bg, borderBottom: `1px solid ${AT.hair}`,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: AF.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: roleColor, textTransform: "uppercase" }}>{title}</span>
          {sub && <span style={{ fontFamily: AF.mono, fontSize: 10, color: AT.muted }}>/ {sub}</span>}
        </div>
        {action}
      </header>
      <div style={{ padding: 12, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
};

// ───────── FxStackTile ─────────
window.AFxStackTile = function AFxStackTile({ group, active, bypassed, envOverlay }) {
  const accentColor = AT[group.accent] || group.accent;
  const baseBg = bypassed ? AT.panelLo : AT.panel;
  return (
    <div style={{
      position: "relative",
      background: bypassed
        ? `repeating-linear-gradient(45deg, ${AT.panelLo} 0 6px, ${AT.panel} 6px 12px)`
        : baseBg,
      border: `1px solid ${active ? accentColor : AT.hair}`,
      borderRadius: 4,
      padding: 10,
      opacity: bypassed ? 0.55 : 1,
      boxShadow: active ? `0 0 0 1px ${accentColor}33` : "none",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontFamily: AF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: accentColor, textTransform: "uppercase" }}>{group.title}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <window.ATag color={group.accent} filled={!bypassed}>{bypassed ? "BYP" : "ON"}</window.ATag>
          <span style={{
            width: 22, height: 22, display: "grid", placeItems: "center",
            background: AT.panelLo, border: `1px solid ${AT.hair}`, borderRadius: 3,
            color: AT.muted, fontSize: 11, cursor: "pointer",
          }}>↻</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {group.top.map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: AF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: AT.muted, textTransform: "uppercase" }}>{k}</span>
            <span style={{ fontFamily: AF.mono, fontSize: 11, color: bypassed ? AT.dim : AT.text, marginTop: 2 }}>
              {typeof v === "number" && v <= 1 ? v.toFixed(2) : v}
              {envOverlay && <span style={{ color: AT.blue, marginLeft: 4, fontSize: 9 }}>▴</span>}
            </span>
          </div>
        ))}
      </div>
      {envOverlay && !bypassed && (
        <div style={{
          marginTop: 8, height: 3, background: AT.envOverlayTrack, borderRadius: 1, position: "relative",
        }}>
          <div style={{ position: "absolute", left: "22%", top: -1, bottom: -1, width: 1, background: AT.blue }} />
          <div style={{ position: "absolute", left: "58%", top: -1, bottom: -1, width: 1, background: AT.blue }} />
          <div style={{ position: "absolute", left: "78%", top: -1, bottom: -1, width: 1, background: AT.blue }} />
        </div>
      )}
      <span style={{ position: "absolute", top: 4, right: 4, fontFamily: AF.mono, fontSize: 9, color: AT.dim }}>{group.ctrlCount} ctrl</span>
    </div>
  );
};

// ───────── FxStackChain ─────────
window.AFxStackChain = function AFxStackChain({ groups, activeId = null, bypassed = [], envOverlayGroups = [], flowing = true }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {groups.map((g, i) => (
        <React.Fragment key={g.id}>
          <window.AFxStackTile group={g} active={g.id === activeId} bypassed={bypassed.includes(g.id)} envOverlay={envOverlayGroups.includes(g.id)} />
          {i < groups.length - 1 && (
            <div style={{ display: "flex", justifyContent: "center", height: 16, position: "relative" }}>
              <div style={{ width: 2, background: AT.hair, height: "100%" }} />
              {flowing && !bypassed.includes(g.id) && (
                <div style={{ position: "absolute", top: 5, width: 6, height: 6, background: AT.copper, boxShadow: `0 0 4px ${AT.copper}` }} />
              )}
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// ───────── StaleChip ─────────
window.AStaleChip = function AStaleChip({ reasons = [], compact = false }) {
  if (!reasons.length) return null;
  const letterMap = { voice: "V", env: "E", "capcom-fx": "C", "ship-fx": "S" };
  const letters = reasons.map(r => letterMap[r]);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: compact ? "0" : "2px 4px 2px 6px",
      background: compact ? "transparent" : AT.red,
      color: compact ? AT.red : "#0c0d10",
      fontFamily: AF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em",
      textTransform: "uppercase", borderRadius: 2, animation: "alpha-stale-pulse 1.6s ease-in-out infinite",
    }}>
      {!compact && <span>STALE</span>}
      {letters.map(l => (
        <span key={l} style={{
          width: 13, height: 13, display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "transparent", color: AT.red,
          border: `1px solid ${AT.red}88`, borderRadius: 2,
          fontFamily: AF.display, fontSize: 8, fontWeight: 800, letterSpacing: 0,
        }}>{l}</span>
      ))}
    </span>
  );
};
