# AGENTS.md - voice-radio-poc

## Scope

These instructions apply to the entire `voice-radio-poc/` tree, including the
Python orbital-tracking sidecar under `src/space/`. The sidecar has its own
finer-grained rules in `src/space/AGENTS.md` - read that before editing the
Python; this file covers the cross-stack contract.

## Start Here

Read these before broad work:

- `INDEX.md` - live repo map.
- `CLAUDE.md` - Claude Code project memory.
- `docs/alpha/ALPHA2_CANONICAL_FLOW.md` - current canonical product flow.
- `docs/alpha/ALPHA2_IMPLEMENTATION_PLAN.md` - current phase/status checklist.
- `docs/alpha/ALPHA2_NARRATIVE_INSTRUMENT_FLOW.md` - earlier ALPHA2 planning context.
- `specs/alpha2-narrative-instrument-flow.md` - implementation contract.
- `.claude/settings.json` - shared Claude Code command allowlist.
- `.claude/rules/` - scoped Claude Code rules.

Use `CLAUDE.local.md` and `.claude/settings.local.json` only for personal
local overrides. They are gitignored; templates are tracked as
`CLAUDE.local.example.md` and `.claude/settings.local.example.json`.

## Common Commands

Run from `voice-radio-poc/` unless noted.

Install:

```bash
npm install
```

Dev stack:

```bash
npm run dev -- --host 127.0.0.1
```

If port `5173` is busy, Vite may print `5174` or another port. Trust the
terminal output.

Unit tests and build:

```bash
npm run test
npm run test -- audio-status
npm run test -- audio-status render-decisions narrative-audio stitch-readiness
npm run build
git diff --check
```

E2E smoke:

```bash
npm run test:e2e
```

Sidecar one-time setup:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-sidecar.txt
python scripts/download_natural_earth.py
```

Sidecar runtime, terminal A:

```bash
cd voice-radio-poc
source venv/bin/activate
./scripts/run_sidecar.sh
```

Dev stack, terminal B:

```bash
cd voice-radio-poc
npm run dev -- --host 127.0.0.1
```

Sidecar smoke:

```bash
node examples/node_client.mjs
```

Docker helper:

```bash
npm run setup:docker
```

## Constraints

- Keep v1 local-only and deterministic where possible.
  - **Exception (ALPHA2, 2026-05-24):** the browser map surface and fonts may
    call out to external map-tile providers (Google/Esri) and CDN web fonts.
    These are the only sanctioned browser-side outbound calls; they must
    degrade gracefully (documented fallback + offline state), and they do NOT
    change the sidecar-is-`127.0.0.1`-only rule below. See `CLAUDE.md`
    hard-constraints and `docs/alpha/ALPHA2_IMPLEMENTATION_PLAN.md`.
- Do not hardcode API keys.
- Use Zod-backed JSON schema for script validation.
- Preserve strict CAPCOM/SHIP constraints in schema and composer pipeline.
- **Sidecar boundary**: Node and Python never share a runtime. Communication
  is HTTP/WebSocket on `127.0.0.1:8765` only - no FFI, no `child_process` from
  Node into Python source. The Node app proxies sidecar liveness at
  `GET /api/space/health` with a 1.5 s `AbortController` timeout
  (configurable via `SPACE_SIDECAR_URL`, `SPACE_SIDECAR_TIMEOUT_MS`).
- **Sidecar licensing**: `src/space/` runs on permissive deps only
  (Skyfield/pyshp/Natural Earth/FastAPI). Do not vendor termtrack (GPL-3.0) -
  the allowed-deps list lives in `src/space/AGENTS.md`.
- **Antimeridian handling is the frontend's job**. The sidecar returns raw
  `[lon, lat]` rings on purpose; `apps/web/src/space/projection.ts::pathFromRing`
  unwraps longitudes and renders at every `k*360` offset whose copy overlaps
  the viewport. **Polar exception**: antimeridian crossings with both
  endpoints at `|lat| > 85°` are *not* unwrapped — the straight SVG line
  between (180,±90) and (-180,±90) IS the pole edge. Re-introducing the
  unwrap on polar crossings is the "Antarctica upside down" regression.
  (There is no `splitAtAntimeridian`; that was the older approach.)
- **Day/night** is computed client-side in `terminator-math.ts` (one
  `/api/sun` call, then a closed-form curve along longitude samples). Do not
  bring back the four twilight-ring stack from v1.
- **Catalog size = 20**. The sidecar `_resolve_aliases` clamps WebSocket
  subscriptions to 1–20; bump together if the catalog grows. The orbital
  surface (`SpaceScreen` / `LiveOrbitView`) now lives inside the Flight
  screen, not a standalone Space nav entry.
- Preserve ALPHA2 boundaries (three lanes: Narrative, Audio, TOOLS):
  - Mission Control creates Narrative Setup JSON.
  - Dialogue creates Radio Dialogue JSON.
  - Voice Archetypes create role/character setup.
  - Radio FX creates explicit render decisions.
  - Utterance rendering is folded into Radio FX ("Process") + Dialogue
    ("regenerate"); there is no standalone Render screen. Guard the
    anti-pattern: Dialogue text edits create a dialogue revision and mark
    audio stale (they do NOT render); FX "Process" renders from the committed
    recipe and must NOT edit text.
  - Spectrogram is optional and non-blocking.
  - Render decisions must drive processing. A render mode or preset change must
    enter the processing signature and mark the affected processed clip stale.
  - Stitch/export must not guess recipes or export stale audio. It may export
    only when every utterance has current processed audio for the current voice,
    text, environment, and render decision.
  - **TOOLS lane** (Seismograph, Relative) is read-only inspection. It does
    NOT write Narrative Setup JSON, Render Decisions, or the session package,
    and shares no state with the Narrative/Audio lanes.
- Do not reintroduce the old right-rail PoC cards removed from Mission
  Control: `Now Playing`, `Scene Brief`, and `NASA Reference`.
- Mission Control should show map/report context, not a spectrogram preview.
- Keep stale/current state explicit when narrative, voice, dialogue, render
  decision, environment, or DSP settings change. Current stale chips are:
  `[V]` voice/raw/text, `[E]` environment or Narrative Draft context, `[C]`
  CAPCOM stack, `[S]` SHIP stack.

## Repo Organization Contract

- `INDEX.md` is the living map of packages, entry points, tests, and generated
  data. Update it when adding workflow helpers, commands, tests, or new
  top-level surfaces.
- `specs/` holds feature contracts before or alongside implementation.
- `.claude/rules/` holds scoped Claude Code rules so the main memory files stay
  readable.
- `.claude/output-styles/` holds response style guidance.
- `.claude/hooks/` holds deterministic hook scripts only; do not make hooks
  depend on network, API keys, or GUI apps.
- `.claude/settings.json` is shared and conservative. Add only repeatable repo
  commands that the team expects agents to run often. Personal allowlists go in
  `.claude/settings.local.json`, which is gitignored.
- `tests/README.md` maps test intent; update it when adding major test suites.

## Reply convention

After every commit + push, end the reply to the user with a canonical
run-commands block: (1) `git pull origin <current-branch>` from the local
repo root, (2) sidecar in terminal A, (3) dev stack in terminal B, (4) the
browser URL and which left-rail screen to click. This is non-negotiable -
the user does not want to re-derive the commands each time.

## Definition of Done

- End-to-end local flow works from brief -> JSON -> TTS -> process -> stitch
  -> preview/export.
- Validation and error states are visible in UI.
- README + docs are updated and accurate (including `docs/api.md` for any
  route change and the Space sidecar section for sidecar surface changes).
- Unit tests include schema and audio preset utility coverage.
- Playwright smoke test covers happy-path UI flow with mocked backend endpoints.
- When the sidecar surface changes, `node examples/node_client.mjs` runs
  clean against a live sidecar. That run is the canonical sidecar smoke.
- The Flight screen renders the sidecar-backed orbital surface without errors
  when the sidecar is up, and shows the offline panel with setup commands - not
  a crash - when it is down.
- `npm run test`, `npm run build`, and `git diff --check` pass before commit.
