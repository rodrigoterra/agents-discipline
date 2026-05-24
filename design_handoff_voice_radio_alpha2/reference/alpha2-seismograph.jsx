// ALPHA2 — Seismograph dashboard.
// Dedicated screen that forks the Seismograph project's 3-column dashboard
// (Proposal.html · §05 HUD LAYOUT) into the ALPHA2 shell.
// Same USGS feed, same magnitude ramp, same dense-HUD vocabulary.

const SG = A.T, SGF = A.F;
const SGUS = React.useState;

window.ScreenSeismograph = function ScreenSeismograph() {
  const usgs = window.useUsgsQuakes();
  const features = usgs.data ? usgs.data.features : [];
  const [focused, setFocused] = SGUS(null);
  const [minMag, setMinMag] = SGUS(0);
  const [sortMode, setSortMode] = SGUS("mag"); // "mag" | "time"

  // Auto-focus the biggest event on first feed change
  React.useEffect(() => {
    if (!focused && features.length) {
      const biggest = features.reduce((a, b) =>
        (b.properties.mag || 0) > (a.properties.mag || 0) ? b : a);
      setFocused(biggest);
    }
  }, [features.length]);

  const sorted = features.slice().sort((a, b) =>
    sortMode === "mag"
      ? (b.properties.mag || 0) - (a.properties.mag || 0)
      : (b.properties.time || 0) - (a.properties.time || 0)
  );

  const stats = computeStats(features);
  const tiers = computeTierCounts(features);

  return (
    <window.AShell2 active="seis" mode="render" screenLabel="10 Seismograph · 地震計" noRightRail>
      <window.ScreenH1 glyph="seismograph"
        title="Seismograph · Live"
        sub="USGS all_day feed · 24h window · poll 60s · forked from Seismograph proposal"
        tags={[
          { label: usgs.live ? "LIVE" : "STATIC", color: usgs.live ? "green" : "muted", filled: true },
          { label: `${features.length} events`, color: "muted" },
          { label: `max M${stats.maxMag.toFixed(1)}`, color: tierColorName(stats.maxMag), filled: true },
        ]}
        actions={(<>
          <window.ABtn size="md">Refresh now</window.ABtn>
          <window.ABtn size="md">Share permalink</window.ABtn>
          <window.ABtn size="md" variant="primary">Open in USGS</window.ABtn>
        </>)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 280px", gap: 12, flex: 1, minHeight: 0 }}>
        <FeedColumn stats={stats} features={sorted} focused={focused} setFocused={setFocused}
          minMag={minMag} setMinMag={setMinMag} sortMode={sortMode} setSortMode={setSortMode} />
        <MapColumn features={features} focused={focused} setFocused={setFocused}
          minMag={minMag} setMinMag={setMinMag} />
        <FocusColumn q={focused} />
      </div>
      <TierStrip tiers={tiers} minMag={minMag} setMinMag={setMinMag} total={features.length} />
    </window.AShell2>
  );
};

// ─────────────────────────────────────────────────────────
function computeStats(features) {
  if (!features.length) return { total: 0, maxMag: 0, m5plus: 0, m7plus: 0, last: null, perHour: [] };
  let maxMag = 0, m5 = 0, m7 = 0, last = 0;
  features.forEach(f => {
    const m = f.properties.mag || 0;
    if (m > maxMag) maxMag = m;
    if (m >= 5) m5++;
    if (m >= 7) m7++;
    if (f.properties.time > last) last = f.properties.time;
  });
  // Events per hour over the last 24h
  const now = Date.now();
  const perHour = Array.from({ length: 24 }, (_, i) => {
    const start = now - (i + 1) * 3600 * 1000;
    const end = now - i * 3600 * 1000;
    return features.filter(f => f.properties.time >= start && f.properties.time < end).length;
  }).reverse();
  return { total: features.length, maxMag, m5plus: m5, m7plus: m7, last, perHour };
}

function computeTierCounts(features) {
  const tiers = { trace: 0, notable: 0, strong: 0, major: 0, critical: 0 };
  features.forEach(f => {
    const m = f.properties.mag || 0;
    if (m >= 7) tiers.critical++;
    else if (m >= 6) tiers.major++;
    else if (m >= 5) tiers.strong++;
    else if (m >= 3) tiers.notable++;
    else tiers.trace++;
  });
  return tiers;
}

function tierColorName(m) {
  if (m >= 7) return "red";
  if (m >= 6) return "amber";
  if (m >= 5) return "amber";
  if (m >= 3) return "green";
  return "blue";
}

// ─────────────────────────────────────────────────────────
// Feed column · stats + sparkline + event list
// ─────────────────────────────────────────────────────────
function FeedColumn({ stats, features, focused, setFocused, minMag, setMinMag, sortMode, setSortMode }) {
  const filtered = features.filter(f => (f.properties.mag || 0) >= minMag);
  return (
    <window.ACard pad={0} title="Feed · last 24h" sub="USGS · all_day" style={{ minHeight: 0 }}>
      {/* Stat strip */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${SG.hair}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Stat label="TOTAL EVENTS" value={stats.total} color={SG.green} />
        <Stat label="MAX MAG" value={`M${stats.maxMag.toFixed(1)}`} color={window.magColor(stats.maxMag)} />
      </div>
      {/* Sparkline */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${SG.hair}` }}>
        <div style={{ fontFamily: "HelvB08, " + SGF.mono, fontSize: 10, color: SG.muted, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
          Events / hour · 24h
        </div>
        <Sparkline data={stats.perHour} color="#5BF38A" />
      </div>
      {/* Sort + filter chrome */}
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${SG.hair}`, display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontFamily: "HelvB08, " + SGF.mono, fontSize: 10, color: SG.muted, letterSpacing: "0.14em" }}>SORT</span>
        <window.ABtn size="sm" variant={sortMode === "mag" ? "primary" : "ghost"} onClick={() => setSortMode("mag")}>MAG</window.ABtn>
        <window.ABtn size="sm" variant={sortMode === "time" ? "primary" : "ghost"} onClick={() => setSortMode("time")}>TIME</window.ABtn>
        {minMag > 0 && (
          <window.ABtn size="sm" variant="ghost" onClick={() => setMinMag(0)}>clear M{minMag}+</window.ABtn>
        )}
      </div>
      {/* Event list */}
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {filtered.slice(0, 60).map((f, i) => {
          const mag = f.properties.mag || 0;
          const c = window.magColor(mag);
          const sel = focused && focused.id === f.id;
          const [, , depth] = f.geometry.coordinates;
          const ago = Math.round((Date.now() - f.properties.time) / 60000);
          return (
            <div key={f.id || i}
              onClick={() => setFocused(f)}
              style={{
                padding: "8px 12px",
                borderBottom: `1px solid ${SG.hair}`,
                background: sel ? "rgba(91,243,138,0.08)" : "transparent",
                borderLeft: sel ? `2px solid ${c}` : "2px solid transparent",
                cursor: "pointer",
                display: "grid", gridTemplateColumns: "44px 1fr", gap: 8, alignItems: "center",
              }}>
              <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 13, color: c, fontWeight: 600, letterSpacing: "0.04em" }}>
                M{mag.toFixed(1)}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: SGF.mono, fontSize: 10.5, color: SG.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {f.properties.place}
                </div>
                <div style={{ fontFamily: "HelvB08, " + SGF.mono, fontSize: 9, color: SG.muted, letterSpacing: "0.06em" }}>
                  {ago < 60 ? `${ago}m` : `${Math.round(ago/60)}h`} · {Math.round(depth)}km
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </window.ACard>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily: "HelvB08, " + SGF.mono, fontSize: 9, color: SG.muted, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: SGF.display, fontSize: 26, fontWeight: 600, color, letterSpacing: "0.02em", textShadow: `0 0 8px ${color}33` }}>{value}</div>
    </div>
  );
}

function Sparkline({ data, color }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data, 1);
  const W = 224, H = 50;
  const stepX = W / (data.length - 1);
  const path = data.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)} ${(H - (v / max) * H).toFixed(1)}`).join(" ");
  const area = path + ` L${W} ${H} L0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} preserveAspectRatio="none" style={{ width: "100%", height: 54, display: "block" }}>
      <path d={area} fill={color} opacity="0.18" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" />
      {data.map((v, i) => (v > 0 && (i === 0 || i === data.length - 1)) && (
        <circle key={i} cx={i * stepX} cy={H - (v / max) * H} r="2" fill={color} />
      ))}
      <line x1="0" y1={H} x2={W} y2={H} stroke={SG.hair} strokeWidth="1" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Map column · earthquake-overloaded EarthDsnMap
// ─────────────────────────────────────────────────────────
function MapColumn({ features, focused, setFocused, minMag, setMinMag }) {
  return (
    <window.ACard pad={0} title="World · USGS overlay" sub={`${features.length} events · ramp v0.1 · pulse on M5+`} style={{ minHeight: 0 }}
      action={<>
        <window.ABtn size="sm">Robinson</window.ABtn>
        <window.ABtn size="sm" variant="primary">Equirectangular</window.ABtn>
      </>}>
      <SeismographMap features={features} focused={focused} setFocused={setFocused} minMag={minMag} />
    </window.ACard>
  );
}

function SeismographMap({ features, focused, setFocused, minMag }) {
  const [satOn, setSatOn] = SGUS(false);
  const [provider, setProvider] = SGUS("nasa");
  const [dayNight, setDayNight] = SGUS(true);
  const W = 720, H = 360;
  return (
    <div style={{ position: "relative", height: "100%", background: "#02040a", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        <window.NaturalEarthMap width={W} height={H} satelliteTiles={satOn} tileProvider={provider} dayNight={dayNight} />
        {features.length > 0 && (
          <window.EarthquakeLayer feed={{ features }} width={W} height={H} minMag={minMag} focus={focused} onPick={setFocused} />
        )}
        {/* corner brackets — proposal ref-01 vocabulary */}
        <g stroke="#5BF38A" strokeWidth="1.2" fill="none">
          <path d="M 0 14 L 0 0 L 14 0" />
          <path d={`M ${W-14} 0 L ${W} 0 L ${W} 14`} />
          <path d={`M 0 ${H-14} L 0 ${H} L 14 ${H}`} />
          <path d={`M ${W-14} ${H} L ${W} ${H} L ${W} ${H-14}`} />
        </g>
      </svg>
      <SeismographSatSwitch satOn={satOn} setSatOn={setSatOn} provider={provider} setProvider={setProvider}
        dayNight={dayNight} setDayNight={setDayNight} />
    </div>
  );
}

function SeismographSatSwitch({ satOn, setSatOn, provider, setProvider, dayNight, setDayNight }) {
  const PROVIDERS = [
    { id: "nasa",   label: "BLUE MARBLE" },
    { id: "google", label: "GOOGLE SAT" },
    { id: "esri",   label: "ESRI" },
  ];
  return (
    <div style={{
      position: "absolute", top: 12, left: 12,
      padding: "6px 8px", background: "rgba(4,6,10,0.85)",
      border: `1px solid ${SG.hair}`, fontFamily: SGF.mono, fontSize: 9, color: SG.text,
      minWidth: 130,
    }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        <div onClick={() => setSatOn(false)} style={{ flex: 1, padding: "3px 6px", background: !satOn ? "#5BF38A" : "transparent", color: !satOn ? "#0c0d10" : SG.muted, border: `1px solid ${SG.hair}`, cursor: "pointer", fontFamily: "HaxrCorp4089, monospace", fontSize: 10, letterSpacing: "0.10em", textAlign: "center" }}>VECTOR</div>
        <div onClick={() => setSatOn(true)} style={{ flex: 1, padding: "3px 6px", background: satOn ? "#5BF38A" : "transparent", color: satOn ? "#0c0d10" : SG.muted, border: `1px solid ${SG.hair}`, cursor: "pointer", fontFamily: "HaxrCorp4089, monospace", fontSize: 10, letterSpacing: "0.10em", textAlign: "center" }}>SATELLITE</div>
      </div>
      {satOn && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 4 }}>
          {PROVIDERS.map(p => (
            <div key={p.id} onClick={() => setProvider(p.id)} style={{
              padding: "2px 4px", cursor: "pointer",
              fontFamily: "HelvB08, monospace", fontSize: 9, letterSpacing: "0.06em",
              color: provider === p.id ? "#5BF38A" : SG.muted,
              border: `1px solid ${provider === p.id ? "#5BF38A" : SG.hair}`,
              textAlign: "center", textTransform: "uppercase",
            }}>{p.label}</div>
          ))}
        </div>
      )}
      <div onClick={() => setDayNight(!dayNight)} style={{
        padding: "3px 6px", cursor: "pointer", borderTop: `1px solid ${SG.hair}`, paddingTop: 5,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: "HaxrCorp4089, monospace", fontSize: 10, letterSpacing: "0.10em",
        color: dayNight ? "#FFB547" : SG.muted,
      }}>
        <span>DAY · NIGHT</span>
        <span style={{ fontFamily: "HelvB08, monospace", fontSize: 9 }}>{dayNight ? "ON" : "OFF"}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Focus column · depth cross-section + full detail
// ─────────────────────────────────────────────────────────
function FocusColumn({ q }) {
  if (!q) return (
    <window.ACard title="Focused event" sub="click a quake on map or feed" pad={20}>
      <div style={{
        height: "100%", display: "grid", placeItems: "center",
        fontFamily: "HelvB08, " + SGF.mono, fontSize: 11, color: SG.dim, letterSpacing: "0.18em", textAlign: "center",
      }}>
        NO EVENT SELECTED · 選択されていない<br/>
        <span style={{ fontFamily: SGF.mono, fontSize: 10, color: SG.dim, letterSpacing: "0.04em" }}>biggest auto-selects on next refresh</span>
      </div>
    </window.ACard>
  );
  const [lon, lat, depth] = q.geometry.coordinates;
  const mag = q.properties.mag || 0;
  const c = window.magColor(mag);
  const tier = window.magTier(mag);
  const ago = Math.round((Date.now() - q.properties.time) / 60000);
  const url = q.properties.url || "https://earthquake.usgs.gov";
  return (
    <window.ACard pad={0} title="Focused event" sub={tier.toLowerCase()} style={{ minHeight: 0 }}
      action={<window.ATag color={mag >= 7 ? "red" : mag >= 5 ? "amber" : "green"} filled>{tier}</window.ATag>}>
      {/* Mag readout */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${SG.hair}` }}>
        <div style={{ fontFamily: "HelvB08, " + SGF.mono, fontSize: 9, color: SG.muted, letterSpacing: "0.18em", marginBottom: 4 }}>MAGNITUDE</div>
        <div style={{ fontFamily: SGF.display, fontSize: 48, fontWeight: 500, color: c, lineHeight: 0.9, letterSpacing: "-0.02em", textShadow: `0 0 12px ${c}55` }}>
          M{mag.toFixed(1)}
        </div>
        <div style={{ fontFamily: SGF.mono, fontSize: 12, color: SG.text, marginTop: 8, lineHeight: 1.4 }}>{q.properties.place}</div>
      </div>
      {/* Coords */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${SG.hair}`, display: "flex", flexDirection: "column", gap: 6, fontFamily: SGF.mono, fontSize: 11 }}>
        <Row k="COORD" v={`${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"} · ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? "E" : "W"}`} />
        <Row k="DEPTH" v={`${Math.round(depth)} km${depth < 35 ? " · shallow" : depth > 300 ? " · deep" : ""}`} c={depth < 35 ? c : null} />
        <Row k="WHEN" v={ago < 60 ? `${ago}m ago` : `${Math.round(ago / 60)}h ago`} />
        <Row k="TIER" v={tier} c={c} />
      </div>
      {/* Depth cross-section */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${SG.hair}` }}>
        <div style={{ fontFamily: "HelvB08, " + SGF.mono, fontSize: 9, color: SG.muted, letterSpacing: "0.18em", marginBottom: 6 }}>DEPTH · CROSS-SECTION</div>
        <DepthCrossSection depth={depth} mag={mag} color={c} />
      </div>
      {/* USGS link */}
      <div style={{ padding: 12 }}>
        <window.ABtn size="md" full>Open in USGS →</window.ABtn>
      </div>
    </window.ACard>
  );
}

function Row({ k, v, c }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: SG.muted, fontFamily: "HelvB08, " + SGF.mono, fontSize: 10, letterSpacing: "0.14em" }}>{k}</span>
      <span style={{ color: c || SG.text }}>{v}</span>
    </div>
  );
}

function DepthCrossSection({ depth, mag, color }) {
  // Surface at top; 0-700km vertical scale; quake as a labeled dot.
  const W = 224, H = 88;
  const maxDepth = 700;
  const surfaceY = 8;
  const y = surfaceY + (Math.min(depth, maxDepth) / maxDepth) * (H - surfaceY - 4);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, display: "block" }}>
      {/* surface */}
      <rect x="0" y="0" width={W} height={surfaceY} fill="#1c2922" />
      <line x1="0" y1={surfaceY} x2={W} y2={surfaceY} stroke="#5BF38A" strokeOpacity="0.45" />
      {/* depth scale */}
      {[35, 70, 150, 300, 700].map(d => {
        const dy = surfaceY + (d / maxDepth) * (H - surfaceY - 4);
        return (
          <g key={d}>
            <line x1="0" y1={dy} x2={W} y2={dy} stroke={SG.hair} strokeDasharray="2 4" />
            <text x={W - 2} y={dy - 2} fontFamily="HelvB08, monospace" fontSize="8" fill={SG.muted} textAnchor="end" letterSpacing="0.06em">{d}km</text>
          </g>
        );
      })}
      {/* event */}
      <circle cx={W * 0.4} cy={y} r={Math.max(3, mag)} fill={color} opacity="0.9" />
      <line x1={W * 0.4} y1={surfaceY} x2={W * 0.4} y2={y} stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
      <text x={W * 0.4 + Math.max(3, mag) + 4} y={y + 3} fontFamily="HaxrCorp4089, monospace" fontSize="10" fill={color} letterSpacing="0.04em">
        M{mag.toFixed(1)} · {Math.round(depth)}km
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Tier strip — bottom of screen, full-width counts + filter
// ─────────────────────────────────────────────────────────
function TierStrip({ tiers, minMag, setMinMag, total }) {
  const items = [
    { min: 0, label: "ALL",       jp: "全",   key: "total",    count: total,           c: SG.text },
    { min: 0, label: "TRACE",     jp: "微",   key: "trace",    count: tiers.trace,     c: "#54E5FF" },
    { min: 3, label: "NOTABLE",   jp: "注",   key: "notable",  count: tiers.notable,   c: "#5BF38A" },
    { min: 5, label: "STRONG",    jp: "強",   key: "strong",   count: tiers.strong,    c: "#FFB547" },
    { min: 6, label: "MAJOR",     jp: "大",   key: "major",    count: tiers.major,     c: "#FF8A3D" },
    { min: 7, label: "CRITICAL",  jp: "危",   key: "critical", count: tiers.critical,  c: "#FF4D5E" },
  ];
  return (
    <window.ACard pad={0} dense style={{ flex: "0 0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
        {items.map((t, i) => {
          const on = minMag === t.min && (i === 0 || (t.min === minMag && i !== 0));
          const isAll = i === 0;
          const showOn = isAll ? minMag === 0 : minMag === t.min && t.min !== 0;
          return (
            <div key={t.key}
              onClick={() => setMinMag(isAll ? 0 : t.min)}
              style={{
                padding: "12px 14px",
                borderRight: i < items.length - 1 ? `1px solid ${SG.hair}` : "none",
                borderTop: showOn ? `2px solid ${t.c}` : "2px solid transparent",
                background: showOn ? `${t.c}11` : "transparent",
                cursor: "pointer",
                display: "flex", flexDirection: "column", gap: 4,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "HaxrCorp4089, monospace", fontSize: 11, color: showOn ? t.c : SG.muted, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  {t.label}
                </span>
                <span style={{ fontFamily: "HelvB08, monospace", fontSize: 9, color: showOn ? t.c : SG.dim, letterSpacing: "0.14em" }}>{t.jp}</span>
              </div>
              <div style={{ fontFamily: SGF.display, fontSize: 22, fontWeight: 600, color: showOn ? t.c : SG.text, letterSpacing: "0.02em" }}>
                {t.count}
              </div>
              <div style={{
                height: 3, background: `${t.c}55`,
                width: `${Math.min(100, total ? (t.count / Math.max(1, total)) * 100 : 0)}%`,
              }} />
            </div>
          );
        })}
      </div>
    </window.ACard>
  );
}
