import type { ChannelProfile, MacroControls } from "./index.js";

export type MissionGeometry =
  | "leo_pass"
  | "trans_lunar_injection"
  | "midcourse_correction"
  | "lunar_flyby"
  | "far_side_occlusion"
  | "low_elevation_dsn"
  | "high_gain_misalignment"
  | "emergency_low_gain";

export type EnvironmentApplyScope = "selected_utterance" | "scene_wide";

export type MissionGeometryConfig = {
  geometry: MissionGeometry;
  intensity: number;
  applyScope: EnvironmentApplyScope;
};

export type MissionGeometryDefinition = {
  id: MissionGeometry;
  label: string;
  description: string;
  recommendedBaseProfile: ChannelProfile;
  recommendedIntensity: number;
  perceptualGoal: string;
  sonicPreviewText: string;
  affectedParameters: Array<keyof MacroControls>;
};

export const missionGeometryDefinitions: MissionGeometryDefinition[] = [
  {
    id: "leo_pass",
    label: "LEO Pass",
    description: "Clean near-Earth link with stable geometry and high signal margin.",
    recommendedBaseProfile: "earth_capcom",
    recommendedIntensity: 0.25,
    perceptualGoal: "Clear, controlled CAPCOM-style communication with only light radio texture.",
    sonicPreviewText: "Clean voice band, low hiss, minimal dropouts.",
    affectedParameters: ["signalQuality", "scintillationDepth", "dropoutProbability", "noise", "hpHz", "lpHz"]
  },
  {
    id: "trans_lunar_injection",
    label: "Trans-Lunar Injection",
    description: "Energetic departure phase with moderate link stress and reflections.",
    recommendedBaseProfile: "ship_comm",
    recommendedIntensity: 0.45,
    perceptualGoal: "Operational but stressed link that stays intelligible.",
    sonicPreviewText: "Compressed voice, mild phase smear, short PTT clipping.",
    affectedParameters: ["compression", "noise", "phaseScintillationMs", "reflectionDelayMs", "pttClipMs"]
  },
  {
    id: "midcourse_correction",
    label: "Midcourse Correction",
    description: "Procedural link with mild instability during trajectory update operations.",
    recommendedBaseProfile: "ship_comm",
    recommendedIntensity: 0.4,
    perceptualGoal: "Preserve clarity while adding slight jitter and repeat behavior.",
    sonicPreviewText: "Subtle repeats, light scintillation, crisp operational tone.",
    affectedParameters: ["jitterAmount", "repeatProbability", "scintillationDepth", "compression"]
  },
  {
    id: "lunar_flyby",
    label: "Lunar Flyby",
    description: "More distant and bandwidth-constrained lunar pass with telemetry bracketing.",
    recommendedBaseProfile: "throttled_s_band_lunar",
    recommendedIntensity: 0.55,
    perceptualGoal: "Distant lunar-band constrained signal with Quindar cues.",
    sonicPreviewText: "Narrower top end, more shimmer, intermittent jitter, clearer tones.",
    affectedParameters: ["signalQuality", "lpHz", "scintillationDepth", "jitterAmount", "telemetryEnabled", "quindarMode"]
  },
  {
    id: "far_side_occlusion",
    label: "Far-Side Occlusion",
    description: "Approach to the edge of lunar occultation and signal loss.",
    recommendedBaseProfile: "deep_space_degraded",
    recommendedIntensity: 0.75,
    perceptualGoal: "Edge-of-coverage degradation with fragments still emerging.",
    sonicPreviewText: "Dropouts, stutter, lower bandwidth, intermittent packets.",
    affectedParameters: ["dropoutProbability", "plcStutter", "jitterAmount", "signalQuality", "granularDensity", "lpHz"]
  },
  {
    id: "low_elevation_dsn",
    label: "Low Elevation DSN",
    description: "Earth receiving geometry degraded by low elevation angle.",
    recommendedBaseProfile: "ionospheric_storm_s4",
    recommendedIntensity: 0.55,
    perceptualGoal: "Rolling atmospheric instability without full signal collapse.",
    sonicPreviewText: "Brown/pink hiss, phase drift, slow fades and reflections.",
    affectedParameters: ["scintillationDepth", "noiseLfoDepth", "phaseScintillationMs", "reflectionMix", "brownNoise", "pinkNoise"]
  },
  {
    id: "high_gain_misalignment",
    label: "High-Gain Misalignment",
    description: "Intermittent antenna pointing instability with pulsing fades and jitter.",
    recommendedBaseProfile: "ship_comm",
    recommendedIntensity: 0.65,
    perceptualGoal: "Pulsing fades and partial packet loss rather than constant destruction.",
    sonicPreviewText: "Pulsing signal loss, unstable phase, partial packet loss.",
    affectedParameters: ["signalQuality", "noiseLfoDepth", "scintillationDepth", "dropoutProbability", "phaseScintillationMs", "jitterAmount"]
  },
  {
    id: "emergency_low_gain",
    label: "Emergency Low-Gain",
    description: "Low-quality backup communication using poorer antenna and narrower link.",
    recommendedBaseProfile: "deep_space_degraded",
    recommendedIntensity: 0.6,
    perceptualGoal: "Poor but intelligible fallback communication.",
    sonicPreviewText: "Narrower band, stronger compression, grainier backup link.",
    affectedParameters: ["hpHz", "lpHz", "downsample", "compression", "noise", "bitDepth", "signalQuality"]
  }
];

export const missionGeometryById = Object.fromEntries(missionGeometryDefinitions.map((item) => [item.id, item])) as Record<MissionGeometry, MissionGeometryDefinition>;

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function mixNumber(base: number, target: number, intensity: number) {
  return base + (target - base) * clamp01(intensity);
}

function setNumber(base: Partial<MacroControls>, key: keyof MacroControls, target: number, intensity: number, fallback: number, min = 0, max = 1) {
  const current = typeof base[key] === "number" ? Number(base[key]) : fallback;
  return clampRange(mixNumber(current, target, intensity), min, max);
}

export function resolveMissionGeometryControls(base: Partial<MacroControls>, geometryConfig: MissionGeometryConfig): Partial<MacroControls> {
  const intensity = clamp01(geometryConfig.intensity);
  const next: Partial<MacroControls> = { ...base };
  const geometry = geometryConfig.geometry;

  if (geometry === "leo_pass") {
    next.signalQuality = setNumber(base, "signalQuality", 0.94, intensity, 0.85);
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.02, intensity, 0.06);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.005, intensity, 0.02);
    next.noise = setNumber(base, "noise", 0.012, intensity, 0.025);
    next.hpHz = setNumber(base, "hpHz", 260, intensity, 300, 120, 1200);
    next.lpHz = setNumber(base, "lpHz", 3400, intensity, 3200, 1200, 4800);
  } else if (geometry === "trans_lunar_injection") {
    next.compression = setNumber(base, "compression", 0.62, intensity, 0.5);
    next.noise = setNumber(base, "noise", 0.075, intensity, 0.04);
    next.phaseScintillationMs = setNumber(base, "phaseScintillationMs", 1.5, intensity, 0.4, 0, 10);
    next.reflectionDelayMs = setNumber(base, "reflectionDelayMs", 36, intensity, 12, 0, 120);
    next.pttClipMs = setNumber(base, "pttClipMs", 10, intensity, 3, 0, 40);
  } else if (geometry === "midcourse_correction") {
    next.jitterAmount = setNumber(base, "jitterAmount", 0.18, intensity, 0.06);
    next.repeatProbability = setNumber(base, "repeatProbability", 0.09, intensity, 0.02);
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.16, intensity, 0.06);
    next.compression = setNumber(base, "compression", 0.58, intensity, 0.46);
  } else if (geometry === "lunar_flyby") {
    next.signalQuality = setNumber(base, "signalQuality", 0.56, intensity, 0.72);
    next.lpHz = setNumber(base, "lpHz", 2700, intensity, 3000, 1200, 4800);
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.22, intensity, 0.08);
    next.jitterAmount = setNumber(base, "jitterAmount", 0.22, intensity, 0.08);
    next.telemetryEnabled = true;
    next.telemetryStyle = "quindar";
    next.quindarMode = "both";
    next.telemetryLevel = setNumber(base, "telemetryLevel", 0.25, intensity, 0.2);
  } else if (geometry === "far_side_occlusion") {
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.46, intensity, 0.08);
    next.plcStutter = setNumber(base, "plcStutter", 0.58, intensity, 0.05);
    next.jitterAmount = setNumber(base, "jitterAmount", 0.7, intensity, 0.1);
    next.signalQuality = setNumber(base, "signalQuality", 0.18, intensity, 0.62);
    next.granularDensity = setNumber(base, "granularDensity", 0.26, intensity, 0.9);
    next.lpHz = setNumber(base, "lpHz", 2050, intensity, 3000, 1200, 4800);
  } else if (geometry === "low_elevation_dsn") {
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.42, intensity, 0.08);
    next.noiseLfoDepth = setNumber(base, "noiseLfoDepth", 0.78, intensity, 0.2);
    next.phaseScintillationMs = setNumber(base, "phaseScintillationMs", 4.4, intensity, 0.4, 0, 10);
    next.reflectionMix = setNumber(base, "reflectionMix", 0.22, intensity, 0.05);
    next.brownNoise = setNumber(base, "brownNoise", 0.12, intensity, 0.02);
    next.pinkNoise = setNumber(base, "pinkNoise", 0.16, intensity, 0.03);
  } else if (geometry === "high_gain_misalignment") {
    next.signalQuality = setNumber(base, "signalQuality", 0.38, intensity, 0.72);
    next.noiseLfoDepth = setNumber(base, "noiseLfoDepth", 0.86, intensity, 0.2);
    next.scintillationDepth = setNumber(base, "scintillationDepth", 0.36, intensity, 0.08);
    next.dropoutProbability = setNumber(base, "dropoutProbability", 0.22, intensity, 0.04);
    next.phaseScintillationMs = setNumber(base, "phaseScintillationMs", 3.5, intensity, 0.4, 0, 10);
    next.jitterAmount = setNumber(base, "jitterAmount", 0.42, intensity, 0.08);
  } else if (geometry === "emergency_low_gain") {
    next.hpHz = setNumber(base, "hpHz", 520, intensity, 300, 120, 1200);
    next.lpHz = setNumber(base, "lpHz", 2150, intensity, 3000, 1200, 4800);
    next.downsample = setNumber(base, "downsample", 7, intensity, 2, 1, 24);
    next.compression = setNumber(base, "compression", 0.78, intensity, 0.5);
    next.noise = setNumber(base, "noise", 0.14, intensity, 0.04);
    next.bitDepth = setNumber(base, "bitDepth", 8, intensity, 13, 4, 24);
    next.signalQuality = setNumber(base, "signalQuality", 0.44, intensity, 0.72);
  }

  return next;
}
