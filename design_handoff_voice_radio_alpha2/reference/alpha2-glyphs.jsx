// ALPHA2 — handcrafted glyph identity pack.
// Wordmark + per-screen sigils + role sigils + small ASCII components.
// All monospace, copy-paste safe, render at any size.

const GL = A.T, GF2 = A.F;

// ─────────────────────────────────────────────────────────
// Glyph art catalog · what lands where in ALPHA2
// ─────────────────────────────────────────────────────────
window.ALPHA2_GLYPHS = {
  wordmark: {
    sigil: " ▐▛███▜▌\n▝▜█████▛▘\n  ▘▘ ▝▝",
    title: "VOICE RADIO · ALPHA2",
    sub: "narrative · instrument · art game",
    jp: "ボイス・ラジオ",
  },
  mc:      { sigil: " ▄███▄\n█▘ ▼ ▝█\n█  ┼  █\n█▖   ▗█\n ▀███▀",        title: "MISSION CONTROL",   jp: "ミッション・コントロール", color: "copper" },
  flight:  { sigil: " ▄▄▄▄▄\n▟ ◉   ▙\n█  ⊹  █\n▜    ▟\n ▀▀▀▀▀",          title: "FLIGHT",            jp: "飛行 ・ ひこう",            color: "amber"  },
  comms:   { sigil: "  ╲│╱\n ─ ╳ ─\n  ╱│╲\n   │\n ▄▄▙▄▄",                title: "COMMS",             jp: "通信 ・ つうしん",          color: "blue"   },
  earthWeather: { sigil: " ░░░░░\n░░▆▆░░\n░▆██▆░\n░░▆▆░░\n ░░░░░",       title: "EARTH WEATHER",     jp: "地球気象 ・ ちきゅうきしょう", color: "green" },
  spaceWeather: { sigil: "  ☀  \n ╱│╲ \n░╱ │ ╲░\n  ░│░\n  ░│░",            title: "SPACE WEATHER",     jp: "宇宙天気 ・ うちゅうてんき",  color: "amber" },
  voice:   { sigil: "  ▗▄▖\n ▟▀▀▙\n █ ◉ █\n ▝▙▟▘\n  ╲╱",                  title: "VOICE",             jp: "音声 ・ おんせい",          color: "amber"  },
  dialogue:{ sigil: "╭───────╮\n│ ░░░░░ │\n│ ░░░░  │\n╰─╮ ─░░ │\n  ╰─────╯", title: "DIALOGUE",       jp: "対話 ・ たいわ",            color: "copper" },
  fx:      { sigil: "▐███▌  QND\n▐██▌   VBE\n▐██▌   HIS\n▐█▌    SCT\n░░░    GRN", title: "RADIO FX",     jp: "無線エフェクト ・ むせんエフェクト", color: "green" },
  spectro: { sigil: "▌▌▌  ▌ ▌▌▌\n▌▌▌▌ ▌▌▌▌▌\n▌▌▌▌▌▌▌▌▌▌\n▌▌▌▌ ▌▌▌▌▌\n▌▌▌  ▌ ▌▌▌", title: "SPECTROGRAM", jp: "スペクトログラム",      color: "blue"   },
  stitch:  { sigil: "╭──┬──┬──┬──╮\n│U1│U2│U3│U4│\n╰──┴──┴──┴──╯\n   ╲ │ ╱\n   manifest", title: "STITCH · EXPORT", jp: "編集と書き出し ・ へんしゅう", color: "copper" },
  seismograph: { sigil: "▁▂▃▅▇█▇▅▃▂▁\n  ▕ ▏ ▕ ▏\n──▼───▼──", title: "SEISMOGRAPH", jp: "地震計 ・ じしんけい", color: "green" },
  relative:    { sigil: "  ╱── ╲\n ╱ ┼╳ ╲\n│ ╲ ╱ │\n ╲ ─── ╱\n ──▶ ──◀", title: "RELATIVE", jp: "相対 ・ そうたい", color: "amber" },

  // Role sigils
  capcom: " ▄██▄\n██▝▘██\n ▝██▘\n  ║║\n══╩╩══",
  ship:   "  ▗▙▖\n ▟███▙\n█  ▼  █\n ▀▀▀▀▀\n ─────",
};

// ─────────────────────────────────────────────────────────
// <GlyphSigil glyph={name} size="sm|md|lg" mono>
//   draws a sigil as <pre>, with a faint glow in the accent color.
// ─────────────────────────────────────────────────────────
window.GlyphSigil = function GlyphSigil({ glyph, size = "md", inline = false, color }) {
  const g = window.ALPHA2_GLYPHS[glyph];
  if (!g) return null;
  const accent = GL[color || g.color || "copper"] || GL.copper;
  const fs = { sm: 8, md: 11, lg: 14 }[size] || 11;
  const art = typeof g === "string" ? g : g.sigil;
  return (
    <pre style={{
      margin: 0,
      fontFamily: GF2.mono,
      fontSize: fs,
      lineHeight: 1,
      color: accent,
      whiteSpace: "pre",
      textShadow: `0 0 6px ${accent}55`,
      display: inline ? "inline-block" : "block",
      letterSpacing: 0,
    }}>{art}</pre>
  );
};

// ─────────────────────────────────────────────────────────
// <ScreenH1 glyph="mc" title="Mission Control" sub="…" tags={[…]}>
//   Standard header. Sigil left, title + JP subtitle + sub right.
// ─────────────────────────────────────────────────────────
window.ScreenH1 = function ScreenH1({ glyph, title, sub, tags, actions, jp }) {
  const g = window.ALPHA2_GLYPHS[glyph] || {};
  const accent = GL[g.color || "copper"];
  const japanese = jp || g.jp;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: "0 0 auto", gap: 14 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", minWidth: 0 }}>
        <window.GlyphSigil glyph={glyph} size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontFamily: GF2.display, fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {title}
            </h1>
            {japanese && (
              <span style={{
                fontFamily: "'Hiragino Sans', 'Yu Gothic UI', 'Noto Sans JP', sans-serif",
                fontSize: 13, fontWeight: 400, color: accent, letterSpacing: "0.08em",
                textShadow: `0 0 6px ${accent}33`,
              }}>{japanese}</span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            {tags && tags.map((t, i) => (
              <window.ATag key={i} color={t.color} filled={t.filled}>{t.label}</window.ATag>
            ))}
          </div>
          <p style={{ margin: 0, fontFamily: GF2.mono, fontSize: 11, color: GL.muted }}>{sub}</p>
        </div>
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>{actions}</div>}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// <GlyphPanel> — a card showing an ASCII art panel with a small caption.
// Used inside screens to render placeholder/empty/manifest blocks.
// ─────────────────────────────────────────────────────────
window.GlyphPanel = function GlyphPanel({ art, caption, accent = "copper", style = {} }) {
  const c = GL[accent] || accent;
  return (
    <div style={{
      background: "#04060a",
      border: `1px solid ${GL.hair}`,
      borderLeft: `2px solid ${c}`,
      borderRadius: 3,
      padding: 10,
      ...style,
    }}>
      <pre style={{
        margin: 0, fontFamily: GF2.mono, fontSize: 11, lineHeight: 1.1,
        color: c, whiteSpace: "pre",
        textShadow: `0 0 4px ${c}55`,
      }}>{art}</pre>
      {caption && (
        <div style={{
          marginTop: 6, fontFamily: GF2.display, fontSize: 8, fontWeight: 700,
          letterSpacing: "0.22em", color: GL.muted, textTransform: "uppercase",
        }}>{caption}</div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// <RoleBadge role="CAPCOM|SHIP" size="sm|md"> — portal sigil + label.
// ─────────────────────────────────────────────────────────
window.RoleBadge = function RoleBadge({ role, size = "md", sub }) {
  const art = role === "CAPCOM" ? window.ALPHA2_GLYPHS.capcom : window.ALPHA2_GLYPHS.ship;
  const c = role === "CAPCOM" ? GL.capcom : GL.ship;
  const fs = size === "sm" ? 7 : 9;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <pre style={{
        margin: 0, fontFamily: GF2.mono, fontSize: fs, lineHeight: 1,
        color: c, whiteSpace: "pre",
        textShadow: `0 0 4px ${c}55`,
      }}>{art}</pre>
      <span style={{ display: "inline-flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontFamily: GF2.display, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: c }}>{role}</span>
        {sub && <span style={{ fontFamily: GF2.mono, fontSize: 9, color: GL.muted }}>{sub}</span>}
      </span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────
// Narrative Signal Draft block — Codex-like console card.
// ─────────────────────────────────────────────────────────
window.NarrativeSignalDraft = function NarrativeSignalDraft({ phase, flight, comms, earth, space, suggested }) {
  return (
    <div style={{
      background: "#04060a", border: `1px solid ${GL.copper}55`, borderRadius: 4, padding: 12,
      boxShadow: `0 0 0 1px ${GL.copperGlow}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontFamily: GF2.display, fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", color: GL.copper, textTransform: "uppercase" }}>
          ▸ Narrative Signal Draft
        </span>
        <span style={{ fontFamily: GF2.mono, fontSize: 9, color: GL.muted }}>why the system suggested this sound</span>
      </div>
      <pre style={{
        margin: 0, fontFamily: GF2.mono, fontSize: 11, lineHeight: 1.55, color: GL.text,
        whiteSpace: "pre-wrap",
      }}>
{`mission phase   ${phase}
flight          ${flight}
comms           ${comms}
earth weather   ${earth}
space weather   ${space}
─────────────── ${"─".repeat(48)}
suggested       ${suggested}`}
      </pre>
    </div>
  );
};
