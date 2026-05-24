# Screen 07 — Radio FX · Review Rack

> 無線エフェクト · narrative-informed, role-stacked, per-role fine DSP

The audio-lane core. Three stacked blocks: a **Narrative Signal Draft** explaining why the suggested sound exists, a terminal-style **FX Commit Station** that previews the diff, and two side-by-side **role stacks** (CAPCOM / SHIP) — exactly one is EDITING, the other is VIEW · LOCKED.

`<AShell2 active="fx" fxPresets={[...]}>`.

## Header

```
<GlyphSigil fx> · h1 "Radio FX · Review Rack" + jp "無線エフェクト ・ むせんエフェクト"
                + Tag(amber|green, filled) "EDIT · ${editRole}"
                + Tag(muted)               "VIEW · ${otherRole}"

sub: "role-stacked · narrative-informed · fine DSP per role"
actions: Btn "Compare preset" + Btn(primary) "Save as preset"
```

The active EDIT tag's color matches the role (CAPCOM=amber, SHIP=green).

## Block 1 — Narrative Signal Draft

`<NarrativeDraftWithControls>`.

```
▸ Narrative Signal Draft        [DRAFT|USED|REJECTED tag]   why the system suggested this sound

mission phase   Approach burn · scene 03
flight          Lunar flyby · 0.62× thrust
comms           DSN Madrid → SHIP S-band · 8.4 GHz
earth weather   rain · Iberia · light scatter
space weather   CME front · ramp_up · 0.62
─────────────── ────────────────────────────────────────────────
suggested       SHIP gets scint depth +0.20 and granular drop +0.08;
                CAPCOM tightens voice band (HP +20 Hz, LP −100 Hz)
                and softens hiss bed.

[ ↻ Use draft (primary when USED) ] [ Compare A/B ] [ ✕ Reject (danger when REJECTED) ]   ─→   [ Edit draft ] [ Save as recipe ]
```

State is internal: `draft | used | rejected`. The tag colour reflects state.

## Block 2 — FX Commit Station

`<FxCommitStation editRole expanded>`.

Terminal block (left) + 3-button stack (right, 280 px).

Terminal:

```
FX COMMIT STATION · 確定                       per-role render decisions

> fx.diff --role capcom|ship
  group voice · 4 controls modulated      (or "no group expanded · select a tile to inspect")

> fx.preview --A=dry --B=fx --src=U3
  A -6.2 dB   B -3.6 dB   Δ +2.6 dB

> _    ← role-colored blinking caret
```

Right column (full-width buttons):
- `Bypass all · {editRole}`
- `All ON · {editRole}`
- `Process {editRole}` (primary)

## Block 3 — Two role stacks (1fr / 1fr)

`<RoleStack role="CAPCOM" editing expanded onTileClick onMakeEditable voiceLabel="ash · storm '65">` and SHIP equivalent.

Each stack:

### Header strip

- 4 px role-color accent bar.
- `<RoleBadge role={role} sub={voiceLabel}>` + Tag(amber|green, filled) reading **EDITING** (active) or **VIEW · LOCKED** (inactive).
- Actions: when editing — `All ON` · `Bypass`. When locked — `⌥ Make editable` (primary) flips `editRole`.

### Tiles

Vertical chain of 5 `<AFxStackTile>` (atoms) connected by hair pipes. Order: **Quindar → Voice band → Hiss → Scintillation → Granular**.

- `editing && id === expanded` → renders the **`<ExpandedTile>`** variant instead. Expanded tile fills the slot, draws full sliders, and tags itself `EXPANDED` (group color).
- Tiles in the locked stack have full opacity 0.78 plus a centered overlay strip "⌬ VIEW MODE · CLICK MAKE EDITABLE TO MODIFY" — pointer-events disabled.
- SHIP's `granular` tile is `bypassed` by default (diagonal hatch + 0.55 opacity).

### Footer (editing only)

Per-utterance override row: amber LED + label "Per-utterance overrides" + 4 chips U1–U4 (U3 active by default) + `Apply to all` (primary).

## Block 4 — A · B · NASA mini-OLED footer

3 mini-OLEDs in a row + 3 play buttons:

| panel | accent | label | sub |
|---|---|---|---|
| A | editRole color | A · DRY · {editRole}  | −6.2 dB · U3 |
| B | copper | B · FX · {editRole} | −3.6 dB · U3 · post-FX |
| NASA | blue | NASA · REFERENCE | A13-OXYGEN-04 · match 0.84 |

Play buttons (right): `▶ A` · `▶ B` (primary) · `▶ NASA`.

## Right rail · FX presets

`fxPresets` passed to AShell2 → `<FxPresetCard>` appears below Situation Card.

| id | label | route | active |
|---|---|---|---|
| storm65 | Storm '65 | CAPCOM · earth_capcom | **true** |
| lo_orbit | Lo-orbit | SHIP · ship_comm | false |
| deep | Deep space | SHIP · deep_space | false |

## State

| key | shape | source |
|---|---|---|
| `editRole` | `"CAPCOM" \| "SHIP"` | local (default `CAPCOM`) |
| `expanded` | `{ CAPCOM: id\|null, SHIP: id\|null }` | local (default `{CAPCOM: "voice", SHIP: null}`) |
| `narrativeState` | `"draft" \| "used" \| "rejected"` | internal to `<NarrativeDraftWithControls>` |

## Rules

- Exactly one stack is editable at any time. `⌥ Make editable` swaps it; the other stack instantly locks.
- Expanding a tile collapses any previously-expanded tile in the same stack.
- A tile changes mark only that role's utterances stale (`[C]` or `[S]`).
- Narrative Draft `USED` writes the suggested values to both stacks atomically. `REJECTED` clears the suggestion; user keeps current state.
- The Commit Station is read-only — diffs reflect current state, processing happens via the right buttons.
