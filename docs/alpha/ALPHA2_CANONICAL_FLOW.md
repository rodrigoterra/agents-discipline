# ALPHA2 Canonical Flow

Status: canonical ALPHA2 flow until superseded.

Amended 2026-05-24 (see `ALPHA2_IMPLEMENTATION_PLAN.md` decision log): a third **TOOLS** inspection lane was added (Seismograph, Relative), and utterance rendering was folded into Radio FX + Dialogue (the standalone Render step is retired — see the Rendering note below).

Voice Radio ALPHA2 is a narrative software, narrative art game, and digital instrument. The user first directs a mission situation, then produces the radio transmission that belongs to that situation.

## Product Shape

There are three lanes — two linked production lanes plus an inspection lane:

- **Narrative Flow**: Mission Control, Flight, COMMS, Weather.
- **Audio Flow**: Voice, Dialogue, Radio FX, optional Spectrogram, Stitch / Export. (Utterance rendering is folded into Radio FX + Dialogue — there is no standalone Render screen.)
- **TOOLS** (inspection, not production): Seismograph, Relative. These read external/reference data for situational awareness; they do **not** feed the creative chain or the session package.

Creative chain:

```text
Mission world
-> Flight state
-> Communication route
-> Earth Weather
-> Space Weather
-> Situation Card
-> Voice archetypes
-> Dialogue
-> FX/DSP review
-> Rendered utterances
-> Optional spectrogram/reference analysis
-> Stitch/export session package
```

## Navigation Rule

The left navigation keeps one `Weather` tab. Inside that tab, Weather has two focused pages:

- **Earth Weather**: ground-side maps and report parameters.
- **Space Weather**: solar, ionosphere, magnetic, and radio-blackout parameters.

This keeps the user from feeling the app has too many top-level tabs while making the two kinds of weather legible.

When the user presses either internal Weather button, the page must show a reference map plus report cards for that weather domain. Earth Weather should not show Space Weather data as its main surface, and Space Weather should not bury the Narrative Signal Draft.

## Narrative Flow

### 1. Mission Control

Purpose:

Creates the story/world setup, not final utterance dialogue.

User sees:

- world map and narrative layer controls
- story prompt area
- Narrative Setup JSON generation and validation
- preset story triggers
- NASA/live/cached report preview
- Flight, COMMS, Earth Weather, and Space Weather summaries

User does:

- writes or revises the mission prompt
- generates the narrative setup
- validates or edits the setup
- chooses preset situations for quick testing

System changes:

- creates Narrative Setup JSON
- marks downstream setup pieces pending when not configured
- marks Dialogue and Audio stale when mission facts change

Output:

- mission draft ready for Flight enrichment

### 2. Flight

Purpose:

Defines where the ship is and what mission phase the story is in.

User sees:

- Earth/SHIP/Moon relative position
- orbit and future planet-ready mission geometry
- modifiable telemetry: distance, speed, integrity, launch/reentry/landing timers
- terminal/navigation panel
- landing and reentry map/image slots
- sidecar-backed orbit surface or offline fallback

User does:

- sets orbit, speed, distance, landing, reentry, and mission phase
- adjusts fake/modifiable telemetry
- chooses or saves flight presets

System changes:

- enriches Narrative Setup JSON with Flight state
- updates Situation Card draft
- emits consistency warnings when story and flight choices conflict

Output:

- flight state ready for COMMS

### 3. COMMS

Purpose:

Defines the radio route that shapes story timing and audio damage.

User sees:

- DSN / antenna map
- ground antenna cards
- SHIP antenna cards
- relay / laser / direct route options
- signal path diagram
- frequency, latency, bandwidth, power, and blackout risk controls

User does:

- chooses CAPCOM ground station
- chooses SHIP antenna
- chooses route / relay mode
- edits signal parameters
- saves COMMS presets

System changes:

- sets route, latency, bandwidth, frequency, power, and blackout metadata
- creates early role FX suggestions
- updates Situation Card draft

Output:

- communication route ready for Weather

### 4A. Earth Weather

Purpose:

Defines ground-side weather and disruption around the selected Earth corridor or ground station.

User sees:

- Earth Weather page under the Weather nav tab
- Earth Reference Map
- ground corridor / DSN-region map
- DSN exposure
- rain and storm cloud overlays
- typhoon-ready layer
- earthquake layer
- day/night and ground station exposure context
- Earth weather report cards and cached fallback text
- reports for ground corridor, DSN exposure, rain/storms, typhoon-ready layer, earthquakes, and source status
- chain-influence readouts: rain scatter, storm cover, earthquake state, ground station exposure

User does:

- edits Earth weather description
- sets ground corridor
- sets Earth intensity
- sets storm/cloud cover
- sets rain scatter
- chooses earthquake state
- toggles live/cached mode
- continues to Space Weather or sends the current Earth context to Radio FX draft

System changes:

- updates Earth Weather state in Narrative Setup JSON
- updates Situation Card with ground-side story pressure
- drafts ground-side FX intent: hiss floor, rain scatter, subtle reflections, station vulnerability
- can mark Dialogue and processed audio stale when the ground-side situation changes

Output:

- Earth Weather context ready for Space Weather

### 4B. Space Weather

Purpose:

Defines solar, ionosphere, magnetic, and blackout conditions that affect the route through space.

User sees:

- Space Weather page under the Weather nav tab
- Space Reference Map
- solar flare, ionosphere, magnetic anomaly, satellite route, and blackout-zone map
- live/cached source status
- event selector
- intensity
- duration
- envelope
- apply scope
- base radio profile
- Narrative Signal Draft preview
- reports for solar flare, ionosphere, magnetic storm, blackout zones, intensity/duration/envelope/scope, Narrative Signal Draft, and affected DSP

User does:

- chooses a space weather event
- adjusts intensity, duration, envelope, and scope
- applies space weather only
- applies full environment
- writes the weather pass across utterances
- sends the final draft to Radio FX

System changes:

- updates Space Weather state in Narrative Setup JSON
- resolves environment audio controls
- updates suggested dialogue intent
- updates suggested FX/DSP intent
- can mark FX draft, rendered clips, and Dialogue stale

Output:

- final Situation Card for the Audio Flow

## Audio Flow

### 1. Voice Archetypes

Purpose:

Casts voices and role personalities before final dialogue.

User sees:

- voice profile list
- voice generation parameters
- role archetype cards
- future pixel-art portrait slots
- personality prompt area
- audition/test utterance area
- role assignment overview

User does:

- tests voices
- edits parameters and personality prompts
- assigns voices to roles
- auditions lines

System changes:

- stores role archetype / character JSON
- stores selected TTS voice candidates
- can stale Dialogue style and raw TTS when voice setup changes

Output:

- role archetypes delivered to Dialogue

### 2. Dialogue

Purpose:

Generates, edits, and validates Radio Dialogue JSON.

User sees:

- radio/movie script interface
- dialogue cards
- graphical dialogue tree
- per-line text editor
- validation controls
- future storyboard image slot per line

User does:

- generates dialogue from the Situation Card and voice archetypes
- edits utterance text
- regenerates lines
- validates JSON

System changes:

- creates CAPCOM/SHIP utterances
- validates Radio Dialogue JSON
- keeps the last valid script visible while the raw JSON textarea is temporarily invalid
- marks raw TTS and processed audio stale when dialogue changes

Output:

- validated dialogue delivered to Radio FX and Render

### 3. Radio FX / DSP Review Rack

Purpose:

Turns narrative signal logic into explicit sound decisions.

User sees:

- Narrative Signal Draft
- why the sound was proposed
- CAPCOM stack
- SHIP stack
- Fine DSP role-stack page
- environment influence
- preset compare/save controls
- stale/current render state

Current Fine DSP rule:

- one visible stack per role
- current roles are CAPCOM and SHIP
- later roles should render dynamically
- active stack is editable
- inactive stacks stay visible as locked preview/context

User does:

- uses Narrative Draft
- compares presets
- focuses a role stack
- edits fine DSP
- saves role/channel/degradation presets
- sets role stack or per-utterance override decisions

System changes:

- creates render decisions for roles and utterances
- resolves the actual processing source from the render decision, not from a display label
- updates stale/current state
- stores `[V][E][C][S]` stale reasons from the processing signature
- stores why each utterance sounds the way it does

Output:

- ready for utterance rendering

### 4. Rendering (folded into Radio FX + Dialogue — no standalone screen)

As of 2026-05-24 there is no separate Render screen. The render surface lives in two places, with a strict division of labour to avoid a "second script editor":

- **Dialogue** owns the *text*. Editing/regenerating an utterance creates a new dialogue revision and marks its raw TTS + processed audio **stale**. Dialogue does NOT process audio.
- **Radio FX "Process"** owns the *sound*. It generates raw TTS and processes it through the committed render decision (Utterance override → Role stack → Narrative draft → Default), but it must NOT edit utterance text.

Render state still exists and behaves as before:

- utterance status, raw clip state, FX clip state, render decision mode
- play dry / play FX, clear and regenerate controls
- stores raw TTS audio, processed FX audio, and processing signatures (the signature includes render-decision mode, preset id, environment, and narrative context when using Narrative Draft)
- marks processed clips current or stale

Output:

- rendered utterances ready for optional analysis or Stitch

### Optional 5. Spectrogram

Purpose:

Provides non-blocking visual audio analysis.

User sees:

- raw TTS spectrogram
- processed FX spectrogram
- final stitched spectrogram
- NASA/reference spectrogram
- side-by-side and overlay modes

User does:

- generates spectrograms
- compares raw, processed, final, and reference audio
- decides whether the result is good enough or needs rerender

System changes:

- stores optional analysis metadata
- may suggest FX changes but does not auto-change rendered audio

Rule:

Spectrogram is optional. It never blocks Stitch/export.

### 6. Stitch / Export

Purpose:

Final DAW-like assembly and session package export.

User sees:

- time ruler
- CAPCOM lane
- SHIP lane
- QD / Quindar marker lane
- FX/environment bed lane
- rendered clips
- stale badges/reasons
- silence controls
- per-utterance A/B dry vs FX list
- character relationship graph
- stem and final export actions

User does:

- arranges timing and silence
- previews final sequence
- re-renders stale clips when needed
- exports final mix
- saves stems/session package

System changes:

- blocks export until every utterance has current processed audio
- generates final stitched audio only from current utterance FX clips in script order
- stores stems and package metadata
- preserves narrative, voice, dialogue, render, weather, comms, and timing metadata

Output:

- final ALPHA2 session package

## TOOLS Lane (inspection)

The TOOLS lane is a separate, visually distinct group of read-only instruments. It exists for situational awareness while directing a mission; it is **not** part of the creative chain. Nothing in TOOLS writes Narrative Setup JSON, Render Decisions, the Situation Card, or the session package, and TOOLS screens share no state with the Narrative/Audio lanes.

### Seismograph

Purpose: live/near-real-time earthquake feed (USGS) as an ambient situational instrument. Backed by the USGS adapter (routed through the sidecar / a Node proxy, not a direct browser fetch). Reuses the map decomposition + earthquake layer.

### Relative

Purpose: an "Earth ↔ ship" relative-position instrument deck — three reference-derived panels (Mission Trajectory globe, Deorbital Descent wireframe Earth, Smith reflection chart) on one canvas. Read-only; header actions (Recalibrate / DEEPNAV PRECISE / Snapshot) are future affordances and do not wire to backend state. Its waypoint pick is local and independent of Flight.

## Data Objects

- Narrative Setup JSON
- Situation Card
- Earth Weather state
- Space Weather state
- Radio Dialogue JSON
- Character / Voice Archetype JSON
- Render Decisions
- Session Package metadata

## Freshness Rules

```text
Narrative changed -> Dialogue may be stale
Flight changed -> Situation Card and Dialogue may be stale
COMMS changed -> FX draft and processed audio may be stale
Earth Weather changed -> Situation Card, dialogue intent, FX draft, and processed audio may be stale
Space Weather changed -> Situation Card, dialogue intent, FX draft, and processed audio may be stale
Voice archetype changed -> Dialogue style and raw TTS may be stale
Dialogue changed -> Raw TTS and processed audio are stale
Exact TTS voice changed -> Raw TTS and processed audio are stale
FX/DSP changed -> Processed audio is stale
Render decision changed -> Processed audio is stale
Stitch timing changed -> Final export is stale
```

Stale reason chips:

```text
V -> voice, raw source, or utterance text changed
E -> environment or Narrative Draft context changed
C -> CAPCOM stack/render decision changed
S -> SHIP stack/render decision changed
```

## Session Package

The export should contain:

- final WAV
- raw utterance audio
- processed utterance audio
- optional stems
- optional spectrograms
- Narrative Setup JSON
- Situation Card
- Earth Weather state/report snapshots
- Space Weather state/report snapshots
- Radio Dialogue JSON
- Character / Voice Archetype JSON
- Render Decisions
- COMMS route
- Flight state
- custom preset references
- timing/silence map

## Validation Commands

Run from `voice-radio-poc/`:

```bash
npm run test
npm run build
git diff --check
```
