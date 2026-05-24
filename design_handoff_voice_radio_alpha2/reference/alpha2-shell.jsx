// ALPHA2 shell — two-lane left rail · ALPHA2 topbar wordmark · contextual right rail.
// Replaces alpha-shell. Same width (1440×900). Right rail uses Situation Card
// instead of Now Playing / Scene Brief / NASA Reference (per ALPHA2 README).

const S2 = A.T, S2F = A.F;
const S2US = React.useState, S2UE = React.useEffect;

// Two-lane nav: narrative + audio.
window.ALPHA2_NAV = {
  narrative: [
    { id: "mc",       label: "Mission",   glyph: "mc" },
    { id: "flight",   label: "Flight",    glyph: "flight" },
    { id: "comms",    label: "Comms",     glyph: "comms" },
    { id: "weather",  label: "Weather",   glyph: "earthWeather" },
  ],
  audio: [
    { id: "voice",    label: "Voice",     glyph: "voice" },
    { id: "dialogue", label: "Dialog",    glyph: "dialogue" },
    { id: "fx",       label: "Radio FX",  glyph: "fx" },
    { id: "spectro",  label: "Spectro",   glyph: "spectro" },
    { id: "stitch",   label: "Stitch",    glyph: "stitch" },
  ],
  tools: [
    { id: "seis",     label: "Seis",      glyph: "seismograph" },
    { id: "rel",      label: "Rel",       glyph: "relative" },
  ],
};

// ─────────────────────────────────────────────────────────
// Outer shell
// ─────────────────────────────────────────────────────────
window.AShell2 = function AShell2({
  active = "mc",
  mode = "render",
  monitoringRole = null,
  situation,
  fxPresets,
  noRightRail = false,
  children,
  screenLabel,
}) {
  const W = 1440, H = 900;
  const isLive = mode === "live";
  return (
    <div data-screen-label={screenLabel} style={{
      width: W, height: H, display: "flex", flexDirection: "column",
      background: S2.bg, color: S2.text, fontFamily: S2F.display,
      position: "relative", overflow: "hidden",
      boxShadow: `inset 0 -1px 0 ${isLive ? S2.green : S2.copper}`,
    }}>
      <A2TopBar mode={mode} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <A2LeftRail active={active} />
        <main style={{
          flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
          borderLeft: `1px solid ${S2.hair}`, borderRight: `1px solid ${S2.hair}`,
        }}>
          <div style={{
            flex: 1, padding: 16, overflow: "hidden",
            display: "flex", flexDirection: "column", gap: 12,
          }}>{children}</div>
          <A2BottomBar />
        </main>
        {!noRightRail && (
          <A2RightRail mode={mode} monitoringRole={monitoringRole} situation={situation} fxPresets={fxPresets} />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Top bar — ALPHA2 wordmark + mission + MET + mode + user
// ─────────────────────────────────────────────────────────
function A2TopBar({ mode }) {
  const [t, setT] = S2US(new Date());
  S2UE(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const F = window.VRP_ALPHA_FIXTURES;
  const time = t.toISOString().slice(11, 19);
  const wm = window.ALPHA2_GLYPHS.wordmark;
  return (
    <header style={{
      height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", borderBottom: `1px solid ${S2.hair}`,
      background: `linear-gradient(180deg, ${S2.panel}, ${S2.panelLo})`,
      flex: "0 0 auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <pre style={{
          margin: 0, fontFamily: S2F.mono, fontSize: 9, lineHeight: 1, color: S2.copper,
          textShadow: `0 0 6px ${S2.copper}55`, whiteSpace: "pre",
        }}>{wm.sigil}</pre>
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.04em" }}>VOICE RADIO</span>
            <span style={{
              fontFamily: "'Hiragino Sans','Yu Gothic UI','Noto Sans JP',sans-serif",
              fontSize: 10, color: S2.muted, letterSpacing: "0.08em",
            }}>ボイス・ラジオ</span>
          </span>
          <span style={{ fontFamily: "HaxrCorp4089, " + S2F.mono, fontSize: 11, color: S2.copper, marginTop: 2, letterSpacing: "0.16em", WebkitFontSmoothing: "none" }}>
            ALPHA2 · NARRATIVE · INSTRUMENT · ART GAME
          </span>
        </div>
        <div style={{ width: 1, height: 28, background: S2.hair }} />
        <window.ATag color="copper" filled>Mission · {F.session.mission}</window.ATag>
        <span style={{ fontFamily: S2F.mono, fontSize: 10, color: S2.muted }}>session {F.session.sessionId}</span>
        <window.ATag color="blue">Scene 03 · Approach burn</window.ATag>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <window.AReadout label="MET" value={time} w={86} accent={S2.copper} />
        <window.AReadout label="BPM" value={F.session.bpm.toFixed(1)} w={56} />
        <window.AModeToggle mode={mode} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
          background: S2.panelLo, border: `1px solid ${S2.hair}`, borderRadius: 3 }}>
          <window.ALED on color="green" size={5} blink />
          <span style={{ fontFamily: S2F.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: S2.green, textTransform: "uppercase" }}>
            Rendering · 3 / 4
          </span>
        </div>
        <div style={{ width: 1, height: 24, background: S2.hair }} />
        <span style={{ fontFamily: S2F.mono, fontSize: 11, color: S2.text }}>{F.session.user}</span>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: S2.copper,
          display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, color: "#0c0d10" }}>MC</div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────
// Two-lane left rail.
// Each lane gets a label band; the active item glows copper.
// ─────────────────────────────────────────────────────────
function A2LeftRail({ active }) {
  return (
    <nav style={{
      width: 76, display: "flex", flexDirection: "column",
      padding: "10px 0 12px", gap: 4,
      background: S2.panelLo, flex: "0 0 auto",
      borderRight: `1px solid ${S2.hair}`,
    }}>
      <LaneLabel text="NARRATIVE" accent={S2.copper} />
      {window.ALPHA2_NAV.narrative.map(item => (
        <A2NavBtn key={item.id} {...item} active={active === item.id} />
      ))}
      <div style={{ height: 8 }} />
      <LaneLabel text="AUDIO" accent={S2.green} />
      {window.ALPHA2_NAV.audio.map(item => (
        <A2NavBtn key={item.id} {...item} active={active === item.id} />
      ))}
      <div style={{ height: 8 }} />
      <LaneLabel text="TOOLS" accent={S2.blue} />
      {window.ALPHA2_NAV.tools.map(item => (
        <A2NavBtn key={item.id} {...item} active={active === item.id} />
      ))}
      <div style={{ flex: 1 }} />
      <LaneLabel text="META" accent={S2.muted} />
      {[
        { id: "lib", label: "Lib",  glyph: null, icon: "□" },
        { id: "set", label: "Set",  glyph: null, icon: "≡" },
      ].map(item => (<A2NavBtn key={item.id} {...item} muted />))}
    </nav>
  );
}

function LaneLabel({ text, accent }) {
  return (
    <div style={{
      padding: "4px 8px 2px",
      fontFamily: "HaxrCorp4089, " + S2F.display, fontSize: 11, fontWeight: 400, letterSpacing: "0.16em",
      color: accent, textTransform: "uppercase",
      borderBottom: `1px dashed ${S2.hair}`, marginBottom: 2,
      display: "flex", alignItems: "center", gap: 4,
      WebkitFontSmoothing: "none",
    }}>
      <span style={{ width: 4, height: 4, background: accent, borderRadius: 1 }} />
      {text}
    </div>
  );
}

function A2NavBtn({ icon, label, glyph, active, muted }) {
  const g = glyph ? window.ALPHA2_GLYPHS[glyph] : null;
  const accent = g ? S2[g.color] || S2.copper : S2.copper;
  return (
    <div style={{
      margin: "0 6px",
      height: 50, borderRadius: 4, position: "relative",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
      background: active ? "rgba(224,122,60,0.12)" : "transparent",
      border: `1px solid ${active ? "rgba(224,122,60,0.4)" : "transparent"}`,
      color: active ? S2.copper : (muted ? S2.dim : S2.muted),
      cursor: "pointer", fontFamily: S2F.display,
    }}>
      {active && <span style={{ position: "absolute", left: -7, top: 10, bottom: 10, width: 2, background: S2.copper, borderRadius: 1, boxShadow: `0 0 4px ${S2.copper}` }} />}
      {g ? (
        <pre style={{
          margin: 0, fontSize: 6, lineHeight: 0.95, color: active ? S2.copper : accent,
          whiteSpace: "pre", opacity: active ? 1 : 0.7, textShadow: active ? `0 0 4px ${accent}88` : "none",
        }}>{g.sigil}</pre>
      ) : (
        <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      )}
      <span style={{
        fontFamily: "HelvB08, " + S2F.display, fontSize: 9, fontWeight: 400, letterSpacing: "0.10em", textTransform: "uppercase",
        WebkitFontSmoothing: "none",
      }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Right rail · ALPHA2 spec:
//   Situation Card (always)
//   FX presets (when relevant, optional)
//   Live monitoring card (when in live mode)
// No Now Playing / Scene Brief / NASA Reference cards.
// ─────────────────────────────────────────────────────────
function A2RightRail({ mode, monitoringRole, situation, fxPresets }) {
  const liveMon = mode === "live" && monitoringRole;
  const sit = situation || DEFAULT_SITUATION;
  return (
    <aside style={{
      width: 280, padding: 12, background: S2.bg,
      display: "flex", flexDirection: "column", gap: 10,
      flex: "0 0 auto", overflow: "hidden",
      borderLeft: `1px solid ${S2.hair}`,
    }}>
      {liveMon && <A2MonitoringCard role={monitoringRole} />}
      <SituationCard sit={sit} />
      {fxPresets && <FxPresetCard presets={fxPresets} />}
      <div style={{ marginTop: "auto", fontFamily: S2F.mono, fontSize: 9, color: S2.dim, lineHeight: 1.55 }}>
        <div>Render queue · 0</div>
        <div>Storage · 142 MB / 2 GB</div>
        <div>Last save · 0:14 ago</div>
      </div>
    </aside>
  );
}

const DEFAULT_SITUATION = {
  phase: "Approach burn · scene 03 / 07",
  flight: "Lunar flyby · 0.62× thrust",
  comms: "DSN Madrid → SHIP S-band",
  earth: "rain · Iberia · light",
  space: "CME front · ramp_up",
  capcom: { voice: "ash", state: "ready" },
  ship:   { voice: "coral", state: "stale" },
  warnings: ["U3 env-stale", "U4 voice-stale"],
};

function SituationCard({ sit }) {
  return (
    <window.ACard title="Situation" sub="narrative + audio handoff" dense accent>
      <pre style={{
        margin: 0, fontFamily: S2F.mono, fontSize: 10.5, lineHeight: 1.55,
        color: S2.text, whiteSpace: "pre-wrap",
      }}>
{`phase  ${sit.phase}
flight ${sit.flight}
comms  ${sit.comms}
earth  ${sit.earth}
space  ${sit.space}`}
      </pre>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <window.RoleBadge role="CAPCOM" size="sm" sub={sit.capcom.voice} />
          <window.ATag color={sit.capcom.state === "ready" ? "green" : "red"} filled>
            {sit.capcom.state.toUpperCase()}
          </window.ATag>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <window.RoleBadge role="SHIP" size="sm" sub={sit.ship.voice} />
          <window.ATag color={sit.ship.state === "ready" ? "green" : "red"} filled>
            {sit.ship.state.toUpperCase()}
          </window.ATag>
        </div>
      </div>
      {sit.warnings.length > 0 && (
        <div style={{
          marginTop: 10, padding: 8, background: S2.panelLo,
          border: `1px dashed ${S2.red}55`, borderRadius: 3,
        }}>
          <span style={{ fontFamily: S2F.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: S2.red, textTransform: "uppercase" }}>warnings · {sit.warnings.length}</span>
          {sit.warnings.map((w, i) => (
            <div key={i} style={{ fontFamily: S2F.mono, fontSize: 10, color: S2.muted, marginTop: 3 }}>· {w}</div>
          ))}
        </div>
      )}
    </window.ACard>
  );
}

function FxPresetCard({ presets }) {
  return (
    <window.ACard title="FX presets" sub="route → recipe" dense>
      {presets.map(p => (
        <div key={p.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "5px 0", borderBottom: `1px dashed ${S2.hair}`,
        }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: S2F.mono, fontSize: 11, color: S2.text }}>{p.label}</span>
            <span style={{ fontFamily: S2F.mono, fontSize: 9, color: S2.muted }}>{p.route}</span>
          </div>
          <window.ATag color={p.active ? "copper" : "muted"} filled={p.active}>
            {p.active ? "ACTIVE" : "LOAD"}
          </window.ATag>
        </div>
      ))}
    </window.ACard>
  );
}

function A2MonitoringCard({ role }) {
  const roleColor = role === "CAPCOM" ? S2.capcom : S2.ship;
  return (
    <window.ACard borderColor={roleColor + "55"} dense pad={10} style={{ boxShadow: `0 0 0 1px ${roleColor}22` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <window.ALED on color="green" size={6} blink />
          <span style={{ fontFamily: S2F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", color: S2.green, textTransform: "uppercase" }}>Live · monitoring</span>
        </div>
        <span style={{ fontFamily: S2F.mono, fontSize: 9, color: S2.muted }}>~12 ms</span>
      </div>
      <window.RoleBadge role={role} size="sm" sub={role === "CAPCOM" ? "ash" : "coral"} />
    </window.ACard>
  );
}

// ─────────────────────────────────────────────────────────
// Bottom bar — transport. Same as ALPHA but with ALPHA2 wording.
// ─────────────────────────────────────────────────────────
function A2BottomBar() {
  const F = window.VRP_ALPHA_FIXTURES;
  return (
    <footer style={{
      height: 52, display: "flex", alignItems: "center", padding: "0 16px", gap: 12,
      borderTop: `1px solid ${S2.hair}`,
      background: `linear-gradient(180deg, ${S2.panelLo}, ${S2.panel})`, flex: "0 0 auto",
    }}>
      <div style={{ display: "flex", gap: 4 }}>
        <window.ABtn size="md">⏮</window.ABtn>
        <window.ABtn variant="primary" size="md">▶ Play</window.ABtn>
        <window.ABtn size="md">⏭</window.ABtn>
        <window.ABtn size="md">●</window.ABtn>
      </div>
      <span style={{ fontFamily: S2F.mono, fontSize: 11, color: S2.copper, fontWeight: 600 }}>0:04.2</span>
      <div style={{ flex: 1, height: 20, background: S2.panelLo, border: `1px solid ${S2.hair}`, borderRadius: 2, position: "relative", display: "flex" }}>
        {[0.24, 0.27, 0.24, 0.25].map((w, i) => {
          const sp = F.utterances[i]?.speaker;
          const c = sp === "CAPCOM" ? S2.capcom : S2.ship;
          const stale = F.utterances[i]?.stale?.length > 0;
          return (
            <div key={i} style={{
              width: `${w * 100}%`, height: "100%",
              background: stale ? "transparent" : `linear-gradient(180deg, ${c}cc, ${c}66)`,
              borderRight: i < 3 ? `1px solid ${S2.bg}` : "none",
              border: stale ? `1px solid ${S2.red}` : "none",
              boxSizing: "border-box",
            }} />
          );
        })}
        <div style={{ position: "absolute", left: "32%", top: -2, bottom: -2, width: 2, background: S2.copper, boxShadow: `0 0 4px ${S2.copper}` }} />
      </div>
      <span style={{ fontFamily: S2F.mono, fontSize: 10, color: S2.muted }}>0:14.3</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: S2.panelLo, border: `1px solid ${S2.hair}`, borderRadius: 3 }}>
        <window.ALED on color="amber" size={5} blink />
        <span style={{ fontFamily: S2F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: S2.amber, textTransform: "uppercase" }}>Batch · U4 · TTS · 62%</span>
      </div>
      <window.ABtn variant="secondary">Stitch</window.ABtn>
      <window.ABtn variant="primary">Export</window.ABtn>
    </footer>
  );
}
