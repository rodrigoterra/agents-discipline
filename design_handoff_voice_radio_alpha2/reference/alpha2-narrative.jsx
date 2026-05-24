// ALPHA2 — Narrative lane screens.
// Mission Control · Flight · COMMS · Earth Weather · Space Weather

const N = A.T, NF = A.F;
const NUS = React.useState;

// ═════════════════════════════════════════════════════════════════════════════
// 01 · MISSION CONTROL — dashboard + story creation console
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenMissionControl = function ScreenMissionControl() {
  const [dsn, setDsn] = NUS("MAD");
  const [storyText, setStoryText] = NUS("Approach burn for lunar flyby. CAPCOM speaks first, SHIP confirms throttling and reports light scintillation.");
  const [showQuakes, setShowQuakes] = NUS(false);
  return (
    <window.AShell2 active="mc" mode="render" screenLabel="01 Mission Control">
      <window.ScreenH1
        glyph="mc"
        title="Mission Control"
        sub="dashboard · story · downstream summaries"
        tags={[
          { label: "ALPHA2", color: "copper", filled: true },
          { label: "Scene 03 · Approach burn", color: "muted" },
          { label: "Live · 4 utt · 14.3s", color: "green", filled: true },
        ]}
        actions={(
          <>
            <window.ABtn size="md">Preset · Apollo 13</window.ABtn>
            <window.ABtn size="md" variant="primary">Generate setup</window.ABtn>
          </>
        )}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, flex: "0 0 auto" }}>
        <window.ACard title="World · DSN coverage" sub={`active station · ${dsn}${showQuakes ? " · USGS feed on" : ""}`} pad={0}
          action={<>
            <window.ABtn size="sm" variant={showQuakes ? "primary" : "ghost"} onClick={() => setShowQuakes(!showQuakes)}>+ Quakes</window.ABtn>
            <window.ABtn size="sm">+ Layer</window.ABtn>
          </>}>
          <window.EarthDsnMap selectedId={dsn} onSelect={setDsn} earthquakes={showQuakes} height={300} />
        </window.ACard>
        <window.ACard title="Story prompt" sub="Narrative Setup JSON" action={<window.ABtn size="sm" variant="primary">Validate</window.ABtn>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <textarea
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              style={{
                background: N.panelLo, border: `1px solid ${N.hair}`, borderRadius: 3,
                color: N.text, fontFamily: NF.mono, fontSize: 11, lineHeight: 1.5,
                padding: 8, resize: "none", minHeight: 76, outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["Apollo 11", "Apollo 13", "Lunar far-side", "DSN handoff", "Solar max", "Custom"].map((p, i) => (
                <window.ABtn key={p} size="sm" variant={i === 1 ? "primary" : "ghost"}>{p}</window.ABtn>
              ))}
            </div>
            <window.GlyphPanel
              accent="copper"
              caption="generated setup · validates against schema"
              art={`{
  "mission": "Odyssey 2026-05",
  "scene":   "Approach burn",
  "phase":   "lunar_flyby",
  "roles":   ["CAPCOM", "SHIP"],
  "lang":    "pt-BR",
  "utt":     4
}`}
            />
          </div>
        </window.ACard>
      </div>

      {/* Row 2: downstream summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: "0 0 auto" }}>
        <DownstreamCard glyph="flight"  title="Flight"  status="ready"   summary={["lunar_flyby", "0.62× thrust", "Δv 14.2 m/s"]} />
        <DownstreamCard glyph="comms"   title="COMMS"   status="ready"   summary={["DSN " + dsn, "S-band · 8.4 GHz", "lat ~1.6s"]} />
        <DownstreamCard glyph="earthWeather" title="Weather" status="partial" summary={["Earth · light rain", "Space · CME ramp_up", "S4 = 0.71"]} />
        <DownstreamCard glyph="dialogue" title="Dialogue" status="pending" summary={["awaiting prompt validation", "4 utt suggested", "—"]} />
      </div>

      {/* Row 3: presets + report status */}
      <window.ACard title="Report preview" sub="fallback status across narrative lane" pad={0} style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", borderTop: `1px solid ${N.hair}` }}>
          {[
            { glyph: "mc",       label: "Story prompt", state: "ready" },
            { glyph: "flight",   label: "Flight state", state: "ready" },
            { glyph: "comms",    label: "Comm route",   state: "ready" },
            { glyph: "earthWeather", label: "Earth wx", state: "live" },
            { glyph: "spaceWeather", label: "Space wx", state: "cached" },
          ].map((r, i, arr) => (
            <ReportPreviewCell key={r.label} {...r} last={i === arr.length - 1} />
          ))}
        </div>
      </window.ACard>
    </window.AShell2>
  );
};

function DownstreamCard({ glyph, title, status, summary }) {
  const statusColor = status === "ready" ? N.green : status === "partial" ? N.amber : N.muted;
  return (
    <window.ACard title={title} sub={status} dense
      action={<window.GlyphSigil glyph={glyph} size="sm" inline />}
      borderColor={statusColor + "55"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: NF.mono, fontSize: 10, color: N.text }}>
        {summary.map((s, i) => (
          <div key={i}>
            <span style={{ color: i === 0 ? statusColor : N.muted, marginRight: 6 }}>·</span>{s}
          </div>
        ))}
      </div>
    </window.ACard>
  );
}

function ReportPreviewCell({ glyph, label, state, last }) {
  const c = state === "ready" ? N.green : state === "live" ? N.copper : state === "cached" ? N.blue : N.amber;
  return (
    <div style={{
      padding: 12, borderRight: last ? "none" : `1px solid ${N.hair}`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: NF.display, fontSize: 9, fontWeight: 800, letterSpacing: "0.22em", color: N.text, textTransform: "uppercase" }}>{label}</span>
        <window.ATag color={state === "ready" ? "green" : state === "live" ? "copper" : state === "cached" ? "blue" : "amber"} filled>{state}</window.ATag>
      </div>
      <window.GlyphSigil glyph={glyph} size="sm" />
      <div style={{ fontFamily: NF.mono, fontSize: 9, color: N.muted, marginTop: 2 }}>
        last sync · 14s ago
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 02 · FLIGHT — orbit + telemetry + integrity
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenFlight = function ScreenFlight() {
  const [wp, setWp] = NUS("W3");
  const [view, setView] = NUS("live"); // "live" | "trajectory"
  return (
    <window.AShell2 active="flight" mode="render" screenLabel="02 Flight">
      <window.ScreenH1 glyph="flight" title="Flight"
        sub="spacecraft position · telemetry · live satellite tracking"
        tags={[
          { label: "Lunar flyby", color: "amber", filled: true },
          { label: "phase 4 / 7", color: "muted" },
          { label: "10 sats", color: "blue" },
        ]}
        actions={(<>
          <window.ABtn size="md">Preset · Apollo 13</window.ABtn>
          <window.ABtn size="md" variant="primary">Save flight</window.ABtn>
        </>)}
      />
      <window.ACard
        title={view === "live" ? "Live orbit · sidecar /api/satellites/*/track" : "Mission trajectory · Earth ↔ Moon"}
        sub={view === "live" ? "Natural Earth · 10-sat catalog · click to toggle tracks" : "7 waypoints · approach burn active"}
        pad={0}
        action={(<>
          <window.ABtn size="sm" variant={view === "live" ? "primary" : "ghost"} onClick={() => setView("live")}>Live orbit</window.ABtn>
          <window.ABtn size="sm" variant={view === "trajectory" ? "primary" : "ghost"} onClick={() => setView("trajectory")}>Trajectory</window.ABtn>
          <window.ABtn size="sm">Top</window.ABtn>
          <window.ABtn size="sm">Side</window.ABtn>
        </>)}>
        {view === "live"
          ? <window.LiveOrbitMap height={360} initialTracked={["ISS", "TERRA"]} dayNight />
          : <window.MissionTrajectory selectedWaypoint={wp} onSelect={setWp} height={360} />}
      </window.ACard>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <FlightTerminal wp={wp} view={view} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <FlightTelemetry />
          <FlightIntegrity />
        </div>
      </div>
    </window.AShell2>
  );
};

function FlightTelemetry() {
  return (
    <window.ACard title="Telemetry" sub="modifiable · live" pad={12}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <window.AReadout label="VEL"      value="2 412 m/s" accent={N.green} />
        <window.AReadout label="ALT"      value="184 km · AGL" accent={N.copper} />
        <window.AReadout label="THRUST"   value="0.62 ×"  accent={N.amber} />
        <window.AReadout label="FUEL"     value="68 %" />
        <window.AReadout label="Δv USED"  value="14.2 m/s" />
        <window.AReadout label="Δv BUDGET" value="42.0 m/s" />
        <window.AReadout label="ATTITUDE" value="prograde" />
        <window.AReadout label="SPIN"     value="0.014 rad/s" />
      </div>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <window.AReadout label="LAUNCH"   value="T-14d 02:14" sub="Cape Canaveral" />
        <window.AReadout label="LANDING"  value="T+04d 18:42" sub="Indian Ocean" />
        <window.AReadout label="REENTRY"  value="T+04d 17:08" sub="window 38m" />
      </div>
    </window.ACard>
  );
}

function FlightTerminal({ wp, view }) {
  return (
    <window.ACard title="Nav terminal" sub={`waypoint · ${wp}`} pad={0}
      action={<><window.ABtn size="sm">cmd</window.ABtn><window.ABtn size="sm">repl</window.ABtn></>}>
      <div style={{ padding: 12, background: "#020308", fontFamily: NF.mono, fontSize: 11, lineHeight: 1.55, color: N.green, minHeight: 200, height: "100%", overflow: "auto" }}>
        <div style={{ color: N.muted }}>{">"} flight.status</div>
        <div>{"  "}phase = lunar_flyby</div>
        <div>{"  "}waypoint = {wp}  ({"approach_burn"})</div>
        <div>{"  "}delta_v_remaining = 27.8 m/s</div>
        <div style={{ color: N.muted, marginTop: 6 }}>{">"} space.health</div>
        <div>{"  "}sidecar = <span style={{ color: N.amber }}>http://127.0.0.1:8765</span></div>
        <div>{"  "}land_geojson = ne_110m_land</div>
        <div>{"  "}catalog = 10 satellites</div>
        <div>{"  "}ws_fps = 1.0  ·  status = {view === "live" ? <span style={{ color: N.green }}>open</span> : <span style={{ color: N.muted }}>idle</span>}</div>
        <div style={{ color: N.muted, marginTop: 6 }}>{">"} flight.burn.preview --waypoint W4</div>
        <div>{"  "}prograde burn · 18.3 s</div>
        <div>{"  "}expected ∆v · 12.4 m/s</div>
        <div>{"  "}safety margin · 2.1 σ</div>
        <div style={{ color: N.muted, marginTop: 6 }}>{">"} integrity.scan</div>
        <div>{"  "}<span style={{ color: N.green }}>OK</span> propulsion</div>
        <div>{"  "}<span style={{ color: N.green }}>OK</span> comm s-band</div>
        <div>{"  "}<span style={{ color: N.amber }}>WARN</span> radiation · CME ramp_up</div>
        <div style={{ color: N.copper, marginTop: 8 }}>{">"} <span style={{ background: N.copper, color: "#0c0d10", padding: "0 4px", animation: "alpha2-pulse 1.2s ease-in-out infinite" }}>_</span></div>
      </div>
    </window.ACard>
  );
}

function FlightIntegrity() {
  const systems = [
    { id: "PRO", label: "Propulsion",      pct: 0.98, state: "OK" },
    { id: "PWR", label: "Power",           pct: 0.86, state: "OK" },
    { id: "ECS", label: "Life support",    pct: 0.91, state: "OK" },
    { id: "RAD", label: "Radiation hull",  pct: 0.62, state: "WARN" },
    { id: "COM", label: "Comm",            pct: 0.88, state: "OK" },
    { id: "NAV", label: "Navigation",      pct: 0.95, state: "OK" },
    { id: "THR", label: "Thermal",         pct: 0.79, state: "OK" },
  ];
  return (
    <window.ACard title="Integrity" sub={`${systems.length} systems · 1 warn`}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {systems.map(s => {
          const c = s.state === "OK" ? N.green : s.state === "WARN" ? N.amber : N.red;
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "30px 60px 1fr 50px", gap: 8, alignItems: "center" }}>
              <window.ATag color={s.state === "OK" ? "green" : "amber"} filled>{s.state}</window.ATag>
              <span style={{ fontFamily: NF.mono, fontSize: 10, color: N.muted }}>{s.id}</span>
              <div style={{ height: 8, background: N.panelLo, border: `1px solid ${N.hair}`, borderRadius: 2, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${s.pct * 100}%`, background: c, opacity: 0.85 }} />
              </div>
              <span style={{ fontFamily: NF.mono, fontSize: 10, color: c, textAlign: "right", fontWeight: 600 }}>{Math.round(s.pct * 100)}%</span>
            </div>
          );
        })}
      </div>
    </window.ACard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 03 · COMMS — DSN map + ground antenna cards + SHIP antenna + path diagram
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenComms = function ScreenComms() {
  const [dsn, setDsn] = NUS("MAD");
  const [showQuakes, setShowQuakes] = NUS(false);
  return (
    <window.AShell2 active="comms" mode="render" screenLabel="03 COMMS">
      <window.ScreenH1 glyph="comms" title="COMMS"
        sub="select the route that later shapes story and radio FX"
        tags={[
          { label: "S-band · 8.4 GHz", color: "blue", filled: true },
          { label: "lat 1.6 s", color: "muted" },
        ]}
        actions={(<><window.ABtn size="md">Preset · DSN handoff</window.ABtn><window.ABtn size="md" variant="primary">Lock route</window.ABtn></>)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, flex: "0 0 auto" }}>
        <window.ACard title="DSN · ground antennas" sub={`active · ${dsn}${showQuakes ? " · quakes" : ""}`} pad={0}
          action={<>
            <window.ABtn size="sm" variant={showQuakes ? "primary" : "ghost"} onClick={() => setShowQuakes(!showQuakes)}>+ Quakes</window.ABtn>
            <window.ABtn size="sm">DSN</window.ABtn><window.ABtn size="sm">Relay</window.ABtn><window.ABtn size="sm">Laser</window.ABtn>
          </>}>
          <window.EarthDsnMap selectedId={dsn} onSelect={setDsn} earthquakes={showQuakes} height={300} />
        </window.ACard>
        <SignalPathPanel dsn={dsn} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, flex: "0 0 auto" }}>
        {["GDS", "MAD", "CAN"].map(id => <GroundAntennaCard key={id} id={id} active={id === dsn} onClick={() => setDsn(id)} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, flex: 1, minHeight: 0 }}>
        <ShipAntennaCard />
        <BlackoutWindows />
      </div>
    </window.AShell2>
  );
};

function SignalPathPanel({ dsn }) {
  return (
    <window.ACard title="Signal path" sub={`${dsn} → SHIP`} pad={12}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <window.AReadout label="FREQ"   value="8.4 GHz"  accent={N.blue} />
        <window.AReadout label="LAT"    value="1.6 s"    accent={N.copper} />
        <window.AReadout label="BANDW"  value="2 Mbps" />
        <window.AReadout label="POWER"  value="20 kW · −82 dBm" />
        <window.AReadout label="EIRP"   value="98 dBm" />
        <window.AReadout label="MARGIN" value="6.4 dB"  accent={N.green} />
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={{ fontFamily: NF.display, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: N.muted, textTransform: "uppercase" }}>path diagram</span>
        <pre style={{ margin: "6px 0 0", padding: 10, background: N.panelLo, border: `1px solid ${N.hair}`, borderRadius: 3,
          fontFamily: NF.mono, fontSize: 11, color: N.blue, lineHeight: 1.4 }}>
{` GROUND ${dsn}            SHIP
   ┌──┐  ───────────► ┌──┐
   │))│  ░░░░░░░░░░░░ │))│
   └──┘  ◄─────────── └──┘
         8.4 GHz · 1.6 s rtt
         scint S4 · 0.71`}
        </pre>
      </div>
    </window.ACard>
  );
}

function GroundAntennaCard({ id, active, onClick }) {
  const meta = {
    GDS: { name: "Goldstone",   dish: "70m / 34m × 4", el: "42°",  state: "uplink",  region: "Mojave · USA", noise: "26 K" },
    MAD: { name: "Madrid",      dish: "70m / 34m × 3", el: "61°",  state: "active",  region: "Robledo · ESP", noise: "24 K" },
    CAN: { name: "Canberra",    dish: "70m / 34m × 4", el: "28°",  state: "standby", region: "Tidbinbilla · AUS", noise: "29 K" },
  }[id];
  const c = meta.state === "active" ? N.copper : meta.state === "uplink" ? N.green : N.amber;
  return (
    <window.ACard borderColor={c + (active ? "" : "55")}
      style={{ cursor: "pointer" }}
      title={`${id} · ${meta.name}`} sub={meta.region}
      action={<window.ATag color={meta.state === "active" ? "copper" : meta.state === "uplink" ? "green" : "amber"} filled>{meta.state}</window.ATag>}>
      <div onClick={onClick}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <window.AReadout label="DISH" value={meta.dish} />
          <window.AReadout label="EL"   value={meta.el} accent={c} />
          <window.AReadout label="NOISE T" value={meta.noise} />
          <window.AReadout label="POWER" value="20 kW" />
        </div>
        <window.GlyphPanel
          accent={meta.state === "active" ? "copper" : meta.state === "uplink" ? "green" : "amber"}
          art={`  ╲│╱
 ─ ${id} ─
  ╱│╲
   │
 ▄▄▙▄▄`}
          caption="dish glyph · live"
        />
      </div>
    </window.ACard>
  );
}

function ShipAntennaCard() {
  return (
    <window.ACard title="SHIP antennas" sub="high-gain · low-gain · S-band">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { id: "HGA", state: "tracking", el: "+82°", gain: "+38 dB", c: N.green },
          { id: "MGA", state: "warm",     el: "+12°", gain: "+18 dB", c: N.amber },
          { id: "LGA", state: "standby",  el: "omni", gain: "+0 dB",  c: N.muted },
        ].map(a => (
          <div key={a.id} style={{
            padding: 10, background: N.panelLo, border: `1px solid ${a.c}55`, borderLeft: `2px solid ${a.c}`, borderRadius: 3,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: NF.display, fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", color: a.c }}>{a.id}</span>
              <window.ATag color={a.c === N.green ? "green" : a.c === N.amber ? "amber" : "muted"}>{a.state}</window.ATag>
            </div>
            <div style={{ marginTop: 6, fontFamily: NF.mono, fontSize: 10, color: N.text, lineHeight: 1.5 }}>
              <div><span style={{ color: N.muted }}>el</span> {a.el}</div>
              <div><span style={{ color: N.muted }}>gain</span> {a.gain}</div>
              <div><span style={{ color: N.muted }}>aim err</span> 0.04°</div>
            </div>
          </div>
        ))}
      </div>
    </window.ACard>
  );
}

function BlackoutWindows() {
  const w = [
    { start: "T+02:48", dur: "12m", reason: "Lunar occultation",     sev: "hard" },
    { start: "T+03:24", dur: "3m",  reason: "DSN handoff GDS → MAD", sev: "soft" },
    { start: "T+04:11", dur: "8m",  reason: "Ionospheric S4 spike",  sev: "soft" },
  ];
  return (
    <window.ACard title="Blackout windows" sub="upcoming · 4 hours" pad={0}>
      {w.map((b, i) => {
        const c = b.sev === "hard" ? N.red : N.amber;
        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "80px 40px 1fr 60px",
            gap: 10, padding: "8px 12px", alignItems: "center",
            borderTop: i === 0 ? `1px solid ${N.hair}` : `1px solid ${N.hair}`,
          }}>
            <span style={{ fontFamily: NF.mono, fontSize: 11, color: c, fontWeight: 600 }}>{b.start}</span>
            <span style={{ fontFamily: NF.mono, fontSize: 10, color: N.muted }}>{b.dur}</span>
            <span style={{ fontFamily: NF.mono, fontSize: 10, color: N.text }}>{b.reason}</span>
            <window.ATag color={b.sev === "hard" ? "red" : "amber"} filled>{b.sev}</window.ATag>
          </div>
        );
      })}
    </window.ACard>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 04 · WEATHER — Earth + Space, one nav item, internal toggle
// ═════════════════════════════════════════════════════════════════════════════
window.ScreenWeather = function ScreenWeather() {
  const [page, setPage] = NUS("earth"); // "earth" | "space"
  return (
    <window.AShell2 active="weather" mode="render" screenLabel={`04 Weather · ${page}`}>
      <WeatherHeader page={page} setPage={setPage} />
      {page === "earth" ? <EarthWeatherBody /> : <SpaceWeatherBody />}
    </window.AShell2>
  );
};

function WeatherHeader({ page, setPage }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: "0 0 auto", gap: 14 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <window.GlyphSigil glyph={page === "earth" ? "earthWeather" : "spaceWeather"} size="md" />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ margin: 0, fontFamily: NF.display, fontSize: 22, fontWeight: 700 }}>Weather</h1>
            <window.ATag color="muted">one nav · two pages</window.ATag>
          </div>
          <p style={{ margin: 0, fontFamily: NF.mono, fontSize: 11, color: N.muted }}>signal-impact conditions · choose page</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", border: `1px solid ${N.hair}`, borderRadius: 3, overflow: "hidden" }}>
          <PageTab on={page === "earth"} onClick={() => setPage("earth")} label="EARTH" glyph="earthWeather" color={N.green} />
          <PageTab on={page === "space"} onClick={() => setPage("space")} label="SPACE" glyph="spaceWeather" color={N.amber} />
        </div>
        <window.ABtn size="md">Live · ON</window.ABtn>
        <window.ABtn size="md" variant="primary">Apply influence</window.ABtn>
      </div>
    </div>
  );
}

function PageTab({ on, onClick, label, glyph, color }) {
  return (
    <div onClick={onClick} style={{
      padding: "8px 14px", background: on ? color : "transparent",
      color: on ? "#0c0d10" : N.muted,
      fontFamily: NF.display, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
      borderRight: `1px solid ${N.hair}`, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      <window.GlyphSigil glyph={glyph} size="sm" inline />
      {label}
    </div>
  );
}

function EarthWeatherBody() {
  const [layer, setLayer] = NUS("earthquake");
  const usgs = window.useUsgsQuakes();
  const features = usgs.data ? usgs.data.features : [];
  const maxMag = features.reduce((m, f) => Math.max(m, f.properties.mag || 0), 0);
  const m5plus = features.filter(f => (f.properties.mag || 0) >= 5).length;
  const recent = features
    .slice()
    .sort((a, b) => (b.properties.mag || 0) - (a.properties.mag || 0))
    .slice(0, 3)
    .map(f => [f.properties.place || "—", `M${(f.properties.mag || 0).toFixed(1)}`]);
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, flex: "0 0 auto" }}>
        <window.ACard title="Earth reference map" sub={`overlay · ${layer}`} pad={0}
          action={<LayerToggles layer={layer} setLayer={setLayer} />}>
          <window.EarthDsnMap
            weatherLayer={layer !== "earthquake" ? layer : null}
            earthquakes={layer === "earthquake"}
            quakeMinMag={0}
            satellites={[]} height={340} />
        </window.ACard>
        <window.ACard title="Ground corridor" sub="DSN exposure · live feed">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <window.AReadout label="CORRIDOR" value="Iberia → S-Atl" accent={N.blue} />
            <window.AReadout label="DSN EXP." value="12 / 18 min" accent={N.green} />
            <window.AReadout label="RAIN ATT." value="0.4 dB" />
            <window.AReadout label="WIND" value="22 km/h" />
          </div>
          <div style={{
            marginTop: 12, padding: 10, background: "#020308",
            border: `1px solid ${N.hair}`, borderRadius: 3,
            fontFamily: NF.mono, fontSize: 10.5, lineHeight: 1.55, color: N.text,
          }}>
            <div style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 11, color: "#5BF38A", letterSpacing: "0.14em", marginBottom: 4 }}>
              USGS · 地震 · ALL_DAY.GEOJSON
            </div>
            <div><span style={{ color: N.muted }}>endpoint</span> earthquake.usgs.gov</div>
            <div><span style={{ color: N.muted }}>feed</span> {features.length} events / 24h</div>
            <div><span style={{ color: N.muted }}>max mag</span> <span style={{ color: window.magColor(maxMag) }}>M{maxMag.toFixed(1)}</span> · {m5plus} M5+</div>
            <div><span style={{ color: N.muted }}>state</span> {usgs.live
              ? <span style={{ color: "#5BF38A" }}>LIVE · poll 60s</span>
              : <span style={{ color: N.muted }}>STATIC · fixture</span>}</div>
          </div>
          <div style={{ marginTop: 10, padding: 8, background: N.panelLo, border: `1px solid ${N.hair}`, borderRadius: 3 }}>
            <div style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 10, color: N.muted, letterSpacing: "0.16em", marginBottom: 4, textTransform: "uppercase" }}>Strongest 24h</div>
            {recent.map(([place, mag], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: NF.mono, fontSize: 10, padding: "2px 0", borderBottom: i < recent.length - 1 ? `1px dashed ${N.hair}` : "none" }}>
                <span style={{ color: N.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{place}</span>
                <span style={{ color: window.magColor(parseFloat(mag.slice(1))), fontWeight: 600 }}>{mag}</span>
              </div>
            ))}
          </div>
        </window.ACard>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1, minHeight: 0 }}>
        <WeatherReport title="Rain / storms" state="live"   accent="blue"  rows={[["Iberia", "light · 0.4 dB"], ["S-Atl", "scatter"], ["Pacific", "clear"]]} />
        <WeatherReport title="Typhoon-ready" state="live"   accent="red"   rows={[["T07 · Phoenix", "cat 3 · NW"], ["T09 · Halcyon", "forming"], ["Indian O.", "clear"]]} />
        <WeatherReport title="Earthquakes · USGS"
          state={usgs.live ? "live" : "cached"}
          accent={maxMag >= 7 ? "red" : maxMag >= 6 ? "amber" : "green"}
          rows={[
            ["events / 24h", String(features.length)],
            ["max mag", `M${maxMag.toFixed(1)}`],
            ["M5+", String(m5plus)],
          ]} />
        <WeatherReport title="Source status" state="ok"     accent="green" rows={[["GFS", "live"], ["NOAA", "live"], ["USGS", usgs.live ? "live" : "cached"]]} />
      </div>
    </>
  );
}

function LayerToggles({ layer, setLayer }) {
  const layers = [
    { id: "earthquake", label: "quakes",  c: "green" },
    { id: "rain",       label: "rain",    c: "blue" },
    { id: "storm",      label: "storm",   c: "amber" },
    { id: "typhoon",    label: "typhoon", c: "red" },
  ];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {layers.map(l => (
        <window.ABtn key={l.id} size="sm" variant={layer === l.id ? "primary" : "ghost"} onClick={() => setLayer(l.id)}>
          {l.label}
        </window.ABtn>
      ))}
    </div>
  );
}

function WeatherReport({ title, state, accent, rows }) {
  return (
    <window.ACard title={title} sub={state} dense
      action={<window.ATag color={accent} filled>{state.toUpperCase()}</window.ATag>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: NF.mono, fontSize: 10 }}>
            <span style={{ color: N.muted }}>{k}</span>
            <span style={{ color: N.text }}>{v}</span>
          </div>
        ))}
      </div>
    </window.ACard>
  );
}

function SpaceWeatherBody() {
  const [evt, setEvt] = NUS("CME");
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, flex: "0 0 auto" }}>
        <window.ACard title="Space reference map" sub={`event · ${evt}`} pad={0}
          action={<>
            <window.ABtn size="sm">Live</window.ABtn>
            <window.ABtn size="sm">Cached</window.ABtn>
          </>}>
          <window.SpaceWeatherMap selectedEvent={evt} onSelect={setEvt} height={320} />
        </window.ACard>
        <window.NarrativeSignalDraft
          phase="Approach burn"
          flight="Lunar flyby · 0.62×"
          comms="DSN MAD · S-band"
          earth="rain · Iberia · light"
          space="CME front · ramp_up · 0.62"
          suggested="ship channel gets scintillation depth +0.20, granular drop +0.08; capcom channel tightens voice band (HP +20 Hz) to push through ionospheric blur."
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1, minHeight: 0 }}>
        <WeatherReport title="Solar flare"        state="live"   accent="amber" rows={[["X1.2", "14m ago"], ["region 3987", "active"], ["next 24h", "M-class likely"]]} />
        <WeatherReport title="Ionosphere"         state="live"   accent="blue"  rows={[["S4 index", "0.71"], ["f0F2", "boosted"], ["TEC", "+18 TECU"]]} />
        <WeatherReport title="Magnetic storm"     state="live"   accent="amber" rows={[["Kp", "6.3"], ["disturbed", "yes"], ["Dst", "-89 nT"]]} />
        <WeatherReport title="Affected DSP"       state="ready"  accent="copper" rows={[["scint depth", "+0.20"], ["granular drop", "+0.08"], ["voice HP", "+20 Hz"]]} />
      </div>
    </>
  );
}
