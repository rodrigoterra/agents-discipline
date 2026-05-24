// ALPHA2 — interactive maps · rebuilt on alpha2-geo.jsx.
// EarthDsnMap (MC + COMMS + Earth Weather) · LiveOrbitMap (Flight) ·
// SpaceWeatherMap (Space Weather). All Natural-Earth backed,
// satellite-track aware, sidecar-aware with offline fixtures.

const M = A.T, MF = A.F;
const MUS = React.useState;

// ─────────────────────────────────────────────────────────
// lon/lat → x/y at any map size (delegates to geo.jsx)
// ─────────────────────────────────────────────────────────
function geo(lon, lat, W, H) { return window.geoProject(lon, lat, W || 600, H || 280); }

// ─────────────────────────────────────────────────────────
// DSN stations (real-ish lat/lon)
// ─────────────────────────────────────────────────────────
const DSN_STATIONS = [
  { id: "GDS", name: "Goldstone",  lat: 35.4,  lon: -116.9, az: "215°", el: "42°", power: "20 kW", freq: "8.4 GHz", state: "uplink",  flag: "USA", jp: "ゴールドストーン" },
  { id: "MAD", name: "Madrid",     lat: 40.4,  lon: -4.2,   az: "168°", el: "61°", power: "20 kW", freq: "8.4 GHz", state: "active",  flag: "ESP", jp: "マドリード" },
  { id: "CAN", name: "Canberra",   lat: -35.4, lon: 148.9,  az: "298°", el: "28°", power: "20 kW", freq: "8.4 GHz", state: "standby", flag: "AUS", jp: "キャンベラ" },
];

// ═════════════════════════════════════════════════════════════════════════════
// 1 · EARTH + DSN MAP
// Natural Earth base + DSN markers + optional satellite-track layer +
// optional weather layer + optional satellite-tiles backdrop.
// ═════════════════════════════════════════════════════════════════════════════
window.EarthDsnMap = function EarthDsnMap({
  selectable = true,
  selectedId,
  onSelect,
  showCorridor = true,
  weatherLayer = null,
  satellites = [],
  satelliteTiles = false,        // initial tile mode
  initialProvider = "nasa",      // "nasa" | "google" | "google-hybrid" | "esri"
  dayNight = false,
  earthquakes = false,
  quakeMinMag = 0,
  showProviderSwitch = true,
  height = 320,
}) {
  const [hover, setHover] = MUS(null);
  const [internalSelected, setInternalSelected] = MUS(selectedId || "MAD");
  const [focusedQuake, setFocusedQuake] = MUS(null);
  const [satOn, setSatOn] = MUS(satelliteTiles);
  const [provider, setProvider] = MUS(initialProvider);
  const [minMag, setMinMag] = MUS(quakeMinMag);
  const active = selectedId || internalSelected;
  const usgs = window.useUsgsQuakes();

  function pick(id) {
    if (!selectable) return;
    if (onSelect) onSelect(id);
    else setInternalSelected(id);
  }

  const W = 720, H = 360;

  return (
    <div style={{ position: "relative", height, background: "#02040a", border: `1px solid ${M.hair}`, borderRadius: 3, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        <window.NaturalEarthMap width={W} height={H} satelliteTiles={satOn} tileProvider={provider} dayNight={dayNight} />
        {weatherLayer && <WeatherOverlay layer={weatherLayer} W={W} H={H} />}
        {satellites.map(alias => (
          <window.SatelliteTrackLayer key={alias} alias={alias} width={W} height={H} />
        ))}
        {earthquakes && usgs.data && (
          <window.EarthquakeLayer feed={usgs.data} width={W} height={H}
            minMag={minMag} focus={focusedQuake} onPick={setFocusedQuake} />
        )}
        {showCorridor && <DSNCorridor stations={DSN_STATIONS} W={W} H={H} />}
        {DSN_STATIONS.map(s => (
          <DSNMarker key={s.id} station={s} active={s.id === active}
            hover={hover === s.id} onHover={setHover} onClick={pick} W={W} H={H} />
        ))}
        <ShipMarker lon={-150} lat={-15} W={W} H={H} />
      </svg>
      {showProviderSwitch && <ProviderSwitch satOn={satOn} setSatOn={setSatOn} provider={provider} setProvider={setProvider} />}
      {earthquakes ? (
        <QuakeLegend live={usgs.live}
          count={usgs.data ? usgs.data.features.length : 0}
          minMag={minMag} setMinMag={setMinMag} />
      ) : (
        <MapLegend title="EARTH · DSN · 地球" lines={[
          { c: M.copper, label: "DSN ACTIVE" },
          { c: M.green,  label: "UPLINK" },
          { c: M.amber,  label: "STANDBY" },
          { c: M.blue,   label: "SHIP" },
        ]} />
      )}
      {earthquakes && focusedQuake
        ? <QuakeCard q={focusedQuake} />
        : <DSNCard station={DSN_STATIONS.find(s => s.id === active)} />}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Vector / Satellite toggle + provider cycle (top-left corner)
// ─────────────────────────────────────────────────────────
const PROVIDERS = [
  { id: "nasa",          label: "BLUE MARBLE", jp: "ブルーマーブル" },
  { id: "google",        label: "GOOGLE SAT",  jp: "グーグル衛星" },
  { id: "google-hybrid", label: "GOOGLE HYBRID", jp: "ハイブリッド" },
  { id: "esri",          label: "ESRI WORLD",  jp: "ESRI" },
];

function ProviderSwitch({ satOn, setSatOn, provider, setProvider }) {
  return (
    <div style={{
      position: "absolute", top: 8, left: 8,
      padding: "6px 8px", background: "rgba(4,6,10,0.85)",
      border: `1px solid ${M.hair}`, borderRadius: 3,
      fontFamily: MF.mono, fontSize: 9, color: M.text,
      minWidth: 130,
    }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        <div onClick={() => setSatOn(false)} style={{
          flex: 1, padding: "3px 6px",
          background: !satOn ? "#7ad99a" : "transparent",
          color: !satOn ? "#0c0d10" : M.muted,
          border: `1px solid ${M.hair}`, cursor: "pointer",
          fontFamily: "HaxrCorp4089, monospace", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase",
          textAlign: "center",
        }}>Vector</div>
        <div onClick={() => setSatOn(true)} style={{
          flex: 1, padding: "3px 6px",
          background: satOn ? "#7ad99a" : "transparent",
          color: satOn ? "#0c0d10" : M.muted,
          border: `1px solid ${M.hair}`, cursor: "pointer",
          fontFamily: "HaxrCorp4089, monospace", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase",
          textAlign: "center",
        }}>Satellite</div>
      </div>
      {satOn && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          {PROVIDERS.map(p => (
            <div key={p.id} onClick={() => setProvider(p.id)} style={{
              padding: "2px 4px", cursor: "pointer",
              fontFamily: "HelvB08, monospace", fontSize: 9, letterSpacing: "0.06em",
              color: provider === p.id ? "#7ad99a" : M.muted,
              border: `1px solid ${provider === p.id ? "#7ad99a" : M.hair}`,
              flexBasis: "calc(50% - 2px)", textAlign: "center", textTransform: "uppercase",
            }}>{p.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuakeLegend({ live, count, minMag, setMinMag }) {
  const tiers = [
    { min: 0, label: "ALL",       c: "#54E5FF" },
    { min: 3, label: "M3+ · NOTE", c: "#5BF38A" },
    { min: 5, label: "M5+ · STR",  c: "#FFB547" },
    { min: 6, label: "M6+ · MAJ",  c: "#FF8A3D" },
    { min: 7, label: "M7+ · CRIT", c: "#FF4D5E" },
  ];
  return (
    <div style={{
      position: "absolute", top: 8, right: 8,
      padding: "6px 10px", background: "rgba(4,6,10,0.88)",
      border: `1px solid ${M.hair}`, borderRadius: 3,
      fontFamily: MF.mono, fontSize: 9, color: M.text,
      minWidth: 158,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, marginBottom: 4 }}>
        <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 11, color: "#5BF38A", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          USGS · 地震
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#5BF38A" : M.muted,
            boxShadow: live ? `0 0 4px #5BF38A` : "none" }} />
          <span style={{ fontFamily: "HelvB08, monospace", fontSize: 9, letterSpacing: "0.1em", color: live ? "#5BF38A" : M.muted }}>
            {live ? "LIVE" : "STATIC"}
          </span>
        </span>
      </div>
      <div style={{ fontFamily: "HelvB08, monospace", fontSize: 9, color: M.muted, marginBottom: 4, letterSpacing: "0.08em" }}>
        {count} events · last 24h · poll 60s
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {tiers.map(t => {
          const on = minMag === t.min;
          return (
            <div key={t.min} onClick={() => setMinMag && setMinMag(t.min)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "2px 4px", border: `1px solid ${on ? t.c : "transparent"}`,
              cursor: setMinMag ? "pointer" : "default",
              background: on ? `${t.c}22` : "transparent",
            }}>
              <span style={{ width: 8, height: 8, background: t.c, display: "inline-block", borderRadius: "50%", boxShadow: `0 0 4px ${t.c}` }} />
              <span style={{ color: on ? t.c : M.muted, fontFamily: "HelvB08, monospace", fontSize: 9, letterSpacing: "0.08em" }}>{t.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuakeCard({ q }) {
  const [lon, lat, depth] = q.geometry.coordinates;
  const mag = q.properties.mag;
  const c = window.magColor(mag);
  const tier = window.magTier(mag);
  const ago = Math.round((Date.now() - q.properties.time) / 60000);
  return (
    <div style={{
      position: "absolute", left: 10, bottom: 10,
      padding: 10, background: "#04060a",
      border: `1px solid ${c}55`, borderLeft: `2px solid ${c}`,
      borderRadius: 3, minWidth: 240,
      fontFamily: MF.mono, fontSize: 10, lineHeight: 1.55, color: M.text,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 14, color: c, letterSpacing: "0.06em" }}>
          M{mag.toFixed(1)}
        </span>
        <span style={{ fontFamily: "HelvB08, monospace", fontSize: 9, color: c, letterSpacing: "0.18em" }}>{tier}</span>
      </div>
      <div style={{ color: M.text, marginBottom: 4 }}>{q.properties.place}</div>
      <div><span style={{ color: M.muted }}>coord</span> {lat.toFixed(2)}°{lat >= 0 ? "N" : "S"} · {lon.toFixed(2)}°{lon >= 0 ? "E" : "W"}</div>
      <div><span style={{ color: M.muted }}>depth</span> {Math.round(depth)} km {depth < 35 ? <span style={{ color: c }}>· shallow</span> : null}</div>
      <div><span style={{ color: M.muted }}>{ago < 60 ? `${ago}m ago` : `${Math.round(ago/60)}h ago`}</span></div>
    </div>
  );
}

function DSNMarker({ station, active, hover, onHover, onClick, W, H }) {
  const [x, y] = window.geoProject(station.lon, station.lat, W, H);
  const stateColor = station.state === "uplink" ? M.green
    : station.state === "active" ? M.copper : M.amber;
  return (
    <g style={{ cursor: "pointer" }}
       onMouseEnter={() => onHover(station.id)}
       onMouseLeave={() => onHover(null)}
       onClick={() => onClick(station.id)}>
      {active && (
        <g opacity="0.5">
          <circle cx={x} cy={y} r="14" fill="none" stroke={stateColor} strokeWidth="0.6" strokeDasharray="2 3">
            <animate attributeName="r" from="14" to="34" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.55" to="0" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
      <circle cx={x} cy={y} r={active ? 16 : 11} fill="none" stroke={stateColor}
        strokeWidth={active ? 1.4 : 0.8} opacity={hover || active ? 0.9 : 0.5} />
      <rect x={x - 4} y={y - 4} width="8" height="8"
        fill={active || hover ? stateColor : "#02040a"}
        stroke={stateColor} strokeWidth="1" />
      <text x={x} y={y + 18} textAnchor="middle"
        fill={active ? stateColor : M.muted}
        fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.08em">{station.id}</text>
      {hover && !active && (
        <text x={x} y={y - 10} textAnchor="middle" fill={M.text}
          fontFamily="HelvB08, monospace" fontSize="9">{station.name}</text>
      )}
    </g>
  );
}

function ShipMarker({ lon, lat, W, H }) {
  const [x, y] = window.geoProject(lon, lat, W, H);
  return (
    <g>
      <circle cx={x} cy={y} r="13" fill="none" stroke={M.blue} strokeOpacity="0.45" strokeDasharray="2 3" />
      <polygon points={`${x - 4},${y + 4} ${x},${y - 6} ${x + 4},${y + 4} ${x},${y + 2}`} fill={M.blue} />
      <text x={x + 10} y={y + 3} fill={M.blue} fontFamily="HaxrCorp4089, monospace" fontSize="10" letterSpacing="0.06em">SHIP</text>
    </g>
  );
}

function DSNCorridor({ stations, W, H }) {
  const pts = stations.map(s => window.geoProject(s.lon, s.lat, W, H));
  return (
    <g opacity="0.35">
      <polyline
        points={pts.map(p => p.join(",")).join(" ")}
        fill="none" stroke={M.copper} strokeWidth="0.6" strokeDasharray="3 4"
      />
    </g>
  );
}

function DSNCard({ station }) {
  if (!station) return null;
  const stateColor = station.state === "uplink" ? M.green
    : station.state === "active" ? M.copper : M.amber;
  return (
    <div style={{
      position: "absolute", left: 10, bottom: 10,
      padding: 10, background: "#04060a",
      border: `1px solid ${stateColor}55`, borderLeft: `2px solid ${stateColor}`,
      borderRadius: 3, minWidth: 220,
      fontFamily: MF.mono, fontSize: 10, lineHeight: 1.5, color: M.text,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 12, color: stateColor, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {station.id} · {station.name}
        </span>
        <span style={{ color: M.muted, fontFamily: "HelvB08, monospace", fontSize: 8, letterSpacing: "0.18em" }}>{station.flag}</span>
      </div>
      <div style={{ color: M.muted, fontFamily: "HelvB08, monospace", fontSize: 9, marginBottom: 4 }}>{station.jp}</div>
      <div><span style={{ color: M.muted }}>state</span> <span style={{ color: stateColor }}>{station.state}</span></div>
      <div><span style={{ color: M.muted }}>az / el</span> {station.az} · {station.el}</div>
      <div><span style={{ color: M.muted }}>freq</span> {station.freq}</div>
      <div><span style={{ color: M.muted }}>power</span> {station.power}</div>
    </div>
  );
}

function MapLegend({ title, lines }) {
  return (
    <div style={{
      position: "absolute", top: 8, right: 8,
      padding: "6px 10px", background: "rgba(4,6,10,0.85)",
      border: `1px solid ${M.hair}`, borderRadius: 3,
      fontFamily: MF.mono, fontSize: 9, color: M.text,
    }}>
      <div style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 10, color: M.copper, letterSpacing: "0.12em", marginBottom: 3, textTransform: "uppercase" }}>
        {title}
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <span style={{ width: 8, height: 8, background: l.c, display: "inline-block", borderRadius: 1 }} />
          <span style={{ color: M.muted, fontFamily: "HelvB08, monospace", fontSize: 9, letterSpacing: "0.08em" }}>{l.label}</span>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · LIVE ORBIT MAP — Natural Earth + multi-sat tracks (Flight)
// Equivalent of apps/web/src/space/LiveOrbitView.tsx
// ═════════════════════════════════════════════════════════════════════════════
window.LiveOrbitMap = function LiveOrbitMap({
  initialTracked = ["ISS", "TERRA"],
  satelliteTiles = false,
  dayNight = true,
  height = 360,
}) {
  const [tracked, setTracked] = MUS(new Set(initialTracked));
  const [hover, setHover] = MUS(null);
  const health = window.useSidecarHealth();
  const W = 720, H = 360;

  function toggle(alias) {
    setTracked(curr => {
      const next = new Set(curr);
      if (next.has(alias)) next.delete(alias);
      else next.add(alias);
      return next;
    });
  }

  return (
    <div style={{ position: "relative", height, background: "#02040a", border: `1px solid ${M.hair}`, borderRadius: 3, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        <window.NaturalEarthMap width={W} height={H} satelliteTiles={satelliteTiles} dayNight={dayNight} />
        {/* tracked satellites get tracks + footprints */}
        {Array.from(tracked).map(alias => (
          <window.SatelliteTrackLayer key={alias} alias={alias} width={W} height={H} showFootprint />
        ))}
        {/* untracked satellites just show their current position as a small dot */}
        {window.SAT_CATALOG.filter(s => !tracked.has(s.alias)).map(s => {
          const fb = window.getSatFixture(s.alias);
          const [x, y] = window.geoProject(fb.subpoint[0], fb.subpoint[1], W, H);
          const h = hover === s.alias;
          return (
            <g key={s.alias} style={{ cursor: "pointer" }}
               onMouseEnter={() => setHover(s.alias)}
               onMouseLeave={() => setHover(null)}
               onClick={() => toggle(s.alias)}>
              <circle cx={x} cy={y} r={h ? 4 : 2.5} fill="#ffb066" stroke="#1a0c00" strokeWidth="0.4" />
              {h && (
                <text x={x + 6} y={y - 4} fill="#ffb066"
                  fontFamily="HaxrCorp4089, monospace" fontSize="9" letterSpacing="0.06em">{s.alias}</text>
              )}
            </g>
          );
        })}
      </svg>
      <OrbitHud tracked={tracked} setTracked={setTracked} live={health.data && health.data.ok} />
    </div>
  );
};

function OrbitHud({ tracked, setTracked, live }) {
  return (
    <div style={{
      position: "absolute", top: 8, right: 8,
      padding: "6px 10px", background: "rgba(4,6,10,0.88)",
      border: `1px solid ${M.hair}`, borderRadius: 3,
      fontFamily: MF.mono, fontSize: 9, color: M.text,
      maxWidth: 220,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 11, color: M.copper, letterSpacing: "0.14em" }}>
          LIVE ORBIT · 軌道
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? M.green : M.muted,
            boxShadow: live ? `0 0 4px ${M.green}` : "none" }} />
          <span style={{ fontFamily: "HelvB08, monospace", fontSize: 9, color: live ? M.green : M.muted, letterSpacing: "0.1em" }}>
            {live ? "SIDECAR" : "STATIC"}
          </span>
        </span>
      </div>
      <div style={{ fontFamily: "HelvB08, monospace", fontSize: 9, color: M.muted, marginBottom: 4, letterSpacing: "0.08em" }}>
        click sat · toggle track
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
        {window.SAT_CATALOG.map(s => {
          const on = tracked.has(s.alias);
          const c = window.colorForSat(s.alias);
          return (
            <div key={s.alias}
              onClick={() => {
                setTracked(curr => {
                  const next = new Set(curr);
                  if (next.has(s.alias)) next.delete(s.alias);
                  else next.add(s.alias);
                  return next;
                });
              }}
              style={{
                padding: "2px 4px", border: `1px solid ${on ? c : M.hair}`,
                background: on ? c + "22" : "transparent", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
              <span style={{ width: 6, height: 6, background: c, borderRadius: 1 }} />
              <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 9, color: on ? c : M.text, letterSpacing: "0.06em" }}>{s.alias}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 4, fontFamily: "HelvB08, monospace", fontSize: 9, color: M.muted, letterSpacing: "0.08em" }}>
        {tracked.size} / {window.SAT_CATALOG.length} tracked · 95m · 30s step
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · MISSION TRAJECTORY (Earth ↔ Moon arc) — small inset for Flight
// Keeps the old Earth-Moon waypoint visualisation alongside LiveOrbitMap.
// ═════════════════════════════════════════════════════════════════════════════
window.MissionTrajectory = function MissionTrajectory({ height = 220, selectedWaypoint, onSelect }) {
  const [hover, setHover] = MUS(null);
  const [sel, setSel] = MUS(selectedWaypoint || "W3");
  const waypoints = [
    { id: "W0", angle: -170, label: "LEO insertion",    t: "T+00:00", state: "done" },
    { id: "W1", angle: -120, label: "TLI burn",         t: "T+00:48", state: "done" },
    { id: "W2", angle: -60,  label: "Midcourse",        t: "T+12:14", state: "done" },
    { id: "W3", angle: -20,  label: "Approach burn",    t: "T+01:36", state: "active" },
    { id: "W4", angle: 20,   label: "Lunar orbit ins.", t: "T+02:01", state: "pending" },
    { id: "W5", angle: 90,   label: "Far-side LOS",     t: "T+02:48", state: "pending" },
    { id: "W6", angle: 160,  label: "Re-acquire DSN",   t: "T+03:24", state: "pending" },
  ];
  function pick(id) { onSelect ? onSelect(id) : setSel(id); }
  const active = sel;
  return (
    <div style={{ position: "relative", height, background: "radial-gradient(circle at 30% 50%, #050912 0%, #02040a 70%)", border: `1px solid ${M.hair}`, borderRadius: 3, overflow: "hidden" }}>
      <svg viewBox="-300 -160 600 320" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        {STAR_DOTS.map((s, i) => <circle key={i} cx={s[0]} cy={s[1]} r={s[2]} fill={M.text} opacity={s[2] * 0.4} />)}
        <g transform="translate(-180, 0)">
          <circle r="48" fill="#0a3550" stroke={M.blue} strokeWidth="0.8" />
          <path d="M -36 -8 q 10 -14 24 -6 q 16 -8 32 0 q 6 12 -8 16 q -20 8 -32 -2 q -12 0 -16 -8 Z" fill={M.green} opacity="0.7" />
          <text x="0" y="62" textAnchor="middle" fill={M.blue} fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.18em">EARTH · 地球</text>
        </g>
        <g transform="translate(170, 0)">
          <circle r="24" fill="#1a1a1a" stroke={M.muted} strokeWidth="0.6" />
          <circle r="3" cx="-8" cy="-6" fill="#000" opacity="0.4" />
          <circle r="2" cx="6" cy="4" fill="#000" opacity="0.5" />
          <text x="0" y="38" textAnchor="middle" fill={M.muted} fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.18em">MOON · 月</text>
        </g>
        <g transform="translate(-5, 0)">
          <ellipse cx="0" cy="0" rx="200" ry="110" fill="none" stroke={M.copper} strokeOpacity="0.5"
            strokeWidth="0.8" strokeDasharray="4 5" />
          {waypoints.map(w => {
            const rad = w.angle * Math.PI / 180;
            const x = Math.cos(rad) * 200;
            const y = Math.sin(rad) * 110;
            return <OrbitWaypoint key={w.id} w={w} x={x} y={y}
              active={w.id === active}
              hover={hover === w.id}
              onHover={setHover}
              onClick={pick} />;
          })}
          {(() => {
            const w = waypoints.find(x => x.id === active);
            if (!w) return null;
            const rad = w.angle * Math.PI / 180;
            const x = Math.cos(rad) * 200;
            const y = Math.sin(rad) * 110;
            return (
              <g transform={`translate(${x} ${y})`}>
                <polygon points="-6,4 0,-8 6,4 0,2" fill={M.copper} />
                <circle r="14" fill="none" stroke={M.copper} strokeWidth="0.6" strokeDasharray="2 3" />
              </g>
            );
          })()}
        </g>
      </svg>
      <OrbitDetailCard wp={waypoints.find(w => w.id === active)} />
    </div>
  );
};

const STAR_DOTS = Array.from({ length: 90 }, (_, i) => {
  const x = ((i * 137.5) % 600) - 300;
  const y = ((i * 73.3) % 320) - 160;
  const s = 0.3 + ((i * 7) % 8) * 0.18;
  return [x, y, s];
});

function OrbitWaypoint({ w, x, y, active, hover, onHover, onClick }) {
  const c = w.state === "done" ? M.green : w.state === "active" ? M.copper : M.muted;
  return (
    <g style={{ cursor: "pointer" }}
       onMouseEnter={() => onHover(w.id)}
       onMouseLeave={() => onHover(null)}
       onClick={() => onClick(w.id)}>
      <circle cx={x} cy={y} r={active ? 8 : 5} fill={c} opacity={hover || active ? 1 : 0.6} />
      <circle cx={x} cy={y} r="11" fill="none" stroke={c} strokeOpacity={hover || active ? 0.8 : 0.2} />
      <text x={x} y={y - 14} textAnchor="middle" fill={c} fontFamily="HaxrCorp4089, monospace" fontSize="10">{w.id}</text>
      {(hover || active) && (
        <text x={x} y={y + 22} textAnchor="middle" fill={M.text} fontFamily="HelvB08, monospace" fontSize="9">{w.label}</text>
      )}
    </g>
  );
}

function OrbitDetailCard({ wp }) {
  if (!wp) return null;
  const c = wp.state === "done" ? M.green : wp.state === "active" ? M.copper : M.muted;
  return (
    <div style={{
      position: "absolute", left: 10, bottom: 10,
      padding: 10, background: "#04060a",
      border: `1px solid ${c}55`, borderLeft: `2px solid ${c}`,
      borderRadius: 3, minWidth: 220,
      fontFamily: MF.mono, fontSize: 10, lineHeight: 1.5, color: M.text,
    }}>
      <div style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 11, color: c, letterSpacing: "0.12em", marginBottom: 4 }}>
        {wp.id} · {wp.label}
      </div>
      <div><span style={{ color: M.muted }}>state</span> {wp.state}</div>
      <div><span style={{ color: M.muted }}>met</span> {wp.t}</div>
      <div><span style={{ color: M.muted }}>delta-v</span> 14.2 m/s</div>
    </div>
  );
}

// Back-compat: alpha2-narrative imports OrbitView. Re-export as the live map.
window.OrbitView = window.LiveOrbitMap;

// ═════════════════════════════════════════════════════════════════════════════
// 4 · WEATHER OVERLAYS (used on Earth Weather)
// ═════════════════════════════════════════════════════════════════════════════
function WeatherOverlay({ layer, W, H }) {
  W = W || 720; H = H || 360;
  if (layer === "rain") {
    const spots = [[-3, 40], [3, 45], [-8, 38], [10, 42]];
    return (
      <g opacity="0.75">
        {spots.map(([lon, lat], i) => {
          const [x, y] = window.geoProject(lon, lat, W, H);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="14" fill={M.blue} opacity="0.18" />
              <text x={x} y={y + 4} textAnchor="middle" fill={M.blue} fontFamily="HaxrCorp4089, monospace" fontSize="11">▒▒</text>
            </g>
          );
        })}
      </g>
    );
  }
  if (layer === "storm") {
    const spots = [[-90, 30], [40, 35], [120, 25]];
    return (
      <g opacity="0.85">
        {spots.map(([lon, lat], i) => {
          const [x, y] = window.geoProject(lon, lat, W, H);
          return (
            <g key={i}>
              <path d={`M ${x - 6} ${y} l 4 4 l -2 4 l 6 -2 l 2 -6 l -4 -2 z`} fill={M.amber} />
              <circle cx={x} cy={y} r="20" fill={M.amber} opacity="0.15" />
            </g>
          );
        })}
      </g>
    );
  }
  if (layer === "typhoon") {
    const [x, y] = window.geoProject(132, 18, W, H); // mid-Pacific
    return (
      <g>
        <g transform={`translate(${x} ${y})`} opacity="0.92">
          <circle r="22" fill="none" stroke={M.red} strokeWidth="1" />
          {[0, 1, 2, 3].map(i => (
            <path key={i} d="M 0 0 q 8 -4 16 4" fill="none" stroke={M.red} strokeWidth="1.2" transform={`rotate(${i * 90})`} />
          ))}
          <circle r="3" fill={M.red} />
          <text x="0" y="36" textAnchor="middle" fill={M.red} fontFamily="HaxrCorp4089, monospace" fontSize="10">T07</text>
        </g>
      </g>
    );
  }
  if (layer === "earthquake") {
    const spots = [[-72, -33, 4.3], [140, 38, 5.4], [-3, 40, 4.1]];
    return (
      <g>
        {spots.map(([lon, lat, mag], i) => {
          const [x, y] = window.geoProject(lon, lat, W, H);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill={M.red} opacity="0.7" />
              <circle cx={x} cy={y} r="14" fill="none" stroke={M.red} strokeOpacity="0.5" />
              <circle cx={x} cy={y} r="22" fill="none" stroke={M.red} strokeOpacity="0.25" />
              <text x={x} y={y - 26} textAnchor="middle" fill={M.red} fontFamily="HaxrCorp4089, monospace" fontSize="10">M{mag}</text>
            </g>
          );
        })}
      </g>
    );
  }
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · SPACE WEATHER MAP (solar system inset — separate vocabulary)
// ═════════════════════════════════════════════════════════════════════════════
const SPACE_EVENTS = [
  { id: "FLR", label: "Solar flare · X1.2",        x: -180, y: 0,   color: "amber",  desc: "X-class flare, 14m ago" },
  { id: "CME", label: "CME front · ramp_up",        x: -40,  y: 20,  color: "red",    desc: "front 0.62, arrives ~T+18m" },
  { id: "ION", label: "Ionosphere · disturbed",     x: 140,  y: 0,   color: "blue",   desc: "f0F2 boosted, S4 = 0.71" },
  { id: "BLK", label: "Blackout cone · S band",     x: 200,  y: -40, color: "red",    desc: "S-band attenuation 12 dB" },
  { id: "MAG", label: "Magnetic anomaly cluster",   x: 100,  y: 50,  color: "amber",  desc: "Kp = 6.3 disturbed" },
];

window.SpaceWeatherMap = function SpaceWeatherMap({
  height = 320,
  selectedEvent,
  onSelect,
}) {
  const [hover, setHover] = MUS(null);
  const [sel, setSel] = MUS(selectedEvent || "CME");
  const active = selectedEvent || sel;

  function pick(id) { onSelect ? onSelect(id) : setSel(id); }

  return (
    <div style={{ position: "relative", height,
      background: "radial-gradient(ellipse at 12% 50%, #2a1a08 0%, #050912 35%, #02040a 80%)",
      border: `1px solid ${M.hair}`, borderRadius: 3, overflow: "hidden" }}>
      <svg viewBox="-280 -130 560 260" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        {STAR_DOTS.slice(0, 50).map((s, i) => (
          <circle key={i} cx={s[0]} cy={s[1]} r={s[2]} fill={M.text} opacity={s[2] * 0.3} />
        ))}
        <g transform="translate(-220, 0)">
          {Array.from({ length: 18 }, (_, i) => {
            const a = (i / 18) * Math.PI * 2;
            const r1 = 36, r2 = 46 + ((i * 7) % 8);
            return (
              <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1}
                    x2={Math.cos(a) * r2} y2={Math.sin(a) * r2}
                    stroke={M.amber} strokeWidth="1.2" opacity="0.7" />
            );
          })}
          <circle r="34" fill={M.amber} opacity="0.92" />
          <circle r="34" fill={M.copper} opacity="0.55" />
          <path d="M 24 -20 q 30 -10 50 -36" fill="none" stroke={M.copper} strokeWidth="1.4" opacity="0.9" />
          <polygon points="74,-56 80,-44 64,-50" fill={M.copper} />
          <text x="0" y="58" textAnchor="middle" fill={M.amber} fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.22em">SUN · 太陽</text>
        </g>
        {[-70, -40, -10, 20, 50].map(yOff => (
          <g key={yOff} opacity="0.45">
            <line x1="-170" y1={yOff} x2="-30" y2={yOff + (yOff > 0 ? 4 : -4)} stroke={M.amber} strokeWidth="0.7" strokeDasharray="3 4" />
            <polygon points={`-30,${yOff + (yOff > 0 ? 4 : -4)} -38,${yOff + (yOff > 0 ? 0 : -8)} -38,${yOff + (yOff > 0 ? 8 : 0)}`} fill={M.amber} />
          </g>
        ))}
        <path d="M -120 -80 q 30 80 0 160" fill={M.red} opacity="0.12" />
        <path d="M -120 -80 q 30 80 0 160" fill="none" stroke={M.red} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.7" />
        <g transform="translate(140, 0)">
          <circle r="28" fill="#0a3550" stroke={M.blue} strokeWidth="0.6" />
          <path d="M -22 -4 q 10 -8 24 0 q -10 8 -24 0" fill={M.green} opacity="0.7" />
          <path d="M -38 -28 q -40 28 0 56" fill="none" stroke={M.blue} strokeWidth="0.7" strokeOpacity="0.55" strokeDasharray="2 4" />
          <path d="M 38 -28 q 80 28 0 56" fill="none" stroke={M.blue} strokeWidth="0.7" strokeOpacity="0.55" strokeDasharray="2 4" />
          <text x="0" y="44" textAnchor="middle" fill={M.blue} fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.22em">EARTH · 地球</text>
        </g>
        <g transform="translate(220, -30)">
          <polygon points="-6,4 0,-8 6,4 0,2" fill={M.copper} />
          <text x="0" y="20" textAnchor="middle" fill={M.copper} fontFamily="HaxrCorp4089, monospace" fontSize="10">SHIP</text>
        </g>
        <path d="M 168 -28 L 240 -68 L 240 -10 Z" fill={M.red} opacity="0.18" />
        <path d="M 168 -28 L 240 -68 L 240 -10 Z" fill="none" stroke={M.red} strokeWidth="0.7" strokeDasharray="2 3" />
        {SPACE_EVENTS.map(e => (
          <SpaceEventMarker key={e.id} e={e} active={e.id === active} hover={hover === e.id}
            onHover={setHover} onClick={pick} />
        ))}
      </svg>
      <MapLegend title="SPACE WX · 宇宙天気" lines={[
        { c: M.amber, label: "FLARE · CORONA" },
        { c: M.red,   label: "CME · BLACKOUT" },
        { c: M.blue,  label: "IONOSPHERE" },
      ]} />
      <SpaceEventCard e={SPACE_EVENTS.find(x => x.id === active)} />
    </div>
  );
};

function SpaceEventMarker({ e, active, hover, onHover, onClick }) {
  const c = M[e.color] || M.amber;
  return (
    <g style={{ cursor: "pointer" }}
       onMouseEnter={() => onHover(e.id)}
       onMouseLeave={() => onHover(null)}
       onClick={() => onClick(e.id)}>
      <rect x={e.x - 6} y={e.y - 6} width="12" height="12"
        fill={active || hover ? c : "transparent"}
        stroke={c} strokeWidth={active ? 1.6 : 1}
        opacity="0.95" />
      <text x={e.x} y={e.y - 12} textAnchor="middle"
        fill={c} fontFamily="HaxrCorp4089, monospace" fontSize="10"
        opacity={hover || active ? 1 : 0.7}>{e.id}</text>
      {(hover || active) && (
        <text x={e.x + 10} y={e.y + 4}
          fill={M.text} fontFamily="HelvB08, monospace" fontSize="9">{e.label}</text>
      )}
    </g>
  );
}

function SpaceEventCard({ e }) {
  if (!e) return null;
  const c = M[e.color] || M.amber;
  return (
    <div style={{
      position: "absolute", left: 10, bottom: 10,
      padding: 10, background: "#04060a",
      border: `1px solid ${c}55`, borderLeft: `2px solid ${c}`,
      borderRadius: 3, minWidth: 240,
      fontFamily: MF.mono, fontSize: 10, lineHeight: 1.5, color: M.text,
    }}>
      <div style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 11, color: c, letterSpacing: "0.12em", marginBottom: 4 }}>
        {e.id} · {e.label.split("·")[0].trim()}
      </div>
      <div style={{ color: M.muted }}>{e.desc}</div>
      <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
        <window.ATag color={e.color} filled>AFFECTS DSP</window.ATag>
        <window.ATag color="muted">Use in draft</window.ATag>
      </div>
    </div>
  );
}
