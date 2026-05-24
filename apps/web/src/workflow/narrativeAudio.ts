import type { MacroControls } from "@voice-radio/audio-core";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clampRange(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function resolveEarthWeatherMacroOverrides({
  intensity,
  rainScatter,
  stormCloudCoverPct,
  earthquakeStatus
}: {
  intensity: number;
  rainScatter: number;
  stormCloudCoverPct: number;
  earthquakeStatus?: string;
}): Partial<MacroControls> {
  const earthIntensity = clamp01(intensity);
  const rain = clamp01(rainScatter);
  const storm = clamp01(stormCloudCoverPct / 100);
  const earthquake = earthquakeStatus === "event" ? 1 : earthquakeStatus === "watch" ? 0.42 : 0;
  const weatherPressure = clamp01((earthIntensity * 0.35) + (rain * 0.35) + (storm * 0.2) + (earthquake * 0.1));

  return {
    noise: clampRange(0.018 + weatherPressure * 0.12, 0, 0.32),
    whiteNoise: clampRange(0.018 + rain * 0.18 + storm * 0.05, 0, 0.38),
    pinkNoise: clampRange(0.012 + storm * 0.12 + rain * 0.08, 0, 0.32),
    brownNoise: clampRange(0.006 + earthquake * 0.1 + storm * 0.04, 0, 0.24),
    reflectionMix: clampRange(rain * 0.18 + storm * 0.08, 0, 0.34),
    reflectionDelayMs: clampRange(12 + rain * 34 + storm * 24, 0, 120),
    jitterAmount: clampRange(rain * 0.1 + earthquake * 0.14 + storm * 0.08, 0, 0.42),
    packetLossDynamics: clampRange(storm * 0.16 + earthquake * 0.14, 0, 0.42),
    signalQuality: clampRange(0.88 - weatherPressure * 0.28, 0.2, 0.98)
  };
}

export function buildNarrativeGenerationBrief({
  sceneBrief,
  missionUtteranceCount,
  missionLanguage,
  speakerPatternLabel,
  flight,
  comms,
  earthWeather,
  spaceWeather,
  earthWeatherChainSummary,
  narrativeSignalReasons
}: {
  sceneBrief: string;
  missionUtteranceCount: number;
  missionLanguage: string;
  speakerPatternLabel: string;
  flight: {
    missionPhase: string;
    orbit: string;
    earthDistanceKm: number;
    moonDistanceKm: number;
    speedKms: number;
    integrityPct: number;
    timerMode: string;
    landingSite: string;
    reentrySite: string;
  };
  comms: {
    groundStation: string;
    shipAntenna: string;
    relayMode: string;
    frequencyMhz: number;
    latencyMs: number;
    bandwidthKhz: number;
    powerWatts: number;
    blackoutRisk: string;
  };
  earthWeather: {
    earthWeather: string;
    earthWeatherRegion?: string;
    stormCloudCoverPct?: number;
    rainScatter?: number;
    earthquakeStatus?: string;
  };
  spaceWeather: {
    spaceWeather: string;
    liveMode: boolean;
    cachedReport: string;
  };
  earthWeatherChainSummary: string[];
  narrativeSignalReasons: string[];
}) {
  const brief = sceneBrief.trim() || "Create a short mission-control radio exchange for a voice-radio proof of concept.";
  return [
    brief,
    "",
    `Mission setup: Generate exactly ${missionUtteranceCount} utterances.`,
    `Language: ${missionLanguage}.`,
    `Speaker pattern: ${speakerPatternLabel}.`,
    "Use speaker labels CAPCOM and SHIP only unless the prompt explicitly says otherwise.",
    "Keep each utterance concise enough for radio-style processing and later stitching.",
    "",
    "Narrative situation facts to respect:",
    `- Flight: ${flight.missionPhase}; orbit ${flight.orbit}; speed ${flight.speedKms.toFixed(1)} km/s; Earth distance ${Math.round(flight.earthDistanceKm)} km; Moon distance ${Math.round(flight.moonDistanceKm)} km; integrity ${flight.integrityPct}%; timer ${flight.timerMode}.`,
    `- Landing/reentry references: landing ${flight.landingSite}; reentry ${flight.reentrySite}.`,
    `- COMMS: ${comms.groundStation} -> ${comms.shipAntenna}; ${comms.relayMode}; ${comms.frequencyMhz.toFixed(1)} MHz; latency ${comms.latencyMs} ms; bandwidth ${comms.bandwidthKhz} kHz; power ${comms.powerWatts} W; blackout risk ${comms.blackoutRisk}.`,
    `- Earth Weather: ${earthWeather.earthWeather}; corridor ${earthWeather.earthWeatherRegion || "not set"}; rain scatter ${(earthWeather.rainScatter ?? 0).toFixed(2)}; storm cover ${earthWeather.stormCloudCoverPct ?? 0}%; earthquake ${earthWeather.earthquakeStatus || "none"}.`,
    `- Space Weather: ${spaceWeather.spaceWeather}; source ${spaceWeather.liveMode ? "live mode requested" : "cached/offline"}; report ${spaceWeather.cachedReport}.`,
    "",
    "Earth-side signal notes:",
    ...earthWeatherChainSummary.map((reason) => `- ${reason}`),
    "",
    "Narrative Signal Draft:",
    ...narrativeSignalReasons.map((reason) => `- ${reason}`)
  ].join("\n");
}
