# Screen 05 — Voice

> 音声 · voice archetypes, casting, audition, portrait slots

The audio-lane entry point. Two role lanes (CAPCOM / SHIP) sit side-by-side with a shared voice catalog on the left. Each role card carries a future portrait slot, a personality prompt, parameter readouts, and an audition wave.

`<AShell2 active="voice">`.

## Header

```
<GlyphSigil voice> · h1 "Voice" + jp "音声 ・ おんせい"
                   + Tag(amber, filled) "pt-BR"
                   + Tag(muted)         "CAPCOM ↔ SHIP"

sub: "archetypes · casting · audition · portrait slots"
actions: Btn "Audition all" + Btn(primary) "Generate batch"
```

## Three-column body (260px / 1fr / 1fr)

### Column 1 — Voice catalog

`<VoiceCatalog>` — read-only list bound to `VRP_ALPHA_FIXTURES.voices`.

Each row: voice id (HaxrCorp4089) · group tag (masc=blue, fem=amber, neutral=muted) · blurb. Currently-cast voices (`ash`, `coral`) get a copper left-border accent and panel-lo background.

Cursor is `grab` — voices are drag sources into the role lanes (drop not implemented in canvas; visual affordance only).

### Columns 2 & 3 — Role archetype cards

`<RoleArchetype role="CAPCOM" voice="ash">` and `<RoleArchetype role="SHIP" voice="coral">`.

Each card:

1. **Top accent bar** (4 px CAPCOM amber / SHIP green).
2. **Portrait slot** (110 px tall) — dashed-border placeholder containing the role's portal sigil (`window.ALPHA2_GLYPHS.capcom|ship`) drawn in monospace + caption "portrait · no prompt yet". States: `no prompt | prompt ready | generating | generated | unavailable` per ALPHA2 README.
3. **4 readouts** (2-col grid): VOICE (color = role) · LANG (pt-BR) · TAKES (kept t3/t5) · AUDITION (duration).
4. **Personality prompt** — `<textarea>` with role-specific default copy. CAPCOM: "Calm operator. Procedural delivery. Earth-side authority. Reads pt-BR. Holds composure under telemetry stress." SHIP: "Bright spacecraft voice. Slight breath. Reports clearly under scintillation. Reads pt-BR with light Brazilian accent."
5. **Audition block** — panel-lo box: small label + `<AWave>` colored by role + 3 buttons (Dry · FX primary · ↻ Re-take).

## Header CAST badge

Both role cards display a `<ATag color={amber|green} filled>CAST</ATag>` in the card-action slot to confirm assignment.

## State

| key | shape | source |
|---|---|---|
| `voices` | catalog | `VRP_ALPHA_FIXTURES.voices` |
| `roleVoice.CAPCOM` | `"ash"` | hard-coded for the canvas |
| `roleVoice.SHIP`   | `"coral"` | hard-coded for the canvas |
| `prompts.{role}` | string | local `defaultValue` (textarea) |

## Rules

- Voices are cast **per role**, never per utterance. Per-utterance overrides live on Dialogue (06) and Radio FX (07).
- Changing CAPCOM voice marks every CAPCOM-speaker utterance stale with reason `[V]`. Same for SHIP.
- Portrait slot waits on a prompt → JSON → pixel-art pipeline that lives outside this design. The slot must render in all 5 states without breaking layout.
- The personality prompt is the input to the TTS instruction layer — it doesn't change voice id, it shapes delivery.
