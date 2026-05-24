# ALPHA2 Screen Inventory

> Local mirror of `rodrigoterra/Chase-for-the-Multiverse@codex/alpha2-narrative-instrument-flow`

## Mission Control

Dashboard plus story creation console.

Must show:
- world map with layer controls
- story prompt area
- Narrative Setup JSON generation and validation
- preset story triggers
- report preview / fallback status
- Flight, COMMS, and Weather summaries

Rule: downstream panels appear pending until configured. Do not pretend final dialogue exists before Dialogue generation.

## Flight

Mission-control view of spacecraft position, telemetry, mission phase, and navigation state.

Must show:
- Earth/SHIP relative position
- orbit and Moon-ready geometry · future planet-ready structure
- modifiable telemetry
- launch / landing / reentry timers
- SHIP integrity metrics
- terminal emulator or navigation system panel
- saved flight presets
- Space sidecar orbit view or clear link to it

## COMMS

Select the communication route that shapes story and radio FX.

Must show:
- DSN / ground antenna map
- ground antenna cards
- SHIP antenna cards
- signal path diagram
- frequency, latency, bandwidth, power
- blackout window previews
- relay or laser comm options
- saved COMMS presets

## Weather

One left-nav tab, two internal pages.

### Earth Weather

Ground-side conditions around the selected corridor or ground station.

- Earth Reference Map opened by the Earth Weather page button
- ground corridor reference · DSN exposure reference
- rain / storm zones · typhoon-ready layer · earthquakes
- live or cached report cards
- ground corridor, DSN exposure, rain/storms, typhoon-ready, earthquakes, source status
- simulation presets · live mode state

### Space Weather

Solar, ionosphere, magnetic, blackout conditions affecting the space route.

- Space Reference Map opened by the Space Weather page button
- solar flares · ionospheric storms · magnetic anomalies · radio blackout zones
- satellite / route context
- live or cached report cards
- event, intensity, duration, envelope, scope
- Narrative Signal Draft / DSP influence preview
- report cards: solar flare, ionosphere, magnetic storm, blackout zones, intensity/duration/envelope/scope, Narrative Signal Draft, affected DSP

## Voice

Voice archetypes and final voice casting.

- voice profile list · generation parameters · role archetype cards
- future pixel-art portrait slots
- personality prompt text area · audition / test utterance area
- role assignment overview

## Dialogue

Generate, edit, validate, revise Radio Dialogue JSON.

- radio / movie script interface
- dialogue cards · graphical dialogue tree
- per-line text editor · regenerate line controls · validation controls
- future storyboard image slot per line

## Radio FX

FX / DSP Review Rack.

- Narrative Signal Draft · why the sound was suggested
- CAPCOM stack · SHIP stack
- environment influence · fine DSP modules
- per-utterance overrides · preset compare · save preset
- stale / current render state

Role-stack contract:
- one visible stack per role
- current roles: CAPCOM, SHIP
- future roles: render dynamically from story/casting roles
- active stack: editable controls, focused border/glow, EDITING status
- inactive stack: visible context, locked controls, VIEW status
- each stack keeps role assignment state: live rack vs assigned recipe
- each stack shows whether a processed role cue exists
- role colors: CAPCOM amber · SHIP green

Fine DSP module groups:
- Quindar Tone Path
- Voice Band + Encoder
- Organic Hiss Bed
- Scintillation + Path
- Granular Codec Failure

Design warning: do not collapse Fine DSP back into one generic rack.

## Spectrogram

Optional analysis and reference comparison.

- raw TTS · processed FX · final stitched · NASA reference spectrogram
- side-by-side · overlay · comparison notes

Rule: never required before export.

## Stitch / Export

Final DAW-like assembly and session package export.

- timeline lanes · rendered utterance clips · silence gaps
- distance-informed silence presets · manual timing overrides
- play / stop / clear / generate controls
- stem save / export controls
- character relationship graph card
- session package contents

DAW timeline contract:
- full-width timeline region inside the Stitch card
- time ruler at 0s, 2s, 4s, etc.
- CAPCOM lane · SHIP lane · QD lane (Quindar intro/outro) · FX lane (scene/environment bed)
- clips positioned by start / duration estimate
- clip state on clip: ready, stale, or needs render
- stale reason legend above the timeline
- per-utterance A/B list below the DAW strip

## Right Rail Policy

ALPHA2 does **not** restore: Now Playing, Scene Brief, NASA Reference.
Use: Situation Card · contextual FX preset management.
