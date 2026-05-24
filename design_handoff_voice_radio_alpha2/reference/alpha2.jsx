// ALPHA2 design canvas root.

function Alpha2Canvas() {
  return (
    <DesignCanvas storageKey="vrp-alpha2-canvas">
      <DCSection id="alpha2-narrative" title="Voice Radio · ALPHA2 · narrative lane"
        subtitle="Mission Control · Flight · COMMS · Earth Weather · Space Weather">
        <DCArtboard id="a2-mc"      label="01 · Mission Control"  width={1440} height={900}>
          <window.ScreenMissionControl />
        </DCArtboard>
        <DCArtboard id="a2-flight"  label="02 · Flight"            width={1440} height={900}>
          <window.ScreenFlight />
        </DCArtboard>
        <DCArtboard id="a2-comms"   label="03 · COMMS"             width={1440} height={900}>
          <window.ScreenComms />
        </DCArtboard>
        <DCArtboard id="a2-weather" label="04 · Weather · Earth + Space" width={1440} height={900}>
          <window.ScreenWeather />
        </DCArtboard>
      </DCSection>

      <DCSection id="alpha2-audio" title="Voice Radio · ALPHA2 · audio lane"
        subtitle="Voice · Dialogue · Radio FX · Spectrogram (optional) · Stitch & Export">
        <DCArtboard id="a2-voice"    label="05 · Voice"      width={1440} height={900}>
          <window.ScreenVoice />
        </DCArtboard>
        <DCArtboard id="a2-dialogue" label="06 · Dialogue"   width={1440} height={900}>
          <window.ScreenDialogue />
        </DCArtboard>
        <DCArtboard id="a2-fx"       label="07 · Radio FX"   width={1440} height={900}>
          <window.ScreenRadioFX />
        </DCArtboard>
        <DCArtboard id="a2-spectro"  label="08 · Spectrogram · optional" width={1440} height={900}>
          <window.ScreenSpectro />
        </DCArtboard>
        <DCArtboard id="a2-stitch"   label="09 · Stitch · Export" width={1440} height={900}>
          <window.ScreenStitch />
        </DCArtboard>
      </DCSection>

      <DCSection id="alpha2-tools" title="Voice Radio · ALPHA2 · tools"
        subtitle="Seismograph · live USGS dashboard · Relative instrument deck">
        <DCArtboard id="a2-seismograph" label="10 · Seismograph · USGS live" width={1440} height={900}>
          <window.ScreenSeismograph />
        </DCArtboard>
        <DCArtboard id="a2-relative" label="11 · Relative · 相対 · 3-instrument deck" width={1440} height={900}>
          <window.ScreenRelative />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Alpha2Canvas />);
