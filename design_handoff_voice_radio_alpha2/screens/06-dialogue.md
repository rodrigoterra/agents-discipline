# Screen 06 — Dialogue

> 対話 · radio script · cards · tree · per-line regenerate

Dialogue is the bridge between casting and rendering. Operators write the script in a movie-style transcript, edit one card at a time, and traverse the conversation as a graphical tree. JSON validation, per-line regeneration, and future per-line storyboard slots all live here.

`<AShell2 active="dialogue">`.

## Header

```
<GlyphSigil dialogue> · h1 "Dialogue" + jp "対話 ・ たいわ"
                      + Tag(copper, filled) "4 utt"
                      + Tag(green, filled)  "valid"

sub: "radio script · cards · tree · per-line regenerate"
actions: Btn "Validate JSON" + Btn(primary) "Regenerate all"
```

## Three-column body (1.2fr / 1fr / 1fr)

### Column 1 — Script

`<DialogueScript>` — full-bleed code-style block on `#020308`.

Format per utterance:

```
SPEAKER (voice) · ID · 3.2s   [stale chip if needed]
"text body"
```

CAPCOM speakers render their pill in `--capcom` (amber); SHIP in `--ship` (green). The selected utterance (`U3` by default) gets a copper left border + panel-lo background. Click any utterance to set it as `selected` — cascades to Card editor (col 2) and Tree (col 3).

Header strip: `FADE IN · APPROACH BURN · SCENE 03` / footer: `FADE OUT · END SCENE`.

### Column 2 — Card · {selected}

`<DialogueCardEditor>` — `<ACard>` keyed by `selected` so `<textarea defaultValue>` resets on selection change.

Body:

- `<textarea>` bound to utterance text (defaultValue · uncontrolled).
- 4 readouts: SPEAKER (color = role) · DUR (s) · VOICE · STATE (ready=green / stale=red).
- **Storyboard slot** — 80 px dashed-border panel · placeholder text "DROP IMAGE · OR · GENERATE" · "no image" tag. Future state per the ALPHA2 README's portrait-slot lifecycle.

Header actions: `↻ Regenerate` · `Save` (primary).

### Column 3 — Dialogue tree

`<DialogueTree>` — SVG graph, 280 × 320.

- Vertical spine at x=140 connecting the 4 utterances in order.
- CAPCOM utterances render their tile at x=70 (left); SHIP at x=210 (right).
- Each tile: 80 × 36, role-colored border. Selected tile fills with role color and renders id + duration in dark text.
- Stale lines (those with `stale.length > 0`) are drawn dashed (`3 3`).
- Tile click → setSelected.
- Top markers: `CAPCOM` left, `SHIP` right (lane labels).

## State

| key | shape | source |
|---|---|---|
| `selected` | utterance id (e.g. `"U3"`) | local (default `U3`) |
| `utterances` | `Utterance[]` | `VRP_ALPHA_FIXTURES.utterances` |

## Rules

- The dialogue tree and the script panel are two views of the same `selected` state — clicking either updates both.
- The card editor's `defaultValue` is intentionally uncontrolled, keyed on `selected` so React remounts the textarea — preserves local edits per-selection without explicit state.
- Per-line `↻ Regenerate` will trigger a TTS rerender for that specific utterance (not implemented in canvas).
- The storyboard slot accepts an image drop OR triggers a generated image — both are future work, not gating.
