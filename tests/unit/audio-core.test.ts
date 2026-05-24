import { describe, expect, it } from "vitest";
import {
  getProfileControls,
  missionGeometryDefinitions,
  profileDefinitions,
  resolveAudioPreset,
  resolveEnvironmentalAudioControls,
  resolveMissionGeometryControls,
  resolveSpaceWeatherControls,
  spaceWeatherEventDefinitions
} from "@voice-radio/audio-core";

describe("audio-core preset resolution", () => {
  it("increases degradation when quality is low", () => {
    const high = resolveAudioPreset({ signalQuality: 0.95, degradationMode: "off" });
    const low = resolveAudioPreset({ signalQuality: 0.2, degradationMode: "severe" });
    expect(low.bitDepth).toBeLessThan(high.bitDepth);
    expect(low.dropoutProbability).toBeGreaterThan(high.dropoutProbability);
  });

  it("enables quindar telemetry only when requested", () => {
    const a = resolveAudioPreset({ quindarMode: "off", telemetryStyle: "quindar" });
    const b = resolveAudioPreset({ quindarMode: "both", telemetryStyle: "quindar", quindarToneMs: 320, quindarDrive: 0.35 });
    expect(a.telemetry.introEnabled).toBe(false);
    expect(a.telemetry.outroEnabled).toBe(false);
    expect(b.telemetry.introEnabled).toBe(true);
    expect(b.telemetry.outroEnabled).toBe(true);
    expect(b.telemetry.introHz).toBe(2525);
    expect(b.telemetry.outroHz).toBe(2475);
    expect(b.telemetry.toneMs).toBe(320);
    expect(b.telemetry.drive).toBe(0.35);
  });

  it("includes PDF-derived Artemis radio profiles", () => {
    expect(profileDefinitions.apollo_heritage_clean.label).toBe("Apollo Heritage (Clean)");
    expect(profileDefinitions.throttled_s_band_lunar.controls.bitDepth).toBeLessThan(16);
    expect(profileDefinitions.ionospheric_storm_s4.controls.scintillationDepth).toBeGreaterThan(0.4);
    expect(profileDefinitions.codec_failure_datamosh.controls.datamoshAmount).toBeGreaterThan(0.7);
  });

  it("returns cloneable controls for custom profile editing", () => {
    const a = getProfileControls("ship_comm");
    const b = getProfileControls("ship_comm");
    a.noise = 0.99;
    expect(b.noise).not.toBe(0.99);
  });

  it("uses packet loss dynamics as a second degradation axis", () => {
    const calm = resolveAudioPreset({ channelProfile: "ship_comm", packetLossDynamics: 0, bitDepth: 14, downsample: 2, dropoutProbability: 0.03, datamoshAmount: 0.02 });
    const stressed = resolveAudioPreset({ channelProfile: "ship_comm", packetLossDynamics: 1, bitDepth: 14, downsample: 2, dropoutProbability: 0.03, datamoshAmount: 0.02 });
    expect(stressed.bitDepth).toBeLessThan(calm.bitDepth);
    expect(stressed.downsample).toBeGreaterThan(calm.downsample);
    expect(stressed.dropoutProbability).toBeGreaterThan(calm.dropoutProbability);
    expect(stressed.datamoshAmount).toBeGreaterThan(calm.datamoshAmount);
  });

  it("defines all mission geometry IDs", () => {
    expect(missionGeometryDefinitions.map((item) => item.id)).toEqual([
      "leo_pass",
      "trans_lunar_injection",
      "midcourse_correction",
      "lunar_flyby",
      "far_side_occlusion",
      "low_elevation_dsn",
      "high_gain_misalignment",
      "emergency_low_gain"
    ]);
  });

  it("defines all space weather event IDs", () => {
    expect(spaceWeatherEventDefinitions.map((item) => item.id)).toEqual([
      "calm_link",
      "solar_flare_onset",
      "cme_front_arrival",
      "radiation_burst",
      "plasma_bubble_pass",
      "lunar_far_side_edge",
      "blackout_window",
      "dsn_reacquisition"
    ]);
  });

  it("clamps mission geometry intensity", () => {
    const base = getProfileControls("ship_comm");
    const low = resolveMissionGeometryControls(base, { geometry: "high_gain_misalignment", intensity: -2, applyScope: "selected_utterance" });
    const high = resolveMissionGeometryControls(base, { geometry: "high_gain_misalignment", intensity: 4, applyScope: "selected_utterance" });
    expect(low.dropoutProbability).toBe(base.dropoutProbability);
    expect(high.dropoutProbability).toBeCloseTo(0.22);
  });

  it("clamps space weather intensity", () => {
    const base = getProfileControls("ship_comm");
    const low = resolveSpaceWeatherControls(base, { event: "solar_flare_onset", intensity: -1, durationMode: "short", envelope: "static", applyScope: "selected_utterance" });
    const high = resolveSpaceWeatherControls(base, { event: "solar_flare_onset", intensity: 2, durationMode: "short", envelope: "static", applyScope: "selected_utterance" });
    expect(low.whiteNoise).toBe(base.whiteNoise);
    expect(high.whiteNoise).toBeCloseTo(0.22);
  });

  it("keeps calm link from heavily degrading a clean profile", () => {
    const calm = resolveSpaceWeatherControls(getProfileControls("earth_capcom"), { event: "calm_link", intensity: 1, durationMode: "scene_wide", envelope: "static", applyScope: "scene_wide" });
    expect(calm.signalQuality).toBeGreaterThan(0.8);
    expect(calm.dropoutProbability).toBeLessThan(0.03);
  });

  it("makes blackout much more fragmented than calm link", () => {
    const base = getProfileControls("ship_comm");
    const calm = resolveSpaceWeatherControls(base, { event: "calm_link", intensity: 1, durationMode: "scene_wide", envelope: "static", applyScope: "scene_wide" });
    const blackout = resolveSpaceWeatherControls(base, { event: "blackout_window", intensity: 1, durationMode: "full_utterance", envelope: "collapse_then_recover", applyScope: "scene_wide" });
    expect(blackout.dropoutProbability).toBeGreaterThan(Number(calm.dropoutProbability) + 0.5);
    expect(blackout.granularDensity).toBeLessThan(Number(calm.granularDensity ?? 1));
  });

  it("makes high-gain misalignment pulse instability parameters", () => {
    const base = getProfileControls("ship_comm");
    const unstable = resolveMissionGeometryControls(base, { geometry: "high_gain_misalignment", intensity: 1, applyScope: "selected_utterance" });
    expect(unstable.noiseLfoDepth).toBeGreaterThan(base.noiseLfoDepth ?? 0);
    expect(unstable.scintillationDepth).toBeGreaterThan(base.scintillationDepth ?? 0);
    expect(unstable.dropoutProbability).toBeGreaterThan(base.dropoutProbability ?? 0);
  });

  it("makes emergency low gain narrower and lower quality", () => {
    const base = getProfileControls("ship_comm");
    const emergency = resolveMissionGeometryControls(base, { geometry: "emergency_low_gain", intensity: 1, applyScope: "selected_utterance" });
    expect(emergency.hpHz).toBeGreaterThan(base.hpHz ?? 0);
    expect(emergency.lpHz).toBeLessThan(base.lpHz ?? 9999);
    expect(emergency.bitDepth).toBeLessThan(base.bitDepth ?? 24);
    expect(emergency.signalQuality).toBeLessThan(base.signalQuality);
  });

  it("combines base profile, geometry, weather, then macro overrides", () => {
    const resolved = resolveEnvironmentalAudioControls({
      baseProfile: "ship_comm",
      missionGeometry: { geometry: "lunar_flyby", intensity: 1, applyScope: "scene_wide" },
      spaceWeather: { event: "solar_flare_onset", intensity: 1, durationMode: "full_utterance", envelope: "ramp_up", applyScope: "scene_wide" },
      macroOverrides: { noise: 0.01, channelProfile: "earth_capcom" }
    });
    expect(resolved.quindarMode).toBe("both");
    expect(resolved.whiteNoise).toBeCloseTo(0.22);
    expect(resolved.noise).toBe(0.01);
    expect(resolved.channelProfile).toBe("earth_capcom");
  });
});
