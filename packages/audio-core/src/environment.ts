import type { ChannelProfile, MacroControls } from "./index.js";
import type { MissionGeometryConfig } from "./missionGeometry.js";
import type { SpaceWeatherConfig } from "./spaceWeather.js";

export type EnvironmentalAudioConfig = {
  baseProfile: ChannelProfile;
  macroOverrides?: Partial<MacroControls>;
  missionGeometry?: MissionGeometryConfig;
  spaceWeather?: SpaceWeatherConfig;
};

export type MissionScenarioDefinition = {
  id: "clean_near_earth_capcom" | "lunar_flyby_under_solar_activity" | "far_side_loss_of_signal" | "dsn_low_elevation_recovery";
  label: string;
  description: string;
  baseProfile: ChannelProfile;
  missionGeometry: MissionGeometryConfig;
  spaceWeather: SpaceWeatherConfig;
  sonicPreviewText: string;
};

export const missionScenarioDefinitions: MissionScenarioDefinition[] = [
  {
    id: "clean_near_earth_capcom",
    label: "Clean Near-Earth CAPCOM",
    description: "Stable near-Earth mission-control link with low weather impact.",
    baseProfile: "earth_capcom",
    missionGeometry: { geometry: "leo_pass", intensity: 0.25, applyScope: "scene_wide" },
    spaceWeather: { event: "calm_link", intensity: 0.2, durationMode: "scene_wide", envelope: "static", applyScope: "scene_wide" },
    sonicPreviewText: "Clean voice-band CAPCOM with low hiss and strong intelligibility."
  },
  {
    id: "lunar_flyby_under_solar_activity",
    label: "Lunar Flyby Under Solar Activity",
    description: "Distant lunar pass with rising solar interference.",
    baseProfile: "throttled_s_band_lunar",
    missionGeometry: { geometry: "lunar_flyby", intensity: 0.65, applyScope: "scene_wide" },
    spaceWeather: { event: "solar_flare_onset", intensity: 0.7, durationMode: "full_utterance", envelope: "ramp_up", applyScope: "scene_wide" },
    sonicPreviewText: "Bandwidth-constrained lunar signal with growing hiss and packet stress."
  },
  {
    id: "far_side_loss_of_signal",
    label: "Far-Side Loss of Signal",
    description: "Lunar far-side occlusion with near-blackout behavior.",
    baseProfile: "deep_space_degraded",
    missionGeometry: { geometry: "far_side_occlusion", intensity: 0.82, applyScope: "scene_wide" },
    spaceWeather: { event: "blackout_window", intensity: 0.88, durationMode: "full_utterance", envelope: "collapse_then_recover", applyScope: "scene_wide" },
    sonicPreviewText: "Sparse fragments, heavy gaps, and collapsing link density."
  },
  {
    id: "dsn_low_elevation_recovery",
    label: "DSN Low Elevation Recovery",
    description: "Low elevation receiving geometry recovering after a disturbed interval.",
    baseProfile: "ionospheric_storm_s4",
    missionGeometry: { geometry: "low_elevation_dsn", intensity: 0.58, applyScope: "scene_wide" },
    spaceWeather: { event: "dsn_reacquisition", intensity: 0.55, durationMode: "full_utterance", envelope: "ramp_down", applyScope: "scene_wide" },
    sonicPreviewText: "Atmospheric rolling instability that resolves toward a readable link."
  }
];

export const missionScenarioById = Object.fromEntries(missionScenarioDefinitions.map((scenario) => [scenario.id, scenario])) as Record<MissionScenarioDefinition["id"], MissionScenarioDefinition>;
