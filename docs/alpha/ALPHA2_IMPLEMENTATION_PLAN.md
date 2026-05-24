# ALPHA2 Implementation Plan

> Phased, decision-locked plan for turning the `design_handoff_voice_radio_alpha2/` design system into working code. Companion to `ALPHA2_CANONICAL_FLOW.md` (product) and the adversarial reviews on PR #4 (code + design). Sequence is dependency-ordered: do Phase 0 before any FX/Stitch UI work.

## Decision log (2026-05-24)

| # | Decision | Consequence / implication |
|---|---|---|
| D1 | **Seismograph kept as a 3rd "TOOLS" lane.** | The canonical two-lane model is now **three lanes** (NARRATIVE / AUDIO / TOOLS). `ALPHA2_CANONICAL_FLOW.md` and `.claude/rules/frontend.md` must be amended (frontend.md updated alongside this plan). TOOLS needs a defined purpose; it does **not** feed the creative chain / session package, so document it as an inspection tool, not a producer. |
| D2 | **Build all four net-new backends** (Narrative Setup schema, NASA match-scoring, USGS adapter, live weather). | Largest scope path. Each is its own deliverable with its own tests/docs; sequenced in Phase 3. |
| D3 | **Allow external map tiles (Google/Esri) + CDN fonts.** | **Relaxes the v1 "local-only / no-cloud" hard constraint and the "sidecar is the only network boundary" rule.** `CLAUDE.md`/`AGENTS.md` hard-constraints must be amended to scope the exception. Risks: `mt0.google.com/vt` is an undocumented/ToS-gray endpoint — ship a documented fallback (NASA Blue Marble image + offline state) so the app degrades when tiles are blocked. |
| D4 | **Fold utterance rendering into FX + Dialogue** (drop the distinct A4 Render screen). | The existing `render` screen in `App.tsx` (`activeScreen === "render"`) is removed/merged. **Anti-pattern guard:** Dialogue text edits must create a dialogue revision + mark audio stale (NOT render); FX "Process" renders from the committed recipe but must NOT edit text. The canonical flow's separate Render step is updated to reflect the fold. |

---

## Phase 0 — Fix the render-decision → stitch contract (BLOCKER)

The design's FX/Stitch screens assume machinery that PR #4's code review proved is broken. Do this first or the new UI is lipstick on a broken contract.

- [x] Include the render-decision `mode` in `processingSignatureForUtterance` so changing a recipe marks the clip stale. Done 2026-05-24.
- [x] `processClip()` resolves each utterance's controls **from its render decision** (Role stack / Narrative draft / Preset override / Manual override), instead of using a decorative label. Done 2026-05-24.
- [x] `stitch()` hard-blocks stale/missing clips and exports only when every utterance is current; it never silently exports obsolete processed audio. Done 2026-05-24.
- [x] FXLabScreen inactive role stack shows that role's **committed/default** assignment, not the live editing buffer. Done 2026-05-24.
- [x] NIT cleanups from PR #4: `validate()` `res.ok` guard; reset `validation` badge on regenerate; `updateAlpha2Layer` functional updater; `toGeneratedPath` robustness. Done 2026-05-24.

## Phase 1 — Reconcile one data model

- [x] **Staleness:** keep the signature mechanism, but derive the design's `[V][E][C][S]` reason-codes from *which* signature input changed (voice / environment / CAPCOM stack / SHIP stack). Single source of truth; better UX than the current single stale bit. Done 2026-05-24; covered by `audio-status` and `stitch-readiness` tests.
- [x] **Narrative → audio bridge:** Flight, COMMS, Earth Weather, Space Weather, and the Narrative Signal Draft now enter the dialogue-generation brief; Earth Weather also contributes macro overrides to resolved environment controls. Done 2026-05-24; covered by `narrative-audio` tests.
- [x] **Render decisions as data:** render mode + preset id are part of the processing signature and resolve through `renderDecisions.ts`, so changing the chosen source marks the right utterances stale. Done 2026-05-24; covered by `render-decisions` tests.
- [ ] **Utterance shape:** the production `Utterance` (`id/speaker/channel/language/text/style/voice/environment`) is canonical. Map prototype-only fields (`fxScene`→render-decision label, `durMs`→duration estimate); drop `level/pan/processed/solo` or formalize them. Restore `channel/language/style/environment` in any UI that dropped them.
- [ ] **Satellites:** the spec's "10-satellite catalog" is wrong — sidecar ships **20** (`ISS, CSS, HST, NOAA19, NOAA20, METEOR2, SUOMINPP, METOPB, METOPC, TERRA, AQUA, AURA, SENT1A, SENT2A, SENT3A, LANDSAT9, JASON3, CRYOSAT2, ICESAT2, CALIPSO`). Fix the spec + use the real aliases.

## Phase 2 — Build screens backed by today's data (reuse, don't reinvent)

Implementable immediately after Phase 0. No new backend required.

- [ ] **Flight:** reuse the production `LiveOrbitView` (`apps/web/src/space/`), don't reimplement as "LiveOrbitMap"; wire 20 sats; add `MissionTrajectory` (Earth↔Moon) as a narrative artifact.
- [ ] **Mission Control:** render the map with the **existing** sidecar layers (land / terminator / sat tracks). Quake overlay is gated on the Phase 3 USGS adapter — ship MC without it first.
- [ ] **Voice / Dialogue / Radio FX / Stitch / Spectrogram:** all map to existing endpoints. Apply the D4 fold (rendering on FX/Dialogue). Spectrogram stays optional/non-blocking. Honor the `[V][E][C][S]` chips from Phase 1.
- [ ] Add the missing **state coverage** the design skipped: offline/failed/loading/invalid for every fetch + the TTS audition + validate + process + export paths (canonical "fail gracefully").
- [ ] Fix Dialogue's uncontrolled `defaultValue` (silent edit loss on reselect) — controlled input or explicit dirty/save.

## Phase 3 — Net-new backends (D2: build all four)

Each is a standalone deliverable with tests + `docs/api.md` updates.

- [ ] **Narrative Setup / Situation Card Zod schema** (`packages/schema`). Smallest, critical path for Mission Control's "validates against schema" claim. Do first.
- [ ] **USGS earthquake adapter** — expose via the **sidecar or a Node proxy**, not a direct browser fetch (keeps the network boundary controllable, dodges CORS). Reusable by MC overlay, Weather, and the TOOLS Seismograph. Candidate to repurpose the audited `legacy/` earthquake-monitoring + `cities_dict` code.
- [ ] **NASA per-band match-scoring engine** — server-side FFmpeg band-energy extraction + compare (8 bands: 120/250/500/1k/2k/4k/8k/16k). Until it lands, screens 07/08 must drop or label "illustrative" the fabricated `MATCH 0.84`.
- [ ] **Live weather adapters** (GFS/NOAA source-status cards) — largest/least-certain; route through sidecar/Node; must fail gracefully to cached fixtures.

## Phase 4 — TOOLS lane: Seismograph + Relative (D1)

The TOOLS lane now has **two** instruments (design screens 10 + 11), both read-only inspection.

- [x] Amend `ALPHA2_CANONICAL_FLOW.md` to define the **third TOOLS lane** and its purpose (inspection, not production). Done 2026-05-24; `CLAUDE.md`, `AGENTS.md`, `INDEX.md`, the design handoff README, and the scoped rules (`frontend.md`, `alpha2-flow.md`) updated alongside.
- [ ] **Seismograph** (screen 10): build `<ScreenSeismograph>` (`FeedColumn`/`FocusColumn`/`TierStrip`) on the Phase 3 USGS adapter; reuse the `EarthquakeLayer` + map decomposition.
- [ ] **Relative** (screen 11): a 1440×900 read-only instrument deck — `PaintedTrajectory` (astrolabe glyph globe) + `DeorbitalDescentPanel` (Nostromo wireframe Earth) + `SmithReflectionPanel` (HP Smith chart). Self-contained panels; only local state is the waypoint pick (`W0`–`W6`), independent of Flight. Header actions (Recalibrate / DEEPNAV PRECISE / Snapshot) are non-wired future affordances. Heaviest net-new bespoke rendering in the lane (orthographic dot mesh ~3000 pts, procedural Smith chart) — budget accordingly and honor `prefers-reduced-motion` (Phase 5).
- [ ] Document explicitly that TOOLS output does **not** enter the Situation Card / Render Decisions / session package. (Captured in the canonical flow's TOOLS Lane section + `alpha2-flow.md`.)

## Phase 5 — External assets + accessibility (D3 + design TODOs)

- [ ] Amend `CLAUDE.md`/`AGENTS.md` hard-constraints to scope the **local-only exception** for map tiles + CDN fonts.
- [ ] Implement the tile providers (NASA image, Google, Google-hybrid, Esri) **with a documented fallback + offline state**; treat the Google endpoint as best-effort (ToS caveat noted).
- [ ] Font pipeline: load `HaxrCorp4089` / `HelvB08` via `@font-face` + the 4 CDN web fonts; verify FOUT/FOIT handling.
- [ ] Resolve the design's own a11y TODOs: `prefers-reduced-motion` (freeze SMIL pulses), keyboard nav (`1`–`5`, `/`, `?`, `Esc`), focus-visible rings on map markers.

---

## Ground rules carried forward
- Determinism in `packages/audio-fx` (no `Math.random` in FX) — the design respects this; keep it.
- Right-rail policy: Situation Card only; no Now Playing / Scene Brief / NASA trio.
- Spectrogram is never a required step before export.
- Keep the existing PoC audio path working at every phase.

## Status
Phase 0 is implemented. Phase 1 is now active: staleness reason-codes, render-decision data flow, Stitch readiness, and the first Narrative → audio bridge are in code with tests. Remaining Phase 1 work is utterance-shape consolidation and the satellite catalog/spec correction before Phase 2 screen work broadens again.
