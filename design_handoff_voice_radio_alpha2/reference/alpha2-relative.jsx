// ALPHA2 — Screen: Relative
// TOOLS-lane instrument deck for Earth ↔ Ship relative position.
// Composes the three shell-grade panels (PaintedTrajectory + DeorbitalDescent + SmithReflection)
// onto one 1440×900 canvas. The design-pass exemplar.

window.ScreenRelative = function ScreenRelative() {
  const [wp, setWp] = React.useState("W3");
  return (
    <window.AShell2 active="rel" mode="render" screenLabel="11 Relative · 相対" noRightRail>
      <window.ScreenH1 glyph="relative"
        title="Relative"
        sub="three instruments · one frame · Earth ↔ ship across the deck"
        tags={[
          { label: "INSTRUMENT", color: "copper", filled: true },
          { label: "EST · 推定", color: "muted" },
          { label: "1979 / 1973 / 1969", color: "muted" },
        ]}
        actions={(<>
          <window.ABtn size="md">Recalibrate</window.ABtn>
          <window.ABtn size="md">DEEPNAV PRECISE</window.ABtn>
          <window.ABtn size="md" variant="primary">Snapshot frame</window.ABtn>
        </>)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gridTemplateRows: "1fr auto", gap: 12, flex: 1, minHeight: 0 }}>
        <div style={{ gridRow: "1 / span 2", minHeight: 0, display: "flex", flexDirection: "column" }}>
          <window.PaintedTrajectory selectedWaypoint={wp} onSelect={setWp} height={"100%"} />
        </div>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <window.DeorbitalDescentPanel height={"100%"} />
        </div>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column" }}>
          <window.SmithReflectionPanel height={"100%"} />
        </div>
      </div>
    </window.AShell2>
  );
};
