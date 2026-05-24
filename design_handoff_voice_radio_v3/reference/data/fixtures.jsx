// VRP v2 — extended fixtures including full DSP control table,
// voice presets with use-case blurbs, and saved FX profile names.
// Builds on the round-1 utterance set so visual continuity holds.

window.VRP_FIXTURES_V2 = {
  sceneBrief:
    "A nave Odyssey está em aproximação orbital. CAPCOM quer confirmar correção de atitude. A nave responde com leve ruído, concentração técnica e pequena latência.",

  utterances: [
    { id: "u1", n: 1, speaker: "CAPCOM", channel: "earth_capcom", lang: "PT-BR",
      text: "Odyssey, Houston. Confirm pitch correction nominal. Standing by.",
      durationMs: 3400, tone: "calm-procedural", urgency: 0.20, speed: 1.00,
      voice: "ash", quindar: { intro: true, outro: true }, processed: true, stitched: true,
      stale: false },
    { id: "u2", n: 2, speaker: "SHIP", channel: "ship_internal", lang: "PT-BR",
      text: "Houston, Odyssey. Pitch correction confirmed. Vector lock holding.",
      durationMs: 3900, tone: "focused-low", urgency: 0.35, speed: 0.95,
      voice: "coral", quindar: { intro: false, outro: false }, processed: true, stitched: true,
      stale: false },
    { id: "u3", n: 3, speaker: "CAPCOM", channel: "earth_capcom", lang: "PT-BR",
      text: "Copy, Odyssey. Telemetry shows good. Continue burn at T plus zero one zero.",
      durationMs: 4200, tone: "calm-procedural", urgency: 0.25, speed: 1.00,
      voice: "ash", quindar: { intro: true, outro: true }, processed: true, stitched: false,
      stale: true },
    { id: "u4", n: 4, speaker: "SHIP", channel: "ship_internal", lang: "PT-BR",
      text: "Roger, Houston. Burn at T plus one zero. Odyssey out.",
      durationMs: 2800, tone: "clipped", urgency: 0.45, speed: 1.05,
      voice: "coral", quindar: { intro: false, outro: false }, processed: false, stitched: false,
      stale: false },
  ],

  voices: [
    { id: "alloy",  group: "neutral",   blurb: "neutral · clear · default narration" },
    { id: "ash",    group: "masculine", blurb: "warm low · CAPCOM-classic · procedural" },
    { id: "ballad", group: "masculine", blurb: "lyrical · dramatic readings · narrator" },
    { id: "coral",  group: "feminine",  blurb: "bright · ship-bridge · technical reads" },
    { id: "echo",   group: "masculine", blurb: "broadcast-tight · shortwave-ready" },
    { id: "sage",   group: "feminine",  blurb: "soft mid · documentary tone" },
    { id: "verse",  group: "neutral",   blurb: "expressive · cinematic line reads" },
  ],

  voiceGroupFilters: ["all", "masculine", "feminine", "neutral-or-flex"],
  speakers: ["CAPCOM", "SHIP", "NARRATOR"],

  channelProfiles: [
    { id: "ship_comm",          label: "SHIP COMM",          family: "stock" },
    { id: "earth_capcom_clean", label: "EARTH/CAPCOM CLEAN", family: "stock" },
    { id: "deep_space_lossy",   label: "DEEP SPACE LOSSY",   family: "stock" },
    { id: "lunar_relay",        label: "LUNAR RELAY",        family: "stock" },
    { id: "emergency_band",     label: "EMERGENCY BAND",     family: "stock" },
    { id: "user_storm_1965",    label: "USER · STORM '65",   family: "user" },
    { id: "user_lo_orbit",      label: "USER · LO-ORBIT",    family: "user" },
  ],

  degradationModes: ["off", "subtle", "nominal", "severe", "collapse"],

  // Five DSP groups, exact label/range/abbreviated-name per handoff
  dspGroups: [
    { id: "quindar", title: "QUINDAR TONE PATH", controls: [
      { k: "telemetryLevel",  label: "TEL LVL", min: 0,   max: 1,   v: 0.42 },
      { k: "quindarToneMs",   label: "TONE MS", min: 80,  max: 600, v: 250  },
      { k: "quindarDrive",    label: "DRIVE",   min: 0,   max: 1,   v: 0.65 },
    ] },
    { id: "voiceband", title: "VOICE BAND + ENCODER", controls: [
      { k: "hpHz",       label: "HP HZ",  min: 120, max: 1200, v: 320 },
      { k: "lpHz",       label: "LP HZ",  min: 1200, max: 4800, v: 3400 },
      { k: "bitDepth",   label: "BIT",    min: 4,   max: 24,    v: 12 },
      { k: "downsample", label: "DOWN×",  min: 1,   max: 24,    v: 6 },
      { k: "compression",label: "COMP",   min: 0,   max: 1,     v: 0.55 },
      { k: "drive",      label: "DRIVE",  min: 0,   max: 1,     v: 0.40 },
      { k: "noise",      label: "NOISE",  min: 0,   max: 1,     v: 0.18 },
    ] },
    { id: "hiss", title: "ORGANIC HISS BED", controls: [
      { k: "whiteNoise",         label: "WHT",    min: 0, max: 1, v: 0.22 },
      { k: "pinkNoise",          label: "PNK",    min: 0, max: 1, v: 0.34 },
      { k: "brownNoise",         label: "BRN",    min: 0, max: 1, v: 0.12 },
      { k: "noiseLfoRate",       label: "LFO HZ", min: 0, max: 12, v: 1.6 },
      { k: "noiseLfoDepth",      label: "LFO DP", min: 0, max: 1, v: 0.30 },
      { k: "noiseGateThreshold", label: "GATE",   min: 0, max: 1, v: 0.14 },
      { k: "noiseGateDepth",     label: "G-DP",   min: 0, max: 1, v: 0.66 },
    ] },
    { id: "scint", title: "SCINTILLATION + PATH", controls: [
      { k: "scintillationDepth",   label: "SCN DP", min: 0, max: 1,   v: 0.42 },
      { k: "scintillationRate",    label: "SCN HZ", min: 0, max: 12,  v: 3.2 },
      { k: "phaseScintillationMs", label: "PHA MS", min: 0, max: 10,  v: 2.4 },
      { k: "reflectionDelayMs",    label: "RFL MS", min: 0, max: 120, v: 36 },
      { k: "reflectionMix",        label: "RFL MX", min: 0, max: 1,   v: 0.28 },
      { k: "pttClipMs",            label: "PTT MS", min: 0, max: 40,  v: 14 },
    ] },
    { id: "granular", title: "GRANULAR CODEC FAILURE", controls: [
      { k: "dropoutProbability", label: "DROP",   min: 0, max: 1,   v: 0.06 },
      { k: "packetLossDynamics", label: "P-LOSS", min: 0, max: 1,   v: 0.10 },
      { k: "repeatProbability",  label: "REPEAT", min: 0, max: 1,   v: 0.05 },
      { k: "jitterAmount",       label: "JITTER", min: 0, max: 1,   v: 0.18 },
      { k: "grainSizeMs",        label: "GRN MS", min: 5, max: 120, v: 40 },
      { k: "granularDensity",    label: "GRN DN", min: 0, max: 1,   v: 0.55 },
      { k: "plcStutter",         label: "PLC ST", min: 0, max: 1,   v: 0.12 },
      { k: "datamoshAmount",     label: "MOSH",   min: 0, max: 1,   v: 0.08 },
    ] },
  ],

  voiceSliders: [
    { k: "speed",        label: "SPEED",     min: 0.25, max: 4, v: 1.00 },
    { k: "intensity",    label: "INTENSITY", min: 0,    max: 1, v: 0.55 },
    { k: "organic",      label: "ORGANIC",   min: 0,    max: 1, v: 0.62 },
    { k: "clarity",      label: "CLARITY",   min: 0,    max: 1, v: 0.78 },
  ],

  presets: {
    cadence: ["measured", "snappy", "drawl", "telegraphic"],
    tone:    ["calm", "focused", "tense", "elated", "deadpan"],
    delivery:["procedural", "dramatic", "intimate", "broadcast"],
    pause:   ["even", "stuttered", "long-tail", "no-pause"],
  },

  pipeline: ["BRIEF", "GEN", "TTS", "FX", "STITCH", "EXPORT", "SPEC", "NASA"],

  spec: {
    sessionId: "VRP-2026-05-07-01",
    nasaSlug: "AS11-LM-22-37-PTC",
    nasaSource: "NASA-LM-22-37-pitch-trim.wav",
  },
};

// Backwards-compat: many components still reach for VRP_FIXTURES.
window.VRP_FIXTURES = window.VRP_FIXTURES || {
  sceneBrief: window.VRP_FIXTURES_V2.sceneBrief,
  utterances: window.VRP_FIXTURES_V2.utterances,
  presets: window.VRP_FIXTURES_V2.channelProfiles.map((p) => p.id),
  voices: window.VRP_FIXTURES_V2.voices.map((v) => ({ ...v, label: v.id })),
};
