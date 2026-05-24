// ALPHA2 — three instrument panels forked from canonical references.
// DeorbitalDescentPanel  · Nostromo (Alien, 1979)  — wireframe Earth + sidebar
// SmithReflectionPanel   · HP/Agilent phosphor CRT — Smith chart impedance
// PaintedTrajectory      · Pioneer/Voyager NASA art — orange orbits, blue ecliptic

const PA = A.T, PAF = A.F;
const PUS = React.useState;

// ═════════════════════════════════════════════════════════════════════════════
// 1 · <DeorbitalDescentPanel> — Nostromo vocabulary
// ═════════════════════════════════════════════════════════════════════════════
window.DeorbitalDescentPanel = function DeorbitalDescentPanel({
  por = "NOSTROMO / S 5",
  heading = "N .36 E .18",
  groundSpeed = "78.26",
  conditionCode = "16 S=C75C",
  past = "8",
  system = "4",
  autoCount = "3654.94",
  systemCode = "BL: 76.75 :OB",
  height = 320,
}) {
  const land = window.useNaturalEarth();
  const W = 720, H = 400;
  const cx = W * 0.62, cy = H / 2, r = H * 0.42;
  // Project Natural Earth coastlines to a stroke-only globe centered on (cx,cy)
  const continents = (land.data.features || []).flatMap(f =>
    f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates
  );
  const time = new Date();
  const timeStr = `${time.getUTCHours().toString().padStart(2,"0")}:${time.getUTCMinutes().toString().padStart(2,"0")}:${time.getUTCSeconds().toString().padStart(2,"0")}:${(time.getUTCMilliseconds() % 100).toString().padStart(2,"0")}`;

  return (
    <div style={{ position: "relative", height, background: "#000", border: `1px solid ${PA.hair}`, overflow: "hidden", display: "flex" }}>
      <NostromoSidebar
        time={timeStr} por={por}
        heading={heading} groundSpeed={groundSpeed}
        conditionCode={conditionCode} past={past}
        system={system} autoCount={autoCount}
      />
      <div style={{ flex: 1, position: "relative" }}>
        {/* Top bar */}
        <div style={{
          position: "absolute", left: 0, right: 0, top: 0,
          height: 32, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 10px", borderBottom: `1px solid rgba(84,229,255,0.4)`,
          fontFamily: "HaxrCorp4089, monospace", fontSize: 13, letterSpacing: "0.18em",
          WebkitFontSmoothing: "none",
        }}>
          <span style={{ color: "#54E5FF", textShadow: "0 0 6px #54E5FFaa" }}>DEORBITAL DESCENT</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              color: "#0c0d10", background: "#FFB547", padding: "2px 8px",
              textShadow: "0 0 0",
            }}>COMMENCE FINAL</span>
            <span style={{ color: "#FFB547" }}>SYSTEM :{systemCode}</span>
          </div>
        </div>
        {/* Wireframe Earth canvas */}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
          {/* faint star scatter */}
          {Array.from({ length: 40 }, (_, i) => {
            const x = (i * 87 + 11) % W, y = (i * 53 + 7) % H, s = 0.4 + ((i * 3) % 3) * 0.3;
            return <circle key={i} cx={x} cy={y} r={s} fill="#FFB547" opacity="0.35" />;
          })}

          {/* corner ticks (Nostromo's frame) */}
          <NostromoCornerTicks W={W} H={H} />

          {/* Disc base */}
          <circle cx={cx} cy={cy} r={r} fill="#001020" opacity="0.55" />

          {/* Equator + tropic lines (latitude wires) */}
          {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map(lat => {
            const ry = r * Math.cos(lat * Math.PI / 180);
            const yOff = (lat / 90) * r;
            return <ellipse key={`lat${lat}`} cx={cx} cy={cy - yOff * 0.0}
              rx={r} ry={Math.abs(ry * 0.32)}
              fill="none" stroke="#54E5FF" strokeOpacity={lat === 0 ? 0.7 : 0.3} strokeWidth={lat === 0 ? 1 : 0.5}
              transform={`translate(0 ${(lat / 90) * r * 0.55})`} />;
          })}
          {/* Longitude meridians */}
          {[-90, -60, -30, 0, 30, 60, 90].map(lon => {
            const rx = r * Math.abs(Math.sin((lon + 90) * Math.PI / 180));
            return <ellipse key={`lon${lon}`} cx={cx} cy={cy} rx={rx} ry={r}
              fill="none" stroke="#54E5FF" strokeOpacity={lon === 0 ? 0.7 : 0.3} strokeWidth={lon === 0 ? 1 : 0.5} />;
          })}
          {/* Continents — projected to the disc with simple orthographic-ish stretch */}
          <NostromoCoasts continents={continents} cx={cx} cy={cy} r={r} />
          {/* Crosshair reticle at sub-satellite point */}
          <g stroke="#fff" strokeWidth="1" fill="none" opacity="0.95">
            <line x1={cx - 22} y1={cy} x2={cx - 6} y2={cy} />
            <line x1={cx + 6} y1={cy} x2={cx + 22} y2={cy} />
            <line x1={cx} y1={cy - 22} x2={cx} y2={cy - 6} />
            <line x1={cx} y1={cy + 6} x2={cx} y2={cy + 22} />
            <circle cx={cx} cy={cy} r="4" />
          </g>
          {/* big readout block */}
          <g>
            <rect x={cx - 100} y={cy - 70} width="200" height="22" fill="#001020" stroke="#54E5FF" strokeOpacity="0.7" />
            <text x={cx} y={cy - 54} textAnchor="middle" fill="#54E5FF" fontFamily="HaxrCorp4089, monospace" fontSize="13" letterSpacing="0.18em" style={{ filter: "drop-shadow(0 0 4px #54E5FFaa)" }}>EST. EARTH RELATIVE</text>
            <rect x={cx - 78} y={cy + 36} width="156" height="18" fill="#FF4D5E" />
            <text x={cx} y={cy + 50} textAnchor="middle" fill="#0c0d10" fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.18em">NOT DEEPNAV PRECISE</text>
          </g>
          {/* random hashing — Nostromo had jagged data marks */}
          {Array.from({ length: 8 }, (_, i) => {
            const ang = (i / 8) * Math.PI * 2;
            const x1 = cx + Math.cos(ang) * (r + 14);
            const y1 = cy + Math.sin(ang) * (r + 14);
            const x2 = cx + Math.cos(ang) * (r + 24);
            const y2 = cy + Math.sin(ang) * (r + 24);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFB547" strokeWidth="1" opacity="0.7" />;
          })}
        </svg>
      </div>
      <ScanlineOverlay color="rgba(84,229,255,0.05)" />
    </div>
  );
};

function NostromoSidebar({ time, por, heading, groundSpeed, conditionCode, past, system, autoCount }) {
  return (
    <div style={{
      width: 140, padding: 8, background: "#000",
      borderRight: `1px solid rgba(84,229,255,0.4)`,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <NostromoField label="TIME FROM #1" value={time} />
      <NostromoField label="PRESENT P.O.R." value={por} multi />
      <NostromoField label="HEADING" value={heading} />
      <NostromoField label="GROUND SPEED" value={groundSpeed} />
      <NostromoField label="CONDITION CODE" value={`${conditionCode}\nPAST=${past}`} multi />
      <NostromoField label={`SYSTEM #${system}`} />
      <NostromoField label="AUTODECOUNT" value={autoCount} />
    </div>
  );
}

function NostromoField({ label, value, multi }) {
  return (
    <div>
      <div style={{
        background: "#54E5FF", color: "#0c0d10",
        padding: "2px 6px", fontFamily: "HaxrCorp4089, monospace", fontSize: 11, letterSpacing: "0.16em",
        WebkitFontSmoothing: "none",
      }}>{label}</div>
      {value && (
        <div style={{
          padding: "4px 6px", background: "#001020",
          border: "1px solid rgba(84,229,255,0.35)", borderTop: "none",
          fontFamily: "HelvB08, monospace", fontSize: 11, color: "#54E5FF",
          letterSpacing: "0.08em", lineHeight: 1.35,
          whiteSpace: multi ? "pre-line" : "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          textShadow: "0 0 4px #54E5FF55", WebkitFontSmoothing: "none",
        }}>{value}</div>
      )}
    </div>
  );
}

function NostromoCornerTicks({ W, H }) {
  const arm = 14;
  const c = "#FFB547";
  return (
    <g stroke={c} strokeWidth="1.4" fill="none">
      <path d={`M 4 ${arm + 4} L 4 4 L ${arm + 4} 4`} />
      <path d={`M ${W - arm - 4} 4 L ${W - 4} 4 L ${W - 4} ${arm + 4}`} />
      <path d={`M 4 ${H - arm - 4} L 4 ${H - 4} L ${arm + 4} ${H - 4}`} />
      <path d={`M ${W - arm - 4} ${H - 4} L ${W - 4} ${H - 4} L ${W - 4} ${H - arm - 4}`} />
    </g>
  );
}

function NostromoCoasts({ continents, cx, cy, r }) {
  // Orthographic-ish projection centred on lon=0 lat=0 — simple cos/sin stretch.
  // Continents on the visible hemisphere render red strokes; back hemisphere muted.
  const paths = [];
  continents.forEach((rings, ci) => {
    rings.forEach((ring, ri) => {
      let d = "";
      let visiblePts = 0;
      for (let i = 0; i < ring.length; i++) {
        const [lon, lat] = ring[i];
        const rad = lat * Math.PI / 180;
        const lonRad = lon * Math.PI / 180;
        const x = cx + r * Math.cos(rad) * Math.sin(lonRad);
        const y = cy - r * Math.sin(rad);
        const visible = Math.cos(rad) * Math.cos(lonRad) >= 0;
        if (visible) visiblePts++;
        d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
      }
      if (visiblePts > 3) {
        paths.push({ d, c: visiblePts > ring.length * 0.5 ? "#FF4D5E" : "#FFB547" });
      }
    });
  });
  return (
    <g>
      <defs>
        <clipPath id="nostromo-clip">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <g clipPath="url(#nostromo-clip)">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill="none" stroke={p.c} strokeWidth="1.2" strokeOpacity="0.85" />
        ))}
      </g>
    </g>
  );
}

function ScanlineOverlay({ color }) {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      background: `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${color} 2px, ${color} 3px)`,
    }} />
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · <SmithReflectionPanel> — phosphor CRT Smith chart
// ═════════════════════════════════════════════════════════════════════════════
window.SmithReflectionPanel = function SmithReflectionPanel({
  frequency = "300.733",
  freqUnit = "MHz",
  impedance = { real: 2.493, imag: 125.5 },
  nH = 66.44,
  height = 340,
}) {
  const W = 580, H = 400;
  const cx = 200, cy = H / 2, r = 150;
  // Resistance circles (R = 0, 0.5, 1, 2, 5)
  const rCircles = [0.2, 0.5, 1, 2, 5];
  // Reactance arcs (X = ±0.5, ±1, ±2, ±5)
  const xArcs = [0.5, 1, 2, 5];
  return (
    <div style={{ position: "relative", height, background: "#001a06", border: `1px solid ${PA.hair}`, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        {/* Top header */}
        <text x="10" y="20" fontFamily="HaxrCorp4089, monospace" fontSize="13" fill="#5BF38A" letterSpacing="0.10em">▸1: Reflection</text>
        <text x="180" y="20" fontFamily="HaxrCorp4089, monospace" fontSize="13" fill="#5BF38A" letterSpacing="0.10em">Smith</text>
        <text x="260" y="20" fontFamily="HaxrCorp4089, monospace" fontSize="13" fill="#5BF38A" letterSpacing="0.10em">1 U FS</text>
        <text x="10" y="36" fontFamily="HaxrCorp4089, monospace" fontSize="11" fill="#5BF38A" opacity="0.85" letterSpacing="0.08em">▸2: Off</text>

        {/* Resistance circles */}
        {rCircles.map((R, i) => {
          // Center: (R/(1+R), 0) in normalized; scale to pixels
          const cx0 = cx + (R / (1 + R)) * r;
          const rr  = r / (1 + R);
          return <circle key={`R${i}`} cx={cx0} cy={cy} r={rr} fill="none" stroke="#5BF38A" strokeOpacity="0.45" strokeWidth="0.6" strokeDasharray="2 3" />;
        })}
        {/* Unit circle (R = 0) */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#5BF38A" strokeOpacity="0.85" strokeWidth="1" />
        {/* Real axis */}
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#5BF38A" strokeOpacity="0.6" strokeDasharray="3 4" />
        {/* Reactance arcs (top + bottom) */}
        {xArcs.flatMap((X, i) => {
          const cy0 = cy - r / X;
          const rr  = r / X;
          return [
            <circle key={`Xpos${i}`} cx={cx + r} cy={cy0} r={rr} fill="none" stroke="#5BF38A" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="2 3"
              clipPath="url(#smith-disc)" />,
            <circle key={`Xneg${i}`} cx={cx + r} cy={cy + r / X} r={rr} fill="none" stroke="#5BF38A" strokeOpacity="0.35" strokeWidth="0.5" strokeDasharray="2 3"
              clipPath="url(#smith-disc)" />,
          ];
        })}
        <defs>
          <clipPath id="smith-disc"><circle cx={cx} cy={cy} r={r} /></clipPath>
        </defs>

        {/* Sweep trace — sample reflection response curve */}
        <path d={smithTracePath(cx, cy, r)} fill="none" stroke="#5BF38A" strokeWidth="1.6" opacity="0.95"
          style={{ filter: "drop-shadow(0 0 4px #5BF38A88)" }} />

        {/* Marker */}
        <g>
          <circle cx={cx + 90} cy={cy - 18} r="5" fill="none" stroke="#5BF38A" strokeWidth="1.4" />
          <line x1={cx + 90 - 8} y1={cy - 18} x2={cx + 90 + 8} y2={cy - 18} stroke="#5BF38A" strokeWidth="1" />
          <line x1={cx + 90} y1={cy - 18 - 8} x2={cx + 90} y2={cy - 18 + 8} stroke="#5BF38A" strokeWidth="1" />
        </g>
        <text x="40" y={cy - 70} fontFamily="HaxrCorp4089, monospace" fontSize="13" fill="#5BF38A" letterSpacing="0.10em" style={{ filter: "drop-shadow(0 0 4px #5BF38A88)" }}>Mkr 1 =</text>
        <text x="40" y={cy - 54} fontFamily="HaxrCorp4089, monospace" fontSize="13" fill="#5BF38A" letterSpacing="0.10em">{frequency} {freqUnit}</text>

        {/* Axis labels */}
        {[10, 25, 50, 100, 250].map((v, i) => (
          <text key={i} x={cx + (i + 1) * 26} y={cy + 12} fontFamily="HelvB08, monospace" fontSize="9" fill="#5BF38A" opacity="0.6" textAnchor="middle">{v}</text>
        ))}
        {[50, 100, 250].map((v, i) => (
          <text key={`j${i}`} x={cx + r + 5} y={cy - 40 - i * 20} fontFamily="HelvB08, monospace" fontSize="9" fill="#5BF38A" opacity="0.6">j{v}</text>
        ))}
        {[50, 100, 250].map((v, i) => (
          <text key={`jn${i}`} x={cx + r + 5} y={cy + 50 + i * 20} fontFamily="HelvB08, monospace" fontSize="9" fill="#5BF38A" opacity="0.6">-j{v}</text>
        ))}

        {/* Right sidebar */}
        <SmithSidebar W={W} H={H} freq={frequency} impedance={impedance} nH={nH} />
      </svg>
      <ScanlineOverlay color="rgba(91,243,138,0.04)" />
    </div>
  );
};

function smithTracePath(cx, cy, r) {
  // Procedural reflection curve — small loop offset right of center
  const pts = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const a = -Math.PI * 1.5 + t * Math.PI * 2;
    const rho = 0.55 + 0.18 * Math.cos(a * 3);
    const px = cx + Math.cos(a) * rho * r * 0.5 + r * 0.18;
    const py = cy + Math.sin(a) * rho * r * 0.5 - r * 0.05;
    pts.push([px, py]);
  }
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

function SmithSidebar({ W, H, freq, impedance, nH }) {
  const x = W - 140;
  return (
    <g>
      <line x1={x - 8} y1="40" x2={x - 8} y2={H - 40} stroke="#5BF38A" strokeOpacity="0.3" />
      <text x={x} y="55" fontFamily="HaxrCorp4089, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.12em">C? │</text>
      <text x={x + 30} y="55" fontFamily="HaxrCorp4089, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.12em">MEAS 1</text>
      <text x={x + 30} y="68" fontFamily="HaxrCorp4089, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.12em" opacity="0.7">MKR</text>
      <text x={x + 80} y="68" fontFamily="HaxrCorp4089, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.12em" opacity="0.7">MHz</text>

      <text x={x} y="95"  fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">1▸ {freq}</text>
      <text x={x} y="108" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">   {impedance.real}kn</text>
      <text x={x} y="121" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">   {impedance.imag}n</text>
      <text x={x} y="134" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">   {nH}nH</text>

      <text x={x} y="158" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">2▸ 619.06</text>
      <text x={x} y="171" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">   136.0n</text>
      <text x={x} y="184" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.08em">   559.9mn</text>

      <text x={x} y="208" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" opacity="0.55" letterSpacing="0.08em">3:</text>
      <text x={x + 30} y="208" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" opacity="0.55" letterSpacing="0.08em">off</text>
      <text x={x} y="221" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" opacity="0.55" letterSpacing="0.08em">4:</text>
      <text x={x + 30} y="221" fontFamily="HelvB08, monospace" fontSize="11" fill="#5BF38A" opacity="0.55" letterSpacing="0.08em">off</text>

      <g>
        {["More", "Markers", "All Off", "", "Marker", "Functions", "", "Marker", "Search"].map((line, i) => (
          <text key={i} x={x} y={258 + i * 13} fontFamily="HaxrCorp4089, monospace" fontSize="11" fill="#5BF38A" letterSpacing="0.10em">{line}</text>
        ))}
      </g>
    </g>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · <PaintedTrajectory> — ASCII/glyph astrolabe-style mission trajectory
// Forked from the dotted-sphere astronomical chart aesthetic (image 2).
// Replaces the painted planet with a glyph globe — coherent with the
// cyan/magenta/green palette shared across the Relative deck.
// ═════════════════════════════════════════════════════════════════════════════
window.PaintedTrajectory = function PaintedTrajectory({ height = 460, selectedWaypoint, onSelect }) {
  const [hover, setHover] = PUS(null);
  const [sel, setSel] = PUS(selectedWaypoint || "W3");
  const W = 600, H = 800;
  const cx = W / 2, cy = H * 0.55;
  const R = 240;
  function pick(id) { onSelect ? onSelect(id) : setSel(id); }
  const active = sel;

  // Shared deck palette
  const C = {
    bg: "#02030a",
    grid: "#54E5FF",        // cyan — structure (lat/lon)
    eclip: "#c45ab6",       // magenta — ecliptic plane
    tropic: "#5BF38A",      // phosphor green — tropics / data
    limb: "#fff",           // white — horizon / great circles
    accent: "#FFD66B",      // gold — MC, key markers
    warn: "#FF4D5E",
  };

  // Magenta ecliptic + green tropics, both dotted
  const ecliptic = [
    { rx: 300, ry: 60,  rot: -14, c: C.eclip,  o: 0.85, dash: "0.5 3" },
    { rx: 270, ry: 38,  rot:  -8, c: C.eclip,  o: 0.55, dash: "0.5 3" },
    { rx: 280, ry: 110, rot:  82, c: C.tropic, o: 0.65, dash: "0.5 3" },
    { rx: 240, ry: 240, rot:   0, c: C.tropic, o: 0.4,  dash: "0.5 4" },
  ];

  // Planetary glyphs placed in mock orbits + a couple zodiac marks on rim
  const planets = [
    { sym: "☿", ang: -150, r: R + 18, c: C.grid,   label: "MERC" },
    { sym: "♀", ang: -90,  r: R + 18, c: C.accent, label: "VENU" },
    { sym: "⊕", ang: -30,  r: R + 18, c: "#5dbed4", label: "EARTH" },
    { sym: "♂", ang: 40,   r: R + 18, c: C.warn,   label: "MARS" },
    { sym: "☉", ang: 110,  r: R + 18, c: C.accent, label: "SUN" },
    { sym: "☽", ang: 170,  r: R + 18, c: C.grid,   label: "MOON" },
  ];

  // Astrolabe-style labels
  const rimMarks = [
    { sym: "MC",  ang: -100, c: C.limb, op: 0.6 },
    { sym: "Asc", ang:    0, c: C.limb, op: 0.6 },
    { sym: "IC",  ang:   80, c: C.limb, op: 0.6 },
    { sym: "Dsc", ang:  180, c: C.limb, op: 0.6 },
    { sym: "N",   ang:  -90, c: C.accent, op: 0.9 },
  ];

  // Mission waypoints sit on the magenta ecliptic — the active trajectory
  const waypoints = [
    { id: "W0", angle: -160, label: "Departure",      state: "done" },
    { id: "W1", angle: -120, label: "TLI burn",       state: "done" },
    { id: "W2", angle: -70,  label: "Midcourse",      state: "done" },
    { id: "W3", angle: -20,  label: "Approach burn",  state: "active" },
    { id: "W4", angle: 20,   label: "Orbit insertion",state: "pending" },
    { id: "W5", angle: 90,   label: "Far-side LOS",   state: "pending" },
    { id: "W6", angle: 160,  label: "Re-acquire DSN", state: "pending" },
  ];

  // Build dotted lat/lon grid points — orthographic projection
  const dots = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lon = -180; lon < 180; lon += 6) {
      const rad = lat * Math.PI / 180;
      const lonR = lon * Math.PI / 180;
      const x = Math.cos(rad) * Math.sin(lonR);
      const z = Math.cos(rad) * Math.cos(lonR);
      const y = Math.sin(rad);
      if (z > -0.1) {
        dots.push([cx + x * R, cy - y * R, z, lat % 30 === 0 ? C.eclip : C.tropic]);
      }
    }
  }

  return (
    <div style={{ position: "relative", height, background: C.bg, border: `1px solid ${PA.hair}`, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        {/* faint background star scatter */}
        {Array.from({ length: 220 }, (_, i) => {
          const x = ((i * 137.5) % W);
          const y = ((i * 73.3) % H);
          const s = 0.3 + ((i * 7) % 5) * 0.15;
          return <circle key={i} cx={x} cy={y} r={s} fill="#fff" opacity={s * 0.45} />;
        })}

        {/* white limb circle (horizon great circle) */}
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.limb} strokeWidth="1.2" />
        {/* hash-marked great circle band — like the white band in the reference */}
        <g transform={`translate(${cx} ${cy})`}>
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const r1 = R - 5, r2 = R + 5;
            return (
              <line key={i}
                x1={Math.cos(a) * r1} y1={Math.sin(a) * r1 * 0.18}
                x2={Math.cos(a) * r2} y2={Math.sin(a) * r2 * 0.18}
                stroke={C.limb} strokeWidth="0.7" opacity="0.85" />
            );
          })}
        </g>

        {/* Dotted lat/lon mesh — astrolabe vibe */}
        {dots.map((d, i) => (
          <circle key={i} cx={d[0]} cy={d[1]} r="0.9"
            fill={d[3]} opacity={0.25 + d[2] * 0.55} />
        ))}

        {/* ecliptic + tropics — dotted curves */}
        <g transform={`translate(${cx} ${cy})`}>
          {ecliptic.map((e, i) => (
            <ellipse key={i} cx="0" cy="0" rx={e.rx} ry={e.ry}
              fill="none" stroke={e.c} strokeOpacity={e.o} strokeWidth="0.8"
              strokeDasharray={e.dash}
              transform={`rotate(${e.rot})`} />
          ))}
        </g>

        {/* Rim markers — MC, Asc, IC, Dsc, N */}
        {rimMarks.map((m, i) => {
          const rad = m.ang * Math.PI / 180;
          const x = cx + Math.cos(rad) * (R + 40);
          const y = cy + Math.sin(rad) * (R + 40);
          return (
            <g key={i}>
              <text x={x} y={y + 4} textAnchor="middle"
                fill={m.c} opacity={m.op}
                fontFamily="HaxrCorp4089, monospace" fontSize="13" letterSpacing="0.14em">{m.sym}</text>
              <line x1={cx + Math.cos(rad) * R} y1={cy + Math.sin(rad) * R}
                x2={cx + Math.cos(rad) * (R + 30)} y2={cy + Math.sin(rad) * (R + 30)}
                stroke={m.c} strokeOpacity={m.op * 0.45} strokeWidth="0.6" />
            </g>
          );
        })}

        {/* Planetary glyphs on outer rim */}
        {planets.map((p, i) => {
          const rad = p.ang * Math.PI / 180;
          const x = cx + Math.cos(rad) * p.r;
          const y = cy + Math.sin(rad) * p.r;
          return (
            <g key={i}>
              <text x={x} y={y + 4} textAnchor="middle" fill={p.c}
                fontFamily="serif" fontSize="22"
                style={{ filter: `drop-shadow(0 0 4px ${p.c}99)` }}>{p.sym}</text>
              <text x={x} y={y + 22} textAnchor="middle" fill={p.c}
                fontFamily="HelvB08, monospace" fontSize="9" opacity="0.7" letterSpacing="0.16em">{p.label}</text>
            </g>
          );
        })}

        {/* Waypoints on the magenta ecliptic */}
        <g transform={`translate(${cx} ${cy})`}>
          {(() => {
            const ec = ecliptic[0];
            const rot = ec.rot * Math.PI / 180;
            return waypoints.map(w => {
              const a = w.angle * Math.PI / 180;
              const lx = Math.cos(a) * ec.rx, ly = Math.sin(a) * ec.ry;
              const x = lx * Math.cos(rot) - ly * Math.sin(rot);
              const y = lx * Math.sin(rot) + ly * Math.cos(rot);
              const c = w.state === "done" ? C.tropic : w.state === "active" ? C.accent : C.grid;
              const isActive = w.id === active;
              return (
                <g key={w.id} style={{ cursor: "pointer" }}
                   onMouseEnter={() => setHover(w.id)}
                   onMouseLeave={() => setHover(null)}
                   onClick={() => pick(w.id)}>
                  {isActive && (
                    <g>
                      <circle cx={x} cy={y} r="12" fill="none" stroke={c} strokeOpacity="0.7">
                        <animate attributeName="r" from="6" to="18" dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.7" to="0" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <line x1={x - 14} y1={y} x2={x - 6} y2={y} stroke={c} strokeWidth="1" />
                      <line x1={x + 6} y1={y} x2={x + 14} y2={y} stroke={c} strokeWidth="1" />
                      <line x1={x} y1={y - 14} x2={x} y2={y - 6} stroke={c} strokeWidth="1" />
                      <line x1={x} y1={y + 6} x2={x} y2={y + 14} stroke={c} strokeWidth="1" />
                    </g>
                  )}
                  <text x={x} y={y + 4} textAnchor="middle" fill={c}
                    fontFamily="serif" fontSize={isActive ? 18 : 13}
                    style={{ filter: `drop-shadow(0 0 5px ${c}99)` }}>✦</text>
                  {(hover === w.id || isActive) && (
                    <g>
                      <text x={x} y={y - 18} textAnchor="middle"
                        fill="#fff" fontFamily="HaxrCorp4089, monospace" fontSize="11" letterSpacing="0.10em"
                        style={{ filter: "drop-shadow(0 0 3px #000)" }}>{w.id}</text>
                      <text x={x} y={y + 22} textAnchor="middle"
                        fill="#fff" fontFamily="HelvB08, monospace" fontSize="10" opacity="0.85"
                        style={{ filter: "drop-shadow(0 0 3px #000)" }}>{w.label}</text>
                    </g>
                  )}
                </g>
              );
            });
          })()}
        </g>

        {/* Glyph ships at top-right + bottom-left — coherent with deck palette */}
        <GlyphShip x={W - 90} y={70} dir={1} color={C.accent} />
        <GlyphShip x={90} y={H - 90} dir={-1} color={C.tropic} />

        {/* Date / coord stamp like the astrolabe ref */}
        <text x={cx} y={H - 24} textAnchor="middle"
          fill={C.limb} opacity="0.85"
          fontFamily="HaxrCorp4089, monospace" fontSize="13" letterSpacing="0.16em">
          MET 02:35:12 · UTC · 142°19'E 47°36'N · ODYSSEY 2026·05
        </text>
      </svg>

      {/* Title overlay */}
      <div style={{
        position: "absolute", top: 12, left: 12,
        padding: "6px 12px", background: "rgba(2,3,10,0.78)",
        border: `1px solid ${C.eclip}66`,
        fontFamily: "HaxrCorp4089, monospace", fontSize: 12, color: C.eclip,
        letterSpacing: "0.18em", WebkitFontSmoothing: "none",
      }}>
        MISSION TRAJECTORY · 軌道計画
      </div>
      <div style={{
        position: "absolute", bottom: 12, right: 12,
        padding: "5px 10px", background: "rgba(2,3,10,0.78)",
        border: `1px solid ${C.tropic}44`,
        fontFamily: "HelvB08, monospace", fontSize: 10, color: C.tropic,
        letterSpacing: "0.14em", WebkitFontSmoothing: "none",
      }}>
        ECLIPTIC · MAGENTA ◆ TROPICS · GREEN ◆ HORIZON · WHITE
      </div>
    </div>
  );
};

// Glyph ship — ASCII silhouette coherent with the rest of the deck
function GlyphShip({ x, y, dir, color }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${dir} 1)`} style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}>
      <text x="0" y="0" fill={color} fontFamily="serif" fontSize="22" textAnchor="middle">⊹</text>
      <g stroke={color} strokeWidth="1" fill="none">
        <line x1="-14" y1="-6" x2="14" y2="-6" />
        <line x1="-14" y1="6" x2="14" y2="6" />
        <line x1="-18" y1="0" x2="-12" y2="0" />
        <line x1="12" y1="0" x2="18" y2="0" />
      </g>
      <g stroke={color} strokeWidth="1.4" fill={color}>
        <line x1="-30" y1="0" x2="-46" y2="0" />
        <polygon points="-46,0 -40,-3 -40,3" />
      </g>
      <text x="0" y="22" fill={color} fontFamily="HelvB08, monospace" fontSize="9" textAnchor="middle" letterSpacing="0.18em" opacity="0.8">PROBE</text>
    </g>
  );
}
