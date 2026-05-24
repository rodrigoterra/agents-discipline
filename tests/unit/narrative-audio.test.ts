import { describe, expect, it } from "vitest";
import { buildNarrativeGenerationBrief, resolveEarthWeatherMacroOverrides } from "../../apps/web/src/workflow/narrativeAudio";

describe("narrative audio handoff", () => {
  it("turns Earth weather into macro overrides for the audio draft", () => {
    const calm = resolveEarthWeatherMacroOverrides({ intensity: 0.1, rainScatter: 0.05, stormCloudCoverPct: 5, earthquakeStatus: "none" });
    const storm = resolveEarthWeatherMacroOverrides({ intensity: 0.8, rainScatter: 0.75, stormCloudCoverPct: 88, earthquakeStatus: "event" });

    expect(storm.noise).toBeGreaterThan(calm.noise || 0);
    expect(storm.reflectionMix).toBeGreaterThan(calm.reflectionMix || 0);
    expect(storm.jitterAmount).toBeGreaterThan(calm.jitterAmount || 0);
    expect(storm.signalQuality).toBeLessThan(calm.signalQuality || 1);
  });

  it("includes Flight, COMMS, Earth Weather, and Space Weather in script generation brief", () => {
    const brief = buildNarrativeGenerationBrief({
      sceneBrief: "A lunar reentry call.",
      missionUtteranceCount: 4,
      missionLanguage: "pt-BR",
      speakerPatternLabel: "CAPCOM ↔ SHIP",
      flight: {
        missionPhase: "Lunar reentry",
        orbit: "return corridor",
        earthDistanceKm: 120000,
        moonDistanceKm: 220000,
        speedKms: 10.8,
        integrityPct: 82,
        timerMode: "reentry",
        landingSite: "Pacific recovery",
        reentrySite: "South Pacific"
      },
      comms: {
        groundStation: "Goldstone DSN",
        shipAntenna: "High-gain antenna",
        relayMode: "direct S-band",
        frequencyMhz: 2287.5,
        latencyMs: 2100,
        bandwidthKhz: 2.4,
        powerWatts: 18,
        blackoutRisk: "high"
      },
      earthWeather: {
        earthWeather: "Storm cells near ground station",
        earthWeatherRegion: "Goldstone corridor",
        rainScatter: 0.66,
        stormCloudCoverPct: 72,
        earthquakeStatus: "watch"
      },
      spaceWeather: {
        spaceWeather: "Solar flare warning",
        liveMode: false,
        cachedReport: "Cached NASA report"
      },
      earthWeatherChainSummary: ["Rain scatter affects hiss."],
      narrativeSignalReasons: ["Suggested result: narrow bandwidth."]
    });

    expect(brief).toContain("Flight: Lunar reentry");
    expect(brief).toContain("COMMS: Goldstone DSN -> High-gain antenna");
    expect(brief).toContain("Earth Weather: Storm cells near ground station");
    expect(brief).toContain("Space Weather: Solar flare warning");
    expect(brief).toContain("Suggested result: narrow bandwidth.");
  });
});
