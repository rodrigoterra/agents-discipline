import { useEffect, useMemo, useRef, useState } from "react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import {
  getProfileControls,
  missionGeometryById,
  missionGeometryDefinitions,
  missionScenarioDefinitions,
  profileDefinitions,
  profileOrder,
  resolveEnvironmentalAudioControls,
  spaceWeatherEventById,
  spaceWeatherEventDefinitions,
  type ChannelProfile,
  type DegradationMode,
  type EnvironmentalAudioConfig,
  type EnvironmentApplyScope,
  type EventDurationMode,
  type EventEnvelope,
  type MacroControls,
  type MissionGeometry,
  type QuindarMode,
  type SpaceWeatherEvent,
  type TelemetryStyle
} from "@voice-radio/audio-core";
import {
  buildTtsInstructions,
  cadencePresets,
  deliveryPresets,
  resolveVoiceProfile,
  roleFromSpeaker,
  speakerDefaultProfiles,
  tonePresets,
  voiceOptionsForGroup,
  voiceRegistry,
  type BuiltInVoiceId,
  type PauseStyle,
  type SpeakerRole,
  type VoiceGroupFilter,
  type VoiceProfile
} from "@voice-radio/voice-core";
import { FXLabScreen } from "./screens/FXLab/FXLabScreen";
import { SpaceScreen } from "./screens/Space/SpaceScreen";
import { V3Btn3D } from "./components/atoms";
import { getProcessedAudioStatus, getProcessedAudioStatusDetail, isProcessedAudioCurrent } from "./workflow/audioStatus";
import { buildNarrativeGenerationBrief, resolveEarthWeatherMacroOverrides } from "./workflow/narrativeAudio";
import { renderDecisionSignature, resolveRenderDecisionSource, type Alpha2RenderDecision, type Alpha2RenderMode, type Alpha2RenderStatus, type RenderDecisionSource } from "./workflow/renderDecisions";
import { evaluateStitchReadiness, formatStitchBlockers } from "./workflow/stitchReadiness";

type Utterance = {
  id: string;
  speaker: "CAPCOM" | "SHIP";
  channel: "earth_capcom" | "ship_internal";
  language: string;
  text: string;
  style: { tone: string; speed: number; urgency: number; clarity_priority: number };
  pronunciation_hints: string[];
  voice?: Partial<VoiceProfile>;
  environment?: {
    missionGeometry?: { geometry: MissionGeometry; intensity: number; applyScope: EnvironmentApplyScope };
    spaceWeather?: { event: SpaceWeatherEvent; intensity: number; durationMode: EventDurationMode; envelope: EventEnvelope; applyScope: EnvironmentApplyScope };
  };
};

type Script = { utterances: Utterance[]; [k: string]: unknown };
type QuindarOverride = { intro: boolean; outro: boolean };
type SavedProfile = { id: string; name: string; controls: MacroControls };
type SavedDegradationProfile = { id: string; name: string; controls: Partial<MacroControls> };
type FxRole = "CAPCOM" | "SHIP";
type RoleFxAssignment = { controls: MacroControls; label: string; assignedAt: string };
type ProcessedMeta = { profileLabel: string; signature: string; summary: string };
type SpectrogramResult = {
  rawSpectrogram?: string;
  processedSpectrogram?: string;
  nasaAudio?: string;
  nasaSpectrogram?: string;
  finalRawSpectrogram?: string;
  finalProcessedSpectrogram?: string;
};
type NasaReferenceFile = { filename: string; slug: string; publicUrl: string };
type ScreenId = "console" | "flight" | "comms" | "weather" | "voice" | "dialogue" | "fx" | "render" | "spectrogram" | "stitch";
type WeatherPage = "earth" | "space";
type SpectrogramPreviewMode = "raw" | "processed" | "nasa";
type SpectrogramComparisonMode = "side_by_side" | "overlay";
type MissionPresetId = "custom" | "storm_65" | "lo_orbit" | "emergency";
type SpeakerPattern = "alternating_capcom_ship" | "capcom_first" | "ship_first" | "capcom_only" | "ship_only";
type Alpha2Lane = "Narrative" | "Audio";
type Alpha2JsonStatus = "draft" | "generated" | "validated" | "needs_review";
type Alpha2MissionState = {
  activeLayers: Record<string, boolean>;
  jsonStatus: Alpha2JsonStatus;
  promptIntent: string;
  storySeed: string;
};
type Alpha2FlightState = {
  missionPhase: string;
  orbit: string;
  earthDistanceKm: number;
  moonDistanceKm: number;
  speedKms: number;
  integrityPct: number;
  timerMode: "met" | "reentry" | "landing";
  landingSite: string;
  reentrySite: string;
  presetName: string;
};
type Alpha2CommsState = {
  groundStation: string;
  shipAntenna: string;
  relayMode: string;
  frequencyMhz: number;
  latencyMs: number;
  bandwidthKhz: number;
  powerWatts: number;
  blackoutRisk: "low" | "medium" | "high";
  presetName: string;
};
type Alpha2WeatherState = {
  spaceWeather: string;
  earthWeather: string;
  earthWeatherRegion?: string;
  earthWeatherIntensity?: number;
  stormCloudCoverPct?: number;
  rainScatter?: number;
  earthquakeStatus?: string;
  liveMode: boolean;
  cachedReport: string;
  presetName: string;
};
type Alpha2CustomPreset = {
  id: string;
  label: string;
  source: string;
  createdAt: string;
};
type Alpha2Session = {
  mission: Alpha2MissionState;
  flight: Alpha2FlightState;
  comms: Alpha2CommsState;
  weather: Alpha2WeatherState;
  renderDecisions: Record<string, Alpha2RenderDecision>;
  presets: Alpha2CustomPreset[];
  updatedAt: string;
};
type NumberControlKey = Exclude<{
  [K in keyof MacroControls]: MacroControls[K] extends number | undefined ? K : never;
}[keyof MacroControls], undefined>;

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const customProfilesKey = "voice-radio-custom-dsp-profiles-v2";
const customDegradationProfilesKey = "voice-radio-custom-degradation-profiles-v1";
const alpha2SessionKey = "voice-radio-alpha2-session-v1";
const defaultSessionId = `session-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}`;

const roleDefaultChannel: Record<FxRole, ChannelProfile> = {
  CAPCOM: "earth_capcom",
  SHIP: "ship_comm"
};

const narrativeLayerDefaults: Record<string, boolean> = {
  "Earthquake": false,
  "Satellite tracks": true,
  "Day/night curve": true,
  "DSN antennas": true,
  "Ionospheric storms": true,
  "Rain/storm cells": false,
  "Radio blackout zones": true
};

const navigationSections: Array<{ lane: Alpha2Lane; items: Array<{ id: ScreenId; label: string; icon: string }> }> = [
  {
    lane: "Narrative",
    items: [
      { id: "console", label: "Mission", icon: "MC" },
      { id: "flight", label: "Flight", icon: "FL" },
      { id: "comms", label: "COMMS", icon: "CM" },
      { id: "weather", label: "Weather", icon: "WX" }
    ]
  },
  {
    lane: "Audio",
    items: [
      { id: "voice", label: "Voice", icon: "VO" },
      { id: "dialogue", label: "Dialogue", icon: "DL" },
      { id: "fx", label: "Radio FX", icon: "FX" },
      { id: "render", label: "Render", icon: "RD" },
      { id: "spectrogram", label: "Spectro", icon: "SP" },
      { id: "stitch", label: "Stitch", icon: "ST" }
    ]
  }
];

function createDefaultAlpha2Session(): Alpha2Session {
  const now = new Date().toISOString();
  return {
    mission: {
      activeLayers: narrativeLayerDefaults,
      jsonStatus: "draft",
      promptIntent: "Prepare a radio dialogue seed from mission, flight, comms, and weather context.",
      storySeed: ""
    },
    flight: {
      missionPhase: "Lunar reentry",
      orbit: "Trans-Earth coast",
      earthDistanceKm: 386000,
      moonDistanceKm: 18400,
      speedKms: 10.8,
      integrityPct: 86,
      timerMode: "reentry",
      landingSite: "Mare Tranquillitatis candidate",
      reentrySite: "Pacific recovery corridor",
      presetName: "Lunar reentry risk"
    },
    comms: {
      groundStation: "Goldstone DSN",
      shipAntenna: "Apollo-style high-gain antenna",
      relayMode: "Direct S-band with relay standby",
      frequencyMhz: 2287.5,
      latencyMs: 1290,
      bandwidthKhz: 8,
      powerWatts: 22,
      blackoutRisk: "medium",
      presetName: "Goldstone high-gain"
    },
    weather: {
      spaceWeather: "Solar flare warning",
      earthWeather: "Storm cells near ground station",
      earthWeatherRegion: "Goldstone DSN desert corridor",
      earthWeatherIntensity: 0.58,
      stormCloudCoverPct: 42,
      rainScatter: 0.36,
      earthquakeStatus: "watch",
      liveMode: false,
      cachedReport: "Cached NASA-style report available for offline mode.",
      presetName: "Solar flare + rain scatter"
    },
    renderDecisions: {},
    presets: [],
    updatedAt: now
  };
}

function loadAlpha2Session(): Alpha2Session {
  try {
    const saved = localStorage.getItem(alpha2SessionKey);
    if (!saved) return createDefaultAlpha2Session();
    const parsed = JSON.parse(saved) as Partial<Alpha2Session>;
    const defaults = createDefaultAlpha2Session();
    return {
      ...defaults,
      ...parsed,
      mission: { ...defaults.mission, ...(parsed.mission || {}), activeLayers: { ...defaults.mission.activeLayers, ...(parsed.mission?.activeLayers || {}) } },
      flight: { ...defaults.flight, ...(parsed.flight || {}) },
      comms: { ...defaults.comms, ...(parsed.comms || {}) },
      weather: { ...defaults.weather, ...(parsed.weather || {}) },
      renderDecisions: parsed.renderDecisions || {},
      presets: Array.isArray(parsed.presets) ? parsed.presets : defaults.presets
    };
  } catch {
    return createDefaultAlpha2Session();
  }
}

const degradationPresetKeys: Array<keyof MacroControls> = [
  "degradationMode",
  "signalQuality",
  "noise",
  "whiteNoise",
  "pinkNoise",
  "brownNoise",
  "noiseLfoRate",
  "noiseLfoDepth",
  "noiseGateThreshold",
  "noiseGateDepth",
  "bitDepth",
  "downsample",
  "packetLossDynamics",
  "scintillationDepth",
  "scintillationRate",
  "phaseScintillationMs",
  "dropoutProbability",
  "repeatProbability",
  "jitterAmount",
  "grainSizeMs",
  "granularDensity",
  "plcStutter",
  "datamoshAmount",
  "reflectionDelayMs",
  "reflectionMix",
  "pttClipMs"
];

const missionPresetCopy: Record<Exclude<MissionPresetId, "custom">, {
  label: string;
  language: string;
  utteranceCount: number;
  speakerPattern: SpeakerPattern;
  sceneBrief: string;
}> = {
  storm_65: {
    label: "Storm '65",
    language: "pt-BR",
    utteranceCount: 4,
    speakerPattern: "alternating_capcom_ship",
    sceneBrief: "A nave Odyssey está em aproximação orbital durante uma tempestade solar inspirada em 1965. CAPCOM quer confirmar correção de atitude. A nave responde com leve ruído, concentração técnica e pequena latência."
  },
  lo_orbit: {
    label: "Lo-orbit",
    language: "en-US",
    utteranceCount: 4,
    speakerPattern: "alternating_capcom_ship",
    sceneBrief: "Odyssey is in low orbit with a clean but compressed link. CAPCOM requests a systems readback. The spacecraft answers with procedural calm and small timing delays."
  },
  emergency: {
    label: "Emergency",
    language: "en-US",
    utteranceCount: 6,
    speakerPattern: "capcom_first",
    sceneBrief: "A spacecraft reports an urgent guidance anomaly under degraded comms. CAPCOM must keep the exchange concise, technical, and controlled while SHIP reports status and confirms recovery actions."
  }
};

const sliderGroups: Array<{
  title: string;
  controls: Array<{ key: NumberControlKey; label: string; min: number; max: number; step: number; suffix?: string }>;
}> = [
  {
    title: "Quindar Tone Path",
    controls: [
      { key: "telemetryLevel", label: "Quindar level", min: 0, max: 1, step: 0.01 },
      { key: "quindarToneMs", label: "Quindar duration", min: 80, max: 600, step: 10, suffix: "ms" },
      { key: "quindarDrive", label: "Quindar drive", min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: "Voice Band + Encoder",
    controls: [
      { key: "hpHz", label: "High-pass", min: 120, max: 1200, step: 10, suffix: "Hz" },
      { key: "lpHz", label: "Low-pass", min: 1200, max: 4800, step: 50, suffix: "Hz" },
      { key: "bitDepth", label: "Bit depth", min: 4, max: 24, step: 1, suffix: "-bit" },
      { key: "downsample", label: "Sample rate reduction", min: 1, max: 24, step: 1, suffix: "x" },
      { key: "compression", label: "Compression", min: 0, max: 1, step: 0.01 },
      { key: "drive", label: "Drive", min: 0, max: 1, step: 0.01 },
      { key: "noise", label: "Noise glue", min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: "Organic Hiss Bed",
    controls: [
      { key: "whiteNoise", label: "White hiss", min: 0, max: 1, step: 0.01 },
      { key: "pinkNoise", label: "Pink hiss", min: 0, max: 1, step: 0.01 },
      { key: "brownNoise", label: "Brown rumble", min: 0, max: 1, step: 0.01 },
      { key: "noiseLfoRate", label: "Hiss LFO rate", min: 0, max: 12, step: 0.05, suffix: "Hz" },
      { key: "noiseLfoDepth", label: "Hiss LFO depth", min: 0, max: 1, step: 0.01 },
      { key: "noiseGateThreshold", label: "Hiss gate threshold", min: 0, max: 1, step: 0.01 },
      { key: "noiseGateDepth", label: "Hiss gate depth", min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: "Scintillation + Path",
    controls: [
      { key: "scintillationDepth", label: "Amplitude scintillation", min: 0, max: 1, step: 0.01 },
      { key: "scintillationRate", label: "Scintillation rate", min: 0, max: 12, step: 0.05, suffix: "Hz" },
      { key: "phaseScintillationMs", label: "Phase smear", min: 0, max: 10, step: 0.1, suffix: "ms" },
      { key: "reflectionDelayMs", label: "Reflection delay", min: 0, max: 120, step: 1, suffix: "ms" },
      { key: "reflectionMix", label: "Reflection mix", min: 0, max: 1, step: 0.01 },
      { key: "pttClipMs", label: "PTT/VOX onset clip", min: 0, max: 40, step: 1, suffix: "ms" }
    ]
  },
  {
    title: "Granular Codec Failure",
    controls: [
      { key: "dropoutProbability", label: "Packet loss", min: 0, max: 1, step: 0.01 },
      { key: "packetLossDynamics", label: "Packet dynamics macro", min: 0, max: 1, step: 0.01 },
      { key: "repeatProbability", label: "PLC repeat", min: 0, max: 1, step: 0.01 },
      { key: "jitterAmount", label: "Network jitter / scatter", min: 0, max: 1, step: 0.01 },
      { key: "grainSizeMs", label: "Grain size", min: 5, max: 120, step: 1, suffix: "ms" },
      { key: "granularDensity", label: "Granular density", min: 0, max: 1, step: 0.01 },
      { key: "plcStutter", label: "Static buffer stutter", min: 0, max: 1, step: 0.01 },
      { key: "datamoshAmount", label: "Datamosh fold", min: 0, max: 1, step: 0.01 }
    ]
  }
];

function cloneControls(controls: MacroControls): MacroControls {
  return { ...getProfileControls(controls.channelProfile), ...controls };
}

function quindarModeFromOverride(q: QuindarOverride): QuindarMode {
  if (q.intro && q.outro) return "both";
  if (q.intro) return "intro";
  if (q.outro) return "outro";
  return "off";
}

function quindarOverrideFromMode(mode: QuindarMode): QuindarOverride {
  return { intro: mode === "intro" || mode === "both", outro: mode === "outro" || mode === "both" };
}

function tagColorClass(color = "muted") {
  return `tag tag-${color}`;
}

function Tag({ color = "muted", filled = false, children }: { color?: string; filled?: boolean; children: ReactNode }) {
  return <span className={`${tagColorClass(color)}${filled ? " tag-filled" : ""}`}>{children}</span>;
}

function LED({ color = "green", blink = false }: { color?: string; blink?: boolean }) {
  return <span className={`led led-${color}${blink ? " led-blink" : ""}`} aria-hidden="true" />;
}

function Btn({
  variant = "ghost",
  size = "md",
  active = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" | "lg"; active?: boolean }) {
  return <button {...props} className={`btn btn-${variant} btn-${size}${active ? " btn-active" : ""}`}>{children}</button>;
}

function Help({ text }: { text: string }) {
  return <span className="help-dot" title={text} aria-label={text}>?</span>;
}

function Card({ title, sub, help, action, accent = false, children }: { title?: string; sub?: string; help?: string; action?: ReactNode; accent?: boolean; children: ReactNode }) {
  return <section className={`card${accent ? " card-accent" : ""}`}>
    {(title || action) && <header className="card-head">
      <div>{title && <span>{title}</span>}{help && <Help text={help} />}{sub && <em> / {sub}</em>}</div>
      {action && <div className="card-action">{action}</div>}
    </header>}
    <div className="card-body">{children}</div>
  </section>;
}

function Readout({ label, value, color = "muted" }: { label: string; value: string; color?: string }) {
  return <div className="readout">
    <span>{label}</span>
    <strong className={`c-${color}`}>{value}</strong>
  </div>;
}

function FlowGuide({ active, utteranceCount, cleanCount, processedCount, finalReady }: {
  active: ScreenId;
  utteranceCount: number;
  cleanCount: number;
  processedCount: number;
  finalReady: boolean;
}) {
  const steps = [
    { id: "console" as const, n: "N1", title: "Mission", body: "Story seed and setup JSON" },
    { id: "flight" as const, n: "N2", title: "Flight", body: "Orbit, distance, timers, integrity" },
    { id: "comms" as const, n: "N3", title: "COMMS", body: "Antenna route and link budget" },
    { id: "weather" as const, n: "N4", title: "Weather", body: "Earth + Space pages" },
    { id: "voice" as const, n: "A1", title: "Voice", body: cleanCount ? `${cleanCount} raw clips` : "Cast roles before script" },
    { id: "dialogue" as const, n: "A2", title: "Dialogue", body: utteranceCount ? `${utteranceCount} utterances` : "Generate, edit, validate JSON" },
    { id: "fx" as const, n: "A3", title: "Radio FX", body: processedCount ? `${processedCount} processed` : "Review narrative DSP draft" },
    { id: "render" as const, n: "A4", title: "Render", body: "Utterance render status" },
    { id: "spectrogram" as const, n: "A5", title: "Spectro", body: "Optional comparison" },
    { id: "stitch" as const, n: "A6", title: "Stitch", body: finalReady ? "Final WAV ready" : "Timeline and export" }
  ];
  return <section className="flow-guide" aria-label="Alpha2 narrative and audio flow">
    {steps.map((step) => <div key={step.id} className={`flow-step${active === step.id ? " active" : ""}`}>
      <span>{step.n}</span>
      <strong>{step.title}</strong>
      <em>{step.body}</em>
    </div>)}
  </section>;
}

function Wave({ color = "copper", seed = 1 }: { color?: string; seed?: number }) {
  return <div className={`wave wave-${color}`} aria-hidden="true">
    {Array.from({ length: 44 }, (_, index) => {
      const height = 18 + Math.abs(Math.sin((index + seed) * 0.74)) * 32 + Math.abs(Math.cos((index + seed) * 0.21)) * 12;
      return <i key={index} style={{ height: `${Math.min(58, height)}%` }} />;
    })}
  </div>;
}

function VoiceAuditionPlayer({
  activePlaybackLabel,
  label,
  onPlay,
  progress,
  role,
  url
}: {
  activePlaybackLabel: string;
  label: string;
  onPlay: () => void;
  progress: number;
  role: FxRole;
  url?: string;
}) {
  if (!url) return null;
  const isPlaying = activePlaybackLabel === label;
  return <div className={`voice-audition-player ${role.toLowerCase()}${isPlaying ? " playing" : ""}`}>
    <div>
      <strong>{role} audition</strong>
      <span>Clean casting sample</span>
    </div>
    <button type="button" className="voice-audition-play" onClick={onPlay}>▶ Play {role}</button>
    <button
      type="button"
      className="voice-audition-wave"
      onClick={onPlay}
      style={{ "--role-progress": `${isPlaying ? progress : 0}%` } as CSSProperties}
      aria-label={`Play ${role} audition`}
    >
      {Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${22 + Math.abs(Math.sin((index + role.length) * 0.61)) * 52}%` }} />)}
      <b />
    </button>
  </div>;
}

function Alpha2MapPlaceholder({ title, sub, tags, variant = "earth" }: { title: string; sub: string; tags: string[]; variant?: "earth" | "orbit" | "weather" | "comms" }) {
  return <div className={`alpha2-map-visual ${variant}`} aria-label={title}>
    <div className="alpha2-map-orbit one" />
    <div className="alpha2-map-orbit two" />
    <div className="alpha2-map-orbit three" />
    <i className="alpha2-map-terminator" />
    <span className="alpha2-map-dot goldstone" />
    <span className="alpha2-map-dot madrid" />
    <span className="alpha2-map-dot canberra" />
    <span className="alpha2-map-dot ship" />
    <span className="alpha2-map-zone storm" />
    <span className="alpha2-map-zone blackout" />
    <strong>{title}</strong>
    <em>{sub}</em>
    <div className="chip-row">
      {tags.map((tag) => <Tag key={tag} color={variant === "weather" ? "amber" : variant === "comms" ? "blue" : "green"}>{tag}</Tag>)}
    </div>
  </div>;
}

function Alpha2ReferenceMap({
  title,
  sub,
  mode,
  layers
}: {
  title: string;
  sub: string;
  mode: "earth" | "space";
  layers: Array<{ label: string; detail: string; value: string; color: "amber" | "blue" | "green" | "red" | "copper" | "muted" }>;
}) {
  return <div className={`alpha2-reference-map ${mode}`} aria-label={title}>
    <div className="alpha2-reference-canvas">
      <i className="ref-grid" />
      {mode === "earth" ? <>
        <span className="ref-earth-disc" />
        <span className="ref-night-band" />
        <span className="ref-route ground" />
        <span className="ref-dsn goldstone">GDS</span>
        <span className="ref-dsn madrid">MAD</span>
        <span className="ref-dsn canberra">CBR</span>
        <span className="ref-weather-cell rain one" />
        <span className="ref-weather-cell storm two" />
        <span className="ref-weather-cell typhoon" />
        <span className="ref-quake q1" />
        <span className="ref-quake q2" />
        <span className="ref-scatter-ring r1" />
        <span className="ref-scatter-ring r2" />
      </> : <>
        <span className="ref-sun" />
        <span className="ref-solar-plume" />
        <span className="ref-earth-disc space-earth" />
        <span className="ref-magnetic-ring one" />
        <span className="ref-magnetic-ring two" />
        <span className="ref-ionosphere band-one" />
        <span className="ref-ionosphere band-two" />
        <span className="ref-blackout-wedge" />
        <span className="ref-route space" />
        <span className="ref-satellite sat-one" />
        <span className="ref-satellite sat-two" />
      </>}
      <strong>{title}</strong>
      <em>{sub}</em>
    </div>
    <div className="alpha2-reference-layers">
      {layers.map((layer) => <div key={layer.label} className={`alpha2-reference-layer ${layer.color}`}>
        <Tag color={layer.color}>{layer.label}</Tag>
        <strong>{layer.value}</strong>
        <span>{layer.detail}</span>
      </div>)}
    </div>
  </div>;
}

function Alpha2ImageSlot({ label, detail, tone = "copper" }: { label: string; detail: string; tone?: "copper" | "green" | "blue" | "amber" }) {
  return <div className={`alpha2-image-slot ${tone}`}>
    <span />
    <strong>{label}</strong>
    <em>{detail}</em>
  </div>;
}

function ControlSlider({ item, value, onChange }: {
  item: { key: NumberControlKey; label: string; min: number; max: number; step: number; suffix?: string };
  value: number;
  onChange: (value: number) => void;
}) {
  const display = Number.isInteger(item.step) ? value.toFixed(0) : value.toFixed(2);
  const pct = ((value - item.min) / Math.max(1, item.max - item.min)) * 100;
  return <label className="slider-label">
    <span>{item.label}</span>
    <output>{display}{item.suffix || ""}</output>
    <input style={{ "--fill": `${pct}%` } as CSSProperties} type="range" value={value} min={item.min} max={item.max} step={item.step} onChange={(e) => onChange(Number(e.target.value))} />
  </label>;
}

export function App() {
  const transportAudioRef = useRef<HTMLAudioElement | null>(null);
  const [missionPreset, setMissionPreset] = useState<MissionPresetId>("custom");
  const [missionLanguage, setMissionLanguage] = useState("pt-BR");
  const [missionUtteranceCount, setMissionUtteranceCount] = useState(4);
  const [missionSpeakerPattern, setMissionSpeakerPattern] = useState<SpeakerPattern>("alternating_capcom_ship");
  const [sceneBrief, setSceneBrief] = useState("");
  const [scriptJson, setScriptJson] = useState("{}");
  const [validation, setValidation] = useState<string>("not validated");
  const [error, setError] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [cleanMap, setCleanMap] = useState<Record<string, string>>({});
  const [processedMap, setProcessedMap] = useState<Record<string, string>>({});
  const [processedMetaMap, setProcessedMetaMap] = useState<Record<string, ProcessedMeta>>({});
  const [quindarByUtterance, setQuindarByUtterance] = useState<Record<string, QuindarOverride>>({});
  const [roleFxAssignments, setRoleFxAssignments] = useState<Partial<Record<FxRole, RoleFxAssignment>>>({});
  const [activeFxRole, setActiveFxRole] = useState<FxRole>("CAPCOM");
  const [finalPath, setFinalPath] = useState("");
  const [auditionPath, setAuditionPath] = useState("");
  const [auditionByRole, setAuditionByRole] = useState<Partial<Record<FxRole, string>>>({});
  const [auditionText, setAuditionText] = useState("Odyssey, this is CAPCOM. Confirm signal lock and proceed with vector correction.");
  const [transportStatus, setTransportStatus] = useState("Generate raw audio, process FX, then stitch for export.");
  const [transportProgress, setTransportProgress] = useState(0);
  const [transportDuration, setTransportDuration] = useState(0);
  const transportPct = transportDuration > 0 ? Math.min(100, Math.max(0, (transportProgress / transportDuration) * 100)) : 0;
  const [activePlaybackLabel, setActivePlaybackLabel] = useState("");
  const [sessionId, setSessionId] = useState(defaultSessionId);
  const [stitchGapByUtterance, setStitchGapByUtterance] = useState<Record<string, number>>({});
  const [selectedSpectrogramUtteranceId, setSelectedSpectrogramUtteranceId] = useState("");
  const [nasaSlug, setNasaSlug] = useState("");
  const [nasaSource, setNasaSource] = useState("");
  const [nasaReferences, setNasaReferences] = useState<NasaReferenceFile[]>([]);
  const [spectrogramResult, setSpectrogramResult] = useState<SpectrogramResult | null>(null);
  const [spectrogramStatus, setSpectrogramStatus] = useState("idle");
  const [spectrogramPreviewMode, setSpectrogramPreviewMode] = useState<SpectrogramPreviewMode>("processed");
  const [spectrogramComparisonMode, setSpectrogramComparisonMode] = useState<SpectrogramComparisonMode>("side_by_side");
  const [activeScreen, setActiveScreen] = useState<ScreenId>("console");
  const [activeWeatherPage, setActiveWeatherPage] = useState<WeatherPage>("earth");
  const [alpha2Session, setAlpha2Session] = useState<Alpha2Session>(() => loadAlpha2Session());

  const [voiceGroupFilter, setVoiceGroupFilter] = useState<VoiceGroupFilter>("all");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile>(() => resolveVoiceProfile(speakerDefaultProfiles.CAPCOM, "CAPCOM"));
  const [roleVoiceProfiles, setRoleVoiceProfiles] = useState<Record<"CAPCOM" | "SHIP", VoiceProfile>>(() => ({
    CAPCOM: resolveVoiceProfile(speakerDefaultProfiles.CAPCOM, "CAPCOM"),
    SHIP: resolveVoiceProfile(speakerDefaultProfiles.SHIP, "SHIP")
  }));
  const [voiceStatus, setVoiceStatus] = useState("Assign voices to CAPCOM and SHIP before batch generation so Stitch can show the casting map.");
  const [controls, setControls] = useState<MacroControls>(() => cloneControls(getProfileControls("ship_comm")));
  const [selectedProfile, setSelectedProfile] = useState<string>("ship_comm");
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [savedDegradationProfiles, setSavedDegradationProfiles] = useState<SavedDegradationProfile[]>([]);
  const [selectedDegradationProfile, setSelectedDegradationProfile] = useState<string>("builtin-nominal");
  const [profileName, setProfileName] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [environmentBaseProfile, setEnvironmentBaseProfile] = useState<ChannelProfile>("ship_comm");
  const [missionGeometry, setMissionGeometry] = useState<MissionGeometry>("lunar_flyby");
  const [missionGeometryIntensity, setMissionGeometryIntensity] = useState(0.65);
  const [missionGeometryScope, setMissionGeometryScope] = useState<EnvironmentApplyScope>("selected_utterance");
  const [spaceWeatherEvent, setSpaceWeatherEvent] = useState<SpaceWeatherEvent>("solar_flare_onset");
  const [spaceWeatherIntensity, setSpaceWeatherIntensity] = useState(0.7);
  const [spaceWeatherDurationMode, setSpaceWeatherDurationMode] = useState<EventDurationMode>("full_utterance");
  const [spaceWeatherEnvelope, setSpaceWeatherEnvelope] = useState<EventEnvelope>("ramp_up");
  const [spaceWeatherScope, setSpaceWeatherScope] = useState<EnvironmentApplyScope>("selected_utterance");
  const [environmentApplied, setEnvironmentApplied] = useState(false);
  const [environmentInfluenceEnabled, setEnvironmentInfluenceEnabled] = useState(false);
  const [fineDspInfluenceEnabled, setFineDspInfluenceEnabled] = useState(false);
  const [environmentStatus, setEnvironmentStatus] = useState("Select a mission geometry or space weather event, then apply it to resolve DSP controls.");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(customProfilesKey) || "[]") as SavedProfile[];
      setSavedProfiles(Array.isArray(saved) ? saved : []);
    } catch {
      setSavedProfiles([]);
    }
    try {
      const savedDegradation = JSON.parse(localStorage.getItem(customDegradationProfilesKey) || "[]") as SavedDegradationProfile[];
      setSavedDegradationProfiles(Array.isArray(savedDegradation) ? savedDegradation : []);
    } catch {
      setSavedDegradationProfiles([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(alpha2SessionKey, JSON.stringify(alpha2Session));
    } catch {
      // Persistence is a convenience for the local instrument session.
    }
  }, [alpha2Session]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/api/nasa-reference/list`)
      .then((res) => res.ok ? res.json() : { files: [] })
      .then((data: { files?: NasaReferenceFile[] }) => {
        if (cancelled) return;
        const files = Array.isArray(data.files) ? data.files : [];
        setNasaReferences(files);
        const first = files[0];
        if (first && !nasaSlug && !nasaSource) {
          setNasaSlug(first.slug);
          setNasaSource(first.filename);
          setSpectrogramResult((current) => ({ ...(current || {}), nasaAudio: `${API}${first.publicUrl}` }));
        }
      })
      .catch(() => {
        if (!cancelled) setNasaReferences([]);
      });
    return () => { cancelled = true; };
  }, []);

  const parsedScriptFromJson = useMemo<Script | null>(() => {
    try { return JSON.parse(scriptJson); } catch { return null; }
  }, [scriptJson]);
  const [lastValidScript, setLastValidScript] = useState<Script | null>(null);
  useEffect(() => {
    if (parsedScriptFromJson?.utterances) setLastValidScript(parsedScriptFromJson);
  }, [parsedScriptFromJson]);
  const parsedScript = parsedScriptFromJson?.utterances ? parsedScriptFromJson : lastValidScript;
  const scriptJsonHasParseError = Boolean(scriptJson.trim() && !parsedScriptFromJson);

  function updateAlpha2Section<K extends keyof Pick<Alpha2Session, "mission" | "flight" | "comms" | "weather">>(section: K, patch: Partial<Alpha2Session[K]>) {
    setAlpha2Session((current) => ({
      ...current,
      [section]: { ...current[section], ...patch },
      updatedAt: new Date().toISOString()
    }));
  }

  function updateAlpha2RenderDecision(decision: Alpha2RenderDecision) {
    setAlpha2Session((current) => ({
      ...current,
      renderDecisions: { ...current.renderDecisions, [decision.targetId]: decision },
      updatedAt: new Date().toISOString()
    }));
  }

  function updateAlpha2Layer(layer: string, enabled: boolean) {
    setAlpha2Session((current) => ({
      ...current,
      mission: {
        ...current.mission,
        activeLayers: { ...current.mission.activeLayers, [layer]: enabled }
      },
      updatedAt: new Date().toISOString()
    }));
  }

  const globalQuindar = quindarOverrideFromMode(controls.quindarMode);
  const voiceOptions = useMemo(() => voiceOptionsForGroup(voiceGroupFilter), [voiceGroupFilter]);
  const instructionPreview = useMemo(() => buildTtsInstructions(voiceProfile), [voiceProfile]);
  function profileLabelForId(id: string) {
    return id === "manual"
      ? "Live DSP draft"
      : profileDefinitions[id as ChannelProfile]?.label || savedProfiles.find((p) => p.id === id)?.name || "Live DSP draft";
  }

  const selectedProfileLabel = profileLabelForId(selectedProfile);
  const utterances = parsedScript?.utterances || [];
  const hasGeneratedScript = utterances.length > 0;
  const speakerPatternLabel = {
    alternating_capcom_ship: "CAPCOM ↔ SHIP",
    capcom_first: "CAPCOM first",
    ship_first: "SHIP first",
    capcom_only: "CAPCOM only",
    ship_only: "SHIP only"
  }[missionSpeakerPattern];
  const missionSetupSummary = hasGeneratedScript
    ? `${utterances.length} utterances · ${utterances[0]?.language || missionLanguage} · ${Array.from(new Set(utterances.map((u) => u.speaker))).join(" ↔ ")}`
    : `Draft setup · ${missionUtteranceCount} utterances · ${missionLanguage} · ${speakerPatternLabel}`;
  const selectedSpectrogramUtterance = utterances.find((u) => u.id === selectedSpectrogramUtteranceId) || utterances[0];
  const currentUtterance = selectedSpectrogramUtterance || utterances[0];
  const cleanCount = Object.keys(cleanMap).length;
  const processedCount = Object.keys(processedMap).length;
  const currentRoleProfile = currentUtterance ? roleVoiceProfiles[currentUtterance.speaker] : roleVoiceProfiles.CAPCOM;
  const currentMissionDefinition = missionGeometryById[missionGeometry];
  const currentWeatherDefinition = spaceWeatherEventById[spaceWeatherEvent];
  const earthWeatherRegion = alpha2Session.weather.earthWeatherRegion || `${alpha2Session.comms.groundStation} ground corridor`;
  const earthWeatherIntensity = alpha2Session.weather.earthWeatherIntensity ?? 0.5;
  const stormCloudCoverPct = alpha2Session.weather.stormCloudCoverPct ?? Math.round(earthWeatherIntensity * 72);
  const rainScatter = alpha2Session.weather.rainScatter ?? Math.min(1, earthWeatherIntensity * 0.72);
  const earthquakeStatus = alpha2Session.weather.earthquakeStatus || "watch";
  const earthWeatherMacroOverrides = resolveEarthWeatherMacroOverrides({
    intensity: earthWeatherIntensity,
    rainScatter,
    stormCloudCoverPct,
    earthquakeStatus
  });
  const currentEnvironmentConfig: EnvironmentalAudioConfig = {
    baseProfile: environmentBaseProfile,
    macroOverrides: earthWeatherMacroOverrides,
    missionGeometry: { geometry: missionGeometry, intensity: missionGeometryIntensity, applyScope: missionGeometryScope },
    spaceWeather: { event: spaceWeatherEvent, intensity: spaceWeatherIntensity, durationMode: spaceWeatherDurationMode, envelope: spaceWeatherEnvelope, applyScope: spaceWeatherScope }
  };
  const resolvedEnvironmentPreview = useMemo(() => resolveEnvironmentalAudioControls(currentEnvironmentConfig), [environmentBaseProfile, missionGeometry, missionGeometryIntensity, missionGeometryScope, spaceWeatherEvent, spaceWeatherIntensity, spaceWeatherDurationMode, spaceWeatherEnvelope, spaceWeatherScope, earthWeatherIntensity, rainScatter, stormCloudCoverPct, earthquakeStatus]);
  const affectedEnvironmentParameters = Array.from(new Set([...currentMissionDefinition.affectedParameters, ...currentWeatherDefinition.affectedParameters])).slice(0, 12);
  const activeLaneLabel = navigationSections.find((section) => section.items.some((item) => item.id === activeScreen))?.lane || "Narrative";
  const activeLayerCount = Object.values(alpha2Session.mission.activeLayers).filter(Boolean).length;
  const narrativeDraftLabel = `${alpha2Session.flight.missionPhase} · ${alpha2Session.comms.groundStation} -> SHIP · ${alpha2Session.weather.spaceWeather}`;
  const earthWeatherChainSummary = [
    `Ground corridor: ${earthWeatherRegion}`,
    `Station exposure: ${alpha2Session.comms.groundStation}`,
    `Earth weather: ${alpha2Session.weather.earthWeather}`,
    `Influence: hiss floor ${rainScatter.toFixed(2)}, storm cover ${stormCloudCoverPct}%, reflections ${(earthWeatherIntensity * 0.44).toFixed(2)}`,
    `Narrative pressure: ${earthquakeStatus === "event" ? "ground disruption active" : "ground link vulnerable but usable"}`
  ];
  const narrativeSignalReasons = [
    `Mission phase: ${alpha2Session.flight.missionPhase}`,
    `Flight state: ${alpha2Session.flight.speedKms.toFixed(1)} km/s, ${alpha2Session.comms.blackoutRisk} blackout risk`,
    `COMMS route: ${alpha2Session.comms.groundStation} -> ${alpha2Session.comms.shipAntenna}`,
    `Earth weather: ${alpha2Session.weather.earthWeather}`,
    `Space weather: ${alpha2Session.weather.spaceWeather}`,
    `Suggested result: ${currentMissionDefinition.label}, ${currentWeatherDefinition.label}, ${resolvedEnvironmentPreview.degradationMode} degradation`
  ];
  const alpha2SetupJson = useMemo(() => JSON.stringify({
    narrative_lane: {
      mission_control: {
        json_status: alpha2Session.mission.jsonStatus,
        active_layers: Object.entries(alpha2Session.mission.activeLayers).filter(([, enabled]) => enabled).map(([layer]) => layer),
        story_seed: alpha2Session.mission.storySeed || sceneBrief || "not written yet"
      },
      flight: alpha2Session.flight,
      comms: alpha2Session.comms,
      weather: alpha2Session.weather
    },
    audio_lane: {
      voice_roles: {
        CAPCOM: voiceSummary(roleVoiceProfiles.CAPCOM, "CAPCOM"),
        SHIP: voiceSummary(roleVoiceProfiles.SHIP, "SHIP")
      },
      fx_draft: {
        label: narrativeDraftLabel,
        channelProfile: resolvedEnvironmentPreview.channelProfile,
        degradationMode: resolvedEnvironmentPreview.degradationMode,
        signalQuality: resolvedEnvironmentPreview.signalQuality
      },
      utterances_ready: utterances.length
    }
  }, null, 2), [alpha2Session, sceneBrief, roleVoiceProfiles, narrativeDraftLabel, resolvedEnvironmentPreview, utterances.length]);

  function controlsSummary(c: MacroControls) {
    return `${selectedProfileLabel} | ${c.channelProfile} | ${c.degradationMode} | SQ ${c.signalQuality.toFixed(2)} | packet ${Number(c.packetLossDynamics ?? 0).toFixed(2)}`;
  }

  function voiceSummary(profile: Partial<VoiceProfile> | undefined, fallbackSpeaker: "CAPCOM" | "SHIP") {
    const profileToShow = resolveVoiceProfile(profile || roleVoiceProfiles[fallbackSpeaker], fallbackSpeaker);
    return `${profileToShow.label || profileToShow.speakerRole} · ${profileToShow.voiceId} · ${profileToShow.cadencePreset || "cadence"} · ${profileToShow.tonePreset || "tone"}`;
  }

  function utteranceWithRoleVoice(utterance: Utterance): Utterance {
    return {
      ...utterance,
      voice: resolveVoiceProfile({ ...roleVoiceProfiles[utterance.speaker], ...(utterance.voice || {}) }, utterance.speaker)
    };
  }

  function environmentForUtterance(utterance: Utterance): EnvironmentalAudioConfig | undefined {
    return utterance.environment
      ? { baseProfile: environmentBaseProfile, ...utterance.environment }
      : environmentInfluenceEnabled && environmentApplied
        ? currentEnvironmentConfig
        : undefined;
  }

  function controlsWithUtteranceQuindar(utterance: Utterance, baseControls: MacroControls): MacroControls {
    const quindar = quindarByUtterance[utterance.id] ?? globalQuindar;
    return {
      ...baseControls,
      quindarMode: quindarModeFromOverride(quindar),
      telemetryEnabled: quindar.intro || quindar.outro,
      telemetryStyle: baseControls.telemetryStyle
    };
  }

  function fallbackRenderModeForUtterance(utterance: Utterance): Alpha2RenderMode {
    return roleFxAssignments[utterance.speaker] ? "role_stack" : "narrative_draft";
  }

  function presetSourceForDecision(decision: Alpha2RenderDecision | undefined): RenderDecisionSource | undefined {
    const presetId = decision?.presetId;
    if (!presetId) return undefined;
    const saved = savedProfiles.find((profile) => profile.id === presetId);
    if (saved) return { controls: cloneControls(saved.controls), label: saved.name };
    if (presetId in profileDefinitions) {
      const id = presetId as ChannelProfile;
      return { controls: cloneControls(getProfileControls(id)), label: profileDefinitions[id].label };
    }
    return undefined;
  }

  function renderSourceForUtterance(utterance: Utterance) {
    const decision = alpha2Session.renderDecisions[utterance.id];
    const roleStack = roleFxAssignments[utterance.speaker];
    const roleDefaultChannelId = roleDefaultChannel[utterance.speaker];
    const resolved = resolveRenderDecisionSource({
      decision,
      fallbackMode: fallbackRenderModeForUtterance(utterance),
      narrativeDraft: {
        controls: cloneControls(resolvedEnvironmentPreview),
        label: `Narrative Draft · ${narrativeDraftLabel}`,
        environment: currentEnvironmentConfig
      },
      roleStack: roleStack ? {
        controls: cloneControls(roleStack.controls),
        label: roleStack.label,
        environment: environmentForUtterance(utterance)
      } : undefined,
      roleDefault: {
        controls: cloneControls(getProfileControls(roleDefaultChannelId)),
        label: `${utterance.speaker} default · ${profileDefinitions[roleDefaultChannelId].label}`,
        environment: environmentForUtterance(utterance)
      },
      presetOverride: presetSourceForDecision(decision),
      manualOverride: {
        controls: cloneControls(controls),
        label: `${selectedProfileLabel} · Manual`,
        environment: environmentForUtterance(utterance)
      }
    });

    return {
      ...resolved,
      controls: controlsWithUtteranceQuindar(utterance, resolved.controls)
    };
  }

  function clipControlsForUtterance(utterance: Utterance): MacroControls {
    return renderSourceForUtterance(utterance).controls;
  }

  const currentQuindar = currentUtterance ? quindarByUtterance[currentUtterance.id] ?? globalQuindar : globalQuindar;

  function updateCurrentQuindar(next: QuindarOverride) {
    if (currentUtterance) {
      setQuindarByUtterance((current) => ({ ...current, [currentUtterance.id]: next }));
      setTransportStatus(`${currentUtterance.id} Quindar tones updated: intro ${next.intro ? "on" : "off"}, outro ${next.outro ? "on" : "off"}. Process FX again to render the change.`);
      return;
    }
    updateControl("quindarMode", quindarModeFromOverride(next));
    setTransportStatus(`Default Quindar tones updated: intro ${next.intro ? "on" : "off"}, outro ${next.outro ? "on" : "off"}.`);
  }

  function fxLabelForUtterance(utterance: Utterance) {
    return renderSourceForUtterance(utterance).label;
  }

  function processingSignatureForUtterance(utterance: Utterance) {
    const renderSource = renderSourceForUtterance(utterance);
    const renderDecision = alpha2Session.renderDecisions[utterance.id];
    const fallbackMode = fallbackRenderModeForUtterance(utterance);
    return JSON.stringify({
      rawSource: cleanMap[utterance.id] || "",
      utteranceText: utterance.text,
      voice: resolveVoiceProfile({ ...roleVoiceProfiles[utterance.speaker], ...(utterance.voice || {}) }, utterance.speaker),
      clipControls: renderSource.controls,
      utteranceEnvironment: renderSource.environment,
      renderDecision: renderDecisionSignature(renderDecision, fallbackMode),
      narrativeContext: renderSource.mode === "narrative_draft" ? {
        label: narrativeDraftLabel,
        flight: alpha2Session.flight,
        comms: alpha2Session.comms,
        weather: alpha2Session.weather,
        earthWeatherMacroOverrides
      } : undefined
    });
  }

  function formatTransportTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = seconds - mins * 60;
    return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
  }

  function playAudioUrl(url: string | undefined, label: string) {
    if (!url) {
      setError(`No audio available for ${label}. Generate or process it first.`);
      setTransportStatus(`No audio available for ${label}.`);
      return;
    }
    setError("");
    const player = transportAudioRef.current || new Audio();
    transportAudioRef.current = player;
    player.pause();
    player.src = url;
    setTransportProgress(0);
    setTransportDuration(0);
    setActivePlaybackLabel(label);
    player.onloadedmetadata = () => setTransportDuration(Number.isFinite(player.duration) ? player.duration : 0);
    player.ontimeupdate = () => {
      setTransportProgress(player.currentTime || 0);
      if (Number.isFinite(player.duration)) setTransportDuration(player.duration);
    };
    player.onended = () => {
      setTransportProgress(Number.isFinite(player.duration) ? player.duration : 0);
      setTransportStatus(`Finished ${label}.`);
      setActivePlaybackLabel("");
    };
    player.play()
      .then(() => setTransportStatus(`Playing ${label}.`))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Playback failed");
        setTransportStatus(`Playback failed for ${label}.`);
        setActivePlaybackLabel("");
      });
  }

  function selectTimelineUtterance(utterance: Utterance, play = false) {
    setSelectedSpectrogramUtteranceId(utterance.id);
    if (!play) {
      setTransportStatus(`Selected ${utterance.id} · ${utterance.speaker}. Press Play for best available audio.`);
      return;
    }
    const url = processedMap[utterance.id] || cleanMap[utterance.id];
    playAudioUrl(url, `${utterance.id} ${processedMap[utterance.id] ? "processed FX" : "raw TTS"}`);
  }

  function playCurrentBestAvailable() {
    if (finalPath) return playAudioUrl(finalPath, "final stitched WAV");
    if (currentUtterance && processedMap[currentUtterance.id]) return playAudioUrl(processedMap[currentUtterance.id], `${currentUtterance.id} processed FX`);
    if (currentUtterance && cleanMap[currentUtterance.id]) return playAudioUrl(cleanMap[currentUtterance.id], `${currentUtterance.id} raw TTS`);
    setError("Nothing to play yet. Generate raw TTS in Voice Lab, then process it in FX Lab.");
    setTransportStatus("Nothing to play yet.");
  }

  function stopTransport() {
    transportAudioRef.current?.pause();
    setActivePlaybackLabel("");
    setTransportStatus("Playback stopped.");
  }

  async function runBusy<T>(label: string, task: () => Promise<T>): Promise<T | undefined> {
    setBusyLabel(label);
    try {
      return await task();
    } finally {
      setBusyLabel("");
    }
  }

  function buildGenerationBrief() {
    return buildNarrativeGenerationBrief({
      sceneBrief,
      missionUtteranceCount,
      missionLanguage,
      speakerPatternLabel,
      flight: alpha2Session.flight,
      comms: alpha2Session.comms,
      earthWeather: {
        ...alpha2Session.weather,
        earthWeatherRegion,
        stormCloudCoverPct,
        rainScatter,
        earthquakeStatus
      },
      spaceWeather: alpha2Session.weather,
      earthWeatherChainSummary,
      narrativeSignalReasons
    });
  }

  function applyMissionPreset(presetId: Exclude<MissionPresetId, "custom">) {
    const preset = missionPresetCopy[presetId];
    setMissionPreset(presetId);
    setMissionLanguage(preset.language);
    setMissionUtteranceCount(preset.utteranceCount);
    setMissionSpeakerPattern(preset.speakerPattern);
    setSceneBrief(preset.sceneBrief);
    setValidation("not validated");
    setTransportStatus(`${preset.label} setup loaded. Generate structured script JSON when ready.`);
  }

  function storeRoleFxAssignment(role: FxRole, nextControls: MacroControls, label = `${role} FX · ${profileLabelForId(selectedProfile)} · ${nextControls.degradationMode}`) {
    const assignment = {
      controls: cloneControls(nextControls),
      label,
      assignedAt: new Date().toLocaleTimeString("en-US", { hour12: false })
    };
    setRoleFxAssignments((current) => ({ ...current, [role]: assignment }));
  }

  function extractDegradationControls(source: MacroControls): Partial<MacroControls> {
    return Object.fromEntries(
      degradationPresetKeys
        .filter((key) => source[key] !== undefined)
        .map((key) => [key, source[key]])
    ) as Partial<MacroControls>;
  }

  function mergeDegradationControls(base: MacroControls, layer: Partial<MacroControls>): MacroControls {
    return {
      ...base,
      ...extractDegradationControls({ ...base, ...layer } as MacroControls),
      channelProfile: base.channelProfile,
      hpHz: base.hpHz,
      lpHz: base.lpHz,
      compression: base.compression,
      drive: base.drive,
      telemetryEnabled: base.telemetryEnabled,
      telemetryStyle: base.telemetryStyle,
      telemetryLevel: base.telemetryLevel,
      telemetryOffsetMs: base.telemetryOffsetMs,
      quindarMode: base.quindarMode,
      quindarToneMs: base.quindarToneMs,
      quindarDrive: base.quindarDrive
    };
  }

  function assignCurrentFxToRole(role: FxRole) {
    setActiveFxRole(role);
    storeRoleFxAssignment(role, controls);
    setTransportStatus(`Assigned current FX to ${role}. Future ${role} processing will use this recipe.`);
  }

  function clearRoleFx(role: FxRole) {
    setActiveFxRole(role);
    setRoleFxAssignments((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
    setTransportStatus(`${role} FX assignment cleared. Processing will use the live FX panel.`);
  }

  function resetFxForRole(role: FxRole) {
    const baseProfile = roleDefaultChannel[role];
    const nextControls = cloneControls(getProfileControls(baseProfile));
    setActiveFxRole(role);
    setControls(nextControls);
    setSelectedProfile(baseProfile);
    setSelectedDegradationProfile(`builtin-${nextControls.degradationMode}`);
    setEnvironmentInfluenceEnabled(false);
    setFineDspInfluenceEnabled(false);
    setEnvironmentApplied(false);
    setSaveStatus("");
    setRoleFxAssignments((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
    setTransportStatus(`Cleared ${role} FX. Started a fresh ${profileDefinitions[baseProfile].label} stack for that role.`);
  }

  function selectFxRoleTarget(role: FxRole) {
    setActiveFxRole(role);
    setVoiceProfile(roleVoiceProfiles[role]);
    const firstForRole = utterances.find((utterance) => utterance.speaker === role);
    if (firstForRole) {
      setSelectedSpectrogramUtteranceId(firstForRole.id);
      setAuditionText(firstForRole.text);
      setTransportStatus(`FX target set to ${role}. Selected ${firstForRole.id} as the scratchpad/source utterance.`);
    } else {
      setTransportStatus(`FX target set to ${role}. No ${role} utterance exists in the current script yet.`);
    }
  }

  function toGeneratedPath(url: string) {
    const value = String(url || "").trim();
    const generatedIndex = value.indexOf("/generated/");
    if (generatedIndex >= 0) return value.slice(generatedIndex);
    return value.replace(API, "");
  }

  function publicUrlsToResult(publicUrls: SpectrogramResult): SpectrogramResult {
    return Object.fromEntries(Object.entries(publicUrls || {}).map(([key, value]) => [key, value ? `${API}${value}` : value])) as SpectrogramResult;
  }

  function selectNasaReference(slug: string) {
    const selected = nasaReferences.find((file) => file.slug === slug);
    setNasaSlug(slug);
    if (selected) {
      setNasaSource(selected.filename);
      setSpectrogramResult((current) => ({ ...(current || {}), nasaAudio: `${API}${selected.publicUrl}` }));
      setSpectrogramStatus(`NASA reference selected: ${selected.filename}`);
    }
  }

  async function selectSpectrogramPreview(mode: SpectrogramPreviewMode) {
    setSpectrogramPreviewMode(mode);
    if (mode === "nasa") {
      if (!spectrogramResult?.nasaSpectrogram) await generateNasaReferenceSpectrogram();
      return;
    }
    const existing = mode === "raw" ? spectrogramResult?.rawSpectrogram || spectrogramResult?.finalRawSpectrogram : spectrogramResult?.processedSpectrogram || spectrogramResult?.finalProcessedSpectrogram;
    if (!existing) await generateCurrentUtteranceSpectrograms();
  }

  function updateControl<K extends keyof MacroControls>(key: K, value: MacroControls[K]) {
    const nextControls = { ...controls, [key]: value };
    setControls(nextControls);
    setSelectedProfile("manual");
    setSaveStatus("");
    if (roleFxAssignments[activeFxRole]) {
      storeRoleFxAssignment(activeFxRole, nextControls, `${activeFxRole} FX · Live DSP draft · ${nextControls.degradationMode}`);
    }
  }

  function updateNumber(key: NumberControlKey, value: number) {
    if (!fineDspInfluenceEnabled) {
      setFineDspInfluenceEnabled(true);
      setTransportStatus("Fine DSP Parameters armed. Slider changes now update the active FX stack.");
    }
    updateControl(key, value as MacroControls[typeof key]);
  }

  function updateVoiceProfile(next: Partial<VoiceProfile>) {
    setVoiceProfile((current) => resolveVoiceProfile({ ...current, ...next }, next.speakerRole || current.speakerRole));
  }

  function selectVoiceCastingRole(role: FxRole) {
    setVoiceProfile(resolveVoiceProfile(roleVoiceProfiles[role], role));
    const firstForRole = utterances.find((utterance) => utterance.speaker === role);
    if (firstForRole) setAuditionText(firstForRole.text);
    setTransportStatus(`${role} casting selected. Audition and recast now target ${role}.`);
  }

  function recastVoiceRole(role: FxRole) {
    setAuditionByRole((current) => {
      const next = { ...current };
      delete next[role];
      return next;
    });
    if (auditionPath === auditionByRole[role]) setAuditionPath("");
    setVoiceProfile(resolveVoiceProfile(roleVoiceProfiles[role], role));
    setTransportStatus(`${role} audition cleared. Select or tune the voice, then generate a new audition.`);
  }

  function updateVoiceGroupFilter(group: VoiceGroupFilter) {
    setVoiceGroupFilter(group);
    const options = voiceOptionsForGroup(group);
    if (!options.some((option) => option.id === voiceProfile.voiceId)) {
      updateVoiceProfile({ voiceId: options[0]?.id || "alloy" });
    }
  }

  function applyProfile(id: string) {
    const builtin = profileDefinitions[id as ChannelProfile];
    const custom = savedProfiles.find((p) => p.id === id);
    const currentDegradation = controls.degradationMode;
    if (builtin) {
      const nextControls = { ...cloneControls(builtin.controls), degradationMode: currentDegradation };
      setControls(nextControls);
      setSelectedProfile(id);
      setEnvironmentBaseProfile(id as ChannelProfile);
      setSaveStatus("");
      setTransportStatus(`Loaded ${profileLabelForId(id)} with ${currentDegradation} degradation. Preview FX or process the selected raw clip to hear it.`);
      if (roleFxAssignments[activeFxRole]) storeRoleFxAssignment(activeFxRole, nextControls, `${activeFxRole} FX · ${profileLabelForId(id)} · ${nextControls.degradationMode}`);
    } else if (custom) {
      const nextControls = { ...cloneControls(custom.controls), degradationMode: currentDegradation };
      setControls(nextControls);
      setSelectedProfile(id);
      setSaveStatus("");
      setTransportStatus(`Loaded ${profileLabelForId(id)} with ${currentDegradation} degradation. Preview FX or process the selected raw clip to hear it.`);
      if (roleFxAssignments[activeFxRole]) storeRoleFxAssignment(activeFxRole, nextControls, `${activeFxRole} FX · ${profileLabelForId(id)} · ${nextControls.degradationMode}`);
    }
  }

  function updateDegradationMode(mode: DegradationMode) {
    const nextControls = { ...controls, degradationMode: mode };
    setControls(nextControls);
    setSelectedDegradationProfile(`builtin-${mode}`);
    setSaveStatus("");
    setTransportStatus(`Layered ${mode} degradation over ${selectedProfileLabel}. Preview FX to test this channel/degradation cross.`);
    if (roleFxAssignments[activeFxRole]) {
      storeRoleFxAssignment(activeFxRole, nextControls, `${activeFxRole} FX · ${selectedProfileLabel} · ${mode}`);
    }
  }

  function applyDegradationProfile(id: string) {
    if (id.startsWith("builtin-")) {
      updateDegradationMode(id.replace("builtin-", "") as DegradationMode);
      return;
    }
    const custom = savedDegradationProfiles.find((profile) => profile.id === id);
    if (!custom) return;
    const nextControls = mergeDegradationControls(controls, custom.controls);
    setControls(nextControls);
    setSelectedDegradationProfile(id);
    setSaveStatus("");
    setTransportStatus(`Layered degradation preset ${custom.name} over ${selectedProfileLabel}. Preview FX or process again to hear it.`);
    if (roleFxAssignments[activeFxRole]) {
      storeRoleFxAssignment(activeFxRole, nextControls, `${activeFxRole} FX · ${selectedProfileLabel} · ${custom.name}`);
    }
  }

  function saveCurrentProfile() {
    const existing = savedProfiles.find((p) => p.id === selectedProfile);
    const name = profileName.trim() || existing?.name || `Custom ${savedProfiles.length + 1}`;
    const next = existing
      ? savedProfiles.map((profile) => profile.id === selectedProfile ? { ...profile, name, controls: cloneControls(controls) } : profile)
      : [...savedProfiles, { id: `custom-${Date.now()}`, name, controls: cloneControls(controls) }];
    setSavedProfiles(next);
    localStorage.setItem(customProfilesKey, JSON.stringify(next));
    setSelectedProfile(existing ? selectedProfile : next[next.length - 1].id);
    setProfileName("");
    setSaveStatus(existing ? `Updated ${name}` : `Saved ${name}`);
  }

  function saveCurrentDegradationProfile() {
    const existing = savedDegradationProfiles.find((profile) => profile.id === selectedDegradationProfile);
    const name = profileName.trim() || existing?.name || `Degradation ${savedDegradationProfiles.length + 1}`;
    const next = existing
      ? savedDegradationProfiles.map((profile) => profile.id === selectedDegradationProfile ? { ...profile, name, controls: extractDegradationControls(controls) } : profile)
      : [...savedDegradationProfiles, { id: `custom-deg-${Date.now()}`, name, controls: extractDegradationControls(controls) }];
    setSavedDegradationProfiles(next);
    localStorage.setItem(customDegradationProfilesKey, JSON.stringify(next));
    setSelectedDegradationProfile(existing ? selectedDegradationProfile : next[next.length - 1].id);
    setProfileName("");
    setSaveStatus(existing ? `Updated degradation ${name}` : `Saved degradation ${name}`);
  }

  function deleteSelectedCustomProfile() {
    const next = savedProfiles.filter((p) => p.id !== selectedProfile);
    setSavedProfiles(next);
    localStorage.setItem(customProfilesKey, JSON.stringify(next));
    setSelectedProfile("manual");
    setSaveStatus("Deleted custom profile");
  }

  function deleteSelectedCustomDegradationProfile() {
    if (!selectedDegradationProfile.startsWith("custom-deg-")) return;
    const next = savedDegradationProfiles.filter((profile) => profile.id !== selectedDegradationProfile);
    setSavedDegradationProfiles(next);
    localStorage.setItem(customDegradationProfilesKey, JSON.stringify(next));
    setSelectedDegradationProfile(`builtin-${controls.degradationMode}`);
    setSaveStatus("Deleted custom degradation preset");
  }

  async function generateScript() {
    await runBusy("Generating structured script JSON", async () => {
      setError("");
      setValidation("not validated");
      const sceneBriefWithSetup = buildGenerationBrief();
      const res = await fetch(`${API}/api/script/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneBrief: sceneBriefWithSetup,
          defaults: { language: missionLanguage, utterance_count: missionUtteranceCount, speaker_pattern: missionSpeakerPattern }
        })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "script generation failed");
      setScriptJson(JSON.stringify(data.script, null, 2));
      setSelectedSpectrogramUtteranceId(data.script?.utterances?.[0]?.id || "");
      updateAlpha2Section("mission", {
        jsonStatus: "generated",
        promptIntent: sceneBriefWithSetup,
        storySeed: sceneBrief.trim()
      });
      setTransportStatus(`Script generated. Validate it, then move to Voice Lab.`);
    });
  }

  async function validate() {
    await runBusy("Validating script JSON", async () => {
      setError("");
      const candidate = parsedScriptFromJson;
      if (!candidate) return setValidation("invalid json parse");
      const res = await fetch(`${API}/api/script/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidate }) });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error || "validation failed";
        setError(message);
        setValidation(`invalid: ${message}`);
        updateAlpha2Section("mission", { jsonStatus: "needs_review" });
        return;
      }
      setValidation(data.valid ? "valid" : `invalid: ${data.errors.join(" | ")}`);
      updateAlpha2Section("mission", { jsonStatus: data.valid ? "validated" : "needs_review" });
      setTransportStatus(data.valid ? "Script validated. Voice casting is next." : "Script validation found issues.");
    });
  }

  async function generateUtterance(utterance: Utterance) {
    await runBusy(`Generating raw TTS for ${utterance.id}`, async () => {
      const utteranceWithVoice = utteranceWithRoleVoice(utterance);
      const res = await fetch(`${API}/api/tts/utterance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ utterance: utteranceWithVoice, voiceProfile: utteranceWithVoice.voice, sessionId }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "tts failed");
      setCleanMap((m) => ({ ...m, [utterance.id]: `${API}${data.path}` }));
      setTransportStatus(`RAW source rendered for FX: ${utterance.id} using ${voiceSummary(utteranceWithVoice.voice, utterance.speaker)}. Process FX to refresh the processed clip.`);
    });
  }

  async function generateAll() {
    await runBusy("Generating batch raw TTS", async () => {
      if (!parsedScript?.utterances?.length) {
        setError("Generate and validate a script before batch TTS.");
        setTransportStatus("Batch TTS needs generated utterances first.");
        return;
      }
      const list = (parsedScript?.utterances || []).map(utteranceWithRoleVoice);
      const res = await fetch(`${API}/api/tts/batch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ utterances: list, sessionId }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "batch failed");
      const next: Record<string, string> = {};
      for (const item of data.success) {
        if (item.path && item.meta?.id) next[item.meta.id] = `${API}${item.path}`;
      }
      setCleanMap((m) => ({ ...m, ...next }));
      setTransportStatus(`Batch TTS generated ${Object.keys(next).length} raw clips using CAPCOM/SHIP casting assignments.`);
    });
  }

  async function auditionVoice() {
    await runBusy("Generating one voice audition", async () => {
      setError("");
      const auditionRole: FxRole = activeScreen === "fx" ? activeFxRole : voiceProfile.speakerRole === "SHIP" ? "SHIP" : "CAPCOM";
      const profileForAudition = activeScreen === "fx"
        ? resolveVoiceProfile(roleVoiceProfiles[auditionRole], auditionRole)
        : voiceProfile;
      const res = await fetch(`${API}/api/tts/audition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceProfile: profileForAudition, text: auditionText })
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "audition failed");
      const auditionUrl = `${API}${data.path}`;
      setAuditionPath(auditionUrl);
      setAuditionByRole((current) => ({ ...current, [auditionRole]: auditionUrl }));
      setTransportStatus(`Casting audition ready: ${auditionRole} · ${profileForAudition.voiceId}. This audition does not feed FX until you render a RAW source.`);
    });
  }

  function updateScriptUtteranceVoices(mapper: (utterance: Utterance, index: number) => Partial<VoiceProfile>) {
    if (!parsedScript?.utterances) return;
    const next = {
      ...parsedScript,
      utterances: parsedScript.utterances.map((utterance, index) => ({
        ...utterance,
        voice: mapper(utterance, index)
      }))
    };
    setScriptJson(JSON.stringify(next, null, 2));
  }

  function updateScriptUtteranceText(id: string, text: string) {
    if (!parsedScript?.utterances) return;
    const next = {
      ...parsedScript,
      utterances: parsedScript.utterances.map((utterance) => utterance.id === id ? { ...utterance, text } : utterance)
    };
    setScriptJson(JSON.stringify(next, null, 2));
    setValidation("not validated");
    updateAlpha2RenderDecision({
      targetId: id,
      role: next.utterances.find((utterance) => utterance.id === id)?.speaker || "CAPCOM",
      mode: "manual_override",
      label: "Dialogue text edited",
      status: "stale",
      note: "Text changed after audio work. Regenerate raw TTS and reprocess FX before Stitch."
    });
    setTransportStatus(`${id} text edited. Existing raw and processed audio should be treated as stale until regenerated.`);
  }

  async function regenerateUtteranceSlot(utterance: Utterance) {
    await runBusy(`Regenerating ${utterance.id}`, async () => {
      setError("");
      const prompt = [
        buildGenerationBrief(),
        "",
        `Regenerate only utterance ${utterance.id}.`,
        `Keep speaker exactly ${utterance.speaker}, channel exactly ${utterance.channel}, and language exactly ${utterance.language}.`,
        `Replace this line while preserving the scene facts: "${utterance.text}"`,
        "Return one concise radio utterance."
      ].join("\n");
      const res = await fetch(`${API}/api/script/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneBrief: prompt,
          defaults: { language: utterance.language, utterance_count: 1, speaker_pattern: utterance.speaker === "CAPCOM" ? "capcom_only" : "ship_only" }
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "single-line regeneration failed");
        return;
      }
      const generated = data.script?.utterances?.[0];
      if (!generated?.text || !parsedScript?.utterances) {
        setError("Single-line regeneration returned no usable utterance.");
        return;
      }
      const next = {
        ...parsedScript,
        utterances: parsedScript.utterances.map((item) => item.id === utterance.id ? { ...item, text: generated.text, style: generated.style || item.style, pronunciation_hints: generated.pronunciation_hints || item.pronunciation_hints } : item)
      };
      setScriptJson(JSON.stringify(next, null, 2));
      setValidation("not validated");
      updateAlpha2RenderDecision({
        targetId: utterance.id,
        role: utterance.speaker,
        mode: "manual_override",
        label: "Dialogue slot regenerated",
        status: "stale",
        note: "Single utterance text was regenerated. Regenerate raw TTS and reprocess FX before Stitch."
      });
      updateAlpha2Section("mission", { jsonStatus: "needs_review" });
      setTransportStatus(`${utterance.id} regenerated. Generate raw TTS and process FX before Stitch.`);
    });
  }

  function clearUtteranceAudio(id: string, mode: "raw" | "processed" | "all" = "processed") {
    if (mode === "raw" || mode === "all") {
      setCleanMap((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    if (mode === "processed" || mode === "all") {
      setProcessedMap((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setProcessedMetaMap((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    }
    updateAlpha2RenderDecision({
      targetId: id,
      role: parsedScript?.utterances.find((utterance) => utterance.id === id)?.speaker || "CAPCOM",
      mode: "manual_override",
      label: mode === "raw" ? "Raw cleared" : mode === "all" ? "Audio cleared" : "FX cleared",
      status: "needs_render",
      note: "User cleared audio output before final stitch."
    });
    setTransportStatus(`${id} ${mode === "processed" ? "processed FX" : mode} audio cleared. Render again before Stitch.`);
  }

  function saveAlpha2NarrativePreset() {
    const createdAt = new Date().toLocaleTimeString("en-US", { hour12: false });
    const label = `${alpha2Session.flight.missionPhase} / ${alpha2Session.comms.groundStation} / ${alpha2Session.weather.presetName}`;
    setAlpha2Session((current) => ({
      ...current,
      presets: [...current.presets, { id: `alpha2-preset-${Date.now()}`, label, source: narrativeDraftLabel, createdAt }],
      updatedAt: new Date().toISOString()
    }));
    setTransportStatus(`Saved ALPHA2 narrative preset: ${label}.`);
  }

  function applyVoiceToAllUtterances() {
    updateScriptUtteranceVoices(() => voiceProfile);
  }

  function applySpeakerDefaults() {
    const capcom = resolveVoiceProfile(speakerDefaultProfiles.CAPCOM, "CAPCOM");
    const ship = resolveVoiceProfile(speakerDefaultProfiles.SHIP, "SHIP");
    setRoleVoiceProfiles({ CAPCOM: capcom, SHIP: ship });
    updateScriptUtteranceVoices((utterance) => {
      const role = roleFromSpeaker(utterance.speaker);
      return resolveVoiceProfile(speakerDefaultProfiles[role], role);
    });
    setVoiceStatus("Applied speaker defaults: CAPCOM and SHIP now have separate voice assignments.");
  }

  function assignCurrentVoiceToRole(role: "CAPCOM" | "SHIP") {
    const assigned = resolveVoiceProfile({
      ...voiceProfile,
      speakerRole: role,
      label: `${role} · ${voiceRegistry[voiceProfile.voiceId].displayName}`
    }, role);
    setRoleVoiceProfiles((current) => ({ ...current, [role]: assigned }));
    if (parsedScript?.utterances) {
      const next = {
        ...parsedScript,
        utterances: parsedScript.utterances.map((utterance) => utterance.speaker === role ? { ...utterance, voice: assigned } : utterance)
      };
      setScriptJson(JSON.stringify(next, null, 2));
    }
    setVoiceStatus(`Assigned ${voiceRegistry[assigned.voiceId].displayName} to ${role}. Batch generation and Stitch labels will use this role map.`);
  }

  function randomizeOrganicVariation() {
    const next = Math.max(0, Math.min(1, Number((voiceProfile.organicVariation + 0.07 - ((voiceProfile.voiceId.charCodeAt(0) % 5) * 0.025)).toFixed(2))));
    updateVoiceProfile({ organicVariation: next });
  }

  function resetVoiceSettings() {
    setVoiceGroupFilter("all");
    setVoiceProfile(resolveVoiceProfile(speakerDefaultProfiles.CAPCOM, "CAPCOM"));
    setAuditionPath("");
    setAuditionByRole({});
  }

  function applyEnvironment(nextConfig: EnvironmentalAudioConfig, note: string, options: { storeActiveRole?: boolean } = {}) {
    const resolved = resolveEnvironmentalAudioControls(nextConfig);
    setControls(cloneControls(resolved));
    setSelectedProfile("manual");
    setEnvironmentBaseProfile(nextConfig.baseProfile);
    setEnvironmentInfluenceEnabled(true);
    setEnvironmentApplied(true);
    setEnvironmentStatus(note);
    if (options.storeActiveRole !== false && roleFxAssignments[activeFxRole]) {
      storeRoleFxAssignment(activeFxRole, cloneControls(resolved), `${activeFxRole} FX · Environment · ${resolved.degradationMode}`);
    }
  }

  function applyMissionGeometry() {
    applyEnvironment(
      { baseProfile: environmentBaseProfile, missionGeometry: currentEnvironmentConfig.missionGeometry },
      `Applied ${currentMissionDefinition.label}: ${currentMissionDefinition.sonicPreviewText}`
    );
  }

  function applySpaceWeather() {
    applyEnvironment(
      { baseProfile: environmentBaseProfile, spaceWeather: currentEnvironmentConfig.spaceWeather },
      `Applied ${currentWeatherDefinition.label}: ${currentWeatherDefinition.sonicPreviewText}`
    );
  }

  function applyFullEnvironment(options?: { storeActiveRole?: boolean }) {
    applyEnvironment(currentEnvironmentConfig, `Applied ${currentMissionDefinition.label} + ${currentWeatherDefinition.label}.`, options);
  }

  function applyNarrativeDraftToFx() {
    applyFullEnvironment({ storeActiveRole: false });
    for (const utterance of utterances) {
      updateAlpha2RenderDecision({
        targetId: utterance.id,
        role: utterance.speaker,
        mode: "narrative_draft",
        label: `Narrative Draft · ${utterance.speaker}`,
        status: processedMap[utterance.id] ? "stale" : "needs_render",
        note: "Uses Flight + COMMS + Weather draft until a role stack or utterance override is chosen."
      });
    }
    setTransportStatus("Narrative Signal Draft selected for utterance render decisions. Existing role stacks are preserved.");
  }

  function applyScenario(id: (typeof missionScenarioDefinitions)[number]["id"]) {
    const scenario = missionScenarioDefinitions.find((item) => item.id === id);
    if (!scenario) return;
    setEnvironmentBaseProfile(scenario.baseProfile);
    setMissionGeometry(scenario.missionGeometry.geometry);
    setMissionGeometryIntensity(scenario.missionGeometry.intensity);
    setMissionGeometryScope(scenario.missionGeometry.applyScope);
    setSpaceWeatherEvent(scenario.spaceWeather.event);
    setSpaceWeatherIntensity(scenario.spaceWeather.intensity);
    setSpaceWeatherDurationMode(scenario.spaceWeather.durationMode);
    setSpaceWeatherEnvelope(scenario.spaceWeather.envelope);
    setSpaceWeatherScope(scenario.spaceWeather.applyScope);
    applyEnvironment({
      baseProfile: scenario.baseProfile,
      missionGeometry: scenario.missionGeometry,
      spaceWeather: scenario.spaceWeather
    }, `Applied mission scenario: ${scenario.sonicPreviewText}`);
  }

  function simulateSpaceWeatherPass() {
    if (!parsedScript?.utterances?.length) {
      applyFullEnvironment();
      return;
    }
    const next = {
      ...parsedScript,
      environment_defaults: {
        missionGeometry: { geometry: missionGeometry, intensity: missionGeometryIntensity, applyScope: "scene_wide" as const },
        spaceWeather: { event: spaceWeatherEvent, intensity: spaceWeatherIntensity, durationMode: "scene_wide" as const, envelope: spaceWeatherEnvelope, applyScope: "scene_wide" as const }
      },
      utterances: parsedScript.utterances.map((utterance, index, list) => {
        const event = index === 0 ? "calm_link" : index === list.length - 1 ? "dsn_reacquisition" : spaceWeatherEvent;
        const intensity = index === 0 ? 0.2 : index === list.length - 1 ? Math.max(0.35, spaceWeatherIntensity * 0.7) : spaceWeatherIntensity;
        return {
          ...utterance,
          environment: {
            missionGeometry: { geometry: missionGeometry, intensity: missionGeometryIntensity, applyScope: "selected_utterance" as const },
            spaceWeather: { event, intensity, durationMode: "full_utterance" as const, envelope: index === 0 ? "static" as const : index === list.length - 1 ? "ramp_down" as const : spaceWeatherEnvelope, applyScope: "selected_utterance" as const }
          }
        };
      })
    };
    setScriptJson(JSON.stringify(next, null, 2));
    applyFullEnvironment();
    setEnvironmentStatus("Applied approximate three-phase scene: calm first utterance, selected event in the middle, DSN reacquisition at the end.");
  }

  async function processClip(u: Utterance) {
    return await runBusy(`Processing FX for ${u.id}`, async () => {
      const input = cleanMap[u.id];
      if (!input) {
        setError(`Generate raw TTS for ${u.id} before processing FX.`);
        setTransportStatus(`Raw TTS missing for ${u.id}.`);
        return null;
      }
      const path = toGeneratedPath(input);
      const renderSource = renderSourceForUtterance(u);
      const clipControls = renderSource.controls;
      const utteranceEnvironment = renderSource.environment;
      const signature = processingSignatureForUtterance(u);
      let data: { path?: string; error?: string; resolvedEnvironment?: { missionGeometry?: string; spaceWeather?: string }; resolvedMacro?: MacroControls };
      try {
        const res = await fetch(`${API}/api/audio/process`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputPath: path, controls: clipControls, environment: utteranceEnvironment, sessionId, utteranceId: u.id }) });
        data = await res.json();
        if (!res.ok) {
          const message = data.error || "process failed";
          setError(`Process failed for ${u.id}: ${message}`);
          setTransportStatus(`Process failed for ${u.id}: ${message}`);
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "network error";
        setError(`Process failed for ${u.id}: ${message}`);
        setTransportStatus(`Process failed for ${u.id}: ${message}`);
        return null;
      }
      if (!data.path) {
        setError(`Process failed for ${u.id}: server did not return a processed audio path.`);
        setTransportStatus(`Process failed for ${u.id}: missing processed audio path.`);
        return null;
      }
      setProcessedMap((m) => ({ ...m, [u.id]: `${API}${data.path}` }));
      setProcessedMetaMap((m) => ({ ...m, [u.id]: { profileLabel: fxLabelForUtterance(u), signature, summary: data.resolvedEnvironment && data.resolvedMacro ? `${controlsSummary(data.resolvedMacro)} | ${data.resolvedEnvironment.missionGeometry || "no geometry"} + ${data.resolvedEnvironment.spaceWeather || "no weather"}` : controlsSummary(clipControls) } }));
      updateAlpha2RenderDecision({
        targetId: u.id,
        role: u.speaker,
        mode: renderSource.mode,
        presetId: alpha2Session.renderDecisions[u.id]?.presetId,
        label: renderSource.label,
        status: "current",
        note: "Processed audio matches the current voice, text, FX stack, and environment signature."
      });
      setTransportStatus(`Processed ${u.id}. Stitch will now use the refreshed FX clip.`);
      return data;
    });
  }

  async function processSelectedWithSpectrograms() {
    setError("");
    if (!currentUtterance) {
      setError("Generate or select an utterance first.");
      setTransportStatus("Process + Spectrograms needs a selected utterance.");
      return;
    }
    if (!cleanMap[currentUtterance.id]) {
      setError(`Generate raw TTS for ${currentUtterance.id} before processing FX.`);
      setTransportStatus(`Process + Spectrograms needs a RAW source for ${currentUtterance.id}. Use 1 Render RAW Source first.`);
      return;
    }
    setTransportStatus(`Processing ${currentUtterance.id}, then generating spectrograms...`);
    const processed = await processClip(currentUtterance);
    if (!processed) return;
    await generateCurrentUtteranceSpectrograms();
  }

  async function processSelectedOnly() {
    setError("");
    if (!currentUtterance) {
      setError("Generate or select an utterance first.");
      setTransportStatus("Process Selected needs a selected utterance.");
      return;
    }
    if (!cleanMap[currentUtterance.id]) {
      setError(`Generate raw TTS for ${currentUtterance.id} before processing FX.`);
      setTransportStatus(`Process Selected needs a RAW source for ${currentUtterance.id}. Use 1 Render RAW Source first.`);
      return;
    }
    setTransportStatus(`Processing ${currentUtterance.id} with ${fxLabelForUtterance(currentUtterance)}...`);
    await processClip(currentUtterance);
  }

  async function previewSelectedFx() {
    setError("");
    if (!currentUtterance) {
      setError("Generate or select an utterance first.");
      setTransportStatus("Preview FX needs a selected utterance.");
      return;
    }
    if (!cleanMap[currentUtterance.id]) {
      setError(`Generate raw TTS for ${currentUtterance.id} before previewing FX.`);
      setTransportStatus(`Preview FX needs a RAW source for ${currentUtterance.id}. Use 1 Render RAW Source first.`);
      return;
    }
    setTransportStatus(`Rendering FX preview for ${currentUtterance.id}...`);
    const processed = await processClip(currentUtterance);
    if (processed?.path) {
      playAudioUrl(`${API}${processed.path}`, `${currentUtterance.id} processed FX preview`);
    } else {
      setTransportStatus(`FX preview could not render for ${currentUtterance.id}. Check the error message.`);
    }
  }

  async function generateCurrentUtteranceAudio() {
    setError("");
    if (!currentUtterance) {
      setError("Generate or select an utterance first.");
      setTransportStatus("Generate Raw needs a selected utterance.");
      return;
    }
    setTransportStatus(`Generating raw TTS for ${currentUtterance.id} using ${voiceSummary(currentUtterance.voice, currentUtterance.speaker)}...`);
    await generateUtterance(currentUtterance);
  }

  async function stitch() {
    await runBusy("Stitching final WAV", async () => {
      const scriptUtterances = parsedScript?.utterances || [];
      if (!scriptUtterances.length) {
        setError("Generate dialogue before stitching.");
        setTransportStatus("Stitch needs utterances first.");
        return;
      }
      const renderReadiness = evaluateStitchReadiness(scriptUtterances.map((u) => ({
        id: u.id,
        role: u.speaker,
        rawUrl: cleanMap[u.id],
        processedUrl: processedMap[u.id],
        processedSignature: processedMetaMap[u.id]?.signature,
        currentSignature: processingSignatureForUtterance(u)
      })));
      if (!renderReadiness.ready) {
        const summary = formatStitchBlockers(renderReadiness.blocked);
        setError(`Stitch blocked. Render current FX for every utterance first: ${summary}`);
        setTransportStatus(`Stitch blocked by ${renderReadiness.blocked.length} utterance(s): ${summary}.`);
        return;
      }
      const order = scriptUtterances.map((u) => toGeneratedPath(processedMap[u.id]));
      const rawOrder = scriptUtterances.map((u) => cleanMap[u.id]).filter(Boolean).map((p) => toGeneratedPath(p as string));
      const gapMs = scriptUtterances.slice(0, -1).map((u) => Math.round(Math.max(0, stitchGapByUtterance[u.id] ?? 0.12) * 1000));
      const res = await fetch(`${API}/api/audio/stitch`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ processedPaths: order, rawPaths: rawOrder, gapMs, sessionId }) });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "stitch failed");
      setFinalPath(`${API}${data.path}`);
      setTransportStatus(`Final stitched WAV ready from ${order.length} processed clips with ${gapMs.length ? "custom inter-utterance silence" : "default spacing"}.`);
    });
  }

  async function generateCurrentUtteranceSpectrograms() {
    await runBusy("Generating selected utterance spectrograms", async () => {
      setError("");
      if (!selectedSpectrogramUtterance) return setError("Select an utterance with raw and processed audio first");
      setSpectrogramStatus("generating selected utterance spectrograms");
      const res = await fetch(`${API}/api/spectrogram/utterance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, utteranceId: selectedSpectrogramUtterance.id })
      });
      const data = await res.json();
      if (!res.ok) {
        setSpectrogramStatus("failed");
        return setError(data.error || "spectrogram generation failed");
      }
      setSpectrogramResult((current) => ({ ...(current || {}), ...publicUrlsToResult(data.publicUrls) }));
      setSpectrogramStatus("selected utterance spectrograms ready");
    });
  }

  async function generateBatchSpectrograms() {
    await runBusy("Generating batch spectrograms", async () => {
      if (!parsedScript?.utterances?.length) {
        setError("Generate utterances before batch spectrograms.");
        setSpectrogramStatus("waiting for generated utterances");
        return;
      }
      setError("");
      setSpectrogramStatus("generating batch spectrograms");
      const res = await fetch(`${API}/api/spectrogram/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) {
        setSpectrogramStatus("failed");
        return setError(data.error || "batch spectrogram generation failed");
      }
      const first = data.results?.find((item: { publicUrls?: SpectrogramResult }) => item.publicUrls)?.publicUrls;
      if (first) setSpectrogramResult((current) => ({ ...(current || {}), ...publicUrlsToResult(first) }));
      setSpectrogramStatus(`batch spectrograms ready (${data.results?.length || 0} checked)`);
    });
  }

  async function generateFinalSpectrograms() {
    await runBusy("Generating final WAV spectrograms", async () => {
      if (!finalPath) {
        setError("Stitch a final WAV before generating final spectrograms.");
        setSpectrogramStatus("waiting for final WAV");
        return;
      }
      setError("");
      setSpectrogramStatus("generating final WAV spectrograms");
      const res = await fetch(`${API}/api/spectrogram/final`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) {
        setSpectrogramStatus("failed");
        return setError(data.error || "final spectrogram generation failed");
      }
      setSpectrogramResult((current) => ({ ...(current || {}), ...publicUrlsToResult(data.publicUrls) }));
      setSpectrogramStatus("final WAV spectrograms ready");
    });
  }

  async function generateNasaReferenceSpectrogram() {
    return await runBusy("Generating NASA reference spectrogram", async () => {
      setError("");
      setSpectrogramStatus("generating NASA reference spectrogram");
      const res = await fetch(`${API}/api/spectrogram/nasa-reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nasaSlug, source: nasaSource })
      });
      const data = await res.json();
      if (!res.ok) {
        setSpectrogramStatus("failed");
        setError(data.error || "NASA reference spectrogram generation failed");
        return null;
      }
      setSpectrogramResult((current) => ({ ...(current || {}), ...publicUrlsToResult(data.publicUrls) }));
      setSpectrogramStatus("NASA reference spectrogram ready");
      return data;
    });
  }

  async function playNasaReferenceAudio() {
    setError("");
    const currentUrl = spectrogramResult?.nasaAudio;
    if (currentUrl) {
      playAudioUrl(currentUrl, `NASA reference ${nasaSlug || "audio"}`);
      return;
    }
    const matchingReference = nasaReferences.find((file) => file.slug === nasaSlug || file.filename === nasaSource) || nasaReferences[0];
    if (matchingReference) {
      const audioUrl = `${API}${matchingReference.publicUrl}`;
      setNasaSlug(matchingReference.slug);
      setNasaSource(matchingReference.filename);
      setSpectrogramResult((current) => ({ ...(current || {}), nasaAudio: audioUrl }));
      playAudioUrl(audioUrl, `NASA reference ${matchingReference.filename}`);
      return;
    }
    if (!nasaSlug.trim()) {
      setError("NASA reference audio not found. Add a WAV/MP3/M4A/FLAC file under artifacts/audio/nasa-reference/.");
      setTransportStatus("NASA playback needs a local file in artifacts/audio/nasa-reference/.");
      return;
    }
    setTransportStatus("Resolving NASA reference audio from artifacts/audio/nasa-reference/...");
    const generated = await generateNasaReferenceSpectrogram();
    const publicAudio = generated?.publicUrls?.nasaAudio ? `${API}${generated.publicUrls.nasaAudio}` : undefined;
    if (publicAudio) {
      playAudioUrl(publicAudio, `NASA reference ${nasaSlug}`);
      return;
    }
    setTransportStatus("NASA reference audio was not available. Check the local filename/slug.");
  }

  const voiceControls = [
    { key: "speed", label: "Speed", min: 0.25, max: 4, step: 0.05 },
    { key: "intensity", label: "Intensity", min: 0, max: 1, step: 0.01 },
    { key: "organicVariation", label: "Organic", min: 0, max: 1, step: 0.01 },
    { key: "clarityPriority", label: "Clarity", min: 0, max: 1, step: 0.01 }
  ] as const;

  const currentProcessedMeta = currentUtterance ? processedMetaMap[currentUtterance.id] : undefined;
  const currentProcessingSignature = currentUtterance ? processingSignatureForUtterance(currentUtterance) : "";
  const currentProcessedIsStale = Boolean(currentUtterance && processedMap[currentUtterance.id] && currentProcessedMeta?.signature !== currentProcessingSignature);
  const roleProcessedAudio = (["CAPCOM", "SHIP"] as const).reduce<Partial<Record<FxRole, { url: string; label: string }>>>((acc, role) => {
    const matchingUtterance = currentUtterance?.speaker === role && processedMap[currentUtterance.id]
      ? currentUtterance
      : utterances.find((utterance) => utterance.speaker === role && processedMap[utterance.id]);
    if (matchingUtterance) acc[role] = { url: processedMap[matchingUtterance.id], label: `${matchingUtterance.id} · ${role}` };
    return acc;
  }, {});
  const currentFxStatus = currentUtterance
    ? !cleanMap[currentUtterance.id]
      ? "Generate raw TTS in Voice Lab before this utterance can be processed."
      : !processedMap[currentUtterance.id]
        ? "Raw TTS exists. Process selected utterance to hear the current FX settings."
        : currentProcessedIsStale
          ? "FX controls changed after the last process. Reprocess selected utterance to update Stitch."
          : "Processed clip matches the current FX and environment settings."
    : "Select or generate an utterance first.";
  const alpha2RenderRows = utterances.map((utterance) => {
    const storedDecision = alpha2Session.renderDecisions[utterance.id];
    const processedDetail = getProcessedAudioStatusDetail({
      rawUrl: cleanMap[utterance.id],
      processedUrl: processedMap[utterance.id],
      processedSignature: processedMetaMap[utterance.id]?.signature,
      currentSignature: processingSignatureForUtterance(utterance),
      role: utterance.speaker
    });
    const processedStatus = processedDetail.status;
    const fallbackStatus: Alpha2RenderStatus = processedStatus === "current" ? "current" : processedStatus === "stale" ? "stale" : "needs_render";
    const fallbackMode = fallbackRenderModeForUtterance(utterance);
    return storedDecision
      ? { ...storedDecision, staleReasons: processedDetail.staleReasons, status: processedStatus === "current" ? "current" : storedDecision.status === "current" ? fallbackStatus : storedDecision.status }
      : {
        targetId: utterance.id,
        role: utterance.speaker,
        mode: fallbackMode,
        label: fallbackMode === "role_stack" ? fxLabelForUtterance(utterance) : "Narrative Draft",
        status: fallbackStatus,
        note: fallbackMode === "role_stack" ? "Role FX stack selected for this speaker." : "Using auto-drafted narrative signal until changed.",
        staleReasons: processedDetail.staleReasons
      };
  });
  let stitchCursorSeconds = 0;
  const stitchTimelineClips = utterances.map((utterance, index) => {
    const estimatedDuration = Math.max(2.2, Math.min(5.8, utterance.text.length / 34));
    const silenceAfter = index < utterances.length - 1 ? Math.max(0, stitchGapByUtterance[utterance.id] ?? 0.12) : 0;
    const renderDecision = alpha2RenderRows.find((row) => row.targetId === utterance.id);
    const clip = {
      utterance,
      start: stitchCursorSeconds,
      duration: estimatedDuration,
      silenceAfter,
      renderDecision
    };
    stitchCursorSeconds += estimatedDuration + silenceAfter;
    return clip;
  });
  const stitchTimelineDuration = Math.max(14, Math.ceil(stitchCursorSeconds || 14));
  const stitchTimelineTicks = Array.from({ length: Math.floor(stitchTimelineDuration / 2) + 1 }, (_, index) => index * 2);
  const stitchTimelineLanes = ["CAPCOM", "SHIP", "QD", "FX"] as const;
  const staleRenderCount = alpha2RenderRows.filter((row) => row.status === "stale").length;
  const rawSpectrogramSrc = spectrogramResult?.rawSpectrogram || spectrogramResult?.finalRawSpectrogram;
  const processedSpectrogramSrc = spectrogramResult?.processedSpectrogram || spectrogramResult?.finalProcessedSpectrogram;
  const nasaSpectrogramSrc = spectrogramResult?.nasaSpectrogram;
  const comparisonUtteranceSpectrogramSrc = processedSpectrogramSrc || rawSpectrogramSrc;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand-mark">V</div>
      <div className="brand-copy">
        <strong>Voice Radio ALPHA2</strong>
        <span>{activeLaneLabel} lane · narrative instrument</span>
      </div>
      <i className="divider" />
      <Tag color="copper" filled>{alpha2Session.flight.missionPhase}</Tag>
      <code>{sessionId}</code>
      <div className="topbar-spacer" />
      {busyLabel && <span className="work-indicator"><i /><strong>{busyLabel}</strong></span>}
      <Readout label="MET" value={new Date().toLocaleTimeString("en-US", { hour12: false })} color="copper" />
      <Readout label="BPM" value="120.0" />
      <span className="status-pill"><LED color={busyLabel ? "amber" : "green"} blink={Boolean(busyLabel)} /> {busyLabel ? "Working" : "Stitching"} · {processedCount} / {utterances.length || 0}</span>
    </header>

    <aside className="left-rail" aria-label="Primary navigation">
      {navigationSections.map((section) => <div key={section.lane} className="rail-section">
        <strong className="rail-section-title">{section.lane}</strong>
        {section.items.map((item) => <button key={item.id} className={`rail-button${activeScreen === item.id ? " active" : ""}`} onClick={() => setActiveScreen(item.id)}>
          <span>{item.icon}</span>
          <em>{item.label}</em>
        </button>)}
      </div>)}
      <div className="rail-bottom">
        {["□", "◬", "≡"].map((icon) => <button key={icon} className="rail-button dimmed"><span>{icon}</span></button>)}
      </div>
    </aside>

    <main className="workspace">
      <FlowGuide active={activeScreen} utteranceCount={utterances.length} cleanCount={cleanCount} processedCount={processedCount} finalReady={Boolean(finalPath)} />
      {(error || busyLabel) && <div className={`global-debug-panel${error ? " has-error" : ""}`} role={error ? "alert" : "status"}>
        <strong>{error ? "Action Error" : "Working"}</strong>
        <span>{error || busyLabel}</span>
        <em>{transportStatus}</em>
      </div>}
      {activeScreen === "console" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Mission Control</h1>
            <p>{missionSetupSummary}</p>
          </div>
          <div className="button-cluster">
            <Btn variant={missionPreset === "storm_65" ? "primary" : "ghost"} active={missionPreset === "storm_65"} onClick={() => applyMissionPreset("storm_65")}>Storm '65</Btn>
            <Btn active={missionPreset === "lo_orbit"} onClick={() => applyMissionPreset("lo_orbit")}>Lo-orbit</Btn>
            <Btn active={missionPreset === "emergency"} onClick={() => applyMissionPreset("emergency")}>Emergency</Btn>
          </div>
        </div>

        <Card title="Narrative Setup JSON" sub={alpha2Session.mission.jsonStatus} help="This is the setup object that gathers Mission, Flight, COMMS, and Weather before Dialogue creates or edits utterances." action={<div className="button-cluster"><Btn onClick={saveAlpha2NarrativePreset}>Save Preset</Btn><Btn onClick={() => setActiveScreen("flight")} variant="secondary">Flight</Btn><Btn onClick={() => setActiveScreen("dialogue")} variant="primary">Dialogue</Btn></div>} accent>
          <div className="alpha2-mission-grid">
            <div className="alpha2-map-panel">
              <strong>Mission World Layers</strong>
              <span>{activeLayerCount} active overlays feeding the story surface.</span>
              <div className="layer-toggle-grid">
                {Object.entries(alpha2Session.mission.activeLayers).map(([layer, enabled]) => <label key={layer}>
                  <span>{layer}</span>
                  <input type="checkbox" checked={enabled} onChange={(event) => updateAlpha2Layer(layer, event.target.checked)} />
                </label>)}
              </div>
            </div>
            <div className="alpha2-status-grid">
              <div><span>Flight</span><strong>{alpha2Session.flight.orbit}</strong><em>{alpha2Session.flight.earthDistanceKm.toLocaleString()} km from Earth</em></div>
              <div><span>COMMS</span><strong>{alpha2Session.comms.groundStation}</strong><em>{alpha2Session.comms.frequencyMhz.toFixed(1)} MHz · {alpha2Session.comms.blackoutRisk} risk</em></div>
              <div><span>Weather</span><strong>{alpha2Session.weather.spaceWeather}</strong><em>{alpha2Session.weather.liveMode ? "live mode" : "cached/offline mode"}</em></div>
              <div><span>Audio Draft</span><strong>{resolvedEnvironmentPreview.degradationMode}</strong><em>SQ {resolvedEnvironmentPreview.signalQuality.toFixed(2)} · packet {Number(resolvedEnvironmentPreview.packetLossDynamics ?? 0).toFixed(2)}</em></div>
            </div>
            <pre className="alpha2-json-preview">{alpha2SetupJson}</pre>
          </div>
        </Card>

        <div className="console-grid">
          <Card title="Mission World Map" sub={`${activeLayerCount} active layers`} help="Mission Control owns the map and reports that seed the story. Spectrograms now live only in the optional Audio analysis lane." accent>
            <Alpha2MapPlaceholder
              title="Earth / SHIP Situation"
              sub={`${alpha2Session.flight.missionPhase} · ${alpha2Session.comms.groundStation}`}
              variant="earth"
              tags={Object.entries(alpha2Session.mission.activeLayers).filter(([, enabled]) => enabled).slice(0, 5).map(([layer]) => layer)}
            />
            <div className="alpha2-report-grid">
              <div><Tag color="blue">NASA fallback</Tag><strong>Solar activity report</strong><span>{alpha2Session.weather.cachedReport}</span></div>
              <div><Tag color="amber">Weather</Tag><strong>{alpha2Session.weather.earthWeather}</strong><span>Rain and storm cells can bias hiss, reflections, and dialogue urgency.</span></div>
              <div><Tag color="green">Flight mirror</Tag><strong>{alpha2Session.flight.orbit}</strong><span>{alpha2Session.flight.earthDistanceKm.toLocaleString()} km from Earth · {alpha2Session.flight.speedKms.toFixed(1)} km/s.</span></div>
              <div><Tag color="copper">COMMS mirror</Tag><strong>{alpha2Session.comms.groundStation}</strong><span>{alpha2Session.comms.frequencyMhz.toFixed(1)} MHz · {alpha2Session.comms.blackoutRisk} blackout risk.</span></div>
            </div>
          </Card>
          <Card title="Mission Setup" sub={hasGeneratedScript ? "script generated" : "draft"} help="Step 1 starts here. Choose the scenario, language, utterance count, and speaker pattern before generating structured JSON." action={<div className="button-cluster"><Btn onClick={generateScript} variant="primary" disabled={Boolean(busyLabel)}>Generate Structured Script JSON</Btn><Btn onClick={validate} disabled={Boolean(busyLabel)}>Validate JSON</Btn></div>}>
            <div className="mission-setup-grid">
              <label>Scenario preset<select value={missionPreset} onChange={(e) => {
                const value = e.target.value as MissionPresetId;
                if (value === "custom") setMissionPreset("custom");
                else applyMissionPreset(value);
              }}>
                <option value="custom">Custom draft</option>
                <option value="storm_65">Storm '65</option>
                <option value="lo_orbit">Lo-orbit</option>
                <option value="emergency">Emergency</option>
              </select></label>
              <label>Language<input value={missionLanguage} onChange={(e) => { setMissionLanguage(e.target.value); setMissionPreset("custom"); }} placeholder="pt-BR, en-US" /></label>
              <label>Utterances<input type="number" min="1" max="12" value={missionUtteranceCount} onChange={(e) => { setMissionUtteranceCount(Math.max(1, Math.min(12, Number(e.target.value) || 1))); setMissionPreset("custom"); }} /></label>
              <label>Speaker pattern<select value={missionSpeakerPattern} onChange={(e) => { setMissionSpeakerPattern(e.target.value as SpeakerPattern); setMissionPreset("custom"); }}>
                <option value="alternating_capcom_ship">CAPCOM ↔ SHIP alternating</option>
                <option value="capcom_first">CAPCOM first, then alternating</option>
                <option value="ship_first">SHIP first, then alternating</option>
                <option value="capcom_only">CAPCOM only</option>
                <option value="ship_only">SHIP only</option>
              </select></label>
            </div>
            <div className="setup-callout">
              <Tag color={hasGeneratedScript ? "green" : "amber"} filled>{hasGeneratedScript ? "Generated" : "Draft"}</Tag>
              <span>{hasGeneratedScript ? "Script exists. Edits below affect the next generation, not the existing JSON until regenerated." : "No script has been generated yet. These fields define what the first JSON request should create."}</span>
            </div>
            <textarea rows={7} value={sceneBrief} onChange={(e) => { setSceneBrief(e.target.value); setMissionPreset("custom"); }} placeholder="Describe the mission moment, tone, stakes, and what CAPCOM/SHIP need to say." />
            <div className={validation.startsWith("valid") ? "success" : "error"}>Validation: {validation}</div>
            {error && <div className="error">Error: {error}</div>}
          </Card>
        </div>

        <Card title="Channels" sub={`${utterances.length} strips · master right`} help="Generated utterances appear as channel strips. Select one to focus right-rail context and spectrogram actions." action={<div className="button-cluster"><Btn size="sm" disabled>+ Add</Btn><Btn size="sm" disabled>Group</Btn><Btn size="sm" disabled>Reset</Btn></div>}>
          <div className="channel-grid">
            {utterances.length === 0 && <div className="empty-channel-state">
              <Tag color="amber" filled>Waiting for script</Tag>
              <strong>No utterances generated yet.</strong>
              <span>Use Mission Setup, then Generate Structured Script JSON and Validate JSON. Channel strips will appear here after a valid script exists.</span>
            </div>}
            {utterances.map((u, index) => {
              const processed = Boolean(processedMap[u.id]);
              return <button key={u.id} className={`channel-strip ${u.speaker === "SHIP" ? "ship" : "capcom"}${currentUtterance?.id === u.id ? " active" : ""}`} onClick={() => setSelectedSpectrogramUtteranceId(u.id)}>
                <strong>{u.id.toUpperCase()}</strong>
                <Tag color={u.speaker === "SHIP" ? "green" : "amber"}>{u.speaker}</Tag>
                <span>{voiceSummary(u.voice, u.speaker)}</span>
                <Wave color={u.speaker === "SHIP" ? "green" : "amber"} seed={index + 2} />
                <em>{processed ? "Processed" : cleanMap[u.id] ? "Raw only" : "Pending"}</em>
              </button>;
            })}
            {utterances.length > 0 && <button className="channel-strip master">
              <strong>BUS</strong>
              <Tag color="copper">MASTER</Tag>
              <span>{selectedProfileLabel}</span>
              <Wave seed={8} />
              <em>{finalPath ? "Export ready" : "Awaiting stitch"}</em>
            </button>}
          </div>
        </Card>
      </div>}

      {activeScreen === "flight" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Flight</h1>
            <p>Relative Earth/SHIP state, mission timers, and navigation presets for story and radio consequences.</p>
          </div>
          <div className="button-cluster"><Btn onClick={() => updateAlpha2Section("flight", createDefaultAlpha2Session().flight)}>Load Reentry Preset</Btn><Btn onClick={saveAlpha2NarrativePreset} variant="primary">Save Preset</Btn></div>
        </div>

        <div className="alpha2-two-column">
          <Card title="Flight State" sub={alpha2Session.flight.presetName} help="These values are narrative controls first. They shape dialogue context now and can later drive real propagation or delay math.">
            <div className="form-grid three">
              <label>Mission phase<input value={alpha2Session.flight.missionPhase} onChange={(event) => updateAlpha2Section("flight", { missionPhase: event.target.value })} /></label>
              <label>Orbit / regime<input value={alpha2Session.flight.orbit} onChange={(event) => updateAlpha2Section("flight", { orbit: event.target.value })} /></label>
              <label>Timer mode<select value={alpha2Session.flight.timerMode} onChange={(event) => updateAlpha2Section("flight", { timerMode: event.target.value as Alpha2FlightState["timerMode"] })}>
                <option value="met">T+ mission elapsed</option>
                <option value="reentry">T- reentry</option>
                <option value="landing">T- landing</option>
              </select></label>
              <label>Earth distance km<input type="number" value={alpha2Session.flight.earthDistanceKm} onChange={(event) => updateAlpha2Section("flight", { earthDistanceKm: Number(event.target.value) || 0 })} /></label>
              <label>Moon distance km<input type="number" value={alpha2Session.flight.moonDistanceKm} onChange={(event) => updateAlpha2Section("flight", { moonDistanceKm: Number(event.target.value) || 0 })} /></label>
              <label>Speed km/s<input type="number" step="0.1" value={alpha2Session.flight.speedKms} onChange={(event) => updateAlpha2Section("flight", { speedKms: Number(event.target.value) || 0 })} /></label>
              <label>Ship integrity %<input type="number" min="0" max="100" value={alpha2Session.flight.integrityPct} onChange={(event) => updateAlpha2Section("flight", { integrityPct: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label>
              <label>Moon landing target<input value={alpha2Session.flight.landingSite} onChange={(event) => updateAlpha2Section("flight", { landingSite: event.target.value })} /></label>
              <label>Earth reentry target<input value={alpha2Session.flight.reentrySite} onChange={(event) => updateAlpha2Section("flight", { reentrySite: event.target.value })} /></label>
            </div>
          </Card>

          <Card title="Navigation Readouts" sub="story consistency" help="This panel shows the creative meaning of the current flight state before it becomes dialogue or DSP.">
            <div className="alpha2-status-grid">
              <div><span>Timer</span><strong>{alpha2Session.flight.timerMode === "met" ? "T+ 118:42:09" : alpha2Session.flight.timerMode === "reentry" ? "T- 02:14:38" : "T- 00:47:12"}</strong><em>{alpha2Session.flight.missionPhase}</em></div>
              <div><span>Integrity</span><strong>{alpha2Session.flight.integrityPct}%</strong><em>{alpha2Session.flight.integrityPct < 60 ? "story warning" : "nominal with tension"}</em></div>
              <div><span>Signal time</span><strong>{(alpha2Session.flight.earthDistanceKm / 299792.458).toFixed(2)} s</strong><em>one-way light-time estimate</em></div>
              <div><span>Consistency</span><strong>{alpha2Session.flight.timerMode === "reentry" && alpha2Session.flight.moonDistanceKm < 10000 ? "check" : "ready"}</strong><em>{alpha2Session.flight.timerMode === "reentry" && alpha2Session.flight.moonDistanceKm < 10000 ? "Reentry while near Moon needs a story reason." : "Flight data can feed Dialogue."}</em></div>
            </div>
          </Card>
        </div>

        <Card title="Relative Position + Navigation Console" sub="map and image placeholders" help="Flight needs visual context even while telemetry is simulated. These placeholders reserve the future map/image contract without blocking the current flow.">
          <div className="alpha2-flight-visual-grid">
            <Alpha2MapPlaceholder
              title="Earth / Moon / SHIP"
              sub={`${alpha2Session.flight.orbit} · ${alpha2Session.flight.earthDistanceKm.toLocaleString()} km Earth range`}
              variant="orbit"
              tags={["Earth", "Moon", "SHIP", alpha2Session.flight.timerMode]}
            />
            <Alpha2ImageSlot label="Moon Landing Site" detail={alpha2Session.flight.landingSite} tone="blue" />
            <Alpha2ImageSlot label="Earth Reentry Map" detail={alpha2Session.flight.reentrySite} tone="green" />
            <div className="alpha2-terminal-panel">
              <strong>SHIP NAV TERMINAL</strong>
              <code>{`NAV> PHASE ${alpha2Session.flight.missionPhase.toUpperCase()}`}</code>
              <code>{`NAV> ORBIT ${alpha2Session.flight.orbit}`}</code>
              <code>{`NAV> RANGE_EARTH ${alpha2Session.flight.earthDistanceKm.toLocaleString()} KM`}</code>
              <code>{`NAV> SPEED ${alpha2Session.flight.speedKms.toFixed(1)} KM/S`}</code>
              <code>{`NAV> INTEGRITY ${alpha2Session.flight.integrityPct}%`}</code>
            </div>
          </div>
        </Card>

        <div className="alpha2-embedded-space">
          <SpaceScreen />
        </div>
      </div>}

      {activeScreen === "comms" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>COMMS</h1>
            <p>Antenna choices, DSN route, relay mode, and link budget for role FX suggestions.</p>
          </div>
          <div className="button-cluster"><Btn onClick={() => updateAlpha2Section("comms", createDefaultAlpha2Session().comms)}>Goldstone Preset</Btn><Btn onClick={() => setActiveScreen("weather")} variant="primary">Weather Impact</Btn></div>
        </div>

        <div className="alpha2-two-column">
          <Card title="Signal Route" sub={alpha2Session.comms.presetName} help="COMMS selects the path. Radio FX uses this as the reason for bandwidth, hiss, packet loss, and Quindar choices.">
            <div className="form-grid three">
              <label>Ground station<select value={alpha2Session.comms.groundStation} onChange={(event) => updateAlpha2Section("comms", { groundStation: event.target.value })}>
                <option>Goldstone DSN</option>
                <option>Madrid DSN</option>
                <option>Canberra DSN</option>
                <option>Local recovery antenna</option>
              </select></label>
              <label>Ship antenna<select value={alpha2Session.comms.shipAntenna} onChange={(event) => updateAlpha2Section("comms", { shipAntenna: event.target.value })}>
                <option>Apollo-style high-gain antenna</option>
                <option>Low-gain omni antenna</option>
                <option>Laser comm terminal</option>
                <option>Emergency VHF antenna</option>
              </select></label>
              <label>Relay mode<select value={alpha2Session.comms.relayMode} onChange={(event) => updateAlpha2Section("comms", { relayMode: event.target.value })}>
                <option>Direct S-band with relay standby</option>
                <option>Relay satellite during blackout</option>
                <option>Laser relay via orbital asset</option>
                <option>Emergency low-band fallback</option>
              </select></label>
              <label>Frequency MHz<input type="number" step="0.1" value={alpha2Session.comms.frequencyMhz} onChange={(event) => updateAlpha2Section("comms", { frequencyMhz: Number(event.target.value) || 0 })} /></label>
              <label>Latency ms<input type="number" value={alpha2Session.comms.latencyMs} onChange={(event) => updateAlpha2Section("comms", { latencyMs: Number(event.target.value) || 0 })} /></label>
              <label>Bandwidth kHz<input type="number" step="0.5" value={alpha2Session.comms.bandwidthKhz} onChange={(event) => updateAlpha2Section("comms", { bandwidthKhz: Number(event.target.value) || 0 })} /></label>
              <label>Power watts<input type="number" value={alpha2Session.comms.powerWatts} onChange={(event) => updateAlpha2Section("comms", { powerWatts: Number(event.target.value) || 0 })} /></label>
              <label>Blackout risk<select value={alpha2Session.comms.blackoutRisk} onChange={(event) => updateAlpha2Section("comms", { blackoutRisk: event.target.value as Alpha2CommsState["blackoutRisk"] })}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select></label>
              <label>Preset name<input value={alpha2Session.comms.presetName} onChange={(event) => updateAlpha2Section("comms", { presetName: event.target.value })} /></label>
            </div>
          </Card>

          <Card title="Route Diagram" sub="narrative signal" help="A compact readout of why the radio sound should change.">
            <div className="alpha2-signal-path">
              <span>{alpha2Session.comms.groundStation}</span>
              <i />
              <span>{alpha2Session.comms.relayMode}</span>
              <i />
              <span>{alpha2Session.comms.shipAntenna}</span>
            </div>
            <div className="alpha2-status-grid">
              <div><span>Latency</span><strong>{alpha2Session.comms.latencyMs} ms</strong><em>dialogue pacing candidate</em></div>
              <div><span>Bandwidth</span><strong>{alpha2Session.comms.bandwidthKhz} kHz</strong><em>bandpass and codec clue</em></div>
              <div><span>Power</span><strong>{alpha2Session.comms.powerWatts} W</strong><em>noise floor clue</em></div>
              <div><span>FX bias</span><strong>{alpha2Session.comms.blackoutRisk === "high" ? "collapse" : alpha2Session.comms.blackoutRisk === "medium" ? "nominal" : "subtle"}</strong><em>draft degradation target</em></div>
            </div>
          </Card>
        </div>

        <Card title="Antenna Map + Route Assets" sub="DSN, SHIP, relay, blackout" help="COMMS needs a station map, antenna cards, route assets, and blackout previews before it becomes FX suggestions.">
          <div className="alpha2-comms-grid">
            <Alpha2MapPlaceholder
              title="DSN Visibility Map"
              sub={`${alpha2Session.comms.groundStation} · day/night + satellite tracks`}
              variant="comms"
              tags={["Goldstone", "Madrid", "Canberra", "relay", "blackout"]}
            />
            <div className="alpha2-card-stack">
              <div><Tag color="amber" filled>Ground antenna</Tag><strong>{alpha2Session.comms.groundStation}</strong><span>CAPCOM route, Earth-side weather exposure, DSN handoff candidate.</span></div>
              <div><Tag color="green" filled>SHIP antenna</Tag><strong>{alpha2Session.comms.shipAntenna}</strong><span>Attitude-sensitive link profile and role FX source for SHIP.</span></div>
              <div><Tag color="blue" filled>Relay option</Tag><strong>{alpha2Session.comms.relayMode}</strong><span>Supports laser/satellite retransmission during blackout windows.</span></div>
            </div>
            <div className="alpha2-parameter-bank">
              <strong>Transmission Parameters</strong>
              <Readout label="Frequency" value={`${alpha2Session.comms.frequencyMhz.toFixed(1)} MHz`} color="copper" />
              <Readout label="Latency" value={`${alpha2Session.comms.latencyMs} ms`} />
              <Readout label="Bandwidth" value={`${alpha2Session.comms.bandwidthKhz} kHz`} color="green" />
              <Readout label="Power" value={`${alpha2Session.comms.powerWatts} W`} />
              <Readout label="Blackout" value={alpha2Session.comms.blackoutRisk} color={alpha2Session.comms.blackoutRisk === "high" ? "red" : "amber"} />
            </div>
          </div>
        </Card>
      </div>}

      {activeScreen === "weather" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Earth + Space Weather</h1>
            <p>One Weather nav tab, two focused pages: Earth weather for ground-map effects, Space weather for solar/ionosphere effects.</p>
          </div>
          <div className="button-cluster"><Btn active={activeWeatherPage === "earth"} onClick={() => setActiveWeatherPage("earth")}>Earth Weather</Btn><Btn active={activeWeatherPage === "space"} onClick={() => setActiveWeatherPage("space")}>Space Weather</Btn><Btn onClick={applyNarrativeDraftToFx} variant="primary">Send Draft to Radio FX</Btn><Btn onClick={() => setActiveScreen("voice")}>Audio Lane</Btn></div>
        </div>

        {activeWeatherPage === "earth" && <>
          <div className="alpha2-two-column">
            <Card title="Earth Weather Controls" sub={earthWeatherRegion} help="Earth weather is the ground-side layer: maps, DSN station exposure, rain/storm cells, earthquakes, and the parameters that bias hiss, reflections, and story pressure.">
              <div className="form-grid three">
                <label>Ground corridor<input value={earthWeatherRegion} onChange={(event) => updateAlpha2Section("weather", { earthWeatherRegion: event.target.value })} /></label>
                <label>Earth weather<input value={alpha2Session.weather.earthWeather} onChange={(event) => updateAlpha2Section("weather", { earthWeather: event.target.value })} /></label>
                <label>Earth intensity<input type="number" min="0" max="1" step="0.05" value={earthWeatherIntensity} onChange={(event) => updateAlpha2Section("weather", { earthWeatherIntensity: Math.max(0, Math.min(1, Number(event.target.value) || 0)) })} /></label>
                <label>Storm cover %<input type="number" min="0" max="100" value={stormCloudCoverPct} onChange={(event) => updateAlpha2Section("weather", { stormCloudCoverPct: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} /></label>
                <label>Rain scatter<input type="number" min="0" max="1" step="0.05" value={rainScatter} onChange={(event) => updateAlpha2Section("weather", { rainScatter: Math.max(0, Math.min(1, Number(event.target.value) || 0)) })} /></label>
                <label>Earthquake state<select value={earthquakeStatus} onChange={(event) => updateAlpha2Section("weather", { earthquakeStatus: event.target.value })}>
                  <option value="none">none</option>
                  <option value="watch">watch</option>
                  <option value="event">event</option>
                </select></label>
                <label>Live mode<input type="checkbox" checked={alpha2Session.weather.liveMode} onChange={(event) => updateAlpha2Section("weather", { liveMode: event.target.checked })} /></label>
                <label>Weather preset<input value={alpha2Session.weather.presetName} onChange={(event) => updateAlpha2Section("weather", { presetName: event.target.value })} /></label>
              </div>
              <textarea rows={4} value={alpha2Session.weather.cachedReport} onChange={(event) => updateAlpha2Section("weather", { cachedReport: event.target.value })} />
              <div className="button-cluster full-row"><Btn onClick={() => setActiveWeatherPage("space")} variant="secondary">Continue to Space Weather</Btn><Btn onClick={applyNarrativeDraftToFx} variant="primary">Send Earth Context to FX Draft</Btn></div>
            </Card>

            <Card title="Earth Chain Influence" sub="ground side of signal" help="This page answers: what on Earth is affecting the ground station, the story stakes, and the radio chain before space weather is layered on top?">
              <div className="alpha2-reason-list">
                {earthWeatherChainSummary.map((reason) => <span key={reason}>{reason}</span>)}
              </div>
              <div className="alpha2-status-grid">
                <div><span>Ground station</span><strong>{alpha2Session.comms.groundStation}</strong><em>Earth-side exposure</em></div>
                <div><span>Rain scatter</span><strong>{rainScatter.toFixed(2)}</strong><em>hiss and reflection clue</em></div>
                <div><span>Storm cells</span><strong>{stormCloudCoverPct}%</strong><em>report-map layer</em></div>
                <div><span>Earthquake</span><strong>{earthquakeStatus}</strong><em>narrative disruption flag</em></div>
              </div>
            </Card>
          </div>

          <Card title="Earth Reference Map + Ground Reports" sub={alpha2Session.weather.liveMode ? "live mode requested" : "cached fallback"} help="Pressing Earth Weather opens this ground-side reference map: DSN corridor, rain/storms, typhoon-ready layer, earthquakes, rain scatter, storm cover, and report cards.">
            <div className="alpha2-weather-grid">
              <Alpha2ReferenceMap
                title="Earth Reference Map"
                sub={`${earthWeatherRegion} · DSN exposure, rain cells, storm tracks, earthquake layer`}
                mode="earth"
                layers={[
                  { label: "ground corridor", value: earthWeatherRegion, detail: "Selected station corridor, day/night exposure, and future ground-map focus.", color: "blue" },
                  { label: "DSN exposure", value: alpha2Session.comms.groundStation, detail: "Ground antenna region used by COMMS and weather report filters.", color: "amber" },
                  { label: "rain scatter", value: rainScatter.toFixed(2), detail: "Ground-side hiss/reflection clue for the audio chain.", color: "green" },
                  { label: "storm cover", value: `${stormCloudCoverPct}%`, detail: "Cloud/storm intensity layer for narrative pressure and radio texture.", color: "copper" },
                  { label: "typhoon-ready", value: "layer slot", detail: "Reserved overlay for rotating storm systems and future live adapters.", color: "muted" },
                  { label: "earthquakes", value: earthquakeStatus, detail: "Ground disruption flag for story consistency and comms vulnerability.", color: earthquakeStatus === "event" ? "red" : "muted" }
                ]}
              />
              <div className="alpha2-report-grid">
                <div><Tag color="green" filled>earth report</Tag><strong>{alpha2Session.weather.earthWeather}</strong><span>Suggested FX: ground hiss floor, rain scatter, room-tone pressure, subtle reflections near the station.</span></div>
                <div><Tag color="blue">ground corridor report</Tag><strong>{earthWeatherRegion}</strong><span>Shows selected DSN region, day/night curve, station exposure, and future map overlays.</span></div>
                <div><Tag color="amber">rain/storm report</Tag><strong>{stormCloudCoverPct}% cover</strong><span>Ground-team pressure without changing spacecraft facts; likely denser noise floor and urgency.</span></div>
                <div><Tag color="copper">typhoon layer report</Tag><strong>prepared overlay</strong><span>Reserved map/report slot for rotating storm systems, route warnings, and future live weather adapters.</span></div>
                <div><Tag color="red">earthquake report</Tag><strong>{earthquakeStatus}</strong><span>Future report source: severity, location, comms disruption, and story relevance.</span></div>
                <div><Tag color="muted">source status</Tag><strong>{alpha2Session.weather.liveMode ? "live fetch slot" : "cached/offline"}</strong><span>{alpha2Session.weather.cachedReport}</span></div>
              </div>
            </div>
          </Card>
        </>}

        {activeWeatherPage === "space" && <>
          <div className="alpha2-two-column">
            <Card title="Space Weather Controls" sub={alpha2Session.weather.spaceWeather} help="Space weather is the solar/ionosphere layer: flares, magnetic storms, blackout windows, duration/envelope, and the DSP controls that should be drafted for Radio FX.">
              <div className="form-grid three">
                <label>Space weather<select value={spaceWeatherEvent} onChange={(event) => {
                  const next = event.target.value as SpaceWeatherEvent;
                  setSpaceWeatherEvent(next);
                  updateAlpha2Section("weather", { spaceWeather: spaceWeatherEventById[next].label });
                }}>{spaceWeatherEventDefinitions.map((definition) => <option key={definition.id} value={definition.id}>{definition.label}</option>)}</select></label>
                <label>Space intensity<input type="number" min="0" max="1" step="0.05" value={spaceWeatherIntensity} onChange={(event) => setSpaceWeatherIntensity(Math.max(0, Math.min(1, Number(event.target.value) || 0)))} /></label>
                <label>Duration<select value={spaceWeatherDurationMode} onChange={(event) => setSpaceWeatherDurationMode(event.target.value as EventDurationMode)}><option value="instant">Instant</option><option value="short">Short</option><option value="medium">Medium</option><option value="full_utterance">Full Utterance</option><option value="scene_wide">Scene-Wide</option></select></label>
                <label>Envelope<select value={spaceWeatherEnvelope} onChange={(event) => setSpaceWeatherEnvelope(event.target.value as EventEnvelope)}><option value="static">Static</option><option value="ramp_up">Ramp Up</option><option value="ramp_down">Ramp Down</option><option value="bell">Bell</option><option value="pulse_train">Pulse Train</option><option value="collapse_then_recover">Collapse Then Recover</option></select></label>
                <label>Scope<select value={spaceWeatherScope} onChange={(event) => setSpaceWeatherScope(event.target.value as EnvironmentApplyScope)}><option value="selected_utterance">Selected Utterance</option><option value="scene_wide">Scene-Wide</option></select></label>
                <label>Base radio profile<select value={environmentBaseProfile} onChange={(event) => setEnvironmentBaseProfile(event.target.value as ChannelProfile)}>
                  {profileOrder.map((id) => <option key={id} value={id}>{profileDefinitions[id].label}</option>)}
                </select></label>
              </div>
	              <div className="button-cluster full-row"><Btn onClick={() => setActiveWeatherPage("earth")}>Back to Earth Weather</Btn><Btn onClick={applySpaceWeather}>Apply Space Weather Only</Btn><Btn onClick={() => applyFullEnvironment()} variant="primary">Apply Full Environment</Btn><Btn onClick={simulateSpaceWeatherPass}>Write Across Utterances</Btn></div>
            </Card>

            <Card title="Narrative Signal Draft" sub="ready for Radio FX" help="This is the preset-like explanation the FX rack and Stitch can use instead of guessing.">
              <div className="alpha2-reason-list">
                {narrativeSignalReasons.map((reason) => <span key={reason}>{reason}</span>)}
              </div>
              <div className="alpha2-status-grid">
                <div><span>Bandpass</span><strong>{Number(resolvedEnvironmentPreview.hpHz ?? controls.hpHz).toFixed(0)}-{Number(resolvedEnvironmentPreview.lpHz ?? controls.lpHz).toFixed(0)} Hz</strong><em>voice bandwidth</em></div>
                <div><span>Hiss</span><strong>{Number(resolvedEnvironmentPreview.noise ?? controls.noise).toFixed(2)}</strong><em>noise glue</em></div>
                <div><span>Packet</span><strong>{Number(resolvedEnvironmentPreview.packetLossDynamics ?? 0).toFixed(2)}</strong><em>loss dynamics</em></div>
                <div><span>Quindar</span><strong>{resolvedEnvironmentPreview.quindarMode}</strong><em>role tone default</em></div>
              </div>
              <div className="button-cluster full-row"><Btn onClick={applyNarrativeDraftToFx} variant="primary">Use Narrative Draft</Btn><Btn onClick={saveAlpha2NarrativePreset}>Save As Preset</Btn></div>
            </Card>
          </div>

          <Card title="Space Reference Map + Space Reports" sub={alpha2Session.weather.liveMode ? "live mode requested" : "cached fallback"} help="Pressing Space Weather opens this route-side reference map: solar flare, ionosphere, magnetic storm, blackout zones, current intensity/duration/envelope/scope, and Narrative Signal Draft.">
            <div className="alpha2-weather-grid">
              <Alpha2ReferenceMap
                title="Space Reference Map"
                sub="solar flare, ionosphere, magnetic anomaly, satellite route, blackout zone"
                mode="space"
                layers={[
                  { label: "solar flare", value: alpha2Session.weather.spaceWeather, detail: "Solar source report that can increase hiss, packet loss, and story pressure.", color: "amber" },
                  { label: "ionosphere", value: currentWeatherDefinition.label, detail: "Scintillation and phase-smear influence for the radio route.", color: "blue" },
                  { label: "magnetic storm", value: `${spaceWeatherIntensity.toFixed(2)} intensity`, detail: "Magnetosphere layer used to explain degradation strength.", color: "copper" },
                  { label: "blackout zones", value: alpha2Session.comms.blackoutRisk, detail: "Route window that can push packet loss, low bandwidth, and reacquisition beats.", color: alpha2Session.comms.blackoutRisk === "high" ? "red" : "amber" },
                  { label: "duration/scope", value: `${spaceWeatherDurationMode} · ${spaceWeatherScope}`, detail: "How long and how broadly the event is applied.", color: "green" },
                  { label: "envelope", value: spaceWeatherEnvelope, detail: "Temporal shape for future time-varying DSP modulation.", color: "muted" }
                ]}
              />
              <div className="alpha2-report-grid">
                <div><Tag color="amber" filled>solar flare report</Tag><strong>{alpha2Session.weather.spaceWeather}</strong><span>Suggested story: keep exchanges concise, procedural, and anxious.</span></div>
                <div><Tag color="blue">ionosphere report</Tag><strong>Ionospheric storm band</strong><span>Suggested FX: phase smear, scintillation, and brief reacquisition moments.</span></div>
                <div><Tag color="copper">magnetic storm report</Tag><strong>{spaceWeatherIntensity.toFixed(2)} intensity</strong><span>Route-wide interference pressure for signal quality, jitter, and loss density.</span></div>
                <div><Tag color="red">blackout report</Tag><strong>{alpha2Session.comms.blackoutRisk} risk window</strong><span>Suggested FX: packet loss, low bandwidth, Quindar transition emphasis.</span></div>
                <div><Tag color="green">event shape report</Tag><strong>{spaceWeatherDurationMode} · {spaceWeatherEnvelope}</strong><span>Scope {spaceWeatherScope}; intensity {spaceWeatherIntensity.toFixed(2)} for future time-varying DSP modulation.</span></div>
                <div><Tag color="green">Narrative Signal Draft</Tag><strong>{currentWeatherDefinition.label}</strong><span>{currentWeatherDefinition.sonicPreviewText} · {spaceWeatherDurationMode}, {spaceWeatherEnvelope}, {spaceWeatherScope}.</span></div>
                <div><Tag color="muted">affected DSP report</Tag><strong>{affectedEnvironmentParameters.join(", ")}</strong><span>These parameters are the knobs Radio FX should explain and expose.</span></div>
              </div>
            </div>
          </Card>
        </>}
      </div>}

      {activeScreen === "voice" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Voice Archetypes</h1>
            <h2>Casting Before Script</h2>
            <p>Role voices, character cards, personality prompting, and audition before utterance rendering.</p>
          </div>
          <div className="button-cluster"><Btn>Cast</Btn><Btn onClick={auditionVoice} variant="secondary">Audition Voice</Btn><Btn onClick={generateAll} variant="primary">Generate batch</Btn></div>
        </div>

        <Card title="Character Card Draft" sub="future portrait JSON" help="This preserves the creative casting layer: personality prompt, voice parameters, and a future generated portrait descriptor live together before Dialogue.">
          <div className="alpha2-character-grid">
            <div className="alpha2-portrait-placeholder">
              <strong>{voiceProfile.speakerRole}</strong>
              <span>{voiceRegistry[voiceProfile.voiceId].displayName}</span>
            </div>
            <textarea rows={5} value={voiceProfile.extraInstruction || ""} onChange={(event) => updateVoiceProfile({ extraInstruction: event.target.value })} placeholder="Prompt personality, temperament, role history, emotional pressure, or performance notes for this voice." />
            <pre>{JSON.stringify({
              role: voiceProfile.speakerRole,
              voiceId: voiceProfile.voiceId,
              portrait_prompt: `${voiceProfile.speakerRole} radio operator, pixel art, ${voiceProfile.tonePreset || "calm technical"} mood`,
              authority_level: voiceProfile.speakerRole === "CAPCOM" ? "high" : "situational",
              stress_level: voiceProfile.intensity,
              cadence: voiceProfile.cadencePreset,
              tone: voiceProfile.tonePreset,
              delivery: voiceProfile.deliveryPreset
            }, null, 2)}</pre>
          </div>
          <div className="alpha2-role-param-grid">
            <label>Authority level<select value={voiceProfile.speakerRole === "CAPCOM" ? "high" : "situational"} onChange={(event) => updateVoiceProfile({ radioDisciplineInstruction: `Authority level: ${event.target.value}` })}>
              <option value="high">high</option>
              <option value="situational">situational</option>
              <option value="low">low / uncertain</option>
            </select></label>
            <label>Stress level<input type="range" min="0" max="1" step="0.01" value={voiceProfile.intensity} onChange={(event) => updateVoiceProfile({ intensity: Number(event.target.value) })} /></label>
            <label>Cadence intent<input value={voiceProfile.cadenceInstruction || voiceProfile.cadencePreset || ""} onChange={(event) => updateVoiceProfile({ cadenceInstruction: event.target.value })} /></label>
            <label>Language texture<input value={voiceProfile.accentInstruction || ""} onChange={(event) => updateVoiceProfile({ accentInstruction: event.target.value })} placeholder="Brazilian Portuguese, clipped Houston English" /></label>
          </div>
        </Card>

        <Card title="Casting Map" sub="role assignment before batch" help="Step 2 checkpoint. Assign the tuned voice to CAPCOM or SHIP, then batch generation uses those role assignments and Stitch shows them on every clip.">
          <div className="handoff-grid">
            <div className={`handoff-card role-select-card${voiceProfile.speakerRole === "CAPCOM" ? " selected" : ""}`} onClick={() => selectVoiceCastingRole("CAPCOM")} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && selectVoiceCastingRole("CAPCOM")}>
              <Tag color="amber" filled>CAPCOM</Tag>
              <strong>{voiceSummary(roleVoiceProfiles.CAPCOM, "CAPCOM")}</strong>
              <span>Ground / mission-control voice used for CAPCOM utterances.</span>
              <div className="button-cluster">
                <Btn onClick={(event) => { event.stopPropagation(); assignCurrentVoiceToRole("CAPCOM"); }} variant="secondary">Assign Current Voice to CAPCOM</Btn>
                <Btn onClick={(event) => { event.stopPropagation(); recastVoiceRole("CAPCOM"); }} variant="danger">Recast CAPCOM</Btn>
              </div>
              <VoiceAuditionPlayer
                activePlaybackLabel={activePlaybackLabel}
                label="CAPCOM voice audition"
                onPlay={() => playAudioUrl(auditionByRole.CAPCOM, "CAPCOM voice audition")}
                progress={transportPct}
                role="CAPCOM"
                url={auditionByRole.CAPCOM}
              />
            </div>
            <div className={`handoff-card role-select-card${voiceProfile.speakerRole === "SHIP" ? " selected" : ""}`} onClick={() => selectVoiceCastingRole("SHIP")} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && selectVoiceCastingRole("SHIP")}>
              <Tag color="green" filled>SHIP</Tag>
              <strong>{voiceSummary(roleVoiceProfiles.SHIP, "SHIP")}</strong>
              <span>Cockpit / spacecraft voice used for SHIP utterances.</span>
              <div className="button-cluster">
                <Btn onClick={(event) => { event.stopPropagation(); assignCurrentVoiceToRole("SHIP"); }} variant="secondary">Assign Current Voice to SHIP</Btn>
                <Btn onClick={(event) => { event.stopPropagation(); recastVoiceRole("SHIP"); }} variant="danger">Recast SHIP</Btn>
              </div>
              <VoiceAuditionPlayer
                activePlaybackLabel={activePlaybackLabel}
                label="SHIP voice audition"
                onPlay={() => playAudioUrl(auditionByRole.SHIP, "SHIP voice audition")}
                progress={transportPct}
                role="SHIP"
                url={auditionByRole.SHIP}
              />
            </div>
            <div className="handoff-card wide-handoff">
              <Tag color="blue">FX reference</Tag>
              <strong>{selectedProfileLabel}</strong>
              <span>{currentFxStatus}</span>
              <em>{voiceStatus}</em>
            </div>
          </div>
        </Card>

        <div className="voice-lab-grid">
          <Card title="Voices" sub={`${voiceOptions.length} presets`} help="Step 2 voice casting. Filter OpenAI voices by perceptual UX group, then pick a voice for audition or batch TTS." action={<select data-testid="voice-group-filter" value={voiceGroupFilter} onChange={(e) => updateVoiceGroupFilter(e.target.value as VoiceGroupFilter)}>
            <option value="all">all</option>
            <option value="masculine-coded">masculine-coded</option>
            <option value="feminine-coded">feminine-coded</option>
            <option value="neutral-or-flexible">neutral-or-flexible</option>
          </select>}>
            <div className="voice-list">
              {voiceOptions.map((voiceOption) => <button key={voiceOption.id} className={`voice-row${voiceProfile.voiceId === voiceOption.id ? " selected" : ""}`} onClick={() => updateVoiceProfile({ voiceId: voiceOption.id })}>
                <strong>{voiceOption.displayName}</strong>
                <Tag color={voiceOption.group === "feminine-coded" ? "amber" : voiceOption.group === "masculine-coded" ? "blue" : "muted"}>{voiceOption.group}</Tag>
                <span>{voiceOption.recommendedUse}</span>
              </button>)}
            </div>
          </Card>

          <Card title={`Voice · ${voiceProfile.voiceId}`} sub={voiceRegistry[voiceProfile.voiceId].group} help="Tune speech delivery before raw audio generation. These controls shape TTS instructions and speed, not the radio FX chain." action={<Btn onClick={auditionVoice} variant="primary">▶ Audition</Btn>} accent>
            <div className="form-grid four">
              <label>Voice<select data-testid="voice-selector" value={voiceProfile.voiceId} onChange={(e) => updateVoiceProfile({ voiceId: e.target.value as BuiltInVoiceId })}>{voiceOptions.map((voiceOption) => <option key={voiceOption.id} value={voiceOption.id}>{voiceOption.displayName} ({voiceOption.group})</option>)}</select></label>
              <label>Speaker<select value={voiceProfile.speakerRole} onChange={(e) => updateVoiceProfile({ ...speakerDefaultProfiles[e.target.value as SpeakerRole], speakerRole: e.target.value as SpeakerRole })}>{Object.keys(speakerDefaultProfiles).map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
              <label>Cadence<select value={voiceProfile.cadencePreset || ""} onChange={(e) => updateVoiceProfile({ cadencePreset: e.target.value })}>{cadencePresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}</select></label>
              <label>Tone<select value={voiceProfile.tonePreset || ""} onChange={(e) => updateVoiceProfile({ tonePreset: e.target.value })}>{tonePresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}</select></label>
              <label>Delivery<select value={voiceProfile.deliveryPreset || ""} onChange={(e) => updateVoiceProfile({ deliveryPreset: e.target.value })}>{deliveryPresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}</select></label>
              <label>Pause<select value={voiceProfile.pauseStyle} onChange={(e) => updateVoiceProfile({ pauseStyle: e.target.value as PauseStyle })}>{["clipped", "natural", "procedural", "urgent", "breathy", "fragmented"].map((style) => <option key={style} value={style}>{style}</option>)}</select></label>
              <label className="wide">Accent<input value={voiceProfile.accentInstruction || ""} onChange={(e) => updateVoiceProfile({ accentInstruction: e.target.value })} placeholder="Brazilian Portuguese, clear mission-control diction" /></label>
            </div>
            <div className="dsp-grid compact-grid">
              {voiceControls.map((item) => {
                const key = item.key as "speed" | "intensity" | "organicVariation" | "clarityPriority";
                const value = Number(voiceProfile[key]);
                return <label key={key} className="slider-label">
                  <span>{item.label}</span>
                  <output>{value.toFixed(2)}</output>
                  <input data-testid={`voice-${key}`} type="range" value={value} min={item.min} max={item.max} step={item.step} onChange={(e) => updateVoiceProfile({ [key]: Number(e.target.value) } as Partial<VoiceProfile>)} />
                </label>;
              })}
            </div>
            <div className="button-cluster full-row">
              <Btn onClick={applyVoiceToAllUtterances}>Apply Voice to All Utterances</Btn>
              <Btn onClick={applySpeakerDefaults}>Apply Speaker Defaults</Btn>
              <Btn onClick={randomizeOrganicVariation}>Randomize Organic Variation Slightly</Btn>
              <Btn onClick={resetVoiceSettings} variant="danger">Reset Voice Settings</Btn>
            </div>
          </Card>

          <Card title="TTS Scratchpad" sub="audition custom text" help="Use this to refine casting before spending a full batch. It generates one audition sample only and does not overwrite utterance audio.">
            <textarea rows={7} value={auditionText} onChange={(e) => setAuditionText(e.target.value)} placeholder="Type a short CAPCOM or SHIP line to audition the current voice." />
            <div className="button-cluster full-row">
              <Btn onClick={auditionVoice} variant="primary">Generate One Audition</Btn>
              <Btn onClick={() => setAuditionText(currentUtterance?.text || auditionText)}>Use Selected Utterance Text</Btn>
              <Btn onClick={() => setAuditionText("Odyssey, this is CAPCOM. Confirm signal lock and proceed with vector correction.")}>Reset Sample Text</Btn>
            </div>
            <div className="profile-status"><strong>Audition target:</strong> {voiceProfile.speakerRole} · {voiceProfile.voiceId} · speed {voiceProfile.speed.toFixed(2)}</div>
            <div className="voice-audition-deck">
              <VoiceAuditionPlayer
                activePlaybackLabel={activePlaybackLabel}
                label="CAPCOM voice audition"
                onPlay={() => playAudioUrl(auditionByRole.CAPCOM, "CAPCOM voice audition")}
                progress={transportPct}
                role="CAPCOM"
                url={auditionByRole.CAPCOM}
              />
              <VoiceAuditionPlayer
                activePlaybackLabel={activePlaybackLabel}
                label="SHIP voice audition"
                onPlay={() => playAudioUrl(auditionByRole.SHIP, "SHIP voice audition")}
                progress={transportPct}
                role="SHIP"
                url={auditionByRole.SHIP}
              />
            </div>
          </Card>

          <div className="voice-instruction-wide">
            <Card title="TTS Instruction" sub="live preview" help="Read-only preview of the natural-language instruction sent to TTS. It should remain clear, concise, and non-SSML.">
              <div className="voice-instruction-grid">
                <div className="instruction-preview">
                  <strong><LED color="green" /> Valid instruction</strong>
                  <p>{instructionPreview}</p>
                  <span>{voiceRegistry[voiceProfile.voiceId].recommendedUse}</span>
                </div>
                <pre>{JSON.stringify({ voice: voiceProfile.voiceId, group: voiceRegistry[voiceProfile.voiceId].group, speaker: voiceProfile.speakerRole, instr: instructionPreview, speed: voiceProfile.speed, intensity: voiceProfile.intensity, organic: voiceProfile.organicVariation, clarity: voiceProfile.clarityPriority, cadence: voiceProfile.cadencePreset, tone: voiceProfile.tonePreset, delivery: voiceProfile.deliveryPreset, pause: voiceProfile.pauseStyle, quindar: globalQuindar }, null, 2)}</pre>
              </div>
            </Card>
          </div>
        </div>
      </div>}

      {activeScreen === "dialogue" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Dialogue</h1>
            <p>Script generation, JSON validation, line editing, and per-utterance storyboarding handoff.</p>
          </div>
          <div className="button-cluster"><Btn onClick={generateScript} variant="secondary">Regenerate Script</Btn><Btn onClick={validate} variant="primary">Validate JSON</Btn></div>
        </div>

        <div className="alpha2-two-column">
          <Card title="Dialogue Tree" sub={validation} help="A visual read of speaker order. This is where future branches and storyboard thumbnails can attach without changing the audio engine.">
            <div className="alpha2-dialogue-tree">
              {utterances.length === 0 && <div className="empty-channel-state">
                <Tag color="amber" filled>No dialogue yet</Tag>
                <strong>Generate structured script JSON from Mission Control.</strong>
                <span>The Dialogue lane edits utterances after the narrative setup exists.</span>
              </div>}
              {utterances.map((utterance, index) => <button key={utterance.id} className={`dialogue-node ${utterance.speaker.toLowerCase()}${currentUtterance?.id === utterance.id ? " active" : ""}`} onClick={() => setSelectedSpectrogramUtteranceId(utterance.id)}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{utterance.id} · {utterance.speaker}</strong>
                <em>{utterance.text}</em>
              </button>)}
            </div>
          </Card>

          <Card title="Script JSON" sub="editable raw object" help="Keep the JSON visible so creative changes remain inspectable and can be validated before voice generation.">
            <textarea rows={18} value={scriptJson} onChange={(event) => { setScriptJson(event.target.value); setValidation("not validated"); updateAlpha2Section("mission", { jsonStatus: "needs_review" }); }} />
            {scriptJsonHasParseError && <div className="inline-warning">JSON parse is currently invalid. Dialogue cards keep showing the last valid script until the edit parses again.</div>}
          </Card>
        </div>

        <Card title="Dialogue Cards" sub={`${utterances.length} utterances`} help="Edit text per line. Existing audio is marked stale because the heard clip no longer matches the written line.">
          <div className="utterance-list">
            {utterances.length === 0 && <div className="empty-channel-state">
              <Tag color="amber" filled>Storyboard Slot pending</Tag>
              <strong>No dialogue cards yet.</strong>
              <span>Generate or paste Radio Dialogue JSON to reveal per-line storyboard image slots and text editors.</span>
            </div>}
            {utterances.map((utterance) => {
              const decision = alpha2RenderRows.find((row) => row.targetId === utterance.id);
              return <div key={utterance.id} className="utterance-card alpha2-dialogue-card">
                <div className="alpha2-card-headline">
                  <Tag color={utterance.speaker === "SHIP" ? "green" : "amber"} filled>{utterance.speaker}</Tag>
                  <strong>{utterance.id} · {utterance.channel} · {utterance.language}</strong>
                  <em>{decision?.status || "needs_render"}</em>
                </div>
                <div className="alpha2-dialogue-edit-grid">
                  <Alpha2ImageSlot label="Storyboard Slot" detail={`${utterance.id} scene frame prompt pending`} tone={utterance.speaker === "SHIP" ? "green" : "amber"} />
                  <textarea rows={5} value={utterance.text} onChange={(event) => updateScriptUtteranceText(utterance.id, event.target.value)} />
                </div>
                <div className="button-cluster full-row">
                  <Btn onClick={() => { setAuditionText(utterance.text); setSelectedSpectrogramUtteranceId(utterance.id); setActiveScreen("voice"); }}>Audition This Line</Btn>
                  <Btn onClick={() => regenerateUtteranceSlot(utterance)}>Regenerate Slot</Btn>
                  <Btn onClick={() => generateUtterance(utterance)} variant="secondary">Generate Raw</Btn>
                  <Btn onClick={() => setActiveScreen("fx")} variant="primary">Review FX</Btn>
                </div>
              </div>;
            })}
          </div>
        </Card>
      </div>}

      {activeScreen === "fx" && <div className="screen-stack alpha2-fx-shell">
        <Card title="Narrative Signal Draft" sub="review before render" help="This is the explanation layer above the DSP rack. The user can keep the auto-draft, compare presets, edit fine DSP, or save a reusable preset before rendering.">
          <div className="alpha2-fx-draft-grid">
            <div className="alpha2-reason-list">
              {narrativeSignalReasons.map((reason) => <span key={reason}>{reason}</span>)}
            </div>
            <div className="alpha2-status-grid">
              <div><span>CAPCOM stack</span><strong>{roleFxAssignments.CAPCOM?.label || "Narrative Draft pending"}</strong><em>{roleFxAssignments.CAPCOM ? "manually assigned" : "auto-draft available"}</em></div>
              <div><span>SHIP stack</span><strong>{roleFxAssignments.SHIP?.label || "Narrative Draft pending"}</strong><em>{roleFxAssignments.SHIP ? "manually assigned" : "auto-draft available"}</em></div>
              <div><span>Selected utterance</span><strong>{currentUtterance?.id || "none"}</strong><em>{currentFxStatus}</em></div>
              <div><span>Processed state</span><strong>{currentProcessedIsStale ? "stale" : processedMap[currentUtterance?.id || ""] ? "current" : "needs render"}</strong><em>Stitch will read this status per utterance.</em></div>
            </div>
            <div className="button-cluster full-row"><Btn onClick={applyNarrativeDraftToFx} variant="primary">Use Narrative Draft</Btn><Btn onClick={() => setProfileName(`${alpha2Session.weather.presetName} FX`)}>Prepare Save Preset</Btn><Btn onClick={() => setActiveScreen("render")}>Render Decisions</Btn></div>
          </div>
        </Card>
        <FXLabScreen
        affectedParameters={affectedEnvironmentParameters}
        applyFullEnvironment={applyFullEnvironment}
        applyDegradationProfile={applyDegradationProfile}
        applyMissionGeometry={applyMissionGeometry}
        applyProfile={applyProfile}
        applyScenario={(id) => applyScenario(id as Parameters<typeof applyScenario>[0])}
        applySpaceWeather={applySpaceWeather}
        controls={controls}
        currentMissionLabel={currentMissionDefinition.label}
        currentMissionPreview={currentMissionDefinition.sonicPreviewText}
        currentMissionDescription={currentMissionDefinition.description}
        currentUtteranceLabel={currentUtterance ? `${currentUtterance.id} · ${currentUtterance.speaker}` : "select utterance"}
        currentUtteranceText={currentUtterance?.text || ""}
        currentUtteranceSpeaker={currentUtterance?.speaker}
        currentFxStatus={currentFxStatus}
        errorMessage={error}
        currentWeatherLabel={currentWeatherDefinition.label}
        currentWeatherPreview={currentWeatherDefinition.sonicPreviewText}
        currentWeatherDescription={currentWeatherDefinition.description}
        environmentBaseProfile={environmentBaseProfile}
        environmentInfluenceEnabled={environmentInfluenceEnabled}
        environmentStatus={environmentStatus}
        fineDspInfluenceEnabled={fineDspInfluenceEnabled}
        generateCurrentUtteranceAudio={generateCurrentUtteranceAudio}
        auditionVoice={auditionVoice}
        setAuditionText={setAuditionText}
        auditionText={auditionText}
        auditionPath={auditionPath}
        auditionByRole={auditionByRole}
        capcomVoiceSummary={voiceSummary(roleVoiceProfiles.CAPCOM, "CAPCOM")}
        shipVoiceSummary={voiceSummary(roleVoiceProfiles.SHIP, "SHIP")}
        buttonActionStatus={transportStatus}
        busyLabel={busyLabel}
        activePlaybackLabel={activePlaybackLabel}
        transportProgress={transportProgress}
        transportDuration={transportDuration}
        missionGeometry={missionGeometry}
        missionGeometryDefinitions={missionGeometryDefinitions}
        missionGeometryIntensity={missionGeometryIntensity}
        missionGeometryScope={missionGeometryScope}
        missionScenarioDefinitions={missionScenarioDefinitions}
        nasaSlug={nasaSlug}
        nasaAudioUrl={spectrogramResult?.nasaAudio}
        nasaReferenceLabel={nasaReferences.length ? nasaReferences.map((file) => file.filename).join(", ") : "No local NASA audio files found"}
        processSelectedWithSpectrograms={processSelectedWithSpectrograms}
        processSelectedOnly={processSelectedOnly}
        previewSelectedFx={previewSelectedFx}
        profileDefinitions={profileDefinitions}
        profileName={profileName}
        profileOrder={profileOrder}
        resolvedPreview={resolvedEnvironmentPreview}
        saveCurrentProfile={saveCurrentProfile}
        saveCurrentDegradationProfile={saveCurrentDegradationProfile}
        deleteSelectedCustomProfile={deleteSelectedCustomProfile}
        deleteSelectedCustomDegradationProfile={deleteSelectedCustomDegradationProfile}
        saveStatus={saveStatus}
        savedProfiles={savedProfiles}
        savedDegradationProfiles={savedDegradationProfiles}
        selectedDegradationProfile={selectedDegradationProfile}
        selectedProfile={selectedProfile}
        selectedProfileLabel={selectedProfileLabel}
        selectedRawUrl={currentUtterance ? cleanMap[currentUtterance.id] : undefined}
        selectedProcessedIsStale={currentProcessedIsStale}
        selectedProcessedUrl={currentUtterance ? processedMap[currentUtterance.id] : undefined}
        activeFxRole={activeFxRole}
        quindarIntro={currentQuindar.intro}
        quindarOutro={currentQuindar.outro}
	        roleFxAssignments={{
	          CAPCOM: roleFxAssignments.CAPCOM?.label || "Live panel",
	          SHIP: roleFxAssignments.SHIP?.label || "Live panel"
	        }}
	        roleFxControlValues={{
	          CAPCOM: roleFxAssignments.CAPCOM?.controls || getProfileControls(roleDefaultChannel.CAPCOM),
	          SHIP: roleFxAssignments.SHIP?.controls || getProfileControls(roleDefaultChannel.SHIP)
	        }}
	        roleFxModes={{
	          CAPCOM: roleFxAssignments.CAPCOM ? "assigned" : "live",
	          SHIP: roleFxAssignments.SHIP ? "assigned" : "live"
        }}
        roleProcessedAudio={roleProcessedAudio}
        setActiveFxRole={selectFxRoleTarget}
        setQuindarIntro={(intro) => updateCurrentQuindar({ ...currentQuindar, intro })}
        setQuindarOutro={(outro) => updateCurrentQuindar({ ...currentQuindar, outro })}
        assignCurrentFxToRole={assignCurrentFxToRole}
        clearRoleFx={clearRoleFx}
        resetFxForRole={resetFxForRole}
        setEnvironmentBaseProfile={setEnvironmentBaseProfile}
        setEnvironmentInfluenceEnabled={setEnvironmentInfluenceEnabled}
        setFineDspInfluenceEnabled={setFineDspInfluenceEnabled}
        setMissionGeometry={setMissionGeometry}
        setMissionGeometryIntensity={setMissionGeometryIntensity}
        setMissionGeometryScope={setMissionGeometryScope}
        setSpaceWeatherDurationMode={setSpaceWeatherDurationMode}
        setSpaceWeatherEnvelope={setSpaceWeatherEnvelope}
        setSpaceWeatherEvent={setSpaceWeatherEvent}
        setSpaceWeatherIntensity={setSpaceWeatherIntensity}
        setSpaceWeatherScope={setSpaceWeatherScope}
        setProfileName={setProfileName}
        playNasaReferenceAudio={playNasaReferenceAudio}
        playAudio={playAudioUrl}
        simulateSpaceWeatherPass={simulateSpaceWeatherPass}
        sliderGroups={sliderGroups}
        spaceWeatherDurationMode={spaceWeatherDurationMode}
        spaceWeatherEnvelope={spaceWeatherEnvelope}
        spaceWeatherEvent={spaceWeatherEvent}
        spaceWeatherEventDefinitions={spaceWeatherEventDefinitions}
        spaceWeatherIntensity={spaceWeatherIntensity}
        spaceWeatherScope={spaceWeatherScope}
        updateDegradationMode={updateDegradationMode}
        updateNumber={(key, value) => updateNumber(key as NumberControlKey, value)}
      />
      </div>}

      {activeScreen === "render" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Utterance Rendering</h1>
            <p>Last chance to regenerate raw speech, process FX, or mark the render decision before Stitch.</p>
          </div>
          <div className="button-cluster"><Btn onClick={generateAll} variant="secondary">Generate Batch Raw</Btn><Btn onClick={() => currentUtterance && processClip(currentUtterance)} variant="primary">Process Selected FX</Btn></div>
        </div>

        <Card title="Render Decision Table" sub="Stitch should not guess" help="Each utterance has a clear sound source: narrative draft, role stack, saved preset, or manual override.">
          <div className="utterance-list">
            {utterances.length === 0 && <div className="empty-channel-state">
              <Tag color="amber" filled>No utterances</Tag>
              <strong>Dialogue must create utterances before rendering.</strong>
              <span>Generate or paste script JSON, validate it, then return here. Clear FX and Clear All controls appear on each rendered utterance row.</span>
              <div className="button-cluster"><Btn disabled variant="danger">Clear FX</Btn><Btn disabled variant="danger">Clear All</Btn></div>
            </div>}
            {utterances.map((utterance) => {
              const decision = alpha2RenderRows.find((row) => row.targetId === utterance.id);
              const status = getProcessedAudioStatus({ rawUrl: cleanMap[utterance.id], processedUrl: processedMap[utterance.id], processedSignature: processedMetaMap[utterance.id]?.signature, currentSignature: processingSignatureForUtterance(utterance) });
              return <div key={utterance.id} className="utterance-card alpha2-render-card">
                <div className="alpha2-card-headline">
                  <Tag color={utterance.speaker === "SHIP" ? "green" : "amber"} filled>{utterance.speaker}</Tag>
                  <strong>{utterance.id} · {decision?.label || "Narrative Draft"}</strong>
                  <em>{status === "current" ? "current" : status === "stale" ? "stale audio" : status === "missing_raw" ? "needs raw" : "needs render"}</em>
                </div>
                <textarea rows={3} value={utterance.text} onChange={(event) => updateScriptUtteranceText(utterance.id, event.target.value)} />
                <div className="form-grid four">
                  <label>Render source<select value={decision?.mode || "narrative_draft"} onChange={(event) => {
                    const mode = event.target.value as Alpha2RenderMode;
                    const presetId = mode === "preset_override" ? decision?.presetId || (selectedProfile === "manual" ? "apollo_heritage_clean" : selectedProfile) : undefined;
                    updateAlpha2RenderDecision({
                      targetId: utterance.id,
                      role: utterance.speaker,
                      mode,
                      presetId,
                      label: mode === "preset_override" ? profileLabelForId(presetId || "apollo_heritage_clean") : mode === "role_stack" ? fxLabelForUtterance(utterance) : mode === "manual_override" ? "Manual utterance override" : "Narrative Draft",
                      status: status === "current" ? "current" : status === "stale" ? "stale" : "needs_render",
                      note: "User selected render source before Stitch."
                    });
                  }}>
                    <option value="narrative_draft">Narrative Draft</option>
                    <option value="role_stack">Role FX Stack</option>
                    <option value="preset_override">Preset Override</option>
                    <option value="manual_override">Manual Override</option>
                  </select></label>
                  {decision?.mode === "preset_override" && <label>Preset<select value={decision.presetId || "apollo_heritage_clean"} onChange={(event) => updateAlpha2RenderDecision({
                    ...decision,
                    presetId: event.target.value,
                    label: profileLabelForId(event.target.value),
                    status: status === "current" ? "stale" : status === "stale" ? "stale" : "needs_render",
                    note: "Preset override selected before Stitch."
                  })}>
                    {profileOrder.map((id) => <option key={id} value={id}>{profileDefinitions[id].label}</option>)}
                    {savedProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select></label>}
                  <label>Status<input value={decision?.status || (status === "current" ? "current" : status === "stale" ? "stale" : "needs_render")} readOnly /></label>
                  <label>Raw clip<input value={cleanMap[utterance.id] ? "ready" : "missing"} readOnly /></label>
                  <label>FX clip<input value={processedMap[utterance.id] ? "ready" : "missing"} readOnly /></label>
                </div>
                <div className="button-cluster full-row">
                  <Btn onClick={() => generateUtterance(utterance)} variant="secondary">Regenerate Raw</Btn>
                  <Btn onClick={() => processClip(utterance)} variant="primary">Render FX</Btn>
                  <Btn onClick={() => clearUtteranceAudio(utterance.id, "processed")} variant="danger">Clear FX</Btn>
                  <Btn onClick={() => clearUtteranceAudio(utterance.id, "all")} variant="danger">Clear All</Btn>
                  <Btn onClick={() => playAudioUrl(cleanMap[utterance.id], `${utterance.id} raw TTS`)}>Play No FX</Btn>
                  <Btn onClick={() => playAudioUrl(processedMap[utterance.id], `${utterance.id} processed FX`)}>Play FX</Btn>
                  <Btn onClick={stopTransport}>Stop</Btn>
                </div>
              </div>;
            })}
          </div>
        </Card>
      </div>}

      {activeScreen === "stitch" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Stitch + Export Session Package</h1>
            <p>Timeline assembly, render decisions, stems, and final package output.</p>
          </div>
          <div className="button-cluster"><Btn onClick={generateAll} variant="secondary">Batch Generate Audio</Btn><Btn onClick={stitch} variant="secondary">Re-Stitch All</Btn><Btn onClick={stitch} variant="primary">Export WAV + JSON</Btn></div>
        </div>

        <Card title="Session Package" sub={`${alpha2RenderRows.length} render decisions`} help="Stitch receives a clear package: narrative setup, voice casting, FX reason, utterance render state, and timeline spacing.">
          <div className="alpha2-package-grid">
            <div><span>Narrative</span><strong>{narrativeDraftLabel}</strong><em>{alpha2Session.mission.jsonStatus}</em></div>
            <div><span>Voice</span><strong>CAPCOM + SHIP cast</strong><em>{voiceStatus}</em></div>
            <div><span>Audio</span><strong>{processedCount} / {utterances.length} FX clips</strong><em>{alpha2RenderRows.some((row) => row.status === "stale") ? "stale clips need render" : "render table ready"}</em></div>
            <div><span>Export</span><strong>{finalPath ? "final WAV ready" : "waiting for stitch"}</strong><em>stems stay available as individual utterance clips</em></div>
          </div>
        </Card>

        <Card title="Preflight References" sub="choices inherited from Voice + FX" help="Step 4 checkpoint. This is the handoff map before stitching: role voices from Voice Lab, current FX preset/environment from FX Lab, and whether processed clips need refresh.">
          <div className="handoff-grid stitch-handoff">
            <div className="handoff-card">
              <Tag color="amber" filled>CAPCOM voice</Tag>
              <strong>{voiceSummary(roleVoiceProfiles.CAPCOM, "CAPCOM")}</strong>
              <span>Used for CAPCOM batch TTS unless an utterance has its own voice override.</span>
            </div>
            <div className="handoff-card">
              <Tag color="green" filled>SHIP voice</Tag>
              <strong>{voiceSummary(roleVoiceProfiles.SHIP, "SHIP")}</strong>
              <span>Used for SHIP batch TTS unless an utterance has its own voice override.</span>
            </div>
            <div className="handoff-card">
              <Tag color="copper" filled>FX preset</Tag>
              <strong>{selectedProfileLabel}</strong>
              <span>{environmentApplied ? `${currentMissionDefinition.label} + ${currentWeatherDefinition.label}` : "No environment transform applied yet."}</span>
              <span>CAPCOM: {roleFxAssignments.CAPCOM?.label || "live FX panel"}</span>
              <span>SHIP: {roleFxAssignments.SHIP?.label || "live FX panel"}</span>
            </div>
            <div className="handoff-card">
              <Tag color={processedCount === utterances.length && utterances.length ? "green" : "amber"} filled>Stitch readiness</Tag>
              <strong>{processedCount} / {utterances.length} processed</strong>
              <span>{utterances.some((u) => getProcessedAudioStatus({ rawUrl: cleanMap[u.id], processedUrl: processedMap[u.id], processedSignature: processedMetaMap[u.id]?.signature, currentSignature: processingSignatureForUtterance(u) }) === "stale") ? "Some processed clips are stale after FX changes." : "Processed clips match their last saved FX recipe."}</span>
            </div>
          </div>
        </Card>

        <Card title="Timeline + Relationship Graph" sub={`${utterances.length} utterances · ${staleRenderCount} stale`} help="The final ALPHA2 export surface needs timing lanes, distance-informed silence, manual overrides, stem actions, and a narrative relationship card.">
          <div className="alpha2-stitch-grid">
            <div className="alpha2-stale-legend">
              <strong>Stale Reasons · Legend</strong>
              <span><b>V</b> voice or line text changed</span>
              <span><b>E</b> environment selection changed</span>
              <span><b>C</b> CAPCOM FX stack changed</span>
              <span><b>S</b> SHIP FX stack changed</span>
            </div>
            <div className="alpha2-daw-timeline" style={{ "--timeline-duration": stitchTimelineDuration } as CSSProperties}>
              {utterances.length === 0 && <span className="alpha2-daw-empty">Generate dialogue to populate timeline lanes.</span>}
              <div className="alpha2-daw-ruler">
                {stitchTimelineTicks.map((tick) => <span key={tick} style={{ left: `${(tick / stitchTimelineDuration) * 100}%` }}>{tick}s</span>)}
              </div>
              {stitchTimelineLanes.map((lane) => (
                <div key={lane} className={`alpha2-daw-lane ${lane.toLowerCase()}`}>
                  <strong>{lane}</strong>
                  <div className="alpha2-daw-lane-track">
                    {(lane === "CAPCOM" || lane === "SHIP") && stitchTimelineClips
                      .filter((clip) => clip.utterance.speaker === lane)
                      .map((clip) => {
                        const status = clip.renderDecision?.status || "needs_render";
                        return <button
                          key={clip.utterance.id}
                          type="button"
                          className={`alpha2-daw-clip ${clip.utterance.speaker.toLowerCase()} ${status}`}
                          style={{
                            "--clip-start": `${(clip.start / stitchTimelineDuration) * 100}%`,
                            "--clip-width": `${Math.max(7, (clip.duration / stitchTimelineDuration) * 100)}%`
                          } as CSSProperties}
                          onClick={() => setSelectedSpectrogramUtteranceId(clip.utterance.id)}
                        >
                          <b>{clip.utterance.id}</b>
                          <span>{clip.utterance.text}</span>
                          <em>{status === "current" ? "READY" : status === "stale" ? `STALE ${clip.renderDecision?.staleReasons?.join("") || ""}` : "RENDER"}</em>
                        </button>;
                      })}
                    {lane === "QD" && stitchTimelineClips.map((clip) => {
                      const qd = quindarByUtterance[clip.utterance.id] ?? globalQuindar;
                      return <span
                        key={`qd-${clip.utterance.id}`}
                        className={`alpha2-daw-marker${qd.intro || qd.outro ? " active" : ""}`}
                        style={{ "--marker-start": `${(clip.start / stitchTimelineDuration) * 100}%` } as CSSProperties}
                      >
                        {clip.utterance.id}
                      </span>;
                    })}
                    {lane === "FX" && <span className="alpha2-daw-env-bed">{environmentApplied ? `${currentMissionDefinition.label} + ${currentWeatherDefinition.label}` : "Narrative FX draft pending"}</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="alpha2-relationship-card">
              <strong>Character Relation Graph</strong>
              <span>{"CAPCOM -> SHIP: procedural trust, rising urgency"}</span>
              <span>{"SHIP -> CAPCOM: constrained reporting, technical vulnerability"}</span>
              <span>Scene emotion: {alpha2Session.comms.blackoutRisk === "high" ? "fear under discipline" : "controlled tension"}</span>
              <span>Thought layer: distance, delay, signal fragility, command responsibility</span>
            </div>
            <div className="alpha2-parameter-bank">
              <strong>Export Actions</strong>
              <Btn onClick={stitch} variant="primary">Generate Final Mix</Btn>
              <Btn onClick={() => setTransportStatus("Stem export placeholder: individual raw and processed utterance clips are already retained in session maps.")}>Save Stems</Btn>
              <Btn onClick={() => { setFinalPath(""); setTransportStatus("Final mix cleared; rendered utterance stems remain available."); }} variant="danger">Clear Final</Btn>
            </div>
          </div>
        </Card>

        <Card title="Utterances" sub="A/B dry vs processed" help="Step 4 working list. Generate raw TTS, process each utterance through FX, then stitch all processed clips into a final WAV.">
          <div className="utterance-list">
            {utterances.map((u, index) => {
              const quindar = quindarByUtterance[u.id] ?? globalQuindar;
              const clipControls = clipControlsForUtterance(u);
              const currentSignature = processingSignatureForUtterance(u);
              const processedMeta = processedMetaMap[u.id];
              const processedStatus = getProcessedAudioStatus({ rawUrl: cleanMap[u.id], processedUrl: processedMap[u.id], processedSignature: processedMeta?.signature, currentSignature });
              const currentProcessed = isProcessedAudioCurrent({ rawUrl: cleanMap[u.id], processedUrl: processedMap[u.id], processedSignature: processedMeta?.signature, currentSignature });
              const voiceLabel = voiceSummary(u.voice, u.speaker);
              const renderDecision = alpha2RenderRows.find((row) => row.targetId === u.id);
              return <div key={u.id} className="utterance-card">
                <strong>{u.id} {u.speaker} ({u.channel}) [{u.language}]</strong>
                <p>{u.text}</p>
                <div className="clip-status">
                  <span>Voice assignment: {voiceLabel}</span>
                  <span>FX assignment: {fxLabelForUtterance(u)}</span>
                  <span>Render decision: {renderDecision?.mode || "narrative_draft"} · {renderDecision?.status || "needs_render"}{renderDecision?.staleReasons?.length ? ` [${renderDecision.staleReasons.join("")}]` : ""} · {renderDecision?.label || "Narrative Draft"}</span>
                  <span>FX preset/environment: {controlsSummary(clipControls)}{environmentApplied ? ` | ${currentMissionDefinition.label} + ${currentWeatherDefinition.label}` : ""}</span>
                  <span>Current panel: {controlsSummary(clipControls)}</span>
                  {processedStatus === "missing_raw" && <strong className="warning">No raw TTS yet. Generate Audio first.</strong>}
                  {processedStatus === "needs_processing" && <strong className="warning">No processed FX yet. Process FX Stack before Play FX or Stitch.</strong>}
                  {processedMap[u.id] && <strong className={currentProcessed ? "success" : "warning"}>{currentProcessed ? "Processed audio matches current FX" : "Processed audio is stale; process again"}</strong>}
                  {processedMeta && <span>Last processed with: {processedMeta.summary}</span>}
                </div>
                <div className="row compact">
                  <label>Intro tone<input type="checkbox" checked={quindar.intro} onChange={(e) => setQuindarByUtterance((m) => ({ ...m, [u.id]: { ...quindar, intro: e.target.checked } }))} /></label>
                  <label>Outro tone<input type="checkbox" checked={quindar.outro} onChange={(e) => setQuindarByUtterance((m) => ({ ...m, [u.id]: { ...quindar, outro: e.target.checked } }))} /></label>
                  {index < utterances.length - 1 && <label>Silence after<input type="number" min="0" max="12" step="0.05" value={stitchGapByUtterance[u.id] ?? 0.12} onChange={(e) => setStitchGapByUtterance((current) => ({ ...current, [u.id]: Math.max(0, Number(e.target.value) || 0) }))} /> sec</label>}
                  <label className="stitch-placeholder-control">Select antenna<select disabled defaultValue="alpha-placeholder"><option value="alpha-placeholder">Alpha placeholder</option></select></label>
                  <label className="stitch-placeholder-control">Earth distance<input disabled value="Future signal-time model" readOnly /></label>
                  <Btn onClick={() => generateUtterance(u)} variant="secondary">Generate Audio</Btn>
                  <Btn onClick={() => processClip(u)} variant="primary">Process Raw → FX</Btn>
                  <Btn onClick={() => playAudioUrl(cleanMap[u.id], `${u.id} raw TTS`)}>Play Dry</Btn>
                  <Btn onClick={() => playAudioUrl(processedMap[u.id], `${u.id} processed FX`)}>Play FX</Btn>
                </div>
              </div>;
            })}
          </div>
        </Card>

      </div>}

      {activeScreen === "spectrogram" && <div className="screen-stack">
        <div className="screen-head">
          <div>
            <h1>Optional Spectrogram Lab</h1>
            <p>Non-blocking analysis and NASA reference comparison. Stitch can continue without this step.</p>
          </div>
          <div className="button-cluster">
            <Btn active={spectrogramComparisonMode === "side_by_side"} onClick={() => setSpectrogramComparisonMode("side_by_side")}>Side by Side</Btn>
            <Btn active={spectrogramComparisonMode === "overlay"} onClick={() => setSpectrogramComparisonMode("overlay")}>Overlay</Btn>
          </div>
        </div>

        <Card title="Spectrogram Generator" sub="raw · processed · NASA" help="Generate visual spectrogram PNGs for raw TTS, processed radio audio, final WAVs, or local NASA reference audio. NASA options are discovered from artifacts/audio/nasa-reference/.">
          <p className="hint">Use this only when you want visual audio inspection. It never blocks rendering or export.</p>
          <div className="form-grid three">
            <label>Session ID<input value={sessionId} onChange={(e) => setSessionId(e.target.value)} /></label>
            <label>Utterance<select data-testid="spectrogram-utterance" value={selectedSpectrogramUtterance?.id || ""} onChange={(e) => setSelectedSpectrogramUtteranceId(e.target.value)}>{utterances.map((u) => <option key={u.id} value={u.id}>{u.id} {u.speaker}</option>)}</select></label>
            <label>NASA reference<select value={nasaSlug} onChange={(e) => selectNasaReference(e.target.value)}>
              <option value="">Choose local NASA file</option>
              {nasaReferences.map((file) => <option key={file.slug} value={file.slug}>{file.filename}</option>)}
            </select></label>
            <label className="wide">NASA local filename<input type="text" placeholder="Optional local NASA reference filename" value={nasaSource} onChange={(e) => setNasaSource(e.target.value)} /></label>
          </div>
          <div className="button-cluster full-row">
            <Btn onClick={generateCurrentUtteranceSpectrograms}>Generate Selected Utterance Spectrograms</Btn>
            <Btn onClick={generateBatchSpectrograms}>Generate Batch Spectrograms</Btn>
            <Btn onClick={generateFinalSpectrograms}>Generate Final WAV Spectrograms</Btn>
            <Btn onClick={generateNasaReferenceSpectrogram} variant="primary">Generate NASA Reference Spectrogram</Btn>
          </div>
          <div className="profile-status"><strong>Spectrogram status:</strong> {spectrogramStatus}</div>
        </Card>

        <Card title="Comparison Monitor" sub={spectrogramComparisonMode === "overlay" ? "utterance over NASA" : "utterance beside NASA"} help="Compare the selected utterance spectrogram with a local NASA reference. Overlay is visual only in this PoC; matching metrics are future work.">
          {!comparisonUtteranceSpectrogramSrc && !nasaSpectrogramSrc && <div className="empty-channel-state">
            <Tag color="amber" filled>No spectrograms yet</Tag>
            <strong>Generate utterance and NASA spectrograms to compare.</strong>
            <span>Use the generator above, then Mission Console can mirror Raw, FX, or NASA.</span>
          </div>}
          {spectrogramComparisonMode === "side_by_side" && <div className="spectrogram-grid comparison-grid">
            {rawSpectrogramSrc && <figure><figcaption>Raw TTS, before processing</figcaption><img src={rawSpectrogramSrc} alt="Raw utterance spectrogram" /></figure>}
            {processedSpectrogramSrc && <figure><figcaption>Processed radio audio</figcaption><img src={processedSpectrogramSrc} alt="Processed utterance spectrogram" /></figure>}
            {nasaSpectrogramSrc && <figure><figcaption>NASA reference · {nasaSlug || nasaSource || "local file"}</figcaption><img src={nasaSpectrogramSrc} alt="NASA reference spectrogram" /></figure>}
          </div>}
          {spectrogramComparisonMode === "overlay" && comparisonUtteranceSpectrogramSrc && nasaSpectrogramSrc && <div className="spectrogram-overlay">
            <img src={comparisonUtteranceSpectrogramSrc} alt="Utterance spectrogram overlay base" />
            <img src={nasaSpectrogramSrc} alt="NASA spectrogram overlay layer" />
            <span>orange: utterance · blue: NASA reference</span>
          </div>}
        </Card>
      </div>}
    </main>

    <aside className="right-rail">
      {activeScreen === "fx" && <Card title="User Presets Mgnt" sub="channel + degradation" help="Save custom channel colors and custom degradation layers. The saved channel buttons appear in Communication Channel Presets; saved degradation buttons appear in Signal Degradation Presets.">
        <div className="right-preset-mgmt">
          <label>Preset name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder={selectedProfile.startsWith("custom-") || selectedDegradationProfile.startsWith("custom-deg-") ? "Rename current preset" : "New preset name"} /></label>
          <label>Channel preset<select value={selectedProfile} onChange={(event) => applyProfile(event.target.value)}>
            <option value="manual">Live console stack</option>
            {profileOrder.map((id) => <option key={id} value={id}>{profileDefinitions[id].label}</option>)}
            {savedProfiles.map((profile) => <option key={profile.id} value={profile.id}>User · {profile.name}</option>)}
          </select></label>
          <label>Degradation preset<select value={selectedDegradationProfile} onChange={(event) => applyDegradationProfile(event.target.value)}>
            {(["off", "subtle", "nominal", "severe", "collapse"] as DegradationMode[]).map((mode) => <option key={mode} value={`builtin-${mode}`}>{mode}</option>)}
            {savedDegradationProfiles.map((profile) => <option key={profile.id} value={profile.id}>User · {profile.name}</option>)}
          </select></label>
          <div className="btn3d-wrap">
            <V3Btn3D color="yellow" size="sm" maxW={134} label="Save Channel" onClick={saveCurrentProfile} />
            <V3Btn3D color="copper" size="sm" maxW={156} label="Save Degradation" onClick={saveCurrentDegradationProfile} />
            <V3Btn3D color={selectedProfile.startsWith("custom-") ? "red" : "grey"} size="sm" maxW={134} label="Delete Channel" disabled={!selectedProfile.startsWith("custom-")} onClick={deleteSelectedCustomProfile} />
            <V3Btn3D color={selectedDegradationProfile.startsWith("custom-deg-") ? "red" : "grey"} size="sm" maxW={156} label="Delete Degradation" disabled={!selectedDegradationProfile.startsWith("custom-deg-")} onClick={deleteSelectedCustomDegradationProfile} />
          </div>
          {saveStatus && <em>{saveStatus}</em>}
        </div>
      </Card>}
      <Card title="Situation Card" sub={activeLaneLabel} help="Compact ALPHA2 context currently feeding Dialogue, Radio FX, and Stitch." accent>
        <Tag color="copper" filled>{alpha2Session.mission.jsonStatus}</Tag>
        <div className="rail-meta">Flight: {alpha2Session.flight.missionPhase} · {alpha2Session.flight.orbit}</div>
        <div className="rail-meta">COMMS: {`${alpha2Session.comms.groundStation} -> ${alpha2Session.comms.shipAntenna}`}</div>
        <div className="rail-meta">Weather: {alpha2Session.weather.spaceWeather}</div>
        <p className="rail-transcript">{narrativeDraftLabel}</p>
      </Card>
    </aside>

    <footer className="bottom-bar">
      <div className="transport"><Btn onClick={stopTransport}>■</Btn><Btn onClick={playCurrentBestAvailable} variant="primary">▶ Play</Btn><Btn onClick={() => playAudioUrl(finalPath, "final stitched WAV")}>Final</Btn></div>
      <code>{formatTransportTime(transportProgress)}</code>
      <div className="segment-timeline" role="list" aria-label="Utterance playback timeline" style={{ "--playhead": `${transportDuration > 0 ? Math.min(100, Math.max(0, transportProgress / transportDuration * 100)) : currentUtterance && utterances.length > 1 ? (utterances.findIndex((u) => u.id === currentUtterance.id) / (utterances.length - 1)) * 100 : 0}%` } as CSSProperties}>
        {utterances.length === 0 && <span className="timeline-empty">Generate script</span>}
        {utterances.map((u) => {
          const selected = currentUtterance?.id === u.id;
          const ready = Boolean(processedMap[u.id] || cleanMap[u.id]);
          return <button
            key={u.id}
            aria-label={`Select ${u.id} ${u.speaker}`}
            className={`${u.speaker === "SHIP" ? "ship" : "capcom"}${selected ? " active" : ""}${ready ? " ready" : ""}`}
            onClick={() => selectTimelineUtterance(u, true)}
            title={`${u.id} · ${u.speaker} · ${processedMap[u.id] ? "processed" : cleanMap[u.id] ? "raw" : "pending"}`}
            type="button"
          />;
        })}
        {utterances.length > 0 && <i />}
      </div>
      <code>{formatTransportTime(transportDuration)}</code>
      <span className="status-pill"><LED color={finalPath ? "green" : cleanCount ? "amber" : "blue"} /> {transportStatus}</span>
      <Btn onClick={stitch}>Stitch</Btn>
      {finalPath ? <a className="btn btn-primary" href={finalPath} download="final.wav">Export</a> : <Btn onClick={() => setError("Stitch a final WAV before export.")} variant="primary">Export</Btn>}
    </footer>
  </div>;
}
