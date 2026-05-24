# ALPHA2 Narrative Instrument Flow

Note: this was the first ALPHA2 planning spec. The current canonical consolidated flow is `ALPHA2_CANONICAL_FLOW.md`.

## Purpose

ALPHA2 reframes Voice Radio as a narrative software, narrative art game, and digital instrument.

The app now has two linked lanes:

- **Narrative Flow**: creates the mission world, live/simulated signal context, flight state, antenna route, and story setup.
- **Audio Flow**: turns that setup into CAPCOM/SHIP dialogue, voice casting, FX/DSP rendering, optional analysis, and a final session package.

Nothing from ALPHA is discarded unless the new structure requires a replacement. Existing script generation, voice casting, FX/DSP, spectrograms, stitch/export, and Space sidecar work are carried forward.

## Branch Decision

Use a new structural branch:

`codex/alpha2-narrative-instrument-flow`

Base it from:

`claude/skyfield-termtrack`

Reason:

- It contains the ALPHA workflow clarity work.
- It contains the Space sidecar and live orbit surface, which now belongs inside the Narrative Flow.
- ALPHA2 is broader than a refactor of the audio lane.

## Product Model

The user is not only editing audio. The user is directing a mission situation and then producing its radio transmission.

Creative model:

```text
Mission world
-> Flight state
-> Communication route
-> Earth and space weather
-> Situation Card
-> Voice archetypes and dialogue
-> FX/DSP review
-> Rendered utterances
-> Optional spectrogram/reference analysis
-> Stitch/export session package
```

## Navigation Shape

Use grouped lanes in the left navigation.

Narrative lane:

- Mission Control
- Flight
- COMMS
- Weather, with Earth Weather and Space Weather internal pages

Audio lane:

- Voice
- Dialogue
- Radio FX
- Spectrogram
- Stitch / Export

The current `Space` page should be absorbed into or linked from `Flight`, not treated as an unrelated experiment.

## Core Data Objects

### Narrative Setup JSON

Mission Control creates a narrative setup, not final dialogue.

Contains:

- mission prompt
- scenario preset
- mission language
- intended utterance count
- speaker pattern
- selected mission phase
- selected reports
- flight state references
- COMMS route references
- Earth/weather/space-weather references

### Situation Card

The final output of the Narrative Flow.

Contains:

- mission phase
- story stakes
- Flight state summary
- COMMS route summary
- Earth/weather summary
- space-weather summary
- cited reports
- suggested dialogue intent
- suggested FX/DSP intent
- freshness signature

### Radio Dialogue JSON

Dialogue creates the actual CAPCOM/SHIP utterances.

Contains:

- utterance ids
- speaker
- channel
- language
- text
- style
- pronunciation hints
- optional per-utterance environment
- optional voice profile reference

### Character / Voice Archetype JSON

Voice casting before dialogue creates role archetypes.

Contains:

- role id, initially `CAPCOM` and `SHIP`
- personality prompt
- authority level
- stress level
- cadence intent
- accent/language texture
- clarity priority
- exact TTS voice candidate
- future image prompt JSON for character portrait generation

Pixel art / nano banana portraits are metadata in ALPHA2. The flow must work if no portrait is generated.

### Render Decision

Radio FX creates an explicit render decision for each role or utterance.

Priority:

```text
Utterance override
-> Role stack
-> Narrative draft
-> Default preset
```

Examples:

```text
CAPCOM: use narrative draft
SHIP: use edited role stack
u003: override with blackout preset
u004: override Quindar outro off
```

Stitch/export must never guess which recipe to use.

## Narrative Flow

### Step 1 - Mission Control

User sees:

- world map
- layer controls for earthquake, satellite tracks, day/night curve, DSN antennas, ionospheric storms, rain/storm clouds, typhoons, and radio blackout zones
- story creation area
- mission prompt text area
- preset story trigger buttons
- JSON generation and validation controls
- NASA report panel with live fetch and stored fallback
- Earth/ship relative-position preview from Flight
- antenna and radio-data previews from COMMS

User does:

- writes or revises the story trigger prompt
- generates the mission draft
- validates the mission setup
- reruns or edits the setup

System changes:

- creates Narrative Setup JSON
- marks Flight, COMMS, and Weather context as pending if not configured
- marks downstream dialogue/audio stale if setup changes later

Output:

- mission draft ready for Flight enrichment

Important correction:

Mission Control should not be the final source of utterance JSON. It creates the story/world setup that later feeds Dialogue generation.

### Step 2 - Flight

User sees:

- relative Earth/SHIP position
- orbit, Moon, and future planet-ready mission geometry
- modifiable SHIP telemetry: distance, speed, integrity, time since launch, reentry countdown, landing countdown
- terminal emulator / SHIP navigation system panel
- mission metrics and flight status bars
- landing or reentry site panels with coordinates and map previews
- preset flight situations and saved user presets

User does:

- sets orbit, speed, distance, Moon orbit, landing, or reentry state
- adjusts fake/modifiable telemetry
- chooses flight presets
- creates and saves custom flight presets

System changes:

- enriches Narrative Setup JSON with Flight state
- updates Situation Card draft
- emits consistency warnings when flight choices conflict with story state

Output:

- Flight state ready for COMMS

### Step 3 - COMMS

User sees:

- antenna choosing window
- world map with DSN stations and day/night state
- ground antenna cards
- SHIP antenna cards
- signal path diagram
- frequency, latency, bandwidth, power, blackout windows
- communication satellite orbit tracks
- preview warnings from current Weather/Space Weather state when available

User does:

- chooses CAPCOM ground antenna, such as Goldstone
- chooses SHIP antenna, such as Apollo-style high-gain antenna
- optionally chooses relay or laser communication route
- chooses, edits, and saves COMMS presets

System changes:

- sets signal path, latency, bandwidth, frequency, power, and route metadata
- creates role FX suggestions
- updates Situation Card draft

Output:

- communication route ready for Weather impact

### Step 4 - Weather, Split Internally Into Earth Weather And Space Weather

Weather remains one top-level nav tab, but the screen is split into two focused internal pages:

- **Earth Weather**: Earth Reference Map, ground corridor, DSN exposure, rain/storm clouds, typhoon-ready overlays, earthquakes, and ground-side chain parameters.
- **Space Weather**: Space Reference Map, solar flare, ionosphere, magnetic anomaly, satellite/route context, radio blackout windows, intensity/duration/envelope/scope, Narrative Signal Draft, and route-wide DSP parameters.

#### Step 4A - Earth Weather

User sees:

- Earth Weather page under the Weather nav tab
- Earth Reference Map opened by the Earth Weather page button
- ground corridor / DSN-region map
- DSN exposure
- rain/storm zones
- typhoon-ready layer
- earthquake layer
- day/night and ground station exposure context
- live or cached Earth weather report cards
- report cards for ground corridor, DSN exposure, rain/storms, typhoon-ready layer, earthquakes, and source status
- chain influence readouts for rain scatter, storm cover, earthquake state, and ground station exposure

User does:

- edits Earth weather description
- sets ground corridor
- sets Earth intensity
- sets storm/cloud cover
- sets rain scatter
- chooses earthquake state
- enables live mode
- chooses which Earth reports influence the mission

System changes:

- adds Earth Weather state to Narrative Setup JSON
- updates Situation Card with ground-side story pressure
- drafts ground-side FX intent: hiss floor, rain scatter, subtle reflections, station vulnerability
- marks downstream dialogue and audio stale when ground-side signal context changes

Output:

- Earth Weather context ready for Space Weather

#### Step 4B - Space Weather

User sees:

- Space Weather page under the Weather nav tab
- Space Reference Map opened by the Space Weather page button
- map with solar flares, ionospheric storms, magnetic anomalies, satellite/route context, and radio blackout zones
- live or stored NASA/NOAA-style report cards
- simulation presets for solar flare, blackout, calm link, DSN reacquisition, and other ALPHA environment events
- "live mode" where fetched reports create the situation
- event selector, intensity, duration, envelope, and apply scope
- Narrative Signal Draft / DSP influence preview
- report cards for solar flare, ionosphere, magnetic storm, blackout zones, intensity/duration/envelope/scope, Narrative Signal Draft, and affected DSP

User does:

- selects space-weather presets
- creates and saves custom presets
- enables live mode
- chooses which space reports influence the mission
- applies space weather only, applies full environment, or writes the weather pass across utterances

System changes:

- adds Space Weather state to Narrative Setup JSON
- updates suggested dialogue intent
- updates suggested FX/DSP intent
- marks downstream dialogue and audio stale when signal context changes

Output:

- final Situation Card for Audio Flow

## Live Data Source Policy

ALPHA2 should build adapter slots for all planned sources, but each adapter must fail gracefully.

Initial source categories:

- NASA space-weather reports
- NOAA SWPC reports
- INPE / Brazil space-weather source when exact accessible endpoint is confirmed
- rain and storm weather data
- earthquake data
- existing Space sidecar orbit data

Adapters should normalize into report cards:

```text
source
title
timestamp
severity
summary
link
suggested narrative influence
suggested FX/DSP influence
status: live / cached / offline / failed
```

No report fetch may block local authoring. If a live fetch fails, use stored sample/fallback report cards.

## Audio Flow

### Step 1 - Voice Archetypes / Casting Before Dialogue

User sees:

- available voice profiles
- voice generation parameters
- character card for each role
- future pixel-art portrait slot generated from character image prompt JSON
- personality prompt text area
- voice test area with preset or user-entered utterance text
- casting overview where voices are assigned to roles
- future-ready structure for roles beyond CAPCOM and SHIP

User does:

- tests voices
- changes voice parameters
- assigns voices or archetypes to roles
- tests text with selected voices
- edits personality by prompt

System changes:

- sets role archetypes
- sets voice setup
- generates test utterances
- stores character JSON

Output:

- role archetypes delivered to Dialogue

Rule:

This stage can change dialogue style, cadence, urgency, language texture, and role behavior. It should not change mission facts.

### Step 2 - Dialogue Generation + JSON Validation

User sees:

- radio/movie script interface, inspired by Final Draft or Celtx
- dialogue cards
- graphical dialogue tree
- future storyboard image slot for each dialogue line
- text input for each utterance
- save button
- regenerate controls
- JSON validation button

User does:

- generates script from Situation Card and voice archetypes
- edits utterance text
- regenerates individual utterances or alternatives
- gives new prompts per role/character
- validates Radio Dialogue JSON

System changes:

- creates CAPCOM/SHIP utterances
- validates Radio Dialogue JSON
- marks raw TTS and processed audio stale when dialogue changes

Output:

- validated dialogue delivered to Radio FX

### Step 3 - FX/DSP Review Rack

User sees:

- panel titled **Narrative Signal Draft**
- explanation of why the system proposed the sound
- CAPCOM stack
- SHIP stack
- scene/environment influence
- fine DSP parameters
- per-utterance overrides
- current status for each stack

Draft explanation example:

```text
Mission phase: Lunar reentry
Flight state: high speed, blackout risk
COMMS route: Goldstone DSN -> SHIP high-gain antenna
Earth weather: rain/storm near ground station
Space weather: solar flare warning
Suggested result: narrow bandwidth, higher hiss, intermittent packet loss, Quindar enabled
```

User does:

- uses Narrative Draft
- compares built-in and saved presets
- edits fine DSP
- saves adjusted recipes as presets
- sets role stack or per-utterance override decisions

System changes:

- creates render decisions for roles and utterances
- updates stale/current state for rendered audio
- stores why each utterance will sound the way it does

Output:

- ready for utterance rendering

### Step 4 - Utterance Rendering

User sees:

- status of each utterance being created
- play raw button
- play FX button
- play final utterance button
- stop button
- clear button
- regenerate text shortcut
- last-chance text editor
- flag to regenerate FX before final stitch

User does:

- reviews utterance text and audio
- clears or regenerates raw/processed output
- edits a line when needed
- processes utterances with selected render decisions

System changes:

- generates raw TTS
- generates processed FX audio
- marks processed status as current or stale

Output:

- rendered utterances ready for Stitch

Rule:

Regenerating text here should create a Dialogue revision for that utterance and mark audio stale. Rendering should not silently become a second script editor.

### Optional Step 5 - Spectrogram / Reference Comparison

This is optional and non-blocking.

User sees:

- raw TTS spectrogram
- processed FX spectrogram
- final stitched spectrogram
- NASA/reference spectrogram
- side-by-side and overlay modes
- notes from Narrative Signal Draft

User does:

- chooses utterance or final mix
- generates spectrograms
- compares raw versus processed
- compares processed audio versus NASA/reference audio
- flags results as good enough, too clean, too degraded, or needs rerender

System changes:

- stores spectrogram metadata in the session package when generated
- stores reference comparison notes
- may suggest FX changes, but does not auto-change rendered audio

Output:

- optional analysis metadata for Stitch/export

Rule:

The user can go directly from Utterance Rendering to Stitch/export. Spectrograms are a lab microscope, not a locked door.

### Step 6 - Stitch + Export Session Package

User sees:

- DAW-like timeline for audio clips
- silence gaps between clips
- distance-informed silence presets based on astronomical context
- manual silence override on the timeline
- play, stop, clear, and generate controls
- stem save button
- character relationship graph card with emotions, sentiments, and thoughts

User does:

- arranges clips
- adjusts silence and timing
- previews final sequence
- exports final mix
- saves stems when desired

System changes:

- generates final stitched audio
- exports utterance stems and processed clips
- stores narrative/audio metadata in the session package

Output:

- final ALPHA2 session package

## Session Package

The ALPHA2 export should contain:

- final WAV
- raw utterance audio
- processed utterance audio
- optional stems
- optional spectrograms
- Narrative Setup JSON
- Situation Card
- Radio Dialogue JSON
- Character / Voice Archetype JSON
- Render Decisions
- antenna choices
- flight state
- report snapshots or citations
- custom preset references
- timing/silence map

## Freshness Rules

The app should track stale state across the whole creative chain.

```text
Narrative changed -> Dialogue may be stale
Flight changed -> Situation Card and dialogue may be stale
COMMS changed -> FX draft and processed audio may be stale
Earth Weather changed -> Situation Card, dialogue intent, FX draft, and processed audio may be stale
Space Weather changed -> Situation Card, dialogue intent, FX draft, and processed audio may be stale
Voice archetype changed -> Dialogue style and raw TTS may be stale
Dialogue changed -> Raw TTS and processed audio are stale
Exact TTS voice changed -> Raw TTS and processed audio are stale
FX/DSP changed -> Processed audio is stale
Stitch timing changed -> Final export is stale
```

This is the main safety system for a flexible narrative instrument.

## Implementation Phases

### Phase 1 - Documentation And Data Contracts

- Add this ALPHA2 flow spec.
- Define TypeScript-only session and handoff types.
- Keep UI behavior unchanged except for safe labels/docs if needed.

### Phase 2 - Narrative State Skeleton

- Add local session state.
- Add Mission Control, Flight, COMMS, and Weather domain objects.
- Keep current Mission Console and Space screen working.
- Add local storage persistence.

### Phase 3 - Narrative Pages

- Split or add pages for Flight, COMMS, and Weather.
- Keep Weather as one nav tab, with Earth Weather and Space Weather internal pages.
- Move Space sidecar orbit display into Flight.
- Keep Mission Control as dashboard + story creation surface.

### Phase 4 - Audio Flow Reshape

- Add Dialogue page.
- Promote Voice page into Voice Archetypes + final casting.
- Convert current FX Lab into FX/DSP Review Rack.
- Add render decision model.
- Keep server-rendered audio path unchanged.

### Phase 5 - Session Export And Analysis

- Add session package metadata.
- Keep Spectrogram optional.
- Add stem/session export metadata.

## Validation

Run from `voice-radio-poc/`:

```bash
nvm use 22
npm install
npm run test
npm run build
npm run test:e2e
```

When the Space sidecar surface changes:

```bash
source venv/bin/activate
./scripts/run_sidecar.sh
node examples/node_client.mjs
```
