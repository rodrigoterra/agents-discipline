// VRP v3 · SCREEN 4 — STITCH & EXPORT
// Final assembly: timeline of utterances with A/B per segment, stitch progress,
// crossfades, NASA reference compare, export targets.

const { useState: V3SUS, useEffect: V3SUE } = React;

function V3Stitch() {
  const F = window.VRP_FIXTURES_V2;
  const [tick, setTick] = V3SUS(0);
  V3SUE(() => { const t = setInterval(() => setTick(x => x + 1), 250); return () => clearInterval(t); }, []);

  const totalMs = F.utterances.reduce((s, u) => s + u.durationMs, 0);

  return (
    <window.V3Shell active="stitch" screenLabel="V3-04 Stitch & Export">
      <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>Stitch &amp; Export</h1>
            <div style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.muted, marginTop: 2 }}>
              4 utterances · {(totalMs / 1000).toFixed(1)}s · 3 / 4 ready · 1 stale FX
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <window.V3Btn size="md" variant="ghost">Re-stitch all</window.V3Btn>
            <window.V3Btn size="md" variant="secondary">Preview master</window.V3Btn>
            <window.V3Btn size="md" variant="primary">Export · WAV + JSON</window.V3Btn>
          </div>
        </div>

        {/* Timeline */}
        <window.V3Card title="Timeline" sub={`${F.utterances.length} utterances`} pad={0}
          action={
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>Crossfade</span>
              <window.V3Btn size="sm" variant="ghost">−</window.V3Btn>
              <span style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.text, minWidth: 36, textAlign: "center" }}>120ms</span>
              <window.V3Btn size="sm" variant="ghost">+</window.V3Btn>
              <div style={{ width: 1, height: 18, background: V3T.hair, margin: "0 4px" }} />
              <window.V3Btn size="sm" variant="ghost">Snap</window.V3Btn>
              <window.V3Btn size="sm" variant="ghost">Quindar gaps</window.V3Btn>
            </div>
          }
        >
          <div style={{ padding: 14, borderTop: `1px solid ${V3T.hair}` }}>
            {/* Time ruler */}
            <div style={{ position: "relative", height: 18, marginBottom: 6, fontFamily: V3F.mono, fontSize: 9, color: V3T.muted }}>
              {[0, 2, 4, 6, 8, 10, 12, 14].map(s => (
                <div key={s} style={{ position: "absolute", left: `${(s / 15) * 100}%`, top: 0 }}>
                  <div style={{ width: 1, height: 6, background: V3T.hair }} />
                  <span style={{ marginLeft: -8 }}>{s}s</span>
                </div>
              ))}
            </div>

            {/* Lanes */}
            {[
              { id: "capcom", name: "CAPCOM", color: V3T.capcom, items: F.utterances.filter(u => u.speaker === "CAPCOM") },
              { id: "ship",   name: "SHIP",   color: V3T.ship,   items: F.utterances.filter(u => u.speaker === "SHIP") },
              { id: "qd",     name: "QUINDAR", color: V3T.amber, items: [] },
              { id: "fx",     name: "FX BUS",  color: V3T.copper, items: [] },
            ].map(lane => (
              <V3Lane key={lane.id} lane={lane} totalMs={totalMs} all={F.utterances} tick={tick} />
            ))}

            {/* Playhead position */}
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontFamily: V3F.mono, fontSize: 10, color: V3T.muted }}>
              <span>00:00.000</span>
              <span style={{ color: V3T.copper }}>▶ 00:04.612</span>
              <span>{(totalMs / 1000).toFixed(3).padStart(6, "0")}s</span>
            </div>
          </div>
        </window.V3Card>

        {/* Bottom row: per-utterance A/B + export panel */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
          <window.V3Card title="Per-utterance A / B" sub="dry vs FX vs NASA reference" pad={0}>
            <div style={{ borderTop: `1px solid ${V3T.hair}` }}>
              {F.utterances.map((u, i) => (
                <V3UtterRow key={u.id} u={u} active={i === 2} last={i === F.utterances.length - 1} />
              ))}
            </div>
          </window.V3Card>

          <window.V3Card title="Export" sub="targets + manifest" pad={0}>
            <div style={{ padding: 12, borderBottom: `1px solid ${V3T.hair}` }}>
              <div style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase", marginBottom: 8 }}>Targets</div>
              {[
                { name: "master.wav",          fmt: "24-bit · 48 kHz · stereo",   on: true },
                { name: "stems/", fmt: "per-utterance · WAV", on: true },
                { name: "manifest.json", fmt: "all parameters · NASA refs",      on: true },
                { name: "spectro.png",         fmt: "1920×540 · post-FX",           on: true },
                { name: "preview.mp4",         fmt: "audio + spectro · 30 fps",     on: false },
              ].map((t, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "6px 0",
                  borderBottom: i < 4 ? `1px dashed ${V3T.hair}` : "none",
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 2, display: "grid", placeItems: "center",
                    background: t.on ? V3T.copper : V3T.panelLo,
                    border: `1px solid ${t.on ? V3T.copperDim : V3T.hair}`,
                    color: t.on ? "#0c0d10" : V3T.muted, fontSize: 11, fontWeight: 800,
                  }}>{t.on ? "✓" : ""}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: V3F.mono, fontSize: 11, color: V3T.text }}>{t.name}</div>
                    <div style={{ fontFamily: V3F.mono, fontSize: 9.5, color: V3T.muted }}>{t.fmt}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 12, borderBottom: `1px solid ${V3T.hair}`, fontFamily: V3F.mono, fontSize: 10.5, lineHeight: 1.6 }}>
              <div style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: V3T.muted, textTransform: "uppercase", marginBottom: 6 }}>Manifest preview</div>
              <div style={{ color: V3T.muted }}>session: <span style={{ color: V3T.text }}>{F.spec.sessionId}</span></div>
              <div style={{ color: V3T.muted }}>scene: <span style={{ color: V3T.text }}>"approach burn"</span></div>
              <div style={{ color: V3T.muted }}>profile: <span style={{ color: V3T.copper }}>"ship_comm"</span></div>
              <div style={{ color: V3T.muted }}>fx_scene: <span style={{ color: V3T.copper }}>"STORM '65"</span></div>
              <div style={{ color: V3T.muted }}>nasa_ref: <span style={{ color: V3T.blue }}>{F.spec.nasaSlug}</span></div>
              <div style={{ color: V3T.muted }}>utterances: <span style={{ color: V3T.text }}>4</span> · stale: <span style={{ color: V3T.red }}>1</span></div>
              <div style={{ color: V3T.muted }}>match: <span style={{ color: V3T.green }}>0.84</span></div>
            </div>

            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              <window.V3Btn size="md" variant="primary" full>Export now</window.V3Btn>
              <window.V3Btn size="md" variant="secondary" full>Save preset</window.V3Btn>
              <div style={{ marginTop: 4, padding: "8px 10px", background: V3T.panelLo, border: `1px solid rgba(232,93,74,0.3)`, borderRadius: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <window.V3LED on color="red" size={6} blink />
                <div style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.text, lineHeight: 1.4 }}>
                  <strong style={{ color: V3T.red }}>U3 FX is stale.</strong> <span style={{ color: V3T.muted }}>Re-render before export.</span>
                </div>
              </div>
            </div>
          </window.V3Card>
        </div>
      </div>
    </window.V3Shell>
  );
}

function V3Lane({ lane, totalMs, all, tick }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 1, background: lane.color }} />
        <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: V3T.muted, textTransform: "uppercase" }}>{lane.name}</span>
      </div>
      <div style={{ position: "relative", height: 38, background: V3T.panelLo, border: `1px solid ${V3T.hair}`, borderRadius: 2 }}>
        {/* utterances on this lane (positioned by global timeline) */}
        {(() => {
          let off = 0;
          return all.map((u, i) => {
            const w = (u.durationMs / totalMs) * 100;
            const l = (off / totalMs) * 100;
            off += u.durationMs;
            const onLane = (lane.id === "capcom" && u.speaker === "CAPCOM") ||
                           (lane.id === "ship" && u.speaker === "SHIP");
            if (!onLane) return null;
            const c = u.speaker === "CAPCOM" ? V3T.capcom : V3T.ship;
            return (
              <div key={u.id} style={{
                position: "absolute", left: `${l}%`, top: 4, bottom: 4, width: `calc(${w}% - 2px)`,
                background: u.processed ? `linear-gradient(180deg, ${c}cc 0%, ${c}66 100%)` : V3T.panelLo,
                border: `1px solid ${u.stale ? V3T.red : c}`,
                borderRadius: 2,
                display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 6px",
                overflow: "hidden",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: V3F.display, fontSize: 9, fontWeight: 700, color: "#0c0d10", letterSpacing: "0.05em" }}>U{u.n}</span>
                  {u.stale && <span style={{ fontFamily: V3F.mono, fontSize: 8, color: "#0c0d10", background: V3T.red, padding: "0 3px", borderRadius: 1 }}>STALE</span>}
                </div>
                <div style={{ fontFamily: V3F.mono, fontSize: 8, color: "#0c0d10", opacity: 0.85, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {u.text}
                </div>
              </div>
            );
          });
        })()}
        {/* quindar markers in QUINDAR lane */}
        {lane.id === "qd" && (() => {
          let off = 0;
          return all.flatMap((u, i) => {
            const out = [];
            const startPct = (off / totalMs) * 100;
            const endPct = ((off + u.durationMs) / totalMs) * 100;
            if (u.quindar.intro) out.push(<div key={`${u.id}-i`} style={{ position: "absolute", left: `calc(${startPct}% - 4px)`, top: 8, bottom: 8, width: 4, background: V3T.amber, borderRadius: 1 }} />);
            if (u.quindar.outro) out.push(<div key={`${u.id}-o`} style={{ position: "absolute", left: `calc(${endPct}% - 4px)`, top: 8, bottom: 8, width: 4, background: V3T.amber, borderRadius: 1 }} />);
            off += u.durationMs;
            return out;
          });
        })()}
        {/* FX BUS waveform */}
        {lane.id === "fx" && (
          <div style={{ position: "absolute", inset: 4, opacity: 0.55 }}>
            <window.V3Wave height={28} seed={tick * 0.05} color={V3T.copper} dense />
          </div>
        )}
        {/* Crossfades — tiny diamond between adjacent items on same lane (visual hint) */}
        {/* Playhead */}
        <div style={{ position: "absolute", left: "32%", top: -2, bottom: -2, width: 1, background: V3T.copper, boxShadow: `0 0 4px ${V3T.copper}` }} />
      </div>
    </div>
  );
}

function V3UtterRow({ u, active, last }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 80px 130px",
      alignItems: "center", gap: 10, padding: "10px 14px",
      borderBottom: last ? "none" : `1px solid ${V3T.hair}`,
      background: active ? "rgba(224,122,60,0.06)" : "transparent",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: V3F.mono, fontSize: 13, color: active ? V3T.copper : V3T.text, fontWeight: 600 }}>U{u.n}</span>
        <window.V3LED on={u.processed} color={u.stale ? "red" : "green"} size={5} />
      </div>
      <div style={{ minWidth: 0 }}>
        <window.V3Speaker name={u.speaker} sub={u.voice} />
        <div style={{ fontFamily: V3F.mono, fontSize: 10.5, color: V3T.muted, marginTop: 2, lineHeight: 1.35, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{u.text}</div>
      </div>
      <span style={{ fontFamily: V3F.mono, fontSize: 10, color: V3T.muted, textAlign: "right" }}>{(u.durationMs / 1000).toFixed(2)}s</span>
      <window.V3Wave height={26} seed={u.n * 5} color={u.processed ? V3T.copper : V3T.muted} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end" }}>
        {u.stale ? <window.V3Tag color="red" filled>Stale</window.V3Tag> : u.processed ? <window.V3Tag color="green" filled>Ready</window.V3Tag> : <window.V3Tag color="muted">Pending</window.V3Tag>}
        {u.stitched ? <window.V3Tag color="copper">Stitched</window.V3Tag> : <window.V3Tag>Loose</window.V3Tag>}
      </div>
      <div style={{ display: "flex", gap: 3 }}>
        <window.V3Btn size="sm" variant="ghost">A</window.V3Btn>
        <window.V3Btn size="sm" variant="primary">B</window.V3Btn>
        <window.V3Btn size="sm" variant="ghost">▶</window.V3Btn>
        <window.V3Btn size="sm" variant="ghost">↻</window.V3Btn>
      </div>
    </div>
  );
}

window.V3Stitch = V3Stitch;
