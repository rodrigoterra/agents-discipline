// Voice Radio ALPHA — fixture data for the reference HTML.
window.VRP_ALPHA_FIXTURES = (() => {
  const session = {
    sessionId: "VRP-2026-05-13-01",
    mission: "Odyssey 2026-05",
    scene: "Approach burn",
    bpm: 120.0,
    user: "m.cabral",
  };

  const cast = {
    CAPCOM: { voiceId: "ash",   group: "masc", takesKept: "t3", auditioned: "0:24" },
    SHIP:   { voiceId: "coral", group: "fem",  takesKept: "t5", auditioned: "0:08" },
  };

  const voices = [
    { id: "alloy",  group: "neutral", blurb: "Even, broadcast-ready. Defaults to no accent." },
    { id: "ash",    group: "masc",    blurb: "Measured operator. Procedural delivery." },
    { id: "ballad", group: "masc",    blurb: "Slow + warm. Good for narration." },
    { id: "coral",  group: "fem",     blurb: "Bright spacecraft voice. Reads pt-BR well." },
    { id: "echo",   group: "neutral", blurb: "Compact, clipped. Mission-control feel." },
    { id: "sage",   group: "neutral", blurb: "Restrained, low energy. Backup-link timbre." },
    { id: "verse",  group: "fem",     blurb: "Lyrical, slightly expressive." },
  ];

  const utterances = [
    { id: "U1", speaker: "CAPCOM", voice: "ash",   text: "Odyssey, Houston. We have you go for approach burn.", level: 0.78, pan: -0.2, fxScene: "STORM '65",  durMs: 3400, processed: true,  stale: [] },
    { id: "U2", speaker: "SHIP",   voice: "coral", text: "Houston, Odyssey. Approach burn in three, two, one — mark.", level: 0.62, pan: 0.3,  fxScene: "LO-ORBIT", durMs: 3800, processed: true,  stale: [] },
    { id: "U3", speaker: "CAPCOM", voice: "ash",   text: "Copy mark. Telemetry nominal. You are clear to throttle.", level: 0.84, pan: -0.2, fxScene: "STORM '65", durMs: 3200, processed: true,  stale: [], active: true, solo: true },
    { id: "U4", speaker: "SHIP",   voice: "coral", text: "Throttling now. We see slight scintillation through the pass.", level: 0.55, pan: 0.3,  fxScene: "LO-ORBIT", durMs: 3900, processed: false, stale: ["voice", "env"] },
  ];

  const fxScenes = [
    { id: "ship_comm",     label: "SHIP COMM",            family: "stock" },
    { id: "earth_capcom",  label: "EARTH/CAPCOM CLEAN",   family: "stock" },
    { id: "deep_space",    label: "DEEP SPACE LOSSY",     family: "stock" },
    { id: "lunar_relay",   label: "LUNAR RELAY",          family: "stock" },
    { id: "emergency",     label: "EMERGENCY BAND",       family: "stock" },
    { id: "storm_65",      label: "USER · STORM '65",     family: "user"  },
    { id: "lo_orbit",      label: "USER · LO-ORBIT",      family: "user"  },
  ];

  const fxGroups = [
    { id: "quindar", title: "QUINDAR TONE PATH",       accent: "amber",  ctrlCount: 3, top: [["TEL LVL", 0.42], ["TONE MS", 250],  ["DRIVE", 0.18]] },
    { id: "voice",   title: "VOICE BAND + ENCODER",    accent: "copper", ctrlCount: 7, top: [["HP HZ", 320],   ["LP HZ", 2900],   ["BIT", 12]] },
    { id: "hiss",    title: "ORGANIC HISS BED",        accent: "green",  ctrlCount: 7, top: [["WHT", 0.18],    ["PNK", 0.32],     ["GATE", 0.62]] },
    { id: "scint",   title: "SCINTILLATION + PATH",    accent: "blue",   ctrlCount: 6, top: [["SCN DP", 0.42], ["SCN HZ", 1.8],   ["PHA MS", 6.0]] },
    { id: "granular",title: "GRANULAR CODEC FAILURE",  accent: "red",    ctrlCount: 8, top: [["DROP", 0.08],   ["JITTER", 0.21],  ["MOSH", 0.04]] },
  ];

  const env = {
    geometries: [
      "LEO Pass", "Trans-Lunar Inj.", "Midcourse Corr.", "Lunar Flyby",
      "Far-Side Occl.", "Low-Elev DSN", "High-Gain Misalign", "Emergency Low-Gain",
    ],
    weathers: [
      "Calm Link", "Solar Flare Onset", "CME Front", "Radiation Burst",
      "Plasma Bubble", "Lunar Far-Edge", "Blackout", "DSN Reacquire",
    ],
    selected: { geom: 3, weath: 2 }, // lunar flyby × CME front
    intensity: 0.62,
  };

  const resolvedMacros = [
    ["hpHz",            "320 Hz",  "+20"],
    ["lpHz",           "2900 Hz", "−100"],
    ["bitDepth",          "12",   null],
    ["downsample",      "1.5×",   "+0.5"],
    ["compression",     "0.42",   "+0.08"],
    ["drive",           "0.18",   null],
    ["noise",           "0.22",   "+0.10"],
    ["whiteNoise",      "0.18",   null],
    ["pinkNoise",       "0.32",   "+0.06"],
    ["brownNoise",      "0.04",   null],
    ["scintDepth",      "0.62",   "+0.20"],
    ["scintRate",        "1.8",   "+0.4"],
    ["phaseScintMs",     "8.0",   "+2.0"],
    ["reflectionMs",     "12",    null],
    ["dropoutProb",     "0.18",   "+0.10"],
    ["jitterAmount",    "0.21",   "+0.04"],
  ];

  const nasaRefs = [
    { id: "as11", slug: "AS11-LM-22-37-PTC", dur: "0:42", using: false },
    { id: "a13",  slug: "A13-OXYGEN-COMM-04", dur: "0:18", using: true  },
    { id: "a17",  slug: "A17-EVA3-SAM-02",    dur: "0:34", using: false },
  ];

  const spectroMeta = {
    utteranceId: "U3",
    speaker: "CAPCOM",
    voice: "ash",
    rawHash: "sha1:8f2a91c0…",
    processedHash: "sha1:c01e6b3a…",
    nasaSlug: "A13-OXYGEN-COMM-04",
    match: { spectral: 2.4, loudness: 3.1, score: 0.84 },
    fxScene: { role: "CAPCOM", profile: "ship_comm", fxSceneId: "storm_65", controlsHash: "sha1:5d7e2f…" },
    envSelection: { geometry: "lunar_flyby", weather: "cme_front", intensity: 0.62 },
    generatedAt: "2026-05-13T18:42:17Z",
  };

  return { session, cast, voices, utterances, fxScenes, fxGroups, env, resolvedMacros, nasaRefs, spectroMeta };
})();
