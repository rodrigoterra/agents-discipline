// VRP v3 — shared shell chrome (top bar, left rail, right rail, bottom bar).
// Every screen wraps in <V3Shell active={...}>{main content}</V3Shell>.

const { useState: V3SUS, useEffect: V3SUE } = React;

window.V3Shell = function V3Shell({ active = "console", children, hideRight = false, hideBottom = false, screenLabel }) {
  return (
    <div data-screen-label={screenLabel} style={{
      width: 1280, height: 880, display: "flex", flexDirection: "column",
      background: V3T.bg, color: V3T.text, fontFamily: V3F.display,
      position: "relative", overflow: "hidden",
    }}>
      <V3TopBar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <V3LeftRail active={active} />
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, borderLeft: `1px solid ${V3T.hair}`, borderRight: hideRight ? "none" : `1px solid ${V3T.hair}` }}>
          <div style={{ flex: 1, padding: 16, overflow: "hidden" }}>{children}</div>
          {!hideBottom && <V3BottomBar />}
        </main>
        {!hideRight && <V3RightRail />}
      </div>
    </div>
  );
};

// ───────── TOP BAR ─────────
function V3TopBar() {
  const [t, setT] = V3SUS(new Date());
  V3SUE(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const F = window.VRP_FIXTURES_V2;
  const time = t.toISOString().slice(11, 19);
  return (
    <header style={{
      height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", borderBottom: `1px solid ${V3T.hair}`,
      background: `linear-gradient(180deg, ${V3T.panel} 0%, ${V3T.panelLo} 100%)`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 3, background: V3T.copper,
            display: "grid", placeItems: "center",
            boxShadow: `0 0 8px ${V3T.copperGlow}`,
          }}>
            <span style={{ fontFamily: V3F.display, fontWeight: 800, fontSize: 11, color: "#0c0d10" }}>V</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" }}>Voice Radio Pipeline</span>
            <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.muted, marginTop: 2 }}>v3.0 · console</span>
          </div>
        </div>
        <div style={{ width: 1, height: 24, background: V3T.hair }} />
        <window.V3Tag color="copper" filled>Mission · Odyssey 2026-05</window.V3Tag>
        <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>session {F.spec.sessionId}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <window.V3Readout label="MET" value={time} w={86} accent={V3T.copper} />
        <window.V3Readout label="BPM" value="120.0" w={56} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 3 }}>
          <window.V3LED on color="green" size={5} blink />
          <span style={{ fontFamily: V3F.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: V3T.green, textTransform: "uppercase" }}>Stitching · 3 / 4</span>
        </div>
        <div style={{ width: 1, height: 24, background: V3T.hair }} />
        <span style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.text }}>m.cabral</span>
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: V3T.copper, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, color: "#0c0d10" }}>MC</div>
      </div>
    </header>
  );
}

// ───────── LEFT RAIL ─────────
const V3_NAV = [
  { id: "console", label: "Console", icon: "▣" },
  { id: "voice",   label: "Voice",   icon: "◉" },
  { id: "fx",      label: "FX",      icon: "≋" },
  { id: "stitch",  label: "Stitch",  icon: "▦" },
];
const V3_NAV_SECONDARY = [
  { id: "lib", label: "Library", icon: "□" },
  { id: "ref", label: "NASA",    icon: "◬" },
  { id: "log", label: "Log",     icon: "≡" },
];

function V3LeftRail({ active }) {
  return (
    <nav style={{
      width: 64, display: "flex", flexDirection: "column", alignItems: "center",
      padding: "12px 0", gap: 4, background: V3T.panelLo,
    }}>
      {V3_NAV.map(item => (
        <V3NavBtn key={item.id} {...item} active={active === item.id} />
      ))}
      <div style={{ flex: 1 }} />
      {V3_NAV_SECONDARY.map(item => (
        <V3NavBtn key={item.id} {...item} muted />
      ))}
    </nav>
  );
}

function V3NavBtn({ icon, label, active, muted }) {
  return (
    <button style={{
      width: 48, height: 48, borderRadius: 4, position: "relative",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
      background: active ? "rgba(224,122,60,0.14)" : "transparent",
      border: `1px solid ${active ? "rgba(224,122,60,0.4)" : "transparent"}`,
      color: active ? V3T.copper : (muted ? V3T.dim : V3T.muted),
      cursor: "pointer",
      fontFamily: V3F.display,
    }}>
      {active && <span style={{ position: "absolute", left: -1, top: 8, bottom: 8, width: 2, background: V3T.copper, borderRadius: 1 }} />}
      <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>{label}</span>
    </button>
  );
}

// ───────── RIGHT RAIL: persistent context ─────────
function V3RightRail() {
  const F = window.VRP_FIXTURES_V2;
  const u = F.utterances[2]; // U3 active
  return (
    <aside style={{
      width: 280, display: "flex", flexDirection: "column", gap: 10,
      padding: 12, background: V3T.panelLo, overflow: "hidden",
    }}>
      <window.V3Card title="Now playing" sub={`U${u.n}`} dense accent>
        <div style={{ marginBottom: 8 }}>
          <window.V3Speaker name={u.speaker} sub={u.lang} />
        </div>
        <p style={{ fontFamily: V3F.mono, fontSize: 11, lineHeight: 1.45, color: V3T.text, margin: 0, marginBottom: 8 }}>"{u.text}"</p>
        <window.V3Wave height={28} seed={3} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: V3F.mono, fontSize: 9, color: V3T.muted }}>
          <span>0:00</span><span>{(u.durationMs / 1000).toFixed(1)}s</span>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <window.V3Btn size="sm" variant="ghost">A · Dry</window.V3Btn>
          <window.V3Btn size="sm" variant="primary">B · FX</window.V3Btn>
          <window.V3Btn size="sm" variant="ghost" style={{ marginLeft: "auto" }}>↻</window.V3Btn>
        </div>
      </window.V3Card>

      <window.V3Card title="Scene brief" sub="pt-BR" dense>
        <p style={{ fontFamily: V3F.mono, fontSize: 10.5, lineHeight: 1.5, color: V3T.text, margin: 0 }}>
          {F.sceneBrief}
        </p>
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <window.V3Btn size="sm" variant="ghost" full>Edit</window.V3Btn>
          <window.V3Btn size="sm" variant="secondary" full>Re-gen</window.V3Btn>
        </div>
      </window.V3Card>

      <window.V3Card title="NASA reference" dense>
        <div style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted, marginBottom: 5 }}>{F.spec.nasaSlug}</div>
        <window.V3Wave height={24} seed={11} color={V3T.blue} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <span style={{ fontFamily: V3F.mono, fontSize: 9.5, color: V3T.muted }}>{F.spec.nasaSource}</span>
          <window.V3Btn size="sm" variant="ghost">A/B</window.V3Btn>
        </div>
      </window.V3Card>

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 4, fontFamily: V3F.mono, fontSize: 9.5, color: V3T.muted }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Render queue</span><span style={{ color: V3T.green }}>2 active</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Storage</span><span>4.2 / 16 GB</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Last save</span><span>0:34 ago</span>
        </div>
      </div>
    </aside>
  );
}

// ───────── BOTTOM BAR: transport + batch jobs ─────────
function V3BottomBar() {
  const F = window.VRP_FIXTURES_V2;
  return (
    <footer style={{
      height: 52, display: "flex", alignItems: "center", gap: 14,
      padding: "0 14px", borderTop: `1px solid ${V3T.hair}`,
      background: V3T.panelLo,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <window.V3Btn size="sm" variant="ghost">⏮</window.V3Btn>
        <window.V3Btn size="md" variant="primary">▶ Play</window.V3Btn>
        <window.V3Btn size="sm" variant="ghost">⏭</window.V3Btn>
        <window.V3Btn size="sm" variant="ghost">●</window.V3Btn>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>0:04.2</span>
        <div style={{ flex: 1, position: "relative", height: 20 }}>
          {/* timeline track */}
          <div style={{ position: "absolute", inset: "8px 0", background: V3T.panel, border: `1px solid ${V3T.hair}`, borderRadius: 1 }} />
          {/* utterance segments */}
          {(() => {
            const total = F.utterances.reduce((s, u) => s + u.durationMs, 0);
            let off = 0;
            return F.utterances.map((u, i) => {
              const w = (u.durationMs / total) * 100;
              const l = (off / total) * 100;
              off += u.durationMs;
              const c = u.speaker === "CAPCOM" ? V3T.capcom : V3T.ship;
              return (
                <div key={u.id} style={{
                  position: "absolute", top: 6, height: 8, left: `${l}%`, width: `calc(${w}% - 2px)`,
                  background: u.processed ? c : c + "55",
                  borderRadius: 1,
                  border: u.stale ? `1px solid ${V3T.red}` : "none",
                }} />
              );
            });
          })()}
          {/* playhead */}
          <div style={{ position: "absolute", left: "32%", top: 0, bottom: 0, width: 2, background: V3T.copper, boxShadow: `0 0 6px ${V3T.copper}` }} />
        </div>
        <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>{(F.utterances.reduce((s, u) => s + u.durationMs, 0) / 1000).toFixed(1)}s</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: V3T.panel, border: `1px solid ${V3T.hair}`, borderRadius: 3 }}>
        <window.V3LED on color="amber" size={5} />
        <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: V3T.muted, textTransform: "uppercase" }}>Batch</span>
        <span style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.text }}>U4 · TTS</span>
        <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>62%</span>
      </div>

      <window.V3Btn size="md" variant="secondary">Stitch</window.V3Btn>
      <window.V3Btn size="md" variant="primary">Export</window.V3Btn>
    </footer>
  );
}
