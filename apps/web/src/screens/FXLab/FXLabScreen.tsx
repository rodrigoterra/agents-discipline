import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  ChannelProfile,
  DegradationMode,
  EnvironmentApplyScope,
  EventDurationMode,
  EventEnvelope,
  MacroControls,
  MissionGeometry,
  SpaceWeatherEvent
} from "@voice-radio/audio-core";
import { V3Btn3D, V3Icon, V3OLED } from "../../components/atoms";
import "./../../components/atoms/animations.css";
import { DSPZone } from "./DSPZone";
import type { DspGroupSpec } from "./DSPZone";
import { SignalMeter } from "./SignalMeter";

type ProfileDefinition = { label: string };
type SavedFxProfile = { id: string; name: string };
type SavedDegradationProfile = { id: string; name: string };
type DefinitionButton<T extends string> = {
  id: T;
  label: string;
  description?: string;
  recommendedIntensity?: number;
  recommendedBaseProfile?: ChannelProfile;
  recommendedDurationMode?: EventDurationMode;
  sonicPreviewText?: string;
  affectedParameters?: Array<keyof MacroControls>;
};
type ScenarioDefinition = { id: string; label: string };
type FxRole = "CAPCOM" | "SHIP";
type FxRackPage = "base" | "environment" | "parameters";

function signalForMode(mode: DegradationMode) {
  return ({ off: 1, subtle: 0.92, nominal: 0.78, severe: 0.55, collapse: 0.3 } as const)[mode];
}

function groupIdFromTitle(title: string): DspGroupSpec["id"] {
  if (title.includes("Quindar")) return "quindar";
  if (title.includes("Voice")) return "voiceband";
  if (title.includes("Hiss")) return "hiss";
  if (title.includes("Scintillation")) return "scint";
  return "granular";
}

function HelpDot({ text }: { text: string }) {
  return <span className="help-dot" title={text} aria-label={text}>?</span>;
}

function affectedParameterText<T extends string>(definitions: Array<DefinitionButton<T>>, id: T) {
  const match = definitions.find((item) => item.id === id);
  return match?.affectedParameters?.join(", ") || "resolved DSP controls";
}

export function FXLabScreen({
  selectedProfileLabel,
  controls,
  selectedProfile,
  profileOrder,
  profileDefinitions,
  savedProfiles,
  savedDegradationProfiles,
  selectedDegradationProfile,
  sliderGroups,
  environmentBaseProfile,
  environmentInfluenceEnabled,
  missionGeometry,
  missionGeometryIntensity,
  missionGeometryScope,
  spaceWeatherEvent,
  spaceWeatherIntensity,
  spaceWeatherDurationMode,
  spaceWeatherEnvelope,
  spaceWeatherScope,
  missionGeometryDefinitions,
  spaceWeatherEventDefinitions,
  missionScenarioDefinitions,
  currentMissionLabel,
  currentMissionPreview,
  currentMissionDescription,
  currentWeatherLabel,
  currentWeatherPreview,
  currentWeatherDescription,
  resolvedPreview,
  affectedParameters,
  environmentStatus,
  fineDspInfluenceEnabled,
  currentUtteranceLabel,
  currentUtteranceText,
  currentUtteranceSpeaker,
  currentFxStatus,
  errorMessage,
  buttonActionStatus,
  busyLabel,
  activePlaybackLabel,
  transportProgress,
  transportDuration,
  nasaSlug,
  nasaAudioUrl,
  nasaReferenceLabel,
  auditionText,
  auditionPath,
  auditionByRole,
  capcomVoiceSummary,
  shipVoiceSummary,
  selectedRawUrl,
  selectedProcessedUrl,
  selectedProcessedIsStale,
  activeFxRole,
  quindarIntro,
  quindarOutro,
  profileName,
  saveStatus,
  applyProfile,
  applyDegradationProfile,
  saveCurrentProfile,
  saveCurrentDegradationProfile,
  deleteSelectedCustomProfile,
  deleteSelectedCustomDegradationProfile,
  setProfileName,
  setEnvironmentBaseProfile,
  setEnvironmentInfluenceEnabled,
  setFineDspInfluenceEnabled,
  setMissionGeometry,
  setMissionGeometryIntensity,
  setMissionGeometryScope,
  setSpaceWeatherEvent,
  setSpaceWeatherIntensity,
  setSpaceWeatherDurationMode,
  setSpaceWeatherEnvelope,
  setSpaceWeatherScope,
  applyMissionGeometry,
  applySpaceWeather,
  applyFullEnvironment,
  simulateSpaceWeatherPass,
  generateCurrentUtteranceAudio,
  auditionVoice,
  setAuditionText,
  processSelectedOnly,
  processSelectedWithSpectrograms,
  previewSelectedFx,
  playNasaReferenceAudio,
  playAudio,
  roleFxAssignments,
  roleFxControlValues,
  roleFxModes,
  roleProcessedAudio,
  setActiveFxRole,
  setQuindarIntro,
  setQuindarOutro,
  assignCurrentFxToRole,
  clearRoleFx,
  resetFxForRole,
  applyScenario,
  updateDegradationMode,
  updateNumber
}: {
  selectedProfileLabel: string;
  controls: MacroControls;
  selectedProfile: string;
  profileOrder: ChannelProfile[];
  profileDefinitions: Record<ChannelProfile, ProfileDefinition>;
  savedProfiles: SavedFxProfile[];
  savedDegradationProfiles: SavedDegradationProfile[];
  selectedDegradationProfile: string;
  sliderGroups: Array<{ title: string; controls: DspGroupSpec["controls"] }>;
  environmentBaseProfile: ChannelProfile;
  environmentInfluenceEnabled: boolean;
  missionGeometry: MissionGeometry;
  missionGeometryIntensity: number;
  missionGeometryScope: EnvironmentApplyScope;
  spaceWeatherEvent: SpaceWeatherEvent;
  spaceWeatherIntensity: number;
  spaceWeatherDurationMode: EventDurationMode;
  spaceWeatherEnvelope: EventEnvelope;
  spaceWeatherScope: EnvironmentApplyScope;
  missionGeometryDefinitions: Array<DefinitionButton<MissionGeometry>>;
  spaceWeatherEventDefinitions: Array<DefinitionButton<SpaceWeatherEvent>>;
  missionScenarioDefinitions: ScenarioDefinition[];
  currentMissionLabel: string;
  currentMissionPreview: string;
  currentMissionDescription: string;
  currentWeatherLabel: string;
  currentWeatherPreview: string;
  currentWeatherDescription: string;
  resolvedPreview: MacroControls;
  affectedParameters: string[];
  environmentStatus: string;
  fineDspInfluenceEnabled: boolean;
  currentUtteranceLabel: string;
  currentUtteranceText: string;
  currentUtteranceSpeaker?: FxRole;
  currentFxStatus: string;
  errorMessage: string;
  buttonActionStatus: string;
  busyLabel: string;
  activePlaybackLabel: string;
  transportProgress: number;
  transportDuration: number;
  nasaSlug: string;
  nasaAudioUrl?: string;
  nasaReferenceLabel: string;
  auditionText: string;
  auditionPath?: string;
  auditionByRole?: Partial<Record<FxRole, string>>;
  capcomVoiceSummary: string;
  shipVoiceSummary: string;
  selectedRawUrl?: string;
  selectedProcessedUrl?: string;
  selectedProcessedIsStale: boolean;
  activeFxRole: FxRole;
  quindarIntro: boolean;
  quindarOutro: boolean;
  profileName: string;
  saveStatus: string;
  applyProfile: (id: string) => void;
  applyDegradationProfile: (id: string) => void;
  saveCurrentProfile: () => void;
  saveCurrentDegradationProfile: () => void;
  deleteSelectedCustomProfile: () => void;
  deleteSelectedCustomDegradationProfile: () => void;
  setProfileName: (value: string) => void;
  setEnvironmentBaseProfile: (profile: ChannelProfile) => void;
  setEnvironmentInfluenceEnabled: (enabled: boolean) => void;
  setFineDspInfluenceEnabled: (enabled: boolean) => void;
  setMissionGeometry: (geometry: MissionGeometry) => void;
  setMissionGeometryIntensity: (intensity: number) => void;
  setMissionGeometryScope: (scope: EnvironmentApplyScope) => void;
  setSpaceWeatherEvent: (event: SpaceWeatherEvent) => void;
  setSpaceWeatherIntensity: (intensity: number) => void;
  setSpaceWeatherDurationMode: (mode: EventDurationMode) => void;
  setSpaceWeatherEnvelope: (envelope: EventEnvelope) => void;
  setSpaceWeatherScope: (scope: EnvironmentApplyScope) => void;
  applyMissionGeometry: () => void;
  applySpaceWeather: () => void;
  applyFullEnvironment: () => void;
  simulateSpaceWeatherPass: () => void;
  generateCurrentUtteranceAudio: () => void;
  auditionVoice: () => void;
  setAuditionText: (value: string) => void;
  processSelectedOnly: () => void;
  processSelectedWithSpectrograms: () => void;
  previewSelectedFx: () => void;
  playNasaReferenceAudio: () => void;
  playAudio: (url: string | undefined, label: string) => void;
  roleFxAssignments: Record<FxRole, string>;
  roleFxControlValues: Record<FxRole, MacroControls>;
  roleFxModes: Record<FxRole, "assigned" | "live">;
  roleProcessedAudio: Partial<Record<FxRole, { url: string; label: string }>>;
  setActiveFxRole: (role: FxRole) => void;
  setQuindarIntro: (enabled: boolean) => void;
  setQuindarOutro: (enabled: boolean) => void;
  assignCurrentFxToRole: (role: FxRole) => void;
  clearRoleFx: (role: FxRole) => void;
  resetFxForRole: (role: FxRole) => void;
  applyScenario: (id: string) => void;
  updateDegradationMode: (mode: DegradationMode) => void;
  updateNumber: (key: keyof MacroControls, value: number) => void;
}) {
  const [tick, setTick] = useState(0);
  const [fxRackPage, setFxRackPage] = useState<FxRackPage>("base");
  const [fineDspGroupsEnabled, setFineDspGroupsEnabled] = useState<Record<DspGroupSpec["id"], boolean>>({
    quindar: true,
    voiceband: true,
    hiss: true,
    scint: true,
    granular: true
  });
  const signal = signalForMode(controls.degradationMode);
  const valuesFromControls = (sourceControls: MacroControls) => {
    const out: Record<string, number> = {};
    for (const group of sliderGroups) {
      for (const control of group.controls) out[control.key] = Number(sourceControls[control.key as keyof MacroControls] ?? 0);
    }
    return out;
  };
  const values = useMemo(() => {
    return valuesFromControls(controls);
  }, [controls, sliderGroups]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  const groupSpecs = {
    quindar: { color: "#d9a857", oled: "wave", icon: "tower", btn: "yellow" },
    voiceband: { color: "#e07a3c", oled: "spectrum", icon: "filter", btn: "copper" },
    hiss: { color: "#7ad99a", oled: "dotgrid", icon: "noise", btn: "mint" },
    scint: { color: "#6c92d8", oled: "wave", icon: "satellite", btn: "navy" },
    granular: { color: "#e85d4a", oled: "scope", icon: "wifiOff", btn: "red" }
  } as const;

  const dspGroups: DspGroupSpec[] = sliderGroups.map((group) => ({ ...group, id: groupIdFromTitle(group.title) }));
  const activeRoleMode = roleFxModes[activeFxRole];
  const previewGlowClass = selectedRawUrl
    ? activeRoleMode === "assigned"
      ? "fx-ready-assigned"
      : selectedProfile === "manual"
        ? "fx-ready-live"
        : "fx-ready-preset"
    : "";
  const roleSourceCopy = activeRoleMode === "assigned"
    ? `${activeFxRole} has a saved role recipe. While ${activeFxRole} is selected, channel, degradation, environment, and fine DSP changes update that ${activeFxRole} recipe. Process again whenever you change the sound.`
    : `${activeFxRole} is using temporary live FX. Changes affect preview/process now, but no role recipe is saved until you save it to ${activeFxRole}. Process again whenever you change the sound.`;
  const selectedRawReady = Boolean(selectedRawUrl);
  const selectedFxReady = Boolean(selectedProcessedUrl && !selectedProcessedIsStale);
  const selectedFxWaiting = selectedProcessedUrl
    ? selectedProcessedIsStale
      ? "stale - reprocess needed"
      : "current"
    : selectedRawUrl
      ? "raw ready - process FX"
      : "waiting for raw source";
  const isBusy = Boolean(busyLabel);
  const isProcessingFx = /process|preview|spectrogram/i.test(busyLabel);
  const previewButtonClass = `${previewGlowClass}${isProcessingFx ? " fx-action-running" : ""}`;
  const fxStackSummary = [
    `${activeFxRole}`,
    activeRoleMode === "assigned" ? "assigned recipe" : "live rack",
    selectedProfileLabel,
    controls.degradationMode,
    environmentInfluenceEnabled ? `${currentMissionLabel} ${missionGeometryIntensity.toFixed(2)}` : "environment off",
    environmentInfluenceEnabled ? `${currentWeatherLabel} ${spaceWeatherIntensity.toFixed(2)}` : "weather off",
    fineDspInfluenceEnabled ? "fine DSP on" : "fine DSP off"
  ].join(" -> ");
  const rawSourceSummary = selectedRawUrl
    ? `${currentUtteranceLabel} · RAW source ready for FX`
    : `${currentUtteranceLabel} · no RAW source rendered yet`;
  const processedFxSummary = selectedProcessedUrl
    ? selectedProcessedIsStale
      ? "Processed FX is stale after sound changes. Reprocess to hear the new stack."
      : "Processed FX matches the current sound stack."
    : "No processed FX committed yet.";
  const testOledData = Array.from({ length: 48 }, (_, index) => {
    const base = selectedFxReady ? 0.72 : selectedRawReady ? 0.46 : 0.18;
    const modulation = Math.sin(index * 0.42) * Number(controls.scintillationDepth ?? 0.1) * 0.22;
    const packet = index % 9 === 0 ? -Number(controls.dropoutProbability ?? 0) * 0.5 : 0;
    return Math.max(0.05, Math.min(0.95, base + modulation + packet + Number(controls.noise ?? 0) * 0.16));
  });
  const envOledData = Array.from({ length: 48 }, (_, index) => {
    const weatherPulse = spaceWeatherEvent === "calm_link" ? 0.06 : 0.2 + spaceWeatherIntensity * 0.3;
    const geometryRoll = Math.sin(index * 0.31) * missionGeometryIntensity * 0.18;
    return Math.max(0.06, Math.min(0.96, signal * 0.55 + weatherPulse + geometryRoll));
  });
  const selectedVoiceSummary = activeFxRole === "SHIP" ? shipVoiceSummary : capcomVoiceSummary;
  const transportPct = transportDuration > 0 ? Math.max(0, Math.min(1, transportProgress / transportDuration)) : 0;
  const fxRoles = ["CAPCOM", "SHIP"] as const satisfies readonly FxRole[];
  const roleStackSpecs = {
    CAPCOM: { accent: "#d9a857", button: "yellow", voice: capcomVoiceSummary },
    SHIP: { accent: "#7ad99a", button: "mint", voice: shipVoiceSummary }
  } as const;

  return (
    <div className="screen-stack fx-enhanced-screen">
      <div className="fx-enhanced-head">
        <div>
          <h1>FX Lab · Enhanced</h1>
          <p><V3Icon name="tower" size={12} color="#e07a3c" pulse /> Channel <span>{selectedProfileLabel}</span> · degradation <span>{controls.degradationMode}</span> · signal {(signal * 100).toFixed(0)}%</p>
        </div>
        <div className="fx-head-status">
          <strong>{activeFxRole} Stack</strong>
          <span>{selectedProfileLabel} · {controls.degradationMode}</span>
          <em>{selectedFxWaiting}</em>
        </div>
      </div>

      <div className="fx-rack-tabs">
        <V3Btn3D color={fxRackPage === "base" ? "copper" : "grey"} size="sm" maxW={144} label="FX 1 · Role + Channel" pressed={fxRackPage === "base"} onClick={() => setFxRackPage("base")} />
        <V3Btn3D color={fxRackPage === "environment" ? "navy" : "grey"} size="sm" maxW={166} label="FX 2 · Environment" pressed={fxRackPage === "environment"} onClick={() => setFxRackPage("environment")} />
        <V3Btn3D color={fxRackPage === "parameters" ? "yellow" : "grey"} size="sm" maxW={166} label="FX 3 · Fine DSP" pressed={fxRackPage === "parameters"} onClick={() => setFxRackPage("parameters")} />
      </div>

      {fxRackPage === "base" && <>
      <section className="v3-dsp-zone fx-test-bench-zone is-accent">
        <header>
          <div>
            <strong>Selected Utterance Test Bench</strong>
            <em>/ {currentUtteranceLabel} · target {activeFxRole}</em>
            <HelpDot text="FX controls do not alter already-rendered audio until you process the selected utterance again. Use this bench to compare raw TTS and refreshed FX before Stitch." />
          </div>
          <div className="zone-badges">
            {selectedRawUrl ? <span className="zone-on" style={{ "--zone-color": "#7ad99a" } as CSSProperties}>RAW READY</span> : <span className="zone-on" style={{ "--zone-color": "#d9a857" } as CSSProperties}>RAW NEEDED</span>}
            {selectedProcessedUrl && !selectedProcessedIsStale ? <span className="zone-on" style={{ "--zone-color": "#7ad99a" } as CSSProperties}>FX CURRENT</span> : selectedProcessedUrl ? <span className="loss-pill">STALE FX</span> : <span className="zone-on" style={{ "--zone-color": "#d9a857" } as CSSProperties}>FX NEEDED</span>}
          </div>
        </header>
        <div className="fx-flow-strip">
          <span><b>1</b> Select CAPCOM or SHIP as the FX target</span>
          <span><b>2</b> Save a role recipe or use temporary live FX</span>
          <span><b>3</b> Build the radio link in the console below</span>
          <span><b>4</b> Process again after each sound change</span>
        </div>
        <div className="fx-tts-source-panel">
          <div className="fx-tts-copy">
            <strong>TTS Scratchpad Source</strong>
            <span>Audition Casting only checks the selected voice. Render RAW Source creates the clean voice clip that the FX console will process and reprocess.</span>
            <em>Selected utterance: {currentUtteranceLabel} · voice source: {selectedVoiceSummary}</em>
          </div>
          <div className="fx-voice-cards">
            <button className={activeFxRole === "CAPCOM" ? "is-active" : ""} onClick={() => setActiveFxRole("CAPCOM")} type="button">
              <b>CAPCOM voice</b>
              <span>{capcomVoiceSummary}</span>
            </button>
            <button className={activeFxRole === "SHIP" ? "is-active" : ""} onClick={() => setActiveFxRole("SHIP")} type="button">
              <b>SHIP voice</b>
              <span>{shipVoiceSummary}</span>
            </button>
          </div>
          <textarea
            rows={4}
            value={auditionText}
            onChange={(event) => setAuditionText(event.target.value)}
            placeholder="Type a short CAPCOM or SHIP line to audition before generating the raw test clip."
          />
          <div className="btn3d-wrap">
            <V3Btn3D color="grey" size="sm" maxW={142} label="Use Selected Text" onClick={() => setAuditionText(currentUtteranceText || auditionText)} />
            <V3Btn3D color="white" size="sm" maxW={142} label="Audition Casting" disabled={isBusy} onClick={auditionVoice} />
            <V3Btn3D color="copper" size="sm" maxW={176} label="Render RAW Source for FX" disabled={isBusy} onClick={generateCurrentUtteranceAudio} />
          </div>
          <RoleAudioDeck
            activeRole={activeFxRole}
            activePlaybackLabel={activePlaybackLabel}
            auditionByRole={auditionByRole}
            fallbackAuditionPath={auditionPath}
            capcomVoiceSummary={capcomVoiceSummary}
            shipVoiceSummary={shipVoiceSummary}
            playAudio={playAudio}
            progress={transportPct}
          />
        </div>
        <div className="fx-role-assign-grid">
          <div className={`fx-role-card${activeFxRole === "CAPCOM" ? " active" : ""}${roleFxModes.CAPCOM === "assigned" ? " assigned" : " live"}`}>
            <strong>CAPCOM FX assignment</strong>
            <span>{roleFxAssignments.CAPCOM}</span>
              <em>{roleFxModes.CAPCOM === "assigned" ? "Saved role recipe: CAPCOM keeps its own final FX stack. When CAPCOM is active, sound changes update this CAPCOM recipe." : "Temporary live FX: CAPCOM uses the current console only for preview/process. It is not saved as the CAPCOM recipe."}</em>
              <div className="btn3d-wrap">
                <V3Btn3D color="yellow" size="sm" maxW={162} label="Save Current FX to CAPCOM" pressed={activeFxRole === "CAPCOM" && roleFxModes.CAPCOM === "assigned"} onClick={() => assignCurrentFxToRole("CAPCOM")} />
              <V3Btn3D color={activeFxRole === "CAPCOM" && roleFxModes.CAPCOM === "live" ? "mint" : "grey"} size="sm" maxW={142} label="Temporary Live FX" pressed={activeFxRole === "CAPCOM" && roleFxModes.CAPCOM === "live"} onClick={() => clearRoleFx("CAPCOM")} />
              <V3Btn3D color="red" size="sm" maxW={96} label="Clear FX" onClick={() => resetFxForRole("CAPCOM")} />
            </div>
            <RoleProcessedFxDeck
              activePlaybackLabel={activePlaybackLabel}
              audio={roleProcessedAudio.CAPCOM}
              color="amber"
              playAudio={playAudio}
              progress={transportPct}
              role="CAPCOM"
            />
          </div>
          <div className={`fx-role-card${activeFxRole === "SHIP" ? " active" : ""}${roleFxModes.SHIP === "assigned" ? " assigned" : " live"}`}>
            <strong>SHIP FX assignment</strong>
            <span>{roleFxAssignments.SHIP}</span>
              <em>{roleFxModes.SHIP === "assigned" ? "Saved role recipe: SHIP keeps its own final FX stack. When SHIP is active, sound changes update this SHIP recipe." : "Temporary live FX: SHIP uses the current console only for preview/process. It is not saved as the SHIP recipe."}</em>
              <div className="btn3d-wrap">
                <V3Btn3D color="mint" size="sm" maxW={162} label="Save Current FX to SHIP" pressed={activeFxRole === "SHIP" && roleFxModes.SHIP === "assigned"} onClick={() => assignCurrentFxToRole("SHIP")} />
              <V3Btn3D color={activeFxRole === "SHIP" && roleFxModes.SHIP === "live" ? "mint" : "grey"} size="sm" maxW={142} label="Temporary Live FX" pressed={activeFxRole === "SHIP" && roleFxModes.SHIP === "live"} onClick={() => clearRoleFx("SHIP")} />
              <V3Btn3D color="red" size="sm" maxW={96} label="Clear FX" onClick={() => resetFxForRole("SHIP")} />
            </div>
            <RoleProcessedFxDeck
              activePlaybackLabel={activePlaybackLabel}
              audio={roleProcessedAudio.SHIP}
              color="green"
              playAudio={playAudio}
              progress={transportPct}
              role="SHIP"
            />
          </div>
        </div>
      </section>

      <section className="v3-dsp-zone signal-chain-console is-accent">
        <header>
          <div>
            <strong>Radio Link Render Console</strong>
            <em>/ channel + degradation + render controls</em>
            <HelpDot text="Choose a communication channel, layer degradation, then process the selected RAW source. Every preset or slider change makes the old processed clip stale until you render again." />
          </div>
          <div className="zone-badges">
            <span className="zone-on" style={{ "--zone-color": activeRoleMode === "assigned" ? "#d9a857" : "#7ad99a" } as CSSProperties}>{activeFxRole} · {activeRoleMode.toUpperCase()}</span>
          </div>
        </header>
        <div className="signal-chain-stack">
          <div className="signal-chain-controls">
            <div className="strip-group channel-strip-group">
              <span>Communication Channel Presets</span>
              <small>Pick the baseline link color for {activeFxRole}. This is the starting radio system before degradation, environment, and fine DSP.</small>
              <div>
                {profileOrder.map((id) => (
                  <V3Btn3D key={id} color={selectedProfile === id ? "copper" : "grey"} size="sm" h={44} maxW={120} label={profileDefinitions[id].label} onClick={() => applyProfile(id)} />
                ))}
                {savedProfiles.map((profile) => (
                  <V3Btn3D key={profile.id} color={selectedProfile === profile.id ? "copper" : "grey"} size="sm" h={44} maxW={120} label={`User · ${profile.name}`} onClick={() => applyProfile(profile.id)} />
                ))}
              </div>
            </div>
            <div className="strip-group degradation-strip-group">
              <span>Signal Degradation Presets</span>
              <small>Stack a severity layer over any channel. Off, subtle, nominal, severe, and collapse are independent from the channel preset.</small>
              <div>
                {(["off", "subtle", "nominal", "severe", "collapse"] as DegradationMode[]).map((mode) => (
                  <V3Btn3D key={mode} color={controls.degradationMode === mode ? mode === "off" ? "white" : mode === "subtle" ? "mint" : mode === "nominal" ? "yellow" : mode === "severe" ? "red" : "black" : "grey"} size="sm" h={44} maxW={108} label={mode} onClick={() => updateDegradationMode(mode)} />
                ))}
                {savedDegradationProfiles.map((profile) => (
                  <V3Btn3D key={profile.id} color={selectedDegradationProfile === profile.id ? "copper" : "grey"} size="sm" h={44} maxW={128} label={`User · ${profile.name}`} onClick={() => applyDegradationProfile(profile.id)} />
                ))}
              </div>
            </div>
            <div className="fx-inline-action">
              <SignalMeter signal={signal} tick={tick} />
              <LinkOrbitInfographic activeRole={activeFxRole} channelLabel={selectedProfileLabel} signal={signal} />
              <div className="quindar-toggle-panel" aria-label="Quindar tone rendering">
                <span>Quindar tones</span>
                <button className={quindarIntro ? "active" : ""} type="button" onClick={() => setQuindarIntro(!quindarIntro)}>Intro</button>
                <button className={quindarOutro ? "active" : ""} type="button" onClick={() => setQuindarOutro(!quindarOutro)}>Outro</button>
                <em>Rendered into the next FX process.</em>
              </div>
              <div className="btn3d-wrap">
                <V3Btn3D color="copper" size="md" maxW={148} label="Process FX Stack" disabled={isBusy} className={busyLabel.includes("Processing FX") ? "fx-action-running" : ""} onClick={processSelectedOnly} />
                <V3Btn3D color="yellow" size="md" maxW={126} label="Preview FX" disabled={isBusy} className={previewButtonClass} onClick={previewSelectedFx} />
                <V3Btn3D color={selectedProcessedUrl ? "mint" : "grey"} size="md" maxW={132} label="Play Processed FX" onClick={() => playAudio(selectedProcessedUrl, `${currentUtteranceLabel} channel/degradation FX`)} />
              </div>
            </div>
          </div>
        <div className="fx-test-bench-grid signal-render-grid">
          <div className={`fx-test-copy ${activeRoleMode}`}>
            <strong>{selectedProfileLabel}</strong>
            <span>Working role: {activeFxRole} · {activeRoleMode === "assigned" ? "saved role recipe" : "temporary live FX"}</span>
            <span>{roleSourceCopy}</span>
            <span>RAW source: {rawSourceSummary}</span>
            <span>Processed FX: {processedFxSummary}</span>
            <span>{currentFxStatus}</span>
            {saveStatus && <em>{saveStatus}</em>}
          </div>
          <FxNavDisplay
            activeRole={activeFxRole}
            busy={isProcessingFx}
            channelLabel={selectedProfileLabel}
            data={testOledData}
            degradation={controls.degradationMode}
            processedReady={Boolean(selectedProcessedUrl)}
            progress={transportPct}
            signal={signal}
            stale={selectedProcessedIsStale}
          />
          <div className="fx-button-cluster">
            <div className="btn3d-wrap">
              <V3Btn3D color="white" size="md" label="1 Render RAW Source" maxW={162} disabled={isBusy} className={busyLabel.includes("Generating raw") ? "fx-action-running" : ""} onClick={generateCurrentUtteranceAudio} />
              <V3Btn3D color="copper" size="md" label="2 Process FX Stack" maxW={158} disabled={isBusy} className={busyLabel.includes("Processing FX") ? "fx-action-running" : ""} onClick={processSelectedOnly} />
              <V3Btn3D color="grey" size="md" label="3 ▶ Dry" maxW={94} onClick={() => playAudio(selectedRawUrl, `${currentUtteranceLabel} raw TTS`)} />
              <V3Btn3D color="yellow" size="md" label="4 Preview FX" maxW={124} disabled={isBusy} className={previewButtonClass} onClick={previewSelectedFx} />
              <V3Btn3D color={selectedProcessedIsStale ? "yellow" : "mint"} size="md" label="5 ▶ Processed FX" maxW={132} className={selectedProcessedUrl ? selectedProcessedIsStale ? "fx-play-stale" : "fx-play-current" : ""} onClick={() => playAudio(selectedProcessedUrl, `${currentUtteranceLabel} processed FX`)} />
              <V3Btn3D color="navy" size="md" label="6 Generate Spectrogram" maxW={196} disabled={isBusy} className={busyLabel.includes("spectrogram") ? "fx-action-running" : ""} onClick={processSelectedWithSpectrograms} />
            </div>
            <div className="fx-button-status">
              <strong>{busyLabel ? "Working now" : "Button status"}</strong>
              {errorMessage && <mark>{errorMessage}</mark>}
              <span>{buttonActionStatus}</span>
              <em>Current output: {selectedFxWaiting}. Audition Casting is only a voice test. Render RAW Source creates FX input; Process FX Stack commits the processed WAV for Stitch.</em>
            </div>
          </div>
        </div>
        </div>
      </section>

      <section className="v3-dsp-zone fx-influence-zone is-accent">
        <header>
          <div>
            <strong>Add Influence</strong>
            <em>/ optional racks for the same role FX stack</em>
          </div>
        </header>
        <div className="fx-influence-body">
          <p>Start with role + channel + degradation on FX 1. Add Environment Simulation when you want mission geometry or weather to reshape the radio failure. Add Fine DSP Parameters when you want manual slider control after the presets.</p>
          <div className="btn3d-wrap">
            <V3Btn3D
              color={environmentInfluenceEnabled ? "navy" : "grey"}
              size="lg"
              maxW={238}
              label={`Environment Simulation · ${environmentInfluenceEnabled ? "ON" : "OFF"}`}
              pressed={environmentInfluenceEnabled}
              onClick={() => {
                setEnvironmentInfluenceEnabled(!environmentInfluenceEnabled);
                setFxRackPage("environment");
              }}
            />
            <V3Btn3D
              color={fineDspInfluenceEnabled ? "yellow" : "grey"}
              size="lg"
              maxW={228}
              label={`Fine DSP Parameters · ${fineDspInfluenceEnabled ? "ON" : "OFF"}`}
              pressed={fineDspInfluenceEnabled}
              onClick={() => {
                setFineDspInfluenceEnabled(!fineDspInfluenceEnabled);
                setFxRackPage("parameters");
              }}
            />
          </div>
        </div>
      </section>
      </>}

      {fxRackPage === "environment" && (
      <section className="v3-dsp-zone environment-rack-zone is-accent">
        <header>
          <div>
            <strong>Environment Simulator</strong>
            <em>/ mission geometry + space weather</em>
            <HelpDot text="Mission geometry and weather are high-level transforms. Apply them first, then process the selected utterance so the new resolved DSP controls create a new FX clip for Stitch." />
          </div>
          <div className="zone-badges">
            <span className="zone-on" style={{ "--zone-color": environmentInfluenceEnabled ? "#7ad99a" : "#8a8b86" } as CSSProperties}><V3Icon name="satellite" size={11} color={environmentInfluenceEnabled ? "#7ad99a" : "#8a8b86"} spin={environmentInfluenceEnabled} /> {environmentInfluenceEnabled ? "ON" : "OFF"}</span>
          </div>
        </header>
        <div className={`fx-rack-arm-banner ${environmentInfluenceEnabled ? "on" : "off"}`}>
          <strong>Environment Influence {environmentInfluenceEnabled ? "ON" : "OFF"}</strong>
          <span>{environmentInfluenceEnabled ? "Mission geometry and space weather can be applied into the active FX stack." : "This rack is visible for planning only. Turn Environment Simulation ON from Add Influence before applying it to the active FX stack."}</span>
          <V3Btn3D color={environmentInfluenceEnabled ? "grey" : "navy"} size="sm" maxW={178} label={environmentInfluenceEnabled ? "Turn Environment OFF" : "Turn Environment ON"} onClick={() => setEnvironmentInfluenceEnabled(!environmentInfluenceEnabled)} />
        </div>
        <div className="fx-stack-tracker">
          <strong>FX Stack Tracker</strong>
          <span>{fxStackSummary}</span>
          <em>Role target, channel, degradation, mission geometry, and space weather combine into the processed WAV used by Stitch.</em>
          <V3Btn3D color="yellow" size="sm" maxW={118} label="Preview FX" disabled={isBusy} className={previewButtonClass} onClick={previewSelectedFx} />
        </div>
        <div className="environment-rack-grid">
          <div className="env-section">
            <h3>Mission Geometry / Link Condition <HelpDot text="Choose the physical link situation. This resolves into bandpass, signal quality, telemetry, reflection, and jitter controls." /></h3>
            <div className="btn3d-wrap">
              {missionGeometryDefinitions.map((item) => (
                <V3Btn3D
                  key={item.id}
                  color={missionGeometry === item.id ? "copper" : "grey"}
                  size="sm"
                  maxW={132}
                  label={item.label}
                  onClick={() => {
                    setMissionGeometry(item.id);
                    if (item.recommendedIntensity !== undefined) setMissionGeometryIntensity(item.recommendedIntensity);
                    if (item.recommendedBaseProfile) setEnvironmentBaseProfile(item.recommendedBaseProfile);
                  }}
                />
              ))}
            </div>
            <p className="env-explain"><strong>{currentMissionLabel}</strong> modifies {affectedParameterText(missionGeometryDefinitions, missionGeometry)}. {currentMissionDescription} Result: {currentMissionPreview}. Press Apply Mission Geometry to write it into the live DSP rack.</p>
            <div className="env-form-grid">
              <label>Base profile<select value={environmentBaseProfile} onChange={(event) => setEnvironmentBaseProfile(event.target.value as ChannelProfile)}>{profileOrder.map((id) => <option key={id} value={id}>{profileDefinitions[id].label}</option>)}</select></label>
              <label>Intensity<input type="range" min="0" max="1" step="0.01" value={missionGeometryIntensity} onChange={(event) => setMissionGeometryIntensity(Number(event.target.value))} /><output>{missionGeometryIntensity.toFixed(2)}</output></label>
              <label>Apply Scope<select value={missionGeometryScope} onChange={(event) => setMissionGeometryScope(event.target.value as EnvironmentApplyScope)}><option value="selected_utterance">Selected Utterance</option><option value="scene_wide">Scene-Wide</option></select></label>
            </div>
            <V3Btn3D color={environmentInfluenceEnabled ? "navy" : "grey"} size="md" maxW={186} label="Apply Mission Geometry" disabled={!environmentInfluenceEnabled} onClick={applyMissionGeometry} />
          </div>

          <div className="env-section">
            <h3>Space Weather Events <HelpDot text="Choose a coherent disturbance condition. In this version envelopes are static approximations, then resolved into the current DSP rack." /></h3>
            <div className="btn3d-wrap">
              {spaceWeatherEventDefinitions.map((item) => (
                <V3Btn3D
                  key={item.id}
                  color={spaceWeatherEvent === item.id ? "red" : "grey"}
                  size="sm"
                  maxW={132}
                  label={item.label}
                  onClick={() => {
                    setSpaceWeatherEvent(item.id);
                    if (item.recommendedIntensity !== undefined) setSpaceWeatherIntensity(item.recommendedIntensity);
                    if (item.recommendedDurationMode) setSpaceWeatherDurationMode(item.recommendedDurationMode);
                  }}
                />
              ))}
            </div>
            <p className="env-explain"><strong>{currentWeatherLabel}</strong> modifies {affectedParameterText(spaceWeatherEventDefinitions, spaceWeatherEvent)}. {currentWeatherDescription} Result: {currentWeatherPreview}. Press Apply Space Weather to write it into the live DSP rack.</p>
            <div className="env-form-grid four">
              <label>Intensity<input type="range" min="0" max="1" step="0.01" value={spaceWeatherIntensity} onChange={(event) => setSpaceWeatherIntensity(Number(event.target.value))} /><output>{spaceWeatherIntensity.toFixed(2)}</output></label>
              <label>Duration<select value={spaceWeatherDurationMode} onChange={(event) => setSpaceWeatherDurationMode(event.target.value as EventDurationMode)}><option value="instant">Instant</option><option value="short">Short</option><option value="medium">Medium</option><option value="full_utterance">Full Utterance</option><option value="scene_wide">Scene-Wide</option></select></label>
              <label>Envelope<select value={spaceWeatherEnvelope} onChange={(event) => setSpaceWeatherEnvelope(event.target.value as EventEnvelope)}><option value="static">Static</option><option value="ramp_up">Ramp Up</option><option value="ramp_down">Ramp Down</option><option value="bell">Bell</option><option value="pulse_train">Pulse Train</option><option value="collapse_then_recover">Collapse Then Recover</option></select></label>
              <label>Scope<select value={spaceWeatherScope} onChange={(event) => setSpaceWeatherScope(event.target.value as EnvironmentApplyScope)}><option value="selected_utterance">Selected Utterance</option><option value="scene_wide">Scene-Wide</option></select></label>
            </div>
            <V3Btn3D color={environmentInfluenceEnabled ? "red" : "grey"} size="md" maxW={168} label="Apply Space Weather" disabled={!environmentInfluenceEnabled} onClick={applySpaceWeather} />
          </div>

          <div className="env-summary-panel">
            <div>
              <strong>Environment Commit Station</strong>
              <p className="env-summary-lede">This station answers: “what will the selected utterance sound like after I add mission link physics and weather?” Nothing changes in Stitch until you process the selected clip again.</p>
              <div className="env-stack-steps">
                <span><b>Base</b>{profileDefinitions[environmentBaseProfile].label}</span>
                <span><b>Geometry</b>{currentMissionLabel} · {missionGeometryIntensity.toFixed(2)} · {currentMissionPreview}</span>
                <span><b>Weather</b>{currentWeatherLabel} · {spaceWeatherIntensity.toFixed(2)} · {currentWeatherPreview}</span>
                <span><b>DSP result</b>SQ {resolvedPreview.signalQuality.toFixed(2)} · dropout {Number(resolvedPreview.dropoutProbability ?? 0).toFixed(2)} · density {Number(resolvedPreview.granularDensity ?? 0).toFixed(2)} · LP {Number(resolvedPreview.lpHz ?? 0).toFixed(0)}Hz</span>
              </div>
              <span>Affected controls: {affectedParameters.join(", ")}</span>
              <span>{environmentStatus}</span>
            </div>
            <V3OLED
              accent={signal < 0.5 ? "#e85d4a" : "#7ad99a"}
              height={88}
              label={<><span><V3Icon name="signal" size={11} /> ENV.OUT</span><span>{(signal * 100).toFixed(0)}%</span></>}
              data={envOledData}
              signal={signal}
              variant="scope"
            />
            <div className="btn3d-wrap env-scenarios">
              <V3Btn3D color={environmentInfluenceEnabled ? "yellow" : "grey"} size="md" label="Simulate Space Weather Pass" maxW={188} disabled={!environmentInfluenceEnabled} onClick={simulateSpaceWeatherPass} />
              <V3Btn3D color={environmentInfluenceEnabled ? "copper" : "grey"} size="md" label="Apply Mission Scenario" maxW={164} disabled={!environmentInfluenceEnabled} onClick={applyFullEnvironment} />
              <V3Btn3D color="yellow" size="md" maxW={128} label="Preview FX" disabled={isBusy} className={previewButtonClass} onClick={previewSelectedFx} />
              <V3Btn3D color="mint" size="md" label="Process + Generate Spectrograms" maxW={206} disabled={isBusy} className={busyLabel.includes("spectrogram") ? "fx-action-running" : ""} onClick={processSelectedWithSpectrograms} />
              {missionScenarioDefinitions.map((scenario) => (
                <V3Btn3D key={scenario.id} color={environmentInfluenceEnabled ? "black" : "grey"} size="sm" maxW={160} label={scenario.label} disabled={!environmentInfluenceEnabled} onClick={() => applyScenario(scenario.id)} />
              ))}
            </div>
            <p>Use Preview FX for a quick listen. Use Process + Spectrograms when you want Stitch and the visual comparison to reflect the environment stack.</p>
          </div>
        </div>
      </section>
      )}

      {fxRackPage === "parameters" && <>
      <div className="fx-enhanced-grid">
        <section className="v3-dsp-zone fx-parameter-intro is-accent">
          <header>
            <div>
              <strong>Fine DSP Parameter Rack</strong>
              <em>/ after preset + environment</em>
            </div>
            <div className="zone-badges">
              <span className="zone-on" style={{ "--zone-color": fineDspInfluenceEnabled ? "#d9a857" : "#8a8b86" } as CSSProperties}>{fineDspInfluenceEnabled ? "ON" : "OFF"}</span>
              <V3Btn3D color={fineDspInfluenceEnabled ? "grey" : "yellow"} size="sm" maxW={164} label={fineDspInfluenceEnabled ? "Turn Fine DSP OFF" : "Turn Fine DSP ON"} onClick={() => setFineDspInfluenceEnabled(!fineDspInfluenceEnabled)} />
            </div>
          </header>
          <div className={`fx-rack-arm-banner ${fineDspInfluenceEnabled ? "on" : "off"}`}>
            <strong>Fine DSP Parameters {fineDspInfluenceEnabled ? "ON" : "OFF"}</strong>
            <span>{fineDspInfluenceEnabled ? "The current channel + degradation preset values are loaded as the starting point. Choose which DSP modules are editable, then save a channel or degradation preset below." : "Sliders are locked. Turn Fine DSP Parameters ON from Add Influence or this header before using manual controls."}</span>
          </div>
          <div className="fine-dsp-module-toggles">
            {dspGroups.map((group) => (
              <V3Btn3D
                key={group.id}
                color={fineDspInfluenceEnabled && fineDspGroupsEnabled[group.id] ? groupSpecs[group.id].btn : "grey"}
                size="sm"
                maxW={150}
                label={`${group.title.split(" / ")[0]} · ${fineDspGroupsEnabled[group.id] ? "ON" : "OFF"}`}
                pressed={fineDspInfluenceEnabled && fineDspGroupsEnabled[group.id]}
                disabled={!fineDspInfluenceEnabled}
                onClick={() => setFineDspGroupsEnabled((current) => ({ ...current, [group.id]: !current[group.id] }))}
              />
            ))}
          </div>
          <p>Use these modules after choosing role, channel, degradation, and environment. The rack is now role-stacked: focus CAPCOM or SHIP, tune the editable column, then process again before Stitch.</p>
        </section>
        <div className="fx-role-stack-grid">
          {fxRoles.map((role) => {
            const isEditableRole = role === activeFxRole;
            const roleMode = roleFxModes[role];
            const processedRoleAudio = roleProcessedAudio[role];
            const stackControls = isEditableRole ? controls : roleFxControlValues[role];
            const stackValues = valuesFromControls(stackControls);
            const stackSignal = signalForMode(stackControls.degradationMode);
            return (
              <section
                key={role}
                className={`fx-role-dsp-stack ${role.toLowerCase()}${isEditableRole ? " active" : ""}${roleMode === "assigned" ? " assigned" : " live"}`}
                style={{ "--role-stack-accent": roleStackSpecs[role].accent } as CSSProperties}
              >
                <header className="fx-role-stack-head">
                  <div>
                    <strong>{role} Role Stack</strong>
                    <em>{roleStackSpecs[role].voice}</em>
                  </div>
                  <div className="zone-badges">
                    <span className="zone-on" style={{ "--zone-color": roleStackSpecs[role].accent } as CSSProperties}>{isEditableRole ? "EDITING" : "VIEW"}</span>
                    <span className="zone-on" style={{ "--zone-color": roleMode === "assigned" ? "#d9a857" : "#7ad99a" } as CSSProperties}>{roleMode.toUpperCase()}</span>
                  </div>
                </header>
                <div className="fx-role-stack-meta">
                  <span>{roleFxAssignments[role]}</span>
                  <span>{processedRoleAudio ? `Processed cue: ${processedRoleAudio.label}` : "No processed role cue committed yet."}</span>
                  <div className="btn3d-wrap">
                    <V3Btn3D color={isEditableRole ? roleStackSpecs[role].button : "grey"} size="sm" maxW={104} label={isEditableRole ? "Editing" : `Focus ${role}`} pressed={isEditableRole} onClick={() => setActiveFxRole(role)} />
                    <V3Btn3D color={roleStackSpecs[role].button} size="sm" maxW={154} label={`Save Current to ${role}`} onClick={() => assignCurrentFxToRole(role)} />
                    <V3Btn3D color="red" size="sm" maxW={96} label="Clear FX" onClick={() => resetFxForRole(role)} />
                  </div>
                </div>
                <div className="fx-role-stack-modules">
                  {dspGroups.map((group) => (
	                    <DSPZone
	                      key={`${role}-${group.id}`}
	                      group={group}
	                      mode={stackControls.degradationMode}
	                      onControlChange={(key, value) => {
	                        if (isEditableRole && fineDspGroupsEnabled[group.id]) updateNumber(key as keyof MacroControls, value);
	                      }}
	                      signal={stackSignal}
	                      spec={groupSpecs[group.id]}
	                      tick={tick}
	                      values={stackValues}
                      disabled={!isEditableRole || !fineDspInfluenceEnabled || !fineDspGroupsEnabled[group.id]}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="v3-dsp-zone ab-match-zone is-accent">
          <header>
            <div><strong>A / B / NASA · Match scope</strong><em>/ {currentUtteranceLabel || "select utterance"}</em></div>
          </header>
          <p className="ab-match-help">Use this after processing. A plays the untouched TTS, B plays the processed clip that Stitch will use, and NASA plays a local reference file from artifacts/audio/nasa-reference after the reference is resolved. Match Scope is a note-only v1 checkpoint, not an auto-match processor.</p>
          <p className="ab-match-help nasa-reference-line">Local NASA audio: {nasaReferenceLabel}. The NASA button plays the resolved local audio; the spectrogram action creates the PNG reference.</p>
          <div className="ab-oled-stack">
            <V3OLED accent="#8a8b86" height={70} label={`A · DRY · ${selectedRawUrl ? "READY" : "WAIT"}`} data={testOledData.map((value) => value * 0.62)} signal={selectedRawUrl ? 1 : 0.2} speed={0.7} variant="wave" />
            <V3OLED accent="#e07a3c" height={70} label={`B · FX · ${selectedProcessedUrl ? selectedProcessedIsStale ? "STALE" : "READY" : "WAIT"}`} data={testOledData} signal={selectedProcessedUrl ? signal : 0.25} speed={1.2} variant="wave" />
            <V3OLED accent="#6c92d8" height={70} label={`NASA · ${nasaAudioUrl ? "READY" : nasaSlug ? "RESOLVE" : "WAIT"}`} data={envOledData.map((value, index) => Math.max(0.08, Math.min(0.92, value * 0.72 + Math.sin(index * 0.5) * 0.08)))} signal={nasaAudioUrl ? 0.92 : 0.35} speed={0.9} variant="spectrum" />
          </div>
          <footer>
            <V3Btn3D color="white" size="sm" label="▶ A" onClick={() => playAudio(selectedRawUrl, `${currentUtteranceLabel} raw TTS`)} />
            <V3Btn3D color="copper" size="sm" label="▶ B" onClick={() => playAudio(selectedProcessedUrl, `${currentUtteranceLabel} processed FX`)} />
            <V3Btn3D color="navy" size="sm" maxW={96} label="▶ NASA" disabled={isBusy} onClick={playNasaReferenceAudio} />
            <V3Btn3D color="grey" size="sm" maxW={108} label="Match Scope" style={{ marginLeft: "auto" }} />
          </footer>
          <div className="match-readout">
            STACK {activeFxRole} / {selectedProfileLabel} / {controls.degradationMode}<br />
            ENV {currentMissionLabel} + {currentWeatherLabel}<br />
            <span>COMPARE AFTER PROCESSING; AUTO MATCH IS FUTURE WORK</span>
          </div>
        </section>
      </div>

      <section className="v3-dsp-zone fx-bottom-preview-zone is-accent">
        <header>
          <div>
            <strong>Live DSP checkpoint</strong>
            <em>/ preview before timeline</em>
            <HelpDot text="After changing the lower DSP modules, use this duplicate preview button so you do not need to scroll back to the top bench." />
          </div>
          <div className="zone-badges">
            <span className="zone-on" style={{ "--zone-color": activeRoleMode === "assigned" ? "#d9a857" : "#7ad99a" } as CSSProperties}>{activeFxRole} · {activeRoleMode.toUpperCase()}</span>
          </div>
        </header>
        <div className="fx-bottom-preview-body">
          <span>{activeRoleMode === "assigned" ? `Fine controls are updating the saved ${activeFxRole} recipe.` : `Fine controls are changing the live rack used by roles in Use Live mode.`}</span>
          <V3Btn3D color="yellow" size="md" label="Save Channel Preset" maxW={172} onClick={saveCurrentProfile} />
          <V3Btn3D color="copper" size="md" label="Save Degradation Preset" maxW={194} onClick={saveCurrentDegradationProfile} />
          <V3Btn3D color="red" size="md" label="Clear FX" maxW={108} onClick={() => resetFxForRole(activeFxRole)} />
          <V3Btn3D color="yellow" size="md" label="Preview FX" maxW={132} disabled={isBusy} className={previewButtonClass} onClick={previewSelectedFx} />
          <V3Btn3D color="copper" size="md" label="Process Selected" maxW={156} disabled={isBusy} className={busyLabel.includes("Processing FX") ? "fx-action-running" : ""} onClick={processSelectedOnly} />
        </div>
      </section>
      </>}
    </div>
  );
}

function LinkOrbitInfographic({
  activeRole,
  channelLabel,
  signal
}: {
  activeRole: FxRole;
  channelLabel: string;
  signal: number;
}) {
  const signalPct = Math.round(signal * 100);
  return <div className="earthship-link-panel" aria-label={`${activeRole} link infographic`}>
    <div className="earthship-orbit" aria-hidden="true">
      <span className="earth-disc" />
      <span className="ship-node">
        <i />
      </span>
      <span className="link-beam beam-one" />
      <span className="link-beam beam-two" />
      <span className="orbit-ring ring-one" />
      <span className="orbit-ring ring-two" />
    </div>
    <div className="earthship-readout">
      <strong>{activeRole} link</strong>
      <span>{channelLabel}</span>
      <em>{signalPct}% carrier</em>
    </div>
  </div>;
}

function RoleProcessedFxDeck({
  activePlaybackLabel,
  audio,
  color,
  playAudio,
  progress,
  role
}: {
  activePlaybackLabel: string;
  audio?: { url: string; label: string };
  color: "amber" | "green";
  playAudio: (url: string | undefined, label: string) => void;
  progress: number;
  role: FxRole;
}) {
  const playbackLabel = `${role} processed role FX`;
  const isPlaying = activePlaybackLabel === playbackLabel;
  const bars = Array.from({ length: 42 }, (_, index) => {
    const seed = role === "CAPCOM" ? 0.62 : 1.14;
    return 18 + Math.abs(Math.sin(index * 0.56 + seed)) * 42 + Math.abs(Math.cos(index * 0.23 + seed)) * 16;
  });
  return <div className={`role-fx-monitor ${color}${audio ? " ready" : ""}${isPlaying ? " playing" : ""}`}>
    <div>
      <strong>{role} processed FX</strong>
      <span>{audio ? audio.label : "No processed utterance for this role yet"}</span>
    </div>
    <button type="button" onClick={() => playAudio(audio?.url, playbackLabel)} disabled={!audio}>
      ▶ Play FX
    </button>
    <button
      className="role-fx-wave"
      type="button"
      disabled={!audio}
      onClick={() => playAudio(audio?.url, playbackLabel)}
      style={{ "--role-fx-progress": `${isPlaying ? progress * 100 : 0}%` } as CSSProperties}
      aria-label={`Play ${role} processed FX waveform`}
    >
      {bars.map((height, index) => <i key={index} style={{ height: `${Math.min(86, height)}%` }} />)}
      <b />
    </button>
  </div>;
}

function RoleAudioDeck({
  activeRole,
  activePlaybackLabel,
  auditionByRole,
  capcomVoiceSummary,
  shipVoiceSummary,
  playAudio,
  progress
}: {
  activeRole: FxRole;
  activePlaybackLabel: string;
  auditionByRole?: Partial<Record<FxRole, string>>;
  fallbackAuditionPath?: string;
  capcomVoiceSummary: string;
  shipVoiceSummary: string;
  playAudio: (url: string | undefined, label: string) => void;
  progress: number;
}) {
  const roleSources: Array<{ role: FxRole; voice: string; url?: string }> = [
    { role: "CAPCOM", voice: capcomVoiceSummary, url: auditionByRole?.CAPCOM },
    { role: "SHIP", voice: shipVoiceSummary, url: auditionByRole?.SHIP }
  ];
  return (
    <div className="role-audio-deck">
      {roleSources.map((source) => {
        const label = `${source.role} casting audition`;
        const isPlaying = activePlaybackLabel === label;
        return <div key={source.role} className={`role-audio-card${source.role === activeRole ? " active" : ""}${source.url ? " ready" : ""}${isPlaying ? " playing" : ""}`}>
          <div>
            <strong>{source.role} Casting Audio</strong>
            <span>{source.voice}</span>
          </div>
          <button type="button" onClick={() => playAudio(source.url, label)}>
            <V3Icon name={source.url ? "signal" : "filter"} size={12} />
            {isPlaying ? "Playing" : source.url ? "Play audition" : "No render yet"}
          </button>
          <button className="role-wave-timeline" aria-label={`Play ${source.role} casting waveform`} type="button" onClick={() => playAudio(source.url, label)} style={{ "--role-progress": `${isPlaying ? progress * 100 : 0}%` } as CSSProperties}>
            {Array.from({ length: 42 }, (_, index) => {
              const height = source.url ? 18 + Math.abs(Math.sin(index * 0.47 + source.role.length)) * 42 : 10;
              return <i key={index} style={{ height: `${height}%` }} />;
            })}
            <b />
          </button>
        </div>;
      })}
    </div>
  );
}

function FxNavDisplay({
  activeRole,
  busy,
  channelLabel,
  data,
  degradation,
  processedReady,
  progress,
  signal,
  stale
}: {
  activeRole: FxRole;
  busy: boolean;
  channelLabel: string;
  data: number[];
  degradation: DegradationMode;
  processedReady: boolean;
  progress: number;
  signal: number;
  stale: boolean;
}) {
  return (
    <div className={`fx-nav-display${busy ? " is-busy" : ""}${stale ? " is-stale" : ""}`}>
      <div className="fx-nav-display-head">
        <span><V3Icon name="satellite" size={12} spin={busy} /> {activeRole} LINK</span>
        <strong>{stale ? "RENDER STALE" : processedReady ? "FX READY" : "RAW ROUTE"}</strong>
      </div>
      <div className="fx-nav-graph" style={{ "--fx-progress": `${progress * 100}%` } as CSSProperties}>
        {data.slice(0, 36).map((value, index) => (
          <i key={index} style={{ height: `${Math.max(8, Math.min(92, value * 100))}%` }} />
        ))}
        <em />
      </div>
      <div className="fx-nav-readouts">
        <span>{channelLabel}</span>
        <span>{degradation}</span>
        <span>{(signal * 100).toFixed(0)}% lock</span>
      </div>
    </div>
  );
}
