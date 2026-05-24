export const builtInVoiceIds = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
  "marin",
  "cedar"
] as const;

export type BuiltInVoiceId = (typeof builtInVoiceIds)[number];
export type VoiceGroup = "masculine-coded" | "feminine-coded" | "neutral-or-flexible";
export type VoiceGroupFilter = "all" | VoiceGroup;

export type SpeakerRole =
  | "CAPCOM"
  | "SHIP"
  | "MISSION_SPECIALIST"
  | "COMMANDER"
  | "FLIGHT_DIRECTOR"
  | "AI_SYSTEM"
  | "DISTRESS_SIGNAL"
  | "UNKNOWN_TRANSMISSION";

export type PauseStyle = "clipped" | "natural" | "procedural" | "urgent" | "breathy" | "fragmented";

export type VoiceMetadata = {
  id: BuiltInVoiceId;
  displayName: string;
  group: VoiceGroup;
  recommendedUse: string;
  perceivedRange: string;
  suggestedRole: SpeakerRole;
  defaultInstructionHint: string;
};

export type VoiceProfile = {
  voiceId: BuiltInVoiceId;
  label?: string;
  speakerRole: SpeakerRole;
  genderPresentation?: VoiceGroup;
  perceivedRange?: string;
  accentInstruction?: string;
  toneInstruction?: string;
  emotionInstruction?: string;
  cadenceInstruction?: string;
  deliveryInstruction?: string;
  radioDisciplineInstruction?: string;
  speed: number;
  pauseStyle: PauseStyle;
  intensity: number;
  organicVariation: number;
  clarityPriority: number;
  cadencePreset?: string;
  tonePreset?: string;
  deliveryPreset?: string;
  extraInstruction?: string;
};

export type SpeechVoice = BuiltInVoiceId | Record<string, unknown>;

export const voiceRegistry: Record<BuiltInVoiceId, VoiceMetadata> = {
  alloy: {
    id: "alloy",
    displayName: "Alloy",
    group: "neutral-or-flexible",
    recommendedUse: "Balanced mission narration, AI systems, and flexible crew voices.",
    perceivedRange: "neutral, adaptable, centered",
    suggestedRole: "AI_SYSTEM",
    defaultInstructionHint: "Keep the delivery balanced, direct, and highly intelligible."
  },
  ash: {
    id: "ash",
    displayName: "Ash",
    group: "masculine-coded",
    recommendedUse: "Cockpit responses, tense ship comms, and operational crew dialogue.",
    perceivedRange: "grounded, low-mid, controlled",
    suggestedRole: "SHIP",
    defaultInstructionHint: "Use restrained cockpit realism with controlled urgency."
  },
  ballad: {
    id: "ballad",
    displayName: "Ballad",
    group: "neutral-or-flexible",
    recommendedUse: "Reflective mission logs, memory playback, and formal narration.",
    perceivedRange: "smooth, lyrical, flexible",
    suggestedRole: "AI_SYSTEM",
    defaultInstructionHint: "Keep the voice composed and clear, avoiding melodrama."
  },
  coral: {
    id: "coral",
    displayName: "Coral",
    group: "feminine-coded",
    recommendedUse: "Crew dialogue, urgent responses, and warm technical narration.",
    perceivedRange: "clear, warm, focused",
    suggestedRole: "SHIP",
    defaultInstructionHint: "Use focused warmth with crisp technical diction."
  },
  echo: {
    id: "echo",
    displayName: "Echo",
    group: "masculine-coded",
    recommendedUse: "Flight director, ground control, and procedural status calls.",
    perceivedRange: "steady, mid-low, controlled",
    suggestedRole: "FLIGHT_DIRECTOR",
    defaultInstructionHint: "Speak with calm authority and procedural pacing."
  },
  fable: {
    id: "fable",
    displayName: "Fable",
    group: "neutral-or-flexible",
    recommendedUse: "Narrative fragments, unknown transmissions, and stylized mission moments.",
    perceivedRange: "expressive, flexible, narrative",
    suggestedRole: "UNKNOWN_TRANSMISSION",
    defaultInstructionHint: "Stay grounded and avoid theatrical exaggeration."
  },
  nova: {
    id: "nova",
    displayName: "Nova",
    group: "feminine-coded",
    recommendedUse: "Clear CAPCOM, mission specialist, and confident ship dialogue.",
    perceivedRange: "bright, clear, energetic",
    suggestedRole: "MISSION_SPECIALIST",
    defaultInstructionHint: "Use crisp speech with natural micro-pauses."
  },
  onyx: {
    id: "onyx",
    displayName: "Onyx",
    group: "masculine-coded",
    recommendedUse: "Commander, ship comms, and low-intensity emergency calls.",
    perceivedRange: "deep, firm, steady",
    suggestedRole: "COMMANDER",
    defaultInstructionHint: "Use grounded authority and keep speech legible under radio FX."
  },
  sage: {
    id: "sage",
    displayName: "Sage",
    group: "neutral-or-flexible",
    recommendedUse: "AI systems, calm diagnostics, and high-clarity procedural readouts.",
    perceivedRange: "measured, calm, flexible",
    suggestedRole: "AI_SYSTEM",
    defaultInstructionHint: "Sound precise and composed without becoming robotic."
  },
  shimmer: {
    id: "shimmer",
    displayName: "Shimmer",
    group: "feminine-coded",
    recommendedUse: "Distress signals, soft cockpit exchanges, and delicate mission logs.",
    perceivedRange: "soft, bright, fragile",
    suggestedRole: "DISTRESS_SIGNAL",
    defaultInstructionHint: "Keep emotion restrained and speech understandable."
  },
  verse: {
    id: "verse",
    displayName: "Verse",
    group: "masculine-coded",
    recommendedUse: "Fragmented transmissions, ceremonial phrases, and severe-link dialogue.",
    perceivedRange: "textured, expressive, low-mid",
    suggestedRole: "DISTRESS_SIGNAL",
    defaultInstructionHint: "Use texture and urgency without overacting."
  },
  marin: {
    id: "marin",
    displayName: "Marin",
    group: "feminine-coded",
    recommendedUse: "CAPCOM, flight dynamics, and mission-control clarity.",
    perceivedRange: "clear, composed, professional",
    suggestedRole: "CAPCOM",
    defaultInstructionHint: "Speak as a disciplined mission-control operator."
  },
  cedar: {
    id: "cedar",
    displayName: "Cedar",
    group: "masculine-coded",
    recommendedUse: "CAPCOM, flight director, commander, and authoritative mission traffic.",
    perceivedRange: "firm, warm, authoritative",
    suggestedRole: "CAPCOM",
    defaultInstructionHint: "Speak with calm command authority and clean diction."
  }
};

export const tonePresets = [
  "calm technical",
  "focused",
  "urgent but controlled",
  "exhausted",
  "distressed",
  "ritualistic transmission",
  "synthetic onboard AI",
  "corrupted memory playback",
  "command authority",
  "whispered emergency"
] as const;

export const cadencePresets = [
  "procedural CAPCOM",
  "clipped military",
  "natural cinematic",
  "slow and deliberate",
  "fast emergency",
  "fragmented weak signal",
  "calm documentary",
  "intimate cockpit"
] as const;

export const deliveryPresets = [
  "grounded operational",
  "controlled breath",
  "clear mission readback",
  "low-power transmission",
  "damaged signal source",
  "onboard computer readout"
] as const;

export const speakerDefaultProfiles: Record<SpeakerRole, VoiceProfile> = {
  CAPCOM: {
    voiceId: "cedar",
    label: "CAPCOM default",
    speakerRole: "CAPCOM",
    speed: 0.95,
    cadencePreset: "procedural CAPCOM",
    tonePreset: "calm technical",
    deliveryPreset: "clear mission readback",
    pauseStyle: "procedural",
    intensity: 0.25,
    organicVariation: 0.25,
    clarityPriority: 0.95,
    accentInstruction: "Clear mission-control diction.",
    radioDisciplineInstruction: "Use concise readbacks and disciplined handoffs."
  },
  SHIP: {
    voiceId: "ash",
    label: "SHIP default",
    speakerRole: "SHIP",
    speed: 1,
    cadencePreset: "intimate cockpit",
    tonePreset: "focused",
    deliveryPreset: "controlled breath",
    pauseStyle: "natural",
    intensity: 0.45,
    organicVariation: 0.45,
    clarityPriority: 0.85,
    accentInstruction: "Clear cockpit diction.",
    radioDisciplineInstruction: "Keep responses operational and short."
  },
  MISSION_SPECIALIST: {
    voiceId: "nova",
    label: "Mission specialist default",
    speakerRole: "MISSION_SPECIALIST",
    speed: 1,
    cadencePreset: "natural cinematic",
    tonePreset: "focused",
    deliveryPreset: "clear mission readback",
    pauseStyle: "natural",
    intensity: 0.35,
    organicVariation: 0.35,
    clarityPriority: 0.9
  },
  COMMANDER: {
    voiceId: "onyx",
    label: "Commander default",
    speakerRole: "COMMANDER",
    speed: 0.95,
    cadencePreset: "clipped military",
    tonePreset: "command authority",
    deliveryPreset: "grounded operational",
    pauseStyle: "clipped",
    intensity: 0.35,
    organicVariation: 0.25,
    clarityPriority: 0.92
  },
  FLIGHT_DIRECTOR: {
    voiceId: "echo",
    label: "Flight director default",
    speakerRole: "FLIGHT_DIRECTOR",
    speed: 0.95,
    cadencePreset: "procedural CAPCOM",
    tonePreset: "command authority",
    deliveryPreset: "clear mission readback",
    pauseStyle: "procedural",
    intensity: 0.3,
    organicVariation: 0.2,
    clarityPriority: 0.96
  },
  AI_SYSTEM: {
    voiceId: "sage",
    label: "AI system default",
    speakerRole: "AI_SYSTEM",
    speed: 0.9,
    cadencePreset: "calm documentary",
    tonePreset: "synthetic onboard AI",
    deliveryPreset: "onboard computer readout",
    pauseStyle: "procedural",
    intensity: 0.15,
    organicVariation: 0.05,
    clarityPriority: 0.98,
    radioDisciplineInstruction: "Sound precise and composed without fake machine effects."
  },
  DISTRESS_SIGNAL: {
    voiceId: "verse",
    label: "Distress signal default",
    speakerRole: "DISTRESS_SIGNAL",
    speed: 1.05,
    cadencePreset: "fragmented weak signal",
    tonePreset: "distressed",
    deliveryPreset: "low-power transmission",
    pauseStyle: "fragmented",
    intensity: 0.75,
    organicVariation: 0.65,
    clarityPriority: 0.7,
    radioDisciplineInstruction: "Preserve intelligibility even under distress."
  },
  UNKNOWN_TRANSMISSION: {
    voiceId: "fable",
    label: "Unknown transmission default",
    speakerRole: "UNKNOWN_TRANSMISSION",
    speed: 0.95,
    cadencePreset: "fragmented weak signal",
    tonePreset: "corrupted memory playback",
    deliveryPreset: "damaged signal source",
    pauseStyle: "fragmented",
    intensity: 0.55,
    organicVariation: 0.55,
    clarityPriority: 0.75
  }
};

export function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, n));
}

export function isBuiltInVoiceId(value: unknown): value is BuiltInVoiceId {
  return typeof value === "string" && (builtInVoiceIds as readonly string[]).includes(value);
}

export function assertBuiltInVoiceId(value: unknown): BuiltInVoiceId {
  if (isBuiltInVoiceId(value)) return value;
  throw new Error(`Unknown OpenAI TTS voice: ${String(value)}`);
}

export function roleFromSpeaker(speaker: unknown): SpeakerRole {
  return speaker === "CAPCOM" || speaker === "SHIP" ? speaker : "SHIP";
}

export function resolveVoiceProfile(raw: Partial<VoiceProfile> = {}, fallbackRole: SpeakerRole = "SHIP"): VoiceProfile {
  const role = raw.speakerRole ?? fallbackRole;
  const base = speakerDefaultProfiles[role] ?? speakerDefaultProfiles.SHIP;
  const voiceId = raw.voiceId === undefined ? base.voiceId : assertBuiltInVoiceId(raw.voiceId);
  const metadata = voiceRegistry[voiceId];
  return {
    ...base,
    ...raw,
    voiceId,
    speakerRole: role,
    genderPresentation: raw.genderPresentation ?? metadata.group,
    perceivedRange: raw.perceivedRange ?? metadata.perceivedRange,
    speed: clampNumber(raw.speed, 0.25, 4, base.speed),
    intensity: clampNumber(raw.intensity, 0, 1, base.intensity),
    organicVariation: clampNumber(raw.organicVariation, 0, 1, base.organicVariation),
    clarityPriority: clampNumber(raw.clarityPriority, 0, 1, base.clarityPriority),
    pauseStyle: raw.pauseStyle ?? base.pauseStyle
  };
}

function sentenceForRole(role: SpeakerRole) {
  const labels: Record<SpeakerRole, string> = {
    CAPCOM: "a calm, disciplined CAPCOM operator",
    SHIP: "a focused spacecraft crew member",
    MISSION_SPECIALIST: "a mission specialist reporting technical status",
    COMMANDER: "a commander maintaining authority under pressure",
    FLIGHT_DIRECTOR: "a flight director coordinating mission decisions",
    AI_SYSTEM: "an onboard AI system with composed operational clarity",
    DISTRESS_SIGNAL: "a strained but intelligible distress transmission",
    UNKNOWN_TRANSMISSION: "an unknown transmission that remains understandable"
  };
  return labels[role];
}

export function buildTtsInstructions(profileInput: Partial<VoiceProfile>) {
  const profile = resolveVoiceProfile(profileInput, profileInput.speakerRole ?? "SHIP");
  const metadata = voiceRegistry[profile.voiceId];
  const lines = [
    `Speak as ${sentenceForRole(profile.speakerRole)}.`,
    metadata.defaultInstructionHint,
    profile.accentInstruction ? `Accent/pronunciation: ${profile.accentInstruction}` : "",
    profile.tonePreset ? `Tone preset: ${profile.tonePreset}.` : "",
    profile.toneInstruction ? `Tone: ${profile.toneInstruction}` : "",
    profile.emotionInstruction ? `Emotion: ${profile.emotionInstruction}` : "",
    profile.cadencePreset ? `Cadence preset: ${profile.cadencePreset}.` : "",
    profile.cadenceInstruction ? `Cadence: ${profile.cadenceInstruction}` : "",
    profile.deliveryPreset ? `Delivery preset: ${profile.deliveryPreset}.` : "",
    profile.deliveryInstruction ? `Delivery: ${profile.deliveryInstruction}` : "",
    `Pause style: ${profile.pauseStyle}. Use natural micro-pauses between technical clauses.`,
    `Use speech speed ${profile.speed.toFixed(2)}x.`,
    `Emotional intensity ${profile.intensity.toFixed(2)}; organic variation ${profile.organicVariation.toFixed(2)}; clarity priority ${profile.clarityPriority.toFixed(2)}.`,
    profile.radioDisciplineInstruction || "Use realistic mission radio cadence and concise operational phrasing.",
    profile.extraInstruction || "",
    "Avoid theatrical overacting. Do not sound robotic or overly synthetic. Maintain intelligibility before the radio FX chain."
  ].filter(Boolean);

  return lines.join(" ");
}

export function normalizeTtsInput(input: string, organicVariation = 0) {
  const trimmed = input
    .replace(/\s+/g, " ")
    .replace(/,{2,}/g, ",")
    .replace(/\s+,/g, ",")
    .trim();
  if (trimmed.length <= 150) return trimmed;

  const chunks = trimmed.split(/(?<=[.!?;:])\s+/);
  if (chunks.length > 1) return chunks.join(" ");

  const parts = trimmed.split(", ");
  if (parts.length < 2) return trimmed;

  const pause = organicVariation > 0.3 ? ". " : "; ";
  return parts.map((part) => part.trim()).filter(Boolean).join(pause);
}

export function organicVariantHint(index: number, amount: number) {
  if (amount <= 0.3) return "";
  const hints = [
    "Let one short technical clause land with a tiny pause.",
    "Use a slightly more human readback rhythm while staying disciplined.",
    "Allow subtle breath control, but do not add breath sounds.",
    "Vary clause timing gently without changing the words."
  ];
  return hints[index % hints.length];
}

export function voiceOptionsForGroup(group: VoiceGroupFilter) {
  return builtInVoiceIds
    .map((id) => voiceRegistry[id])
    .filter((voice) => group === "all" || voice.group === group);
}
