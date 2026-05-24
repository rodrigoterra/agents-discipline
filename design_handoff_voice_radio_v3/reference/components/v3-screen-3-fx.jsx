// VRP v3 · SCREEN 3 — FX LAB
// All five DSP groups laid out as a coherent rack. Channel profile picker,
// degradation modes, A/B compare, save FX scene.

const { useState: V3FUS, useEffect: V3FUE } = React;

function V3FXLab() {
  const F = window.VRP_FIXTURES_V2;
  const [tick, setTick] = V3FUS(0);
  const [mode, setMode] = V3FUS("nominal");
  const [profile, setProfile] = V3FUS("ship_comm");
  V3FUE(() => { const t = setInterval(() => setTick(x => x + 1), 220); return () => clearInterval(t); }, []);

  const groupAccent = {
    quindar:  V3T.amber,
    voiceband: V3T.copper,
    hiss:     V3T.green,
    scint:    V3T.blue,
    granular: V3T.red,
  };

  return (
    <window.V3Shell active="fx" screenLabel="V3-03 FX Lab">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>FX Lab</h1>
            <div style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.muted, marginTop: 2 }}>
              5 DSP groups · 32 controls · profile&nbsp;<span style={{ color: V3T.copper }}>{profile.replace("_", " ")}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <window.V3Btn size="md" variant="ghost">↺ Reset</window.V3Btn>
            <window.V3Btn size="md" variant="secondary">A · Dry</window.V3Btn>
            <window.V3Btn size="md" variant="primary">B · FX</window.V3Btn>
            <window.V3Btn size="md" variant="primary">Save scene</window.V3Btn>
          </div>
        </div>

        {/* Profile + degradation strip */}
        <window.V3Card pad={10}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase" }}>Channel profile</span>
              <div style={{ display: "flex", gap: 3 }}>
                {F.channelProfiles.map(p => {
                  const sel = p.id === profile;
                  return (
                    <button key={p.id} onClick={() => setProfile(p.id)} style={{
                      padding: "5px 10px", fontFamily: V3F.display, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
                      background: sel ? V3T.copper : V3T.panelLo,
                      color: sel ? "#0c0d10" : V3T.muted,
                      border: `1px solid ${sel ? V3T.copperDim : V3T.hair}`,
                      borderRadius: 2, textTransform: "uppercase", cursor: "pointer",
                    }}>{p.label}{p.family === "user" && <span style={{ marginLeft: 4, opacity: 0.6 }}>·</span>}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 24, width: 1, background: V3T.hair }} />

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase" }}>Degradation</span>
              <div style={{ display: "flex", gap: 3 }}>
                {F.degradationModes.map(m => {
                  const sel = m === mode;
                  return (
                    <button key={m} onClick={() => setMode(m)} style={{
                      padding: "5px 10px", fontFamily: V3F.display, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em",
                      background: sel ? V3T.copper : V3T.panelLo,
                      color: sel ? "#0c0d10" : V3T.muted,
                      border: `1px solid ${sel ? V3T.copperDim : V3T.hair}`,
                      borderRadius: 2, textTransform: "uppercase", cursor: "pointer",
                    }}>{m}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <window.V3Tag color="green" filled>32 / 32 active</window.V3Tag>
              <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>CPU 12% · 24-bit · 48 kHz</span>
            </div>
          </div>
        </window.V3Card>

        {/* DSP groups grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "auto auto", gap: 10, minHeight: 0 }}>
          {F.dspGroups.map((g, i) => (
            <V3DSPGroup key={g.id} group={g} accent={groupAccent[g.id]} idx={i} />
          ))}

          {/* Last cell: A/B preview */}
          <window.V3Card title="A / B Preview" sub="U3 · CAPCOM" accent>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <window.V3Tag>A · Dry</window.V3Tag>
                  <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.muted }}>−6.2 dB</span>
                </div>
                <window.V3Wave height={28} seed={2} color={V3T.muted} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <window.V3Tag color="copper" filled>B · FX</window.V3Tag>
                  <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.muted }}>−3.1 dB</span>
                </div>
                <window.V3Wave height={28} seed={5} color={V3T.copper} />
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <window.V3Tag color="blue">NASA ref</window.V3Tag>
                  <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.muted }}>{F.spec.nasaSlug}</span>
                </div>
                <window.V3Wave height={28} seed={11} color={V3T.blue} />
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <window.V3Btn size="sm" variant="ghost">▶ A</window.V3Btn>
                <window.V3Btn size="sm" variant="primary">▶ B</window.V3Btn>
                <window.V3Btn size="sm" variant="ghost" style={{ marginLeft: "auto" }}>Match NASA</window.V3Btn>
              </div>
              <div style={{ padding: 8, background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 2, fontFamily: V3F.mono, fontSize: 10, lineHeight: 1.5, color: V3T.muted }}>
                <div><span style={{ color: V3T.copper }}>Δ Spectral:</span> +2.4 dB @ 1.2 kHz</div>
                <div><span style={{ color: V3T.copper }}>Δ Loudness:</span> +3.1 LUFS</div>
                <div><span style={{ color: V3T.green }}>Match score:</span> 0.84 / 1.00</div>
              </div>
            </div>
          </window.V3Card>
        </div>
      </div>
    </window.V3Shell>
  );
}

function V3DSPGroup({ group, accent }) {
  const cols = group.controls.length > 6 ? 4 : 3;
  return (
    <window.V3Card
      title={group.title}
      sub={`${group.controls.length} ctrl`}
      action={
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "2px 6px", borderRadius: 2,
            background: accent + "22", color: accent,
            border: `1px solid ${accent}55`,
            fontFamily: V3F.display, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.16em",
          }}>● ON</span>
          <button style={{
            background: "transparent", border: `1px solid ${V3T.hair}`, borderRadius: 2,
            padding: "1px 6px", fontFamily: V3F.display, fontSize: 9, color: V3T.muted, cursor: "pointer",
          }}>↻</button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "10px 12px" }}>
        {group.controls.map(c => (
          <window.V3Slider
            key={c.k}
            label={c.label}
            value={c.v}
            min={c.min}
            max={c.max}
            unit={c.label.includes("MS") ? "ms" : c.label.includes("HZ") ? "Hz" : null}
            accent={accent}
          />
        ))}
      </div>
    </window.V3Card>
  );
}

window.V3FXLab = V3FXLab;
