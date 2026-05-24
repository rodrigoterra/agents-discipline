import type { MacroControls } from "./index.js";
import { clamp01, clampRange, mixNumber, type EnvironmentApplyScope } from "./missionGeometry.js";

export type SpaceWeatherEvent =
  | "calm_link"
  | "solar_flare_onset"
  | "cme_front_arrival"
  | "radiation_burst"
  | "plasma_bubble_pass"
  | "lunar_far_side_edge"
  | "blackout_window"
  | "dsn_reacquisition";

export type EventDurationMode = "instant" | "short" | "medium" | "full_utterance" | "scene_wide";
export type EventEnvelope = "static" | "ramp_up" | "ramp_down" | "bell" | "pulse_train" | "collapse_then_recover";

export type SpaceWeatherConfig = {
  event: SpaceWeatherEvent;
  intensity: number;
  durationMode: EventDurationMode;
  envelope: EventEnvelope;
  applyScope: EnvironmentApplyScope;
};

export type SpaceWeatherEventDefinition = {
  id: SpaceWeatherEvent;
  label: string;
  description: string;
  recommendedIntensity: number;
  recommendedDurationMode: EventDurationMode;
  perceptualGoal: string;
  sonicPreviewText: string;
  affectedParameters: Array<keyof MacroControls>;
};

export const spaceWeatherEventDefinitions: SpaceWeatherEventDefinition[] = [
  {
    id: "calm_link",
    label: "Calm Link",
    description: "Stable baseline with minimal modulation and low packet instability.",
    recommendedIntensity: 0.2,
    recommendedDurationMode: "scene_wide",
    perceptualGoal: "Keep the link intelligible and only lightly textured.",
    sonicPreviewText: "Stable radio, low packet movement, low background hiss.",
    affectedParameters: ["signalQuality", "noise", "dropoutProbability", "scintillationDepth", "packetLossDynamics"]
  },
  {
    id: "solar_flare_onset",
    label: "Solar Flare Onset",
    description: "Rising noisy interference condition with short corruption bursts.",
    recommendedIntensity: 0.65,
    recommendedDurationMode: "full_utterance",
    perceptualGoal: "Rising noise and short digital stress while speech remains mostly readable.",
    sonicPreviewText: "Growing white hiss, lowered bit depth, short datamosh bursts.",
    affectedParameters: ["noise", "whiteNoise", "downsample", "datamoshAmount", "dropoutProbability", "signalQuality", "bitDepth"]
  },
  {
    id: "cme_front_arrival",
    label: "CME Front Arrival",
    description: "Strong disturbed propagation with heavy scintillation, jitter, and dropouts.",
    recommendedIntensity: 0.75,
    recommendedDurationMode: "medium",
    perceptualGoal: "Large-scale disturbed propagation without becoming pure noise.",
    sonicPreviewText: "Strong shimmer, phase smear, packet repeats and dropouts.",
    affectedParameters: ["scintillationDepth", "scintillationRate", "phaseScintillationMs", "jitterAmount", "repeatProbability", "dropoutProbability", "granularDensity", "signalQuality"]
  },
  {
    id: "radiation_burst",
    label: "Radiation Burst",
    description: "Short aggressive digital corruption event rather than continuous weather.",
    recommendedIntensity: 0.8,
    recommendedDurationMode: "short",
    perceptualGoal: "Brief violent corruption spikes.",
    sonicPreviewText: "Harsh bit depth collapse, packet loss, clipped onset, datamosh.",
    affectedParameters: ["bitDepth", "downsample", "datamoshAmount", "pttClipMs", "dropoutProbability", "packetLossDynamics"]
  },
  {
    id: "plasma_bubble_pass",
    label: "Plasma Bubble Pass",
    description: "Rolling ionospheric scintillation and slow unstable fading.",
    recommendedIntensity: 0.6,
    recommendedDurationMode: "medium",
    perceptualGoal: "Slow moving fade and phase instability.",
    sonicPreviewText: "Rolling fade, deeper noise LFO, phase smear, reflections.",
    affectedParameters: ["scintillationDepth", "noiseLfoDepth", "phaseScintillationMs", "reflectionDelayMs", "reflectionMix"]
  },
  {
    id: "lunar_far_side_edge",
    label: "Lunar Far-Side Edge",
    description: "Progressive approach to loss of signal.",
    recommendedIntensity: 0.72,
    recommendedDurationMode: "full_utterance",
    perceptualGoal: "Speech fragments break apart as coverage fades.",
    sonicPreviewText: "Reduced bandwidth, lower quality, more repeats, stutter, and jitter.",
    affectedParameters: ["signalQuality", "lpHz", "granularDensity", "dropoutProbability", "plcStutter", "repeatProbability", "jitterAmount"]
  },
  {
    id: "blackout_window",
    label: "Blackout Window",
    description: "Severe or complete signal loss with occasional fragments.",
    recommendedIntensity: 0.9,
    recommendedDurationMode: "medium",
    perceptualGoal: "Mostly silence and packet gaps, not loud continuous noise.",
    sonicPreviewText: "Sparse fragments, heavy dropouts, edge corruption.",
    affectedParameters: ["dropoutProbability", "plcStutter", "granularDensity", "datamoshAmount", "signalQuality", "noise"]
  },
  {
    id: "dsn_reacquisition",
    label: "DSN Reacquisition",
    description: "Recovery after loss of signal, approximated statically in this PoC.",
    recommendedIntensity: 0.55,
    recommendedDurationMode: "full_utterance",
    perceptualGoal: "Recovering link with improving tone clarity.",
    sonicPreviewText: "Reduced dropouts, higher density, clearer Quindar/telemetry.",
    affectedParameters: ["signalQuality", "dropoutProbability", "granularDensity", "scintillationDepth", "telemetryLevel", "quindarDrive"]
  }
];

export const spaceWeatherEventById = Object.fromEntries(spaceWeatherEventDefinitions.map((item) => [item.id, item])) as Record<SpaceWeatherEvent, SpaceWeatherEventDefinition>;

function setNumber(base: Partial<MacroControls>, key: keyof MacroControls, target: number, intensity: number, fallback: number, min = 0, max = 1) {
  const current = typeof base[key] === "number" ? Number(base[key]) : fallback;
  return clampRange(mixNumber(current, target, intensity), min, max);
}

export function eventEnvelopePreviewScalar(config: SpaceWeatherConfig, position01: number) {
  const x = clamp01(position01);
  if (config.envelope === "ramp_up") return x;
  if (config.envelope === "ramp_down") return 1 - x;
  if (config.envelope === "bell") return Math.sin(Math.PI * x);
  if (config.envelope === "pulse_train") return x < 0.2 || (x > 0.45 && x < 0.6) || x > 0.82 ? 1 : 0.35;
  if (config.envelope === "collapse_then_recover") return x < 0.5 ? x * 2 : (1 - x) * 2;
  return 1;
}

export function resolveSpaceWeatherControls(base: Partial<MacroControls>, eventConfig: SpaceWeatherConfig): Partial<MacroControls> {
  const intensity = clamp01(eventConfig.intensity);
  const next: Partial<MacroControls> = { ...base };
  const event = eventConfig.event;

  // v1 resolves events statically. The envelope fields are preserved so audio-fx can add per-frame modulation later.
  if (event === "calm_link") {
    next.signalQuality = setNumber(base, "signalQuality", 0.86, intensity, 0.72);
    next.noise = setNumber(base, "noise", 0.02, intensity, 0.04);
    next.whiteNoise = setNumber(base, "whiteNoise", 0.02, intensity, 0.04);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.015, intensity, 0.04);
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.04, intensity, 0.08);
    next.packetLossDynamics = setNumber(base, "packetLossDynamics", 0.08, intensity, 0.25);
  } else if (event === "solar_flare_onset") {
    next.signalQuality = setNumber(base, "signalQuality", 0.48, intensity, 0.72);
    next.noise = setNumber(base, "noise", 0.16, intensity, 0.04);
    next.whiteNoise = setNumber(base, "whiteNoise", 0.22, intensity, 0.04);
    next.downsample = setNumber(base, "downsample", 6, intensity, 2, 1, 24);
    next.datamoshAmount = setNumber(base, "datamoshAmount", 0.25, intensity, 0.04);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.16, intensity, 0.04);
    next.bitDepth = setNumber(base, "bitDepth", 9, intensity, 13, 4, 24);
  } else if (event === "cme_front_arrival") {
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.66, intensity, 0.1);
    next.scintillationRate = setNumber(base, "scintillationRate", 4.4, intensity, 0.9, 0, 12);
    next.phaseScintillationMs = setNumber(base, "phaseScintillationMs", 6.5, intensity, 0.5, 0, 10);
    next.jitterAmount = setNumber(base, "jitterAmount", 0.68, intensity, 0.08);
    next.repeatProbability = setNumber(base, "repeatProbability", 0.3, intensity, 0.03);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.32, intensity, 0.04);
    next.granularDensity = setNumber(base, "granularDensity", 0.48, intensity, 0.92);
    next.signalQuality = setNumber(base, "signalQuality", 0.34, intensity, 0.72);
  } else if (event === "radiation_burst") {
    next.bitDepth = setNumber(base, "bitDepth", 6, intensity, 13, 4, 24);
    next.downsample = setNumber(base, "downsample", 10, intensity, 2, 1, 24);
    next.datamoshAmount = setNumber(base, "datamoshAmount", 0.64, intensity, 0.04);
    next.pttClipMs = setNumber(base, "pttClipMs", 24, intensity, 4, 0, 40);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.28, intensity, 0.04);
    next.packetLossDynamics = setNumber(base, "packetLossDynamics", 0.9, intensity, 0.32);
  } else if (event === "plasma_bubble_pass") {
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.54, intensity, 0.1);
    next.noiseLfoDepth = setNumber(base, "noiseLfoDepth", 0.82, intensity, 0.2);
    next.phaseScintillationMs = setNumber(base, "phaseScintillationMs", 5.2, intensity, 0.5, 0, 10);
    next.reflectionDelayMs = setNumber(base, "reflectionDelayMs", 62, intensity, 20, 0, 120);
    next.reflectionMix = setNumber(base, "reflectionMix", 0.2, intensity, 0.08);
  } else if (event === "lunar_far_side_edge") {
    next.signalQuality = setNumber(base, "signalQuality", 0.16, intensity, 0.72);
    next.lpHz = setNumber(base, "lpHz", 1900, intensity, 3000, 1200, 4800);
    next.granularDensity = setNumber(base, "granularDensity", 0.24, intensity, 0.92);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.52, intensity, 0.04);
    next.plcStutter = setNumber(base, "plcStutter", 0.62, intensity, 0.04);
    next.repeatProbability = setNumber(base, "repeatProbability", 0.34, intensity, 0.03);
    next.jitterAmount = setNumber(base, "jitterAmount", 0.74, intensity, 0.08);
  } else if (event === "blackout_window") {
    next.signalQuality = setNumber(base, "signalQuality", 0.04, intensity, 0.72);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.86, intensity, 0.04);
    next.plcStutter = setNumber(base, "plcStutter", 0.84, intensity, 0.04);
    next.granularDensity = setNumber(base, "granularDensity", 0.08, intensity, 0.92);
    next.datamoshAmount = setNumber(base, "datamoshAmount", 0.36, intensity, 0.04);
    next.noise = setNumber(base, "noise", 0.035, intensity, 0.04);
    next.whiteNoise = setNumber(base, "whiteNoise", 0.04, intensity, 0.04);
  } else if (event === "dsn_reacquisition") {
    next.signalQuality = setNumber(base, "signalQuality", 0.76, intensity, 0.36);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.08, intensity, 0.28);
    next.granularDensity = setNumber(base, "granularDensity", 0.82, intensity, 0.48);
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.12, intensity, 0.36);
    next.telemetryEnabled = true;
    next.telemetryStyle = "quindar";
    next.quindarMode = base.quindarMode === "off" ? "intro" : base.quindarMode;
    next.telemetryLevel = setNumber(base, "telemetryLevel", 0.27, intensity, 0.2);
    next.quindarDrive = setNumber(base, "quindarDrive", 0.18, intensity, 0.08);
  }

  return next;
}
