// VRP v3 · SCREEN 1 — CONSOLE
// Mixer-forward main view. Channel strips per voice/utterance, scene brief at top,
// quick FX scene picker + spectrogram. Built entirely from V3 atoms.

const { useState: V3CUS, useEffect: V3CUE } = React;

function V3Console() {
  const F = window.VRP_FIXTURES_V2;
  const [tick, setTick] = V3CUS(0);
  V3CUE(() => { const t = setInterval(() => setTick(x => x + 1), 250); return () => clearInterval(t); }, []);

  const channels = [
    { id: "u1", label: "U1", speaker: "CAPCOM", voice: "ash",   level: 0.78, pan: -0.2, mute: false, solo: false, fx: "STORM '65", processed: true },
    { id: "u2", label: "U2", speaker: "SHIP",   voice: "coral", level: 0.62, pan:  0.3, mute: false, solo: false, fx: "LO-ORBIT",  processed: true },
    { id: "u3", label: "U3", speaker: "CAPCOM", voice: "ash",   level: 0.84, pan: -0.2, mute: false, solo: true,  fx: "STORM '65", processed: true, active: true },
    { id: "u4", label: "U4", speaker: "SHIP",   voice: "coral", level: 0.55, pan:  0.3, mute: false, solo: false, fx: "LO-ORBIT",  processed: false },
    { id: "qd", label: "QD", speaker: "—",      voice: "tone",  level: 0.42, pan:  0.0, mute: false, solo: false, fx: "QUINDAR",   processed: true },
    { id: "bus", label: "BUS", speaker: "—",    voice: "—",     level: 0.92, pan:  0.0, mute: false, solo: false, fx: "MASTER",    processed: true, master: true },
  ];

  return (
    <window.V3Shell active="console" screenLabel="V3-01 Console">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
        {/* Header strip — page title + scene meta + FX scene picker */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Mission Console</h1>
              <window.V3Tag color="muted">Scene 03 · Approach burn</window.V3Tag>
              <window.V3Tag color="green" filled>Live</window.V3Tag>
            </div>
            <div style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.muted }}>
              4 utterances · 14.3s · pt-BR · CAPCOM ↔ SHIP
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, marginRight: 4 }}>FX SCENE</span>
            {["STORM '65", "LO-ORBIT", "EMERGENCY", "+ NEW"].map((s, i) => (
              <window.V3Btn key={s} size="sm" variant={i === 0 ? "primary" : "ghost"}>{s}</window.V3Btn>
            ))}
          </div>
        </div>

        {/* Two-row layout: spectro + channels */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* Spectrogram */}
          <window.V3Card title="Spectrogram" sub="U3 · CAPCOM · post-FX" action={
            <div style={{ display: "flex", gap: 4 }}>
              <window.V3Btn size="sm" variant="ghost">Dry</window.V3Btn>
              <window.V3Btn size="sm" variant="primary">FX</window.V3Btn>
              <window.V3Btn size="sm" variant="ghost">NASA</window.V3Btn>
            </div>
          }>
            <V3Spec tick={tick} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 10 }}>
              <V3Meter label="PEAK" value={-3.2} unit="dB" color={V3T.copper} />
              <V3Meter label="RMS" value={-12.4} unit="dB" />
              <V3Meter label="SNR" value={42.1} unit="dB" color={V3T.green} />
              <V3Meter label="ROLLOFF" value={3.4} unit="kHz" />
            </div>
          </window.V3Card>

          {/* Voice + scene brief mini */}
          <window.V3Card title="Voice / Take" sub={`U3 · ash`} action={<window.V3Btn size="sm" variant="ghost">Open lab →</window.V3Btn>}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <window.V3Speaker name="CAPCOM" sub="ash · masc" />
                <p style={{ fontFamily: V3F.mono, fontSize: 11.5, lineHeight: 1.45, color: V3T.text, margin: "8px 0" }}>
                  "Copy, Odyssey. Telemetry shows good. Continue burn at T plus zero one zero."
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <window.V3Tag>Calm</window.V3Tag>
                  <window.V3Tag>Procedural</window.V3Tag>
                  <window.V3Tag>0.95×</window.V3Tag>
                  <window.V3Tag color="copper">Quindar ↻</window.V3Tag>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <window.V3Knob value={0.78} size={48} label="Level" />
                <window.V3Knob value={0.42} size={48} label="Quindar" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <window.V3Slider label="Speed" value={0.95} accent="copper" />
              <window.V3Slider label="Intensity" value={0.25} accent="copper" />
              <window.V3Slider label="Organic" value={0.62} accent="copper" />
              <window.V3Slider label="Clarity" value={1.0} accent="copper" />
            </div>
          </window.V3Card>
        </div>

        {/* Channel strips */}
        <window.V3Card title="Channels" sub="6 strips · master right" pad={0}
          action={<div style={{ display: "flex", gap: 4 }}>
            <window.V3Btn size="sm" variant="ghost">+ Add</window.V3Btn>
            <window.V3Btn size="sm" variant="ghost">Group</window.V3Btn>
            <window.V3Btn size="sm" variant="ghost">Reset</window.V3Btn>
          </div>}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderTop: `1px solid ${V3T.hair}` }}>
            {channels.map((c, i) => <V3Strip key={c.id} c={c} tick={tick} idx={i} />)}
          </div>
        </window.V3Card>
      </div>
    </window.V3Shell>
  );
}

function V3Strip({ c, tick, idx }) {
  const speakerColor = c.speaker === "CAPCOM" ? V3T.capcom : c.speaker === "SHIP" ? V3T.ship : V3T.muted;
  const meter = Math.max(0.05, Math.min(1, c.level + Math.sin(tick * 0.4 + idx) * 0.08));
  return (
    <div style={{
      borderRight: `1px solid ${V3T.hair}`, padding: 10,
      background: c.active ? "rgba(224,122,60,0.06)" : c.master ? V3T.panelLo : "transparent",
      display: "flex", flexDirection: "column", gap: 8, minHeight: 0,
    }}>
      {/* Top: label + speaker */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: V3F.display, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: c.master ? V3T.copper : V3T.text }}>{c.label}</span>
        <window.V3LED on={c.processed} color={c.master ? "copper" : (c.speaker === "CAPCOM" ? "amber" : "green")} size={6} blink={c.active} />
      </div>
      {!c.master && <window.V3Speaker name={c.speaker} />}
      {c.master && <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.copper, textTransform: "uppercase" }}>Master bus</span>}

      {/* Voice tag */}
      <div style={{ display: "flex", gap: 4 }}>
        <window.V3Tag>{c.voice}</window.V3Tag>
        {c.solo && <window.V3Tag color="copper" filled>S</window.V3Tag>}
      </div>

      {/* FX chip */}
      <div style={{ padding: "5px 7px", background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: V3F.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", color: V3T.muted, textTransform: "uppercase" }}>FX</span>
        <span style={{ fontFamily: V3F.mono, fontSize: 9.5, color: V3T.copper }}>{c.fx}</span>
      </div>

      {/* Pan */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontFamily: V3F.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted }}>PAN</span>
          <span style={{ fontFamily: V3F.mono, fontSize: 9.5, color: V3T.text }}>{c.pan === 0 ? "C" : c.pan > 0 ? `R${Math.round(c.pan * 100)}` : `L${Math.round(-c.pan * 100)}`}</span>
        </div>
        <div style={{ position: "relative", height: 3, background: V3T.panelLo, border: `1px solid ${V3T.hair}` }}>
          <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: V3T.dim }} />
          <div style={{ position: "absolute", top: -2, bottom: -2, left: `calc(${50 + c.pan * 50}% - 2px)`, width: 4, background: V3T.copper }} />
        </div>
      </div>

      {/* Fader + meter */}
      <div style={{ display: "flex", gap: 8, flex: 1, minHeight: 110 }}>
        {/* meter */}
        <div style={{ width: 8, position: "relative", background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 1 }}>
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, height: `${meter * 100}%`,
            background: `linear-gradient(0deg, ${V3T.green} 0%, ${V3T.green} 65%, ${V3T.amber} 80%, ${V3T.red} 95%)`,
          }} />
          {/* peak hold */}
          {c.level > 0.9 && <div style={{ position: "absolute", left: 0, right: 0, top: `${(1 - c.level) * 100}%`, height: 1, background: V3T.red }} />}
        </div>
        {/* fader */}
        <div style={{ flex: 1, position: "relative", background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 1 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: `${(1 - c.level) * 100}%`, bottom: 0, background: c.master ? "rgba(224,122,60,0.16)" : "rgba(122,217,154,0.08)" }} />
          {/* tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <div key={p} style={{ position: "absolute", left: 0, right: 0, top: `${p * 100}%`, height: 1, background: V3T.hair }} />
          ))}
          {/* fader knob */}
          <div style={{
            position: "absolute", left: -3, right: -3, top: `calc(${(1 - c.level) * 100}% - 4px)`, height: 8,
            background: c.master ? V3T.copper : V3T.text, borderRadius: 1,
            boxShadow: "0 1px 2px rgba(0,0,0,0.5)",
            border: `1px solid ${V3T.hair}`,
          }} />
        </div>
      </div>

      {/* dB readout */}
      <div style={{ textAlign: "center", fontFamily: V3F.mono, fontSize: 11, color: c.master ? V3T.copper : V3T.text, fontWeight: 600 }}>
        {(20 * Math.log10(c.level)).toFixed(1)} <span style={{ color: V3T.muted, fontSize: 9 }}>dB</span>
      </div>

      {/* M/S buttons */}
      <div style={{ display: "flex", gap: 3 }}>
        <button style={V3MSBtn(c.mute, V3T.red)}>M</button>
        <button style={V3MSBtn(c.solo, V3T.amber)}>S</button>
        {!c.master && <button style={V3MSBtn(false, V3T.copper)}>FX</button>}
      </div>
    </div>
  );
}

function V3MSBtn(active, color) {
  return {
    flex: 1, height: 20, fontFamily: window.V3.F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
    background: active ? color : V3T.panelLo, color: active ? "#0c0d10" : V3T.muted,
    border: `1px solid ${active ? color : V3T.hair}`, borderRadius: 2, cursor: "pointer", textTransform: "uppercase",
  };
}

function V3Meter({ label, value, unit, color }) {
  return (
    <div style={{ background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 3, padding: "6px 8px" }}>
      <div style={{ fontFamily: V3F.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: V3F.mono, fontSize: 14, color: color || V3T.text, fontWeight: 600 }}>
        {value}<span style={{ color: V3T.muted, fontSize: 9, marginLeft: 2 }}>{unit}</span>
      </div>
    </div>
  );
}

function V3Spec({ tick }) {
  const cols = 80, rows = 18;
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const v = Math.max(0, Math.sin((tick + c) * 0.11 + r * 0.4) * 0.4 + Math.sin((tick - c) * 0.05 + r * 0.2) * 0.3 + (r < 4 ? 0.2 : 0));
      cells.push(v);
    }
  return (
    <div style={{ background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 3, padding: 8, height: 180, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 8, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: 1 }}>
        {cells.map((v, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          const op = Math.max(0, Math.min(1, v));
          return <div key={i} style={{
            gridRow: rows - r, gridColumn: c + 1,
            background: op > 0.05 ? `rgba(224, ${122 + op * 60}, 60, ${op})` : "transparent",
          }} />;
        })}
      </div>
      {/* freq labels */}
      <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: V3F.mono, fontSize: 8, color: V3T.muted }}>
        <span>8k</span><span>4k</span><span>1k</span><span>250</span>
      </div>
      {/* playhead */}
      <div style={{ position: "absolute", left: "32%", top: 0, bottom: 0, width: 1, background: V3T.copper, opacity: 0.6 }} />
    </div>
  );
}

window.V3Console = V3Console;
