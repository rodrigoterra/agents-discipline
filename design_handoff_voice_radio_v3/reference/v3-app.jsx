// VRP v3 — round-5 only canvas. Four coherent screens, one design system.

function V3App() {
  return (
    <window.DesignCanvas>
      <window.DCSection
        id="v3-final"
        title="Round 5 · Final direction — coherent visual system"
        subtitle="One language across four screens: same chrome, palette, type, and components. Single accent (copper). Persistent top bar / left rail / right context / bottom transport. Each screen owns one job."
      >
        <window.DCArtboard id="v3-console" label="V3-01 · Console" width={1280} height={880}>
          <window.V3Console />
        </window.DCArtboard>
        <window.DCArtboard id="v3-voice" label="V3-02 · Voice Lab" width={1280} height={880}>
          <window.V3VoiceLab />
        </window.DCArtboard>
        <window.DCArtboard id="v3-fx" label="V3-03 · FX Lab" width={1280} height={880}>
          <window.V3FXLab />
        </window.DCArtboard>
        <window.DCArtboard id="v3-stitch" label="V3-04 · Stitch & Export" width={1280} height={880}>
          <window.V3Stitch />
        </window.DCArtboard>
      </window.DCSection>
    </window.DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<V3App />);
