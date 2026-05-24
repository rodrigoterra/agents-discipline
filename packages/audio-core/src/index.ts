import { resolveMissionGeometryControls } from "./missionGeometry.js";
import { resolveSpaceWeatherControls } from "./spaceWeather.js";
import type { EnvironmentalAudioConfig } from "./environment.js";

export type ChannelProfile =
  | "earth_capcom"
  | "ship_comm"
  | "deep_space_degraded"
  | "apollo_heritage_clean"
  | "throttled_s_band_lunar"
  | "ionospheric_storm_s4"
  | "codec_failure_datamosh";

export type TelemetryStyle = "none" | "quindar";
export type DegradationMode = "off" | "subtle" | "nominal" | "severe" | "collapse";
export type QuindarMode = "off" | "intro" | "outro" | "both";

export type MacroControls = {
  channelProfile: ChannelProfile;
  signalQuality: number;
  telemetryEnabled: boolean;
  telemetryStyle: TelemetryStyle;
  degradationMode: DegradationMode;
  telemetryLevel: number;
  telemetryOffsetMs: number;
  quindarMode: QuindarMode;
  quindarToneMs?: number;
  quindarDrive?: number;
  hpHz?: number;
  lpHz?: number;
  compression?: number;
  drive?: number;
  noise?: number;
  whiteNoise?: number;
  pinkNoise?: number;
  brownNoise?: number;
  noiseLfoRate?: number;
  noiseLfoDepth?: number;
  noiseGateThreshold?: number;
  noiseGateDepth?: number;
  bitDepth?: number;
  downsample?: number;
  packetLossDynamics?: number;
  scintillationDepth?: number;
  scintillationRate?: number;
  phaseScintillationMs?: number;
  dropoutProbability?: number;
  repeatProbability?: number;
  jitterAmount?: number;
  grainSizeMs?: number;
  granularDensity?: number;
  plcStutter?: number;
  datamoshAmount?: number;
  reflectionDelayMs?: number;
  reflectionMix?: number;
  pttClipMs?: number;
};

export type ResolvedDspParams = {
  hpHz: number;
  lpHz: number;
  compression: number;
  drive: number;
  noise: number;
  whiteNoise: number;
  pinkNoise: number;
  brownNoise: number;
  noiseLfoRate: number;
  noiseLfoDepth: number;
  noiseGateThreshold: number;
  noiseGateDepth: number;
  bitDepth: number;
  downsample: number;
  packetLossDynamics: number;
  scintillationDepth: number;
  scintillationRate: number;
  phaseScintillationMs: number;
  dropoutProbability: number;
  repeatProbability: number;
  jitterAmount: number;
  grainSizeMs: number;
  granularDensity: number;
  plcStutter: number;
  datamoshAmount: number;
  reflectionDelayMs: number;
  reflectionMix: number;
  pttClipMs: number;
  telemetry: {
    introEnabled: boolean;
    outroEnabled: boolean;
    introHz: number;
    outroHz: number;
    toneMs: number;
    level: number;
    offsetMs: number;
    drive: number;
  };
};

export type DspProfileDefinition = {
  label: string;
  description: string;
  controls: MacroControls;
};

function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function clampInt(v: number, min: number, max: number) {
  return Math.round(Math.max(min, Math.min(max, v)));
}

function withDefaults(controls: MacroControls): MacroControls {
  const noise = controls.noise ?? 0;
  const dynamicDefaults = { off: 0, subtle: 0.12, nominal: 0.32, severe: 0.62, collapse: 0.9 } as const;
  return {
    ...controls,
    whiteNoise: controls.whiteNoise ?? noise,
    pinkNoise: controls.pinkNoise ?? noise * 0.55,
    brownNoise: controls.brownNoise ?? noise * 0.22,
    noiseLfoRate: controls.noiseLfoRate ?? 0.18,
    noiseLfoDepth: controls.noiseLfoDepth ?? 0.2,
    noiseGateThreshold: controls.noiseGateThreshold ?? 0.08,
    noiseGateDepth: controls.noiseGateDepth ?? 0.45,
    packetLossDynamics: controls.packetLossDynamics ?? dynamicDefaults[controls.degradationMode],
    quindarToneMs: controls.quindarToneMs ?? 250,
    quindarDrive: controls.quindarDrive ?? 0.08
  };
}

export const profileDefinitions: Record<ChannelProfile, DspProfileDefinition> = {
  earth_capcom: {
    label: "Earth CAPCOM",
    description: "Clean ground-side radio with narrow passband and low hiss.",
    controls: withDefaults({
      channelProfile: "earth_capcom",
      signalQuality: 0.88,
      degradationMode: "subtle",
      telemetryEnabled: false,
      telemetryStyle: "quindar",
      telemetryLevel: 0.18,
      telemetryOffsetMs: 0,
      quindarMode: "off",
      hpHz: 300,
      lpHz: 3200,
      compression: 0.42,
      drive: 0.04,
      noise: 0.015,
      bitDepth: 16,
      downsample: 1,
      scintillationDepth: 0.03,
      scintillationRate: 0.4,
      phaseScintillationMs: 0.15,
      dropoutProbability: 0.01,
      repeatProbability: 0.01,
      jitterAmount: 0.02,
      grainSizeMs: 20,
      granularDensity: 0.98,
      plcStutter: 0,
      datamoshAmount: 0,
      reflectionDelayMs: 0,
      reflectionMix: 0,
      pttClipMs: 2
    })
  },
  ship_comm: {
    label: "Ship Comm",
    description: "Moderate spacecraft saturation, hiss, reflection, and light scintillation.",
    controls: withDefaults({
      channelProfile: "ship_comm",
      signalQuality: 0.72,
      degradationMode: "nominal",
      telemetryEnabled: false,
      telemetryStyle: "quindar",
      telemetryLevel: 0.22,
      telemetryOffsetMs: 0,
      quindarMode: "off",
      hpHz: 280,
      lpHz: 3000,
      compression: 0.52,
      drive: 0.1,
      noise: 0.045,
      bitDepth: 13,
      downsample: 2,
      scintillationDepth: 0.1,
      scintillationRate: 0.9,
      phaseScintillationMs: 0.55,
      dropoutProbability: 0.045,
      repeatProbability: 0.035,
      jitterAmount: 0.08,
      grainSizeMs: 28,
      granularDensity: 0.92,
      plcStutter: 0.04,
      datamoshAmount: 0.04,
      reflectionDelayMs: 22,
      reflectionMix: 0.08,
      pttClipMs: 4
    })
  },
  deep_space_degraded: {
    label: "Deep Space Degraded",
    description: "Lower SNR with stronger band limiting, fading, dropouts, and codec stress.",
    controls: withDefaults({
      channelProfile: "deep_space_degraded",
      signalQuality: 0.42,
      degradationMode: "severe",
      telemetryEnabled: true,
      telemetryStyle: "quindar",
      telemetryLevel: 0.24,
      telemetryOffsetMs: 0,
      quindarMode: "both",
      hpHz: 340,
      lpHz: 2600,
      compression: 0.66,
      drive: 0.22,
      noise: 0.12,
      bitDepth: 9,
      downsample: 5,
      scintillationDepth: 0.3,
      scintillationRate: 1.4,
      phaseScintillationMs: 2.2,
      dropoutProbability: 0.18,
      repeatProbability: 0.14,
      jitterAmount: 0.35,
      grainSizeMs: 72,
      granularDensity: 0.68,
      plcStutter: 0.25,
      datamoshAmount: 0.22,
      reflectionDelayMs: 38,
      reflectionMix: 0.12,
      pttClipMs: 8
    })
  },
  apollo_heritage_clean: {
    label: "Apollo Heritage (Clean)",
    description: "Figure preset: high intelligibility, 16-bit, no packet loss, classic voice band.",
    controls: withDefaults({
      channelProfile: "apollo_heritage_clean",
      signalQuality: 0.96,
      degradationMode: "off",
      telemetryEnabled: true,
      telemetryStyle: "quindar",
      telemetryLevel: 0.2,
      telemetryOffsetMs: 0,
      quindarMode: "both",
      hpHz: 300,
      lpHz: 3000,
      compression: 0.36,
      drive: 0.03,
      noise: 0.012,
      bitDepth: 16,
      downsample: 1,
      scintillationDepth: 0,
      scintillationRate: 0.25,
      phaseScintillationMs: 0,
      dropoutProbability: 0,
      repeatProbability: 0,
      jitterAmount: 0,
      grainSizeMs: 16,
      granularDensity: 1,
      plcStutter: 0,
      datamoshAmount: 0,
      reflectionDelayMs: 0,
      reflectionMix: 0,
      pttClipMs: 3
    })
  },
  throttled_s_band_lunar: {
    label: "Throttled S-Band (Lunar)",
    description: "Figure preset: quantized lunar downlink with reduced sample rate and mild loss.",
    controls: withDefaults({
      channelProfile: "throttled_s_band_lunar",
      signalQuality: 0.62,
      degradationMode: "nominal",
      telemetryEnabled: true,
      telemetryStyle: "quindar",
      telemetryLevel: 0.22,
      telemetryOffsetMs: 0,
      quindarMode: "both",
      hpHz: 320,
      lpHz: 2850,
      compression: 0.58,
      drive: 0.15,
      noise: 0.065,
      bitDepth: 10,
      downsample: 4,
      scintillationDepth: 0.12,
      scintillationRate: 0.85,
      phaseScintillationMs: 0.9,
      dropoutProbability: 0.07,
      repeatProbability: 0.08,
      jitterAmount: 0.16,
      grainSizeMs: 48,
      granularDensity: 0.84,
      plcStutter: 0.12,
      datamoshAmount: 0.1,
      reflectionDelayMs: 28,
      reflectionMix: 0.1,
      pttClipMs: 5
    })
  },
  ionospheric_storm_s4: {
    label: "Ionospheric Storm (S4)",
    description: "Figure preset: deep stochastic fading and phase smear with packet instability.",
    controls: withDefaults({
      channelProfile: "ionospheric_storm_s4",
      signalQuality: 0.36,
      degradationMode: "severe",
      telemetryEnabled: true,
      telemetryStyle: "quindar",
      telemetryLevel: 0.24,
      telemetryOffsetMs: 0,
      quindarMode: "both",
      hpHz: 360,
      lpHz: 2550,
      compression: 0.68,
      drive: 0.18,
      noise: 0.11,
      bitDepth: 10,
      downsample: 4,
      scintillationDepth: 0.48,
      scintillationRate: 1.75,
      phaseScintillationMs: 4.2,
      dropoutProbability: 0.2,
      repeatProbability: 0.12,
      jitterAmount: 0.42,
      grainSizeMs: 70,
      granularDensity: 0.62,
      plcStutter: 0.18,
      datamoshAmount: 0.18,
      reflectionDelayMs: 44,
      reflectionMix: 0.14,
      pttClipMs: 7
    })
  },
  codec_failure_datamosh: {
    label: "Codec Failure (Datamosh)",
    description: "Figure preset: sparse granular packets, PLC stutter, jitter, and harsh folding.",
    controls: withDefaults({
      channelProfile: "codec_failure_datamosh",
      signalQuality: 0.18,
      degradationMode: "collapse",
      telemetryEnabled: true,
      telemetryStyle: "quindar",
      telemetryLevel: 0.26,
      telemetryOffsetMs: 0,
      quindarMode: "both",
      hpHz: 390,
      lpHz: 2200,
      compression: 0.82,
      drive: 0.36,
      noise: 0.17,
      bitDepth: 5,
      downsample: 9,
      scintillationDepth: 0.38,
      scintillationRate: 2.4,
      phaseScintillationMs: 5.8,
      dropoutProbability: 0.36,
      repeatProbability: 0.28,
      jitterAmount: 0.78,
      grainSizeMs: 96,
      granularDensity: 0.36,
      plcStutter: 0.62,
      datamoshAmount: 0.78,
      reflectionDelayMs: 52,
      reflectionMix: 0.16,
      pttClipMs: 12
    })
  }
};

export const profileOrder: ChannelProfile[] = [
  "earth_capcom",
  "ship_comm",
  "deep_space_degraded",
  "apollo_heritage_clean",
  "throttled_s_band_lunar",
  "ionospheric_storm_s4",
  "codec_failure_datamosh"
];

const modeScale = {
  off: 0,
  subtle: 0.25,
  nominal: 0.5,
  severe: 0.8,
  collapse: 1
} as const;

function numberOr(raw: number | undefined, fallback: number, min: number, max: number) {
  return Math.max(min, Math.min(max, raw ?? fallback));
}

export function getProfileControls(profile: ChannelProfile): MacroControls {
  return { ...profileDefinitions[profile].controls };
}

export function resolveAudioPreset(raw: Partial<MacroControls>): ResolvedDspParams {
  const profile = raw.channelProfile ?? "ship_comm";
  const base = profileDefinitions[profile].controls;
  const cfg: MacroControls = {
    ...base,
    ...raw,
    channelProfile: profile,
    signalQuality: clamp(raw.signalQuality ?? base.signalQuality),
    degradationMode: raw.degradationMode ?? base.degradationMode,
    telemetryEnabled: raw.telemetryEnabled ?? base.telemetryEnabled,
    telemetryStyle: raw.telemetryStyle ?? base.telemetryStyle,
    telemetryLevel: clamp(raw.telemetryLevel ?? base.telemetryLevel),
    telemetryOffsetMs: raw.telemetryOffsetMs ?? base.telemetryOffsetMs,
    quindarMode: raw.quindarMode ?? base.quindarMode
  };

  const qualityLoss = 1 - cfg.signalQuality;
  const mode = modeScale[cfg.degradationMode];
  const intensity = clamp(qualityLoss * 0.65 + mode * 0.9, 0, 1);
  const fallbackBitDepth = Math.max(4, Math.round(16 - intensity * 10));
  const fallbackDownsample = Math.max(1, Math.round(1 + intensity * 9));
  const legacyQuindar = cfg.telemetryEnabled && cfg.telemetryStyle === "quindar";
  const quindarMode = cfg.quindarMode ?? (legacyQuindar ? "both" : "off");
  const baseBitDepth = base.bitDepth ?? 16;
  const baseDownsample = base.downsample ?? 1;
  const baseDropout = base.dropoutProbability ?? 0;
  const baseRepeat = base.repeatProbability ?? 0;
  const baseJitter = base.jitterAmount ?? 0;
  const baseDensity = base.granularDensity ?? 1;
  const baseStutter = base.plcStutter ?? 0;
  const baseDatamosh = base.datamoshAmount ?? 0;
  const packetLossDynamics = clamp(numberOr(raw.packetLossDynamics, base.packetLossDynamics ?? intensity, 0, 1));
  const dynamicBitDepthDrop = Math.round(packetLossDynamics * 5);
  const dynamicDownsampleBoost = Math.round(packetLossDynamics * 5);

  return {
    hpHz: Math.round(numberOr(raw.hpHz, (base.hpHz ?? 300) + intensity * 40, 120, 1200)),
    lpHz: Math.round(numberOr(raw.lpHz, (base.lpHz ?? 3200) - intensity * 350, 1200, 4800)),
    compression: clamp(numberOr(raw.compression, (base.compression ?? 0.45) + intensity * 0.16, 0, 1)),
    drive: clamp(numberOr(raw.drive, (base.drive ?? 0.05) + intensity * 0.2, 0, 1)),
    noise: clamp(numberOr(raw.noise, (base.noise ?? 0.02) + intensity * 0.1, 0, 1)),
    whiteNoise: clamp(numberOr(raw.whiteNoise, (base.whiteNoise ?? base.noise ?? 0.02) + intensity * 0.08, 0, 1)),
    pinkNoise: clamp(numberOr(raw.pinkNoise, (base.pinkNoise ?? (base.noise ?? 0.02) * 0.55) + intensity * 0.05, 0, 1)),
    brownNoise: clamp(numberOr(raw.brownNoise, (base.brownNoise ?? (base.noise ?? 0.02) * 0.22) + intensity * 0.035, 0, 1)),
    noiseLfoRate: numberOr(raw.noiseLfoRate, base.noiseLfoRate ?? 0.18, 0, 12),
    noiseLfoDepth: clamp(numberOr(raw.noiseLfoDepth, base.noiseLfoDepth ?? 0.2, 0, 1)),
    noiseGateThreshold: clamp(numberOr(raw.noiseGateThreshold, base.noiseGateThreshold ?? 0.08, 0, 1)),
    noiseGateDepth: clamp(numberOr(raw.noiseGateDepth, base.noiseGateDepth ?? 0.45, 0, 1)),
    bitDepth: clampInt((raw.bitDepth ?? Math.min(baseBitDepth, fallbackBitDepth)) - dynamicBitDepthDrop, 4, 24),
    downsample: clampInt((raw.downsample ?? Math.max(baseDownsample, fallbackDownsample)) + dynamicDownsampleBoost, 1, 24),
    packetLossDynamics,
    scintillationDepth: clamp(numberOr(raw.scintillationDepth, (base.scintillationDepth ?? 0.02) + intensity * 0.2, 0, 1)),
    scintillationRate: numberOr(raw.scintillationRate, (base.scintillationRate ?? 0.4) + intensity * 1.2, 0, 12),
    phaseScintillationMs: numberOr(raw.phaseScintillationMs, (base.phaseScintillationMs ?? 0) + intensity * 3, 0, 10),
    dropoutProbability: clamp(numberOr(raw.dropoutProbability, baseDropout + intensity * 0.24, 0, 1) + packetLossDynamics * 0.16),
    repeatProbability: clamp(numberOr(raw.repeatProbability, baseRepeat + intensity * 0.14, 0, 1) + packetLossDynamics * 0.12),
    jitterAmount: clamp(numberOr(raw.jitterAmount, baseJitter + intensity * 0.3, 0, 1) + packetLossDynamics * 0.2),
    grainSizeMs: numberOr(raw.grainSizeMs, (base.grainSizeMs ?? 18) + intensity * 40, 5, 120),
    granularDensity: clamp(numberOr(raw.granularDensity, baseDensity - intensity * 0.38, 0, 1) - packetLossDynamics * 0.18),
    plcStutter: clamp(numberOr(raw.plcStutter, baseStutter + intensity * 0.2, 0, 1) + packetLossDynamics * 0.16),
    datamoshAmount: clamp(numberOr(raw.datamoshAmount, baseDatamosh + (cfg.degradationMode === "collapse" ? 0.4 + qualityLoss * 0.4 : intensity * 0.16), 0, 1) + packetLossDynamics * 0.18),
    reflectionDelayMs: numberOr(raw.reflectionDelayMs, (base.reflectionDelayMs ?? 0) + intensity * 24, 0, 120),
    reflectionMix: clamp(numberOr(raw.reflectionMix, (base.reflectionMix ?? 0) + intensity * 0.1, 0, 1)),
    pttClipMs: numberOr(raw.pttClipMs, (base.pttClipMs ?? 0) + intensity * 6, 0, 40),
    telemetry: {
      introEnabled: cfg.telemetryStyle === "quindar" && (quindarMode === "intro" || quindarMode === "both"),
      outroEnabled: cfg.telemetryStyle === "quindar" && (quindarMode === "outro" || quindarMode === "both"),
      introHz: 2525,
      outroHz: 2475,
      toneMs: numberOr(raw.quindarToneMs, base.quindarToneMs ?? 250, 80, 600),
      level: cfg.telemetryLevel,
      offsetMs: cfg.telemetryOffsetMs,
      drive: clamp(numberOr(raw.quindarDrive, base.quindarDrive ?? 0.08, 0, 1))
    }
  };
}

export function resolveEnvironmentalAudioControls(config: EnvironmentalAudioConfig): MacroControls {
  let resolved: Partial<MacroControls> = getProfileControls(config.baseProfile);
  if (config.missionGeometry) {
    resolved = resolveMissionGeometryControls(resolved, config.missionGeometry);
  }
  if (config.spaceWeather) {
    resolved = resolveSpaceWeatherControls(resolved, config.spaceWeather);
  }
  resolved = { ...resolved, ...(config.macroOverrides || {}) };
  return {
    ...getProfileControls(config.baseProfile),
    ...resolved,
    channelProfile: config.macroOverrides?.channelProfile || resolved.channelProfile || config.baseProfile
  } as MacroControls;
}

export * from "./missionGeometry.js";
export * from "./spaceWeather.js";
export * from "./environment.js";
