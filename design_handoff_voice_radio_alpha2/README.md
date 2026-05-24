# Claude Design Handoff — Voice Radio ALPHA2

> Local mirror of `rodrigoterra/Chase-for-the-Multiverse@codex/alpha2-narrative-instrument-flow`
> Path on branch · `voice-radio-poc/design_handoff_voice_radio_alpha2/README.md`

## Purpose

This package briefs Claude Design on the ALPHA2 direction.

ALPHA2 reframes Voice Radio as:

- narrative software
- narrative art game
- digital instrument

The implementation source of truth is `../docs/alpha/ALPHA2_CANONICAL_FLOW.md`.
The existing visual-system reference remains `../design_handoff_voice_radio_v3/`.

ALPHA2 uses the v3 design language as the baseline, expanded for the new three-lane flow (Narrative · Audio · TOOLS).

## Current Implementation Update (preserve these)

- Radio FX has a **Fine DSP role-stack view**. CAPCOM and SHIP visible side by side; later one stack per story role.
- Active role stack is editable; inactive role stacks visible as preview/context.
- Stitch / Export has a **compact DAW timeline**: time ruler, CAPCOM lane, SHIP lane, QD/Quindar marker lane, FX/environment bed lane.
- Stitch shows a stale-reason legend and per-utterance A/B controls below the timeline.
- The old right-rail cards `Now Playing`, `Scene Brief`, `NASA Reference` are **not** reintroduced. ALPHA2 uses a lighter contextual rail: `Situation Card` and FX preset management.
- Keep the current ALPHA2 dark console / v3 aesthetic.

## ALPHA2 Screen Lanes

Narrative lane:

- Mission Control
- Flight
- COMMS
- Weather (one top-level nav · two internal pages: Earth Weather · Space Weather)

Audio lane:

- Voice
- Dialogue
- Radio FX (utterance rendering folded in here + Dialogue; no standalone Render screen)
- Spectrogram (optional)
- Stitch / Export

TOOLS lane (inspection, not production — does not feed the creative chain or session package):

- Seismograph
- Relative

The left navigation visually communicates the three lanes without making the app feel like three products; TOOLS reads as a distinct inspection group.

## Creative Chain

```
Mission world
-> Flight state
-> Communication route
-> Earth Weather reference map + reports
-> Space Weather reference map + Narrative Signal Draft
-> Situation Card
-> Voice archetypes and dialogue
-> FX/DSP review
-> Rendered utterances
-> Optional spectrogram/reference analysis
-> Stitch/export session package
```

## FX/DSP Review Rack

The FX Lab becomes the **FX/DSP Review Rack**.

Surfaces:

- **Narrative Signal Draft** — why the system suggested a sound (mission phase + flight + comms + earth weather + space weather → suggested sonic result)
- CAPCOM stack · SHIP stack
- Scene / environment influence
- Fine DSP parameters split by role stack
- Per-utterance overrides
- Stale / current render state

Actions:

- use Narrative Draft
- compare preset
- edit fine DSP
- save as preset
- set per-role or per-utterance render decisions

## Optional Spectrogram Rule

Optional analysis lane. Must not block Stitch / export.

## Future Portrait Slots

Voice archetype cards include a portrait slot with states: no prompt · prompt ready · generating · generated · unavailable. Flow must not depend on portraits existing.

## Suggested Deliverables (this iteration)

- [screens/01-mission-control.md](screens/01-mission-control.md)
- [screens/02-flight.md](screens/02-flight.md)
- [screens/03-comms.md](screens/03-comms.md)
- [screens/04-earth-space-weather.md](screens/04-earth-space-weather.md)
- [screens/05-voice.md](screens/05-voice.md)
- [screens/06-dialogue.md](screens/06-dialogue.md)
- [screens/07-radio-fx.md](screens/07-radio-fx.md)
- [screens/08-spectrogram.md](screens/08-spectrogram.md)
- [screens/09-stitch-export.md](screens/09-stitch-export.md)
- [screens/10-seismograph.md](screens/10-seismograph.md) — **new TOOLS-lane screen** (forked from the Seismograph proposal)
- [screens/11-relative.md](screens/11-relative.md) — **TOOLS-lane instrument deck** (3 reference-derived panels: Nostromo wireframe Earth + Voyager-style trajectory + HP Smith chart)
- [components.md](components.md)
- [interaction-states.md](interaction-states.md)
- [tokens-delta.md](tokens-delta.md)
- [reference/alpha2.html](reference/alpha2.html) — clickable canvas with all 11 artboards

Design references may be static Markdown, screenshots, HTML, or JSX prototypes. They remain handoff artifacts, not production app code.
