// ALPHA2 — Audio lane screens.
// Voice · Dialogue · Radio FX · Spectrogram · Stitch & Export

const AU = A.T, AUF = A.F;
const AUS2 = React.useState;
const FXR = () => window.VRP_ALPHA_FIXTURES;

// ═════════════════════════════════════════════════════════════════════════════
// 05 · VOICE
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenVoice = function ScreenVoice() {
  return (
    <window.AShell2 active="voice" mode="render" screenLabel="05 Voice">
      <window.ScreenH1 glyph="voice" title="Voice"
        sub="archetypes · casting · audition · portrait slots"
        tags={[
          { label: "pt-BR", color: "amber", filled: true },
          { label: "CAPCOM ↔ SHIP", color: "muted" },
        ]}
        actions={(<>
          <window.ABtn size="md">Audition all</window.ABtn>
          <window.ABtn size="md" variant="primary">Generate batch</window.ABtn>
        </>)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <VoiceCatalog />
        <RoleArchetype role="CAPCOM" voice="ash" />
        <RoleArchetype role="SHIP"   voice="coral" />
      </div>
    </window.AShell2>
  );
};

function VoiceCatalog() {
  const voices = FXR().voices;
  return (
    <window.ACard title="Voices" sub={`${voices.length} presets`} pad={0}>
      <div style={{ overflow: "auto" }}>
        {voices.map((v, i) => {
          const selected = v.id === "ash" || v.id === "coral";
          const c = v.group === "masc" ? AU.blue : v.group === "fem" ? AU.amber : AU.muted;
          return (
            <div key={v.id} style={{
              padding: "10px 12px",
              borderTop: i === 0 ? "none" : `1px solid ${AU.hair}`,
              background: selected ? AU.panelLo : "transparent",
              borderLeft: selected ? `2px solid ${AU.copper}` : "2px solid transparent",
              cursor: "grab",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: AUF.display, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", color: selected ? AU.copper : AU.text, textTransform: "uppercase" }}>{v.id}</span>
                <window.ATag color={v.group === "masc" ? "blue" : v.group === "fem" ? "amber" : "muted"} filled={selected}>{v.group}</window.ATag>
              </div>
              <p style={{ margin: 0, fontFamily: AUF.mono, fontSize: 10, color: AU.muted, lineHeight: 1.4 }}>{v.blurb}</p>
            </div>
          );
        })}
      </div>
    </window.ACard>
  );
}

function RoleArchetype({ role, voice }) {
  const c = role === "CAPCOM" ? AU.capcom : AU.ship;
  return (
    <window.ACard
      borderColor={c}
      title={role}
      sub={`voice · ${voice}`}
      action={<window.ATag color={role === "CAPCOM" ? "amber" : "green"} filled>CAST</window.ATag>}
    >
      <div style={{ height: 4, background: c, marginBottom: 10, marginTop: -8, marginLeft: -14, marginRight: -14 }} />
      {/* Portrait slot */}
      <div style={{
        height: 110, background: "#04060a", border: `1px dashed ${AU.hair}`, borderRadius: 3,
        display: "grid", placeItems: "center", marginBottom: 10, position: "relative",
        overflow: "hidden",
      }}>
        <window.GlyphSigil glyph={role === "CAPCOM" ? "wordmark" : "wordmark"} size="sm" />
        <pre style={{
          position: "absolute", margin: 0, fontFamily: AUF.mono, fontSize: 14, lineHeight: 1, color: c,
          textShadow: `0 0 6px ${c}77`, whiteSpace: "pre", top: 18,
        }}>{role === "CAPCOM" ? window.ALPHA2_GLYPHS.capcom : window.ALPHA2_GLYPHS.ship}</pre>
        <span style={{ position: "absolute", bottom: 6, right: 8,
          fontFamily: AUF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em",
          color: AU.muted, textTransform: "uppercase" }}>portrait · no prompt yet</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", marginBottom: 10 }}>
        <window.AReadout label="VOICE"      value={voice} accent={c} />
        <window.AReadout label="LANG"       value="pt-BR" />
        <window.AReadout label="TAKES"      value="kept t3" />
        <window.AReadout label="AUDITION"   value="0:24" />
      </div>
      <span style={{ fontFamily: AUF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: AU.muted, textTransform: "uppercase" }}>Personality prompt</span>
      <textarea
        defaultValue={role === "CAPCOM"
          ? "Calm operator. Procedural delivery. Earth-side authority. Reads pt-BR. Holds composure under telemetry stress."
          : "Bright spacecraft voice. Slight breath. Reports clearly under scintillation. Reads pt-BR with light Brazilian accent."}
        style={{
          width: "100%", marginTop: 6, padding: 8,
          background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 3,
          color: AU.text, fontFamily: AUF.mono, fontSize: 10.5, lineHeight: 1.5,
          minHeight: 56, resize: "none", outline: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ marginTop: 10, padding: 8, background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: AUF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: AU.muted, textTransform: "uppercase" }}>Audition</span>
          <span style={{ fontFamily: AUF.mono, fontSize: 9, color: AU.muted }}>U3 · post-FX</span>
        </div>
        <window.AWave height={28} seed={role === "CAPCOM" ? 4 : 9} color={c} />
        <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
          <window.ABtn size="sm">▶ Dry</window.ABtn>
          <window.ABtn size="sm" variant="primary">▶ FX</window.ABtn>
          <window.ABtn size="sm">↻ Re-take</window.ABtn>
        </div>
      </div>
    </window.ACard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 06 · DIALOGUE
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenDialogue = function ScreenDialogue() {
  const [selected, setSelected] = AUS2("U3");
  return (
    <window.AShell2 active="dialogue" mode="render" screenLabel="06 Dialogue">
      <window.ScreenH1 glyph="dialogue" title="Dialogue"
        sub="radio script · cards · tree · per-line regenerate"
        tags={[
          { label: "4 utt", color: "copper", filled: true },
          { label: "valid", color: "green", filled: true },
        ]}
        actions={(<>
          <window.ABtn size="md">Validate JSON</window.ABtn>
          <window.ABtn size="md" variant="primary">Regenerate all</window.ABtn>
        </>)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <DialogueScript selected={selected} setSelected={setSelected} />
        <DialogueCardEditor selected={selected} />
        <DialogueTree selected={selected} setSelected={setSelected} />
      </div>
    </window.AShell2>
  );
};

function DialogueScript({ selected, setSelected }) {
  const utts = FXR().utterances;
  return (
    <window.ACard title="Script" sub="movie / radio interface" pad={0}>
      <div style={{ padding: 14, background: "#020308", fontFamily: AUF.mono, fontSize: 12, lineHeight: 1.7, color: AU.text, height: "100%", overflow: "auto" }}>
        <div style={{ fontFamily: AUF.display, fontSize: 9, color: AU.muted, letterSpacing: "0.22em", marginBottom: 8 }}>FADE IN · APPROACH BURN · SCENE 03</div>
        {utts.map((u) => {
          const c = u.speaker === "CAPCOM" ? AU.capcom : AU.ship;
          const isSel = selected === u.id;
          return (
            <div key={u.id} onClick={() => setSelected(u.id)} style={{
              marginBottom: 14, padding: 8,
              background: isSel ? "rgba(224,122,60,0.06)" : "transparent",
              borderLeft: isSel ? `2px solid ${AU.copper}` : "2px solid transparent",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: c, fontWeight: 700, letterSpacing: "0.12em" }}>{u.speaker}</span>
                <span style={{ color: AU.muted, fontSize: 10 }}>({u.voice})</span>
                <span style={{ color: AU.dim, fontSize: 10 }}>· {u.id} · {(u.durMs / 1000).toFixed(1)}s</span>
                {u.stale?.length > 0 && <window.AStaleChip reasons={u.stale} compact />}
              </div>
              <p style={{ margin: "4px 0 0", color: AU.text, fontSize: 12, lineHeight: 1.45 }}>"{u.text}"</p>
            </div>
          );
        })}
        <div style={{ fontFamily: AUF.display, fontSize: 9, color: AU.muted, letterSpacing: "0.22em", marginTop: 8 }}>FADE OUT · END SCENE</div>
      </div>
    </window.ACard>
  );
}

function DialogueCardEditor({ selected }) {
  const u = FXR().utterances.find(x => x.id === selected) || FXR().utterances[2];
  return (
    <window.ACard title={`Card · ${u.id}`} sub={`${u.speaker} · ${u.voice}`}
      action={(<><window.ABtn size="sm">↻ Regenerate</window.ABtn><window.ABtn size="sm" variant="primary">Save</window.ABtn></>)}>
      <span style={{ fontFamily: AUF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: AU.muted, textTransform: "uppercase" }}>Text</span>
      <textarea
        key={selected}
        defaultValue={u.text}
        style={{
          width: "100%", marginTop: 6, padding: 8,
          background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 3,
          color: AU.text, fontFamily: AUF.mono, fontSize: 11, lineHeight: 1.5,
          minHeight: 80, resize: "none", outline: "none", boxSizing: "border-box",
        }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
        <window.AReadout label="SPEAKER" value={u.speaker} accent={u.speaker === "CAPCOM" ? AU.capcom : AU.ship} />
        <window.AReadout label="DUR"     value={`${(u.durMs / 1000).toFixed(1)}s`} />
        <window.AReadout label="VOICE"   value={u.voice} />
        <window.AReadout label="STATE"   value={u.stale?.length > 0 ? "stale" : "ready"} accent={u.stale?.length > 0 ? AU.red : AU.green} />
      </div>
      <div style={{ marginTop: 12, padding: 8, background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: AUF.display, fontSize: 8, fontWeight: 700, letterSpacing: "0.22em", color: AU.muted, textTransform: "uppercase" }}>Storyboard slot</span>
          <window.ATag color="muted">no image</window.ATag>
        </div>
        <div style={{
          height: 80, background: "#04060a", border: `1px dashed ${AU.hair}`, borderRadius: 3,
          display: "grid", placeItems: "center", fontFamily: AUF.display, fontSize: 9, color: AU.dim, letterSpacing: "0.22em",
        }}>
          DROP IMAGE · OR · GENERATE
        </div>
      </div>
    </window.ACard>
  );
}

function DialogueTree({ selected, setSelected }) {
  const utts = FXR().utterances;
  return (
    <window.ACard title="Dialogue tree" sub="graphical view" pad={12}>
      <svg viewBox="0 0 280 320" style={{ width: "100%", height: "100%", display: "block" }}>
        {/* Spine */}
        <line x1="140" y1="20" x2="140" y2="300" stroke={AU.hair} strokeWidth="1" />
        {utts.map((u, i) => {
          const y = 40 + i * 70;
          const x = u.speaker === "CAPCOM" ? 70 : 210;
          const c = u.speaker === "CAPCOM" ? AU.capcom : AU.ship;
          const sel = selected === u.id;
          return (
            <g key={u.id} style={{ cursor: "pointer" }} onClick={() => setSelected(u.id)}>
              <line x1="140" y1={y} x2={x} y2={y} stroke={c} strokeWidth={sel ? 1.6 : 0.8} strokeDasharray={u.stale?.length > 0 ? "3 3" : "0"} />
              <rect x={x - 40} y={y - 18} width="80" height="36" fill={sel ? c : "#04060a"}
                stroke={c} strokeWidth={sel ? 2 : 1} rx="2" />
              <text x={x} y={y - 4} textAnchor="middle"
                fill={sel ? "#0c0d10" : c}
                fontFamily={AUF.display} fontSize="10" fontWeight="800" letterSpacing="0.16em">{u.id}</text>
              <text x={x} y={y + 8} textAnchor="middle"
                fill={sel ? "#0c0d10" : AU.muted}
                fontFamily={AUF.mono} fontSize="8">{(u.durMs / 1000).toFixed(1)}s</text>
              <circle cx="140" cy={y} r="3" fill={c} />
            </g>
          );
        })}
        <text x="70"  y="14" textAnchor="middle" fill={AU.capcom} fontFamily={AUF.display} fontSize="8" fontWeight="800" letterSpacing="0.22em">CAPCOM</text>
        <text x="210" y="14" textAnchor="middle" fill={AU.ship}   fontFamily={AUF.display} fontSize="8" fontWeight="800" letterSpacing="0.22em">SHIP</text>
      </svg>
    </window.ACard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 07 · RADIO FX — Narrative Signal Draft + dual role stacks + commit station
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenRadioFX = function ScreenRadioFX() {
  const [editRole, setEditRole] = AUS2("CAPCOM");
  const [expanded, setExpanded] = AUS2({ CAPCOM: "voice", SHIP: null });
  function setExp(role, id) {
    setExpanded(curr => ({ ...curr, [role]: curr[role] === id ? null : id }));
  }
  return (
    <window.AShell2 active="fx" mode="render" screenLabel="07 Radio FX"
      situation={undefined}
      fxPresets={[
        { id: "storm65",  label: "Storm '65",   route: "CAPCOM · earth_capcom",  active: true  },
        { id: "lo_orbit", label: "Lo-orbit",    route: "SHIP · ship_comm",        active: false },
        { id: "deep",     label: "Deep space",  route: "SHIP · deep_space",       active: false },
      ]}>
      <window.ScreenH1 glyph="fx" title="Radio FX · Review Rack"
        sub="role-stacked · narrative-informed · fine DSP per role"
        tags={[
          { label: `EDIT · ${editRole}`, color: editRole === "CAPCOM" ? "amber" : "green", filled: true },
          { label: `VIEW · ${editRole === "CAPCOM" ? "SHIP" : "CAPCOM"}`, color: "muted" },
        ]}
        actions={(<>
          <window.ABtn size="md">Compare preset</window.ABtn>
          <window.ABtn size="md" variant="primary">Save as preset</window.ABtn>
        </>)}
      />
      <NarrativeDraftWithControls />
      <FxCommitStation editRole={editRole} expanded={expanded[editRole]} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        <RoleStack role="CAPCOM"
          editing={editRole === "CAPCOM"}
          expanded={expanded.CAPCOM}
          onTileClick={(id) => setExp("CAPCOM", id)}
          onMakeEditable={() => setEditRole("CAPCOM")}
          voiceLabel="ash · storm '65" />
        <RoleStack role="SHIP"
          editing={editRole === "SHIP"}
          expanded={expanded.SHIP}
          onTileClick={(id) => setExp("SHIP", id)}
          onMakeEditable={() => setEditRole("SHIP")}
          voiceLabel="coral · lo-orbit" />
      </div>
      <ABNasaFooter editRole={editRole} />
    </window.AShell2>
  );
};

// ─────────────── Narrative Draft + 3 controls ───────────────
function NarrativeDraftWithControls() {
  const [state, setState] = AUS2("draft"); // "draft" | "used" | "rejected"
  return (
    <div style={{
      background: "#04060a", border: `1px solid ${AU.copper}55`, borderRadius: 4, padding: 12,
      boxShadow: `0 0 0 1px ${AU.copperGlow}`, flex: "0 0 auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: "HaxrCorp4089, " + AUF.display, fontSize: 13, color: AU.copper, letterSpacing: "0.16em", textTransform: "uppercase", WebkitFontSmoothing: "none" }}>
          ▸ Narrative Signal Draft
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <window.ATag color={state === "used" ? "green" : state === "rejected" ? "red" : "copper"} filled>
            {state.toUpperCase()}
          </window.ATag>
          <span style={{ fontFamily: "HelvB08, " + AUF.mono, fontSize: 10, color: AU.muted, letterSpacing: "0.08em", WebkitFontSmoothing: "none" }}>
            why the system suggested this sound
          </span>
        </div>
      </div>
      <pre style={{
        margin: 0, fontFamily: AUF.mono, fontSize: 11, lineHeight: 1.55, color: AU.text,
        whiteSpace: "pre-wrap",
      }}>
{`mission phase   Approach burn · scene 03
flight          Lunar flyby · 0.62× thrust
comms           DSN Madrid → SHIP S-band · 8.4 GHz
earth weather   rain · Iberia · light scatter
space weather   CME front · ramp_up · 0.62
─────────────── ────────────────────────────────────────────────
suggested       SHIP gets scint depth +0.20 and granular drop +0.08;
                CAPCOM tightens voice band (HP +20 Hz, LP −100 Hz)
                and softens hiss bed.`}
      </pre>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <window.ABtn size="sm" variant={state === "used" ? "primary" : "ghost"} onClick={() => setState("used")}>↻ Use draft</window.ABtn>
        <window.ABtn size="sm">Compare A/B</window.ABtn>
        <window.ABtn size="sm" variant={state === "rejected" ? "danger" : "ghost"} onClick={() => setState("rejected")}>✕ Reject</window.ABtn>
        <div style={{ flex: 1 }} />
        <window.ABtn size="sm">Edit draft</window.ABtn>
        <window.ABtn size="sm">Save as recipe</window.ABtn>
      </div>
    </div>
  );
}

// ─────────────── Terminal-style commit station ───────────────
function FxCommitStation({ editRole, expanded }) {
  const c = editRole === "CAPCOM" ? AU.capcom : AU.ship;
  return (
    <div style={{
      flex: "0 0 auto", display: "grid", gridTemplateColumns: "1fr 280px", gap: 12,
    }}>
      <div style={{
        padding: 12, background: "#020308", border: `1px solid ${AU.hair}`, borderRadius: 4,
        fontFamily: AUF.mono, fontSize: 11, lineHeight: 1.55,
      }}>
        <div style={{ color: AU.muted, marginBottom: 4 }}>
          <span style={{ fontFamily: "HaxrCorp4089, " + AUF.mono, fontSize: 10, color: AU.copper, letterSpacing: "0.12em", WebkitFontSmoothing: "none" }}>
            FX COMMIT STATION · 確定
          </span>
          <span style={{ marginLeft: 8 }}>per-role render decisions</span>
        </div>
        <div style={{ color: AU.green }}>{">"} fx.diff --role {editRole.toLowerCase()}</div>
        <div style={{ color: AU.text }}>{"  "}{expanded
          ? <>group <span style={{ color: c }}>{expanded}</span> · 4 controls modulated</>
          : <>no group expanded · select a tile to inspect</>}</div>
        <div style={{ color: AU.muted, marginTop: 6 }}>{">"} fx.preview --A=dry --B=fx --src=U3</div>
        <div style={{ color: AU.text }}>{"  "}A {`-6.2 dB`}   B {`-3.6 dB`}   Δ <span style={{ color: AU.copper }}>+2.6 dB</span></div>
        <div style={{ color: AU.muted, marginTop: 6 }}>{">"} <span style={{ background: c, color: "#0c0d10", padding: "0 4px", animation: "alpha2-pulse 1.2s ease-in-out infinite" }}>_</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <window.ABtn size="md" full>Bypass all · {editRole}</window.ABtn>
        <window.ABtn size="md" full>All ON · {editRole}</window.ABtn>
        <window.ABtn size="md" full variant="primary">Process {editRole}</window.ABtn>
      </div>
    </div>
  );
}

// ─────────────── Role stack (expand-on-click) ───────────────
function RoleStack({ role, voiceLabel, editing, expanded, onTileClick, onMakeEditable }) {
  const c = role === "CAPCOM" ? AU.capcom : AU.ship;
  const bg = role === "CAPCOM" ? AU.capcomBg : AU.shipBg;
  const groups = FXR().fxGroups;
  return (
    <section style={{
      position: "relative",
      background: AU.panel, border: `1px solid ${editing ? c : AU.hair}`, borderRadius: 4,
      boxShadow: editing ? `0 0 0 1px ${c}33, inset 0 1px 0 rgba(255,255,255,0.02)` : "inset 0 1px 0 rgba(255,255,255,0.02)",
      display: "flex", flexDirection: "column", minHeight: 0,
      opacity: editing ? 1 : 0.78,
    }}>
      <div style={{ height: 4, background: c }} />
      <header style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", background: bg, borderBottom: `1px solid ${AU.hair}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <window.RoleBadge role={role} size="sm" sub={voiceLabel} />
          <window.ATag color={editing ? (role === "CAPCOM" ? "amber" : "green") : "muted"} filled>
            {editing ? "EDITING" : "VIEW · LOCKED"}
          </window.ATag>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {editing
            ? <><window.ABtn size="sm">All ON</window.ABtn><window.ABtn size="sm">Bypass</window.ABtn></>
            : <window.ABtn size="sm" variant="primary" onClick={onMakeEditable}>⌥ Make editable</window.ABtn>}
        </div>
      </header>
      <div style={{ padding: 12, flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
        {!editing && (
          <div style={{
            position: "absolute", top: 12, left: 12, right: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "4px 8px", background: "rgba(2,3,8,0.65)", border: `1px dashed ${AU.hair}`, borderRadius: 2,
            fontFamily: "HelvB08, " + AUF.display, fontSize: 10, letterSpacing: "0.14em",
            color: AU.muted, textTransform: "uppercase", pointerEvents: "none", zIndex: 1, WebkitFontSmoothing: "none",
          }}>
            <span style={{ fontSize: 12 }}>⌬</span> VIEW MODE · CLICK MAKE EDITABLE TO MODIFY
          </div>
        )}
        {groups.map((g, i) => {
          const isExpanded = expanded === g.id;
          const isBypassed = role === "SHIP" && g.id === "granular";
          return (
            <React.Fragment key={g.id}>
              <div style={{ cursor: editing ? "pointer" : "default" }}
                onClick={() => editing && onTileClick(g.id)}>
                {isExpanded
                  ? <ExpandedTile group={g} editing={editing} envOverlay={g.id === "scint" || g.id === "granular"} />
                  : <window.AFxStackTile group={g}
                      active={editing && isExpanded}
                      bypassed={isBypassed}
                      envOverlay={g.id === "scint" || g.id === "granular"} />}
              </div>
              {i < groups.length - 1 && (
                <div style={{ display: "flex", justifyContent: "center", height: 14, position: "relative" }}>
                  <div style={{ width: 2, background: AU.hair, height: "100%" }} />
                  {editing && <div style={{ position: "absolute", top: 4, width: 6, height: 6, background: c, boxShadow: `0 0 4px ${c}` }} />}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {editing && (
        <div style={{ padding: 10, borderTop: `1px solid ${AU.hair}`, background: AU.panelLo, display: "flex", gap: 6, alignItems: "center" }}>
          <window.ALED on color="amber" size={5} blink />
          <span style={{ fontFamily: "HelvB08, " + AUF.display, fontSize: 10, letterSpacing: "0.14em", color: AU.amber, textTransform: "uppercase", WebkitFontSmoothing: "none" }}>
            Per-utterance overrides
          </span>
          <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
            {["U1", "U2", "U3", "U4"].map(u => (
              <window.ABtn key={u} size="sm" variant={u === "U3" ? "primary" : "ghost"} style={{ minWidth: 28, padding: "0 6px" }}>{u}</window.ABtn>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <window.ABtn size="sm" variant="primary">Apply to all</window.ABtn>
        </div>
      )}
    </section>
  );
}

function ExpandedTile({ group, editing, envOverlay }) {
  const c = AU[group.accent] || group.accent;
  return (
    <div style={{
      background: editing ? `rgba(224,122,60,0.04)` : "transparent",
      border: `1px solid ${c}`, borderRadius: 4, padding: 12,
      boxShadow: `0 0 0 1px ${c}33`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "HaxrCorp4089, " + AUF.display, fontSize: 12, color: c, letterSpacing: "0.16em", textTransform: "uppercase", WebkitFontSmoothing: "none" }}>{group.title}</span>
          <window.ATag color={group.accent} filled>EXPANDED</window.ATag>
        </div>
        <span style={{ fontFamily: "HelvB08, " + AUF.mono, fontSize: 9, color: AU.muted, letterSpacing: "0.1em", WebkitFontSmoothing: "none" }}>
          {group.ctrlCount} ctrl · click to collapse
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        {group.top.map(([k, v]) => (
          <window.ASlider key={k} label={k}
            value={typeof v === "number" && v <= 1 ? v : 0.5}
            accent={group.accent}
            envOverlay={envOverlay ? 0.62 : null}
          />
        ))}
        {group.id === "voice" && (<>
          <window.ASlider label="DOWN×" value={0.25} accent={group.accent} />
          <window.ASlider label="COMP" value={0.42} envOverlay={envOverlay ? 0.5 : null} accent={group.accent} />
          <window.ASlider label="DRIVE" value={0.18} accent={group.accent} />
          <window.ASlider label="NOISE" value={0.22} envOverlay={envOverlay ? 0.3 : null} accent={group.accent} />
        </>)}
      </div>
      {envOverlay && (
        <div style={{ marginTop: 8, padding: "4px 6px", background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 2,
          fontFamily: "HelvB08, " + AUF.mono, fontSize: 9, color: AU.blue, letterSpacing: "0.08em", WebkitFontSmoothing: "none" }}>
          ENV OVERLAY · 3 controls modulated by CME ramp_up · 0.62×
        </div>
      )}
    </div>
  );
}

// ─────────────── A/B/NASA mini-OLED footer ───────────────
function ABNasaFooter({ editRole }) {
  const c = editRole === "CAPCOM" ? AU.capcom : AU.ship;
  function Bars({ accent, data, label, sub }) {
    return (
      <div style={{ flex: 1, padding: 8, background: "#04050a", border: `1px solid ${AU.hair}`, borderRadius: 3 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontFamily: "HaxrCorp4089, " + AUF.display, fontSize: 11, color: accent, letterSpacing: "0.14em", textTransform: "uppercase", WebkitFontSmoothing: "none" }}>{label}</span>
          <span style={{ fontFamily: "HelvB08, " + AUF.mono, fontSize: 9, color: AU.muted, letterSpacing: "0.08em", WebkitFontSmoothing: "none" }}>{sub}</span>
        </div>
        <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: "100%", height: 28, display: "block" }}>
          {data.map((v, i) => {
            const w = 100 / data.length;
            return <rect key={i} x={i * w} y={28 - v * 28} width={w * 0.65} height={v * 28} fill={accent} opacity={0.7 + v * 0.3} />;
          })}
        </svg>
      </div>
    );
  }
  const dryData  = Array.from({ length: 40 }, (_, i) => 0.2 + 0.45 * Math.abs(Math.sin(i * 0.45)));
  const fxData   = Array.from({ length: 40 }, (_, i) => 0.3 + 0.55 * Math.abs(Math.sin(i * 0.45 + 1.2)));
  const nasaData = Array.from({ length: 40 }, (_, i) => 0.25 + 0.5 * Math.abs(Math.cos(i * 0.4)));
  return (
    <div style={{ flex: "0 0 auto", display: "flex", gap: 8 }}>
      <Bars accent={c} data={dryData}  label={`A · DRY · ${editRole}`}  sub="−6.2 dB · U3" />
      <Bars accent={AU.copper} data={fxData}   label={`B · FX · ${editRole}`}   sub="−3.6 dB · U3 · post-FX" />
      <Bars accent={AU.blue}   data={nasaData} label="NASA · REFERENCE"          sub="A13-OXYGEN-04 · match 0.84" />
      <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 4, justifyContent: "center" }}>
        <window.ABtn size="sm">▶ A</window.ABtn>
        <window.ABtn size="sm" variant="primary">▶ B</window.ABtn>
        <window.ABtn size="sm">▶ NASA</window.ABtn>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 08 · SPECTROGRAM (optional)
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenSpectro = function ScreenSpectro() {
  return (
    <window.AShell2 active="spectro" mode="render" screenLabel="08 Spectrogram">
      <window.ScreenH1 glyph="spectro" title="Spectrogram"
        sub="optional analysis · never blocks export"
        tags={[
          { label: "U3 · CAPCOM", color: "copper", filled: true },
          { label: "Optional", color: "muted" },
        ]}
        actions={(<>
          <window.ABtn size="md">Side-by-side</window.ABtn>
          <window.ABtn size="md">Overlay</window.ABtn>
          <window.ABtn size="md" variant="primary">Match NASA</window.ABtn>
        </>)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          <SpectroPanel label="RAW · pre-FX · 3.2s"        color={AU.copper} stale={false} />
          <SpectroPanel label="PROCESSED · post-FX"        color={AU.copper} stale />
          <SpectroPanel label="STITCHED · final"           color={AU.green} stale={false} />
          <SpectroPanel label="NASA · A13-OXYGEN-COMM-04"  color={AU.blue} stale={false} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
          <SpectroMatch />
          <SpectroNotes />
        </div>
      </div>
    </window.AShell2>
  );
};

function SpectroPanel({ label, color, stale }) {
  return (
    <window.ACard pad={0} dense title={label}
      action={stale ? <window.AStaleChip reasons={["env"]} compact /> : <window.ALED on color="green" size={5} />}
      style={{ flex: 1, minHeight: 0 }}>
      <div style={{ height: "100%", background: AU.spectroBg, display: "grid", gridTemplateColumns: "repeat(100, 1fr)", gridTemplateRows: "repeat(12, 1fr)", gap: 1, padding: 4 }}>
        {Array.from({ length: 1200 }, (_, i) => {
          const r = Math.floor(i / 100);
          const c = i % 100;
          const e = Math.max(0, Math.min(1,
            0.7 * Math.exp(-Math.pow((r - 7) / 3.5, 2)) * (0.6 + 0.4 * Math.sin(c * 0.35 + r * 0.2)) + 0.1
          ));
          return <div key={i} style={{ background: color, opacity: e * 0.92 }} />;
        })}
      </div>
    </window.ACard>
  );
}

function SpectroMatch() {
  const bands = [["120", 0.72], ["250", 0.81], ["500", 0.91], ["1k", 0.88], ["2k", 0.79], ["4k", 0.84], ["8k", 0.71], ["16k", 0.62]];
  return (
    <window.ACard title="Match · diff" sub="processed vs NASA">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
        <window.AReadout label="Δ SPECT" value="+2.4 dB" accent={AU.blue} />
        <window.AReadout label="Δ LUFS" value="+3.1" accent={AU.amber} />
        <window.AReadout label="MATCH" value="0.84" accent={AU.green} />
        <window.AReadout label="GEN" value="18:42" />
      </div>
      <span style={{ fontFamily: AUF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: AU.muted, textTransform: "uppercase" }}>Per-band match</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, height: 50, alignItems: "end", marginTop: 6 }}>
        {bands.map(([k, v], i) => (
          <div key={i} style={{ height: `${v * 100}%`, background: v > 0.8 ? AU.green : v > 0.7 ? AU.amber : AU.red, position: "relative" }}>
            <span style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontFamily: AUF.mono, fontSize: 8, color: AU.muted }}>{v.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, marginTop: 4, fontFamily: AUF.mono, fontSize: 8, color: AU.muted, textAlign: "center" }}>
        {bands.map(([k]) => <span key={k}>{k}</span>)}
      </div>
    </window.ACard>
  );
}

function SpectroNotes() {
  return (
    <window.ACard title="Comparison notes" sub="optional commentary">
      <pre style={{ margin: 0, padding: 10, background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 3, fontFamily: AUF.mono, fontSize: 10.5, lineHeight: 1.55, color: AU.text, whiteSpace: "pre-wrap" }}>
{`Processed FX matches NASA at 0.84.
1.2 kHz peak is +2.4 dB hotter — the
voice-band drive is tracking too high
under CME ramp. Try drop drive by 0.05
or raise comp threshold by 1 dB.

This screen is optional. Skip it and
export still works.`}
      </pre>
    </window.ACard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 09 · STITCH · EXPORT — compact DAW
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenStitch = function ScreenStitch() {
  return (
    <window.AShell2 active="stitch" mode="render" screenLabel="09 Stitch · Export">
      <window.ScreenH1 glyph="stitch" title="Stitch · Export"
        sub="DAW · timeline · stale reasons · session package"
        tags={[
          { label: "4 utt · 14.3s", color: "copper", filled: true },
          { label: "2 stale", color: "red", filled: true },
        ]}
        actions={(<>
          <window.ABtn size="md">Re-stitch all</window.ABtn>
          <window.ABtn size="md">Re-render stale (2)</window.ABtn>
          <window.ABtn size="md" variant="primary">Export · WAV + JSON</window.ABtn>
        </>)}
      />
      <StitchStaleLegend />
      <DawTimeline />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <PerUtteranceAB />
        <SessionPackage />
      </div>
    </window.AShell2>
  );
};

function StitchStaleLegend() {
  const rows = [
    { letter: "V", word: "voice",      desc: "voice or audition changed", color: AU.text },
    { letter: "E", word: "env",        desc: "environment changed",        color: AU.blue },
    { letter: "C", word: "capcom-fx",  desc: "CAPCOM FX changed",          color: AU.capcom },
    { letter: "S", word: "ship-fx",    desc: "SHIP FX changed",            color: AU.ship },
  ];
  return (
    <window.ACard title="Stale reasons · legend" sub="multi-source · per clip" dense style={{ flex: "0 0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {rows.map(r => (
          <div key={r.letter} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{
              width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: AU.red, border: `1px solid ${AU.red}88`, borderRadius: 2,
              fontFamily: AUF.display, fontSize: 10, fontWeight: 800,
            }}>{r.letter}</span>
            <div>
              <div style={{ fontFamily: AUF.mono, fontSize: 11, color: r.color }}>{r.word}</div>
              <div style={{ fontFamily: AUF.mono, fontSize: 9, color: AU.muted, marginTop: 2 }}>{r.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </window.ACard>
  );
}

function DawTimeline() {
  const lanes = [
    { name: "CAPCOM", color: AU.capcom },
    { name: "SHIP",   color: AU.ship },
    { name: "QD",     color: AU.amber },
    { name: "FX",     color: AU.copper },
  ];
  const blocks = [
    { lane: 0, x: 1,  w: 24, id: "U1", text: "Odyssey, Houston. Go for approach burn.",  stale: [] },
    { lane: 1, x: 26, w: 26, id: "U2", text: "Houston, Odyssey. Approach burn in three…", stale: ["voice"] },
    { lane: 0, x: 53, w: 22, id: "U3", text: "Copy mark. Telemetry nominal.",             stale: ["env", "capcom-fx"] },
    { lane: 1, x: 76, w: 22, id: "U4", text: "Throttling now. Slight scintillation.",     stale: [] },
    { lane: 2, x: 0,  w: 2,  id: "QD1", text: "▸ QD",  stale: [] },
    { lane: 2, x: 98, w: 2,  id: "QD2", text: "QD ▸",  stale: [] },
    { lane: 3, x: 0,  w: 100, id: "BED", text: "STORM '65 / LO-ORBIT · environment bed", stale: [] },
  ];
  return (
    <window.ACard title="DAW timeline" sub="4 utt · 14.3s · 2 stale" pad={0} style={{ flex: "0 0 auto" }}>
      <div style={{ padding: 14, borderTop: `1px solid ${AU.hair}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", marginBottom: 6 }}>
          <div />
          <div style={{ position: "relative", height: 14 }}>
            {[0, 2, 4, 6, 8, 10, 12, 14].map(t => (
              <span key={t} style={{ position: "absolute", left: `${(t / 14) * 100}%`, fontFamily: AUF.mono, fontSize: 8, color: AU.muted }}>{t}s</span>
            ))}
          </div>
        </div>
        {lanes.map((lane, li) => (
          <div key={lane.name} style={{ display: "grid", gridTemplateColumns: "80px 1fr", marginBottom: 4, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: 8 }}>
              <span style={{ width: 8, height: 8, background: lane.color, borderRadius: 1 }} />
              <span style={{ fontFamily: AUF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", color: AU.muted, textTransform: "uppercase" }}>{lane.name}</span>
            </div>
            <div style={{ height: li === 3 ? 28 : 36, background: AU.panelLo, border: `1px solid ${AU.hair}`, borderRadius: 2, position: "relative" }}>
              {blocks.filter(b => b.lane === li).map(b => {
                const stale = b.stale.length > 0;
                return (
                  <div key={b.id} style={{
                    position: "absolute", left: `${b.x}%`, width: `${b.w}%`, top: 3, bottom: 3,
                    background: stale ? "transparent" : (li === 3 ? `${lane.color}33` : `linear-gradient(180deg, ${lane.color}cc, ${lane.color}66)`),
                    border: `1px solid ${stale ? AU.red : lane.color}`, borderRadius: 2, padding: 4,
                    animation: stale ? "alpha-stale-pulse 1.6s ease-in-out infinite" : "none",
                    overflow: "hidden",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: AUF.display, fontSize: 9, fontWeight: 700, color: stale ? AU.red : (li === 3 ? lane.color : "#0c0d10") }}>{b.id}</span>
                      {stale && <window.AStaleChip reasons={b.stale} compact />}
                    </div>
                    <div style={{ marginTop: 2, fontFamily: AUF.mono, fontSize: 8, color: stale ? AU.muted : (li === 3 ? AU.muted : "rgba(12,13,16,0.85)"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </window.ACard>
  );
}

function PerUtteranceAB() {
  const rows = [
    { id: "U1", speaker: "CAPCOM", voice: "ash",   stale: [],                  status: "Ready" },
    { id: "U2", speaker: "SHIP",   voice: "coral", stale: ["voice"],           status: "Stale" },
    { id: "U3", speaker: "CAPCOM", voice: "ash",   stale: ["env","capcom-fx"], status: "Stale", active: true },
    { id: "U4", speaker: "SHIP",   voice: "coral", stale: [],                  status: "Ready" },
  ];
  return (
    <window.ACard title="Per-utterance A / B" sub="dry · FX · NASA" pad={0}>
      {rows.map((r, i) => {
        const stale = r.stale.length > 0;
        return (
          <div key={r.id} style={{
            display: "grid", gridTemplateColumns: "50px 1fr 140px 130px",
            alignItems: "center", gap: 10, padding: "10px 12px",
            borderTop: i === 0 ? "none" : `1px solid ${AU.hair}`,
            background: r.active ? "rgba(224,122,60,0.06)" : "transparent",
          }}>
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <window.ALED on color={stale ? "red" : "green"} size={5} blink={stale} />
              <span style={{ fontFamily: AUF.mono, fontSize: 12, color: r.active ? AU.copper : AU.text }}>{r.id}</span>
            </div>
            <window.RoleBadge role={r.speaker} size="sm" sub={r.voice} />
            <window.AWave height={22} seed={i + 4} color={r.speaker === "CAPCOM" ? AU.capcom : AU.ship} opacity={stale ? 0.4 : 0.85} />
            <div style={{ display: "flex", gap: 4 }}>
              <window.ABtn size="sm" style={{ flex: 1 }}>A</window.ABtn>
              <window.ABtn size="sm" variant="primary" style={{ flex: 1 }}>B</window.ABtn>
              <window.ABtn size="sm" style={{ flex: 1 }}>▶</window.ABtn>
              <window.ABtn size="sm" style={{ flex: 1 }}>↻</window.ABtn>
            </div>
          </div>
        );
      })}
    </window.ACard>
  );
}

function SessionPackage() {
  return (
    <window.ACard title="Session package" sub="export receipt">
      <window.GlyphPanel
        accent="copper"
        art={`>_ vrp export · VRP-26-05-13
 model     gpt-4o-mini-tts
 voices    ash · coral
 dsp       QND VBE HIS SCT [GRN-byp]
 env       lunar_flyby × cme @ 0.62×
 utt       4 / 4   stale 2
 size      11.4 MB · 14.3 s
 sha1      8f2a91c0…c01e6b3a`}
        caption="manifest preview · copy-paste"
      />
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          ["odyssey-scene-03.wav",        "11.4 MB", "audio · stitched"],
          ["odyssey-scene-03.manifest.json","2.1 KB", "metadata · sha1"],
          ["U1-U4_stems.zip",             "32.8 MB", "per-utt stems + dry"],
          ["spectro-snapshots.zip",       "1.4 MB",  "optional · skipped"],
        ].map(([f, sz, lbl], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 110px", gap: 8, padding: "5px 8px", background: i === 3 ? AU.panelLo : "transparent", borderRadius: 2 }}>
            <span style={{ fontFamily: AUF.mono, fontSize: 10, color: i === 3 ? AU.dim : AU.text }}>{f}</span>
            <span style={{ fontFamily: AUF.mono, fontSize: 10, color: AU.muted, textAlign: "right" }}>{sz}</span>
            <span style={{ fontFamily: AUF.mono, fontSize: 9, color: AU.muted }}>{lbl}</span>
          </div>
        ))}
      </div>
    </window.ACard>
  );
}
