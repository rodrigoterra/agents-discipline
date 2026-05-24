// VRP v3 · SCREEN 2 — VOICE LAB
// Voice generation focus: voice cards, parameter detail, JSON instr, audition flow.

const { useState: V3VUS } = React;

function V3VoiceLab() {
  const F = window.VRP_FIXTURES_V2;
  const [selectedVoice, setSel] = V3VUS("ash");
  const v = F.voices.find(x => x.id === selectedVoice) || F.voices[1];

  return (
    <window.V3Shell active="voice" screenLabel="V3-02 Voice Lab">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Voice Lab</h1>
            <div style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.muted, marginTop: 2 }}>
              Generation · TTS instruction synthesis · audition before commit
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <window.V3Btn size="md" variant="ghost">Cast</window.V3Btn>
            <window.V3Btn size="md" variant="secondary">Audition all</window.V3Btn>
            <window.V3Btn size="md" variant="primary">Generate batch</window.V3Btn>
          </div>
        </div>

        {/* 3-col: voices grid · detail · instr */}
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 12, flex: 1, minHeight: 0 }}>
          {/* LEFT: voice cards */}
          <window.V3Card title="Voices" sub={`${F.voices.length} presets`} pad={0}
            action={
              <select style={{
                background: V3T.panelLo, color: V3T.text, fontFamily: V3F.mono, fontSize: 10,
                border: `1px solid ${V3T.hair}`, borderRadius: 2, padding: "2px 4px",
              }}>
                {F.voiceGroupFilters.map(g => <option key={g}>{g}</option>)}
              </select>
            }>
            <div style={{ maxHeight: 540, overflow: "auto" }}>
              {F.voices.map(voice => {
                const sel = voice.id === selectedVoice;
                return (
                  <button key={voice.id} onClick={() => setSel(voice.id)} style={{
                    width: "100%", textAlign: "left", padding: "10px 12px",
                    background: sel ? "rgba(224,122,60,0.08)" : "transparent",
                    border: "none", borderBottom: `1px solid ${V3T.hair}`,
                    borderLeft: `3px solid ${sel ? V3T.copper : "transparent"}`,
                    cursor: "pointer", display: "flex", flexDirection: "column", gap: 4,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: V3F.display, fontSize: 13, fontWeight: 700, color: sel ? V3T.copper : V3T.text }}>{voice.id}</span>
                      <window.V3Tag color={voice.group === "masculine" ? "blue" : voice.group === "feminine" ? "amber" : "muted"}>{voice.group}</window.V3Tag>
                    </div>
                    <div style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted, lineHeight: 1.35 }}>{voice.blurb}</div>
                    {sel && <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                      <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.green, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <window.V3LED on color="green" size={5} blink /> Auditioned · 0:24 ago
                      </span>
                    </div>}
                  </button>
                );
              })}
            </div>
          </window.V3Card>

          {/* CENTER: voice detail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            <window.V3Card title={`Voice · ${v.id}`} sub={v.group} accent
              action={<window.V3Btn size="sm" variant="primary">▶ Audition</window.V3Btn>}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                <window.V3Drop label="Group" value="all" full />
                <window.V3Drop label="Speaker" value="CAPCOM" hot full />
                <window.V3Drop label="Cadence" value="measured" full />
                <window.V3Drop label="Tone" value="calm" full />
                <window.V3Drop label="Delivery" value="procedural" full />
                <window.V3Drop label="Pause" value="even" full />
                <window.V3Drop label="Lang" value="pt-BR" hot full />
                <window.V3Drop label="Accent" value="neutral" full />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
                {F.voiceSliders.map(s => (
                  <window.V3Slider key={s.k} label={s.label} value={s.v} min={s.min} max={s.max} accent="copper" />
                ))}
              </div>
            </window.V3Card>

            <window.V3Card title="Take takes" sub="audition → keep" pad={0}>
              <div style={{ borderTop: `1px solid ${V3T.hair}` }}>
                {[
                  { n: 1, when: "0:00", dur: 3.4, kept: false, score: 0.71 },
                  { n: 2, when: "0:24", dur: 3.6, kept: true,  score: 0.92, active: true },
                  { n: 3, when: "1:08", dur: 3.5, kept: false, score: 0.84 },
                ].map((t, i) => (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "60px 60px 1fr 60px 110px",
                    alignItems: "center", gap: 10, padding: "10px 12px",
                    background: t.active ? "rgba(224,122,60,0.06)" : "transparent",
                    borderBottom: i < 2 ? `1px solid ${V3T.hair}` : "none",
                  }}>
                    <span style={{ fontFamily: V3F.mono, fontSize: 12, color: t.active ? V3T.copper : V3T.text, fontWeight: 600 }}>Take {t.n}</span>
                    <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>{t.when}</span>
                    <window.V3Wave height={28} seed={t.n * 7} color={t.active ? V3T.copper : V3T.muted} />
                    <span style={{ fontFamily: V3F.mono, fontSize: 10, color: t.score > 0.85 ? V3T.green : V3T.muted }}>{t.score.toFixed(2)}</span>
                    <div style={{ display: "flex", gap: 3 }}>
                      <window.V3Btn size="sm" variant="ghost">▶</window.V3Btn>
                      {t.kept
                        ? <window.V3Btn size="sm" variant="primary">Kept</window.V3Btn>
                        : <window.V3Btn size="sm" variant="ghost">Keep</window.V3Btn>}
                      <window.V3Btn size="sm" variant="ghost">✕</window.V3Btn>
                    </div>
                  </div>
                ))}
              </div>
            </window.V3Card>
          </div>

          {/* RIGHT: TTS instruction */}
          <window.V3Card title="TTS Instruction" sub="generated · pt-BR" pad={0}>
            <div style={{ padding: 12, borderBottom: `1px solid ${V3T.hair}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase" }}>Source · Brief</span>
                <window.V3Tag color="copper">Auto</window.V3Tag>
              </div>
              <p style={{ margin: 0, fontFamily: V3F.mono, fontSize: 10.5, lineHeight: 1.5, color: V3T.text }}>
                Calm CAPCOM voice. Procedural pacing. Speed 0.95×. Even pauses. Light dialect.
              </p>
            </div>

            <div style={{ padding: 12, borderBottom: `1px solid ${V3T.hair}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase" }}>Synthesized</span>
                <span style={{ fontFamily: V3F.mono, fontSize: 9, color: V3T.green, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <window.V3LED on color="green" size={5} /> Valid JSON
                </span>
              </div>
              <pre style={{
                margin: 0, fontFamily: V3F.mono, fontSize: 10, color: V3T.text,
                background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 2,
                padding: 8, lineHeight: 1.5, overflow: "auto", maxHeight: 200,
              }}>
{`{
  "voice": "ash",
  "group": "masculine",
  "speaker": "CAPCOM",
  "lang": "pt-BR",
  "instr": "Calm. Procedural.",
  "speed": 0.95,
  "intensity": 0.25,
  "organic": 0.62,
  "clarity": 1.00,
  "cadence": "measured",
  "tone": "calm",
  "delivery": "procedural",
  "pause": "even",
  "quindar": { "in": true, "out": true }
}`}
              </pre>
            </div>

            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <window.V3Btn size="md" variant="primary" full>Generate selection · U3</window.V3Btn>
              <window.V3Btn size="md" variant="secondary" full>Generate batch · 4</window.V3Btn>
              <div style={{ display: "flex", gap: 6 }}>
                <window.V3Btn size="sm" variant="ghost" full>Default</window.V3Btn>
                <window.V3Btn size="sm" variant="ghost" full>Random</window.V3Btn>
                <window.V3Btn size="sm" variant="danger" full>Reset</window.V3Btn>
              </div>
              <div style={{ marginTop: 6, fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Estimate</span><span style={{ color: V3T.text }}>14.4s · 12 KB</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Cost</span><span style={{ color: V3T.text }}>~$0.04</span></div>
              </div>
            </div>
          </window.V3Card>
        </div>
      </div>
    </window.V3Shell>
  );
}

window.V3VoiceLab = V3VoiceLab;
