# CLAUDE.md — voice-radio-poc

Project memory for Claude Code (and any AI agent dropping in cold). For shared multi-AI rules, also read `AGENTS.md`. For setup details and the human-oriented walkthrough, read `README.md`.

## What this is
Local PoC: scene brief → structured JSON (Zod-validated) → OpenAI TTS WAV → deterministic radio DSP → stitched WAV. Single-machine, no auth, no cloud. Stack: TypeScript monorepo (npm workspaces), React + Vite frontend, Express backend, Vitest + Playwright. An optional **Python sidecar** under `src/space/` (FastAPI + Skyfield, port 8765) supplies orbital state, terminator, and Natural Earth land polygons — it runs as a *separate* process; Node and Python never share a runtime.

Current ALPHA2 direction: the project is becoming a **narrative software + narrative art game + digital instrument**. The canonical source of truth is `docs/alpha/ALPHA2_CANONICAL_FLOW.md`: three lanes — Narrative Flow (Mission Control, Flight, COMMS, Weather with Earth Weather + Space Weather sub-pages), Audio Flow (Voice, Dialogue, Radio FX, optional Spectrogram, Stitch/Export — utterance rendering is folded into Radio FX "Process" + Dialogue "regenerate"; there is no standalone Render screen), and a **TOOLS** inspection lane (Seismograph, Relative) that does NOT feed the creative chain or session package. The phased build plan + decision log is `docs/alpha/ALPHA2_IMPLEMENTATION_PLAN.md`.

Recent ALPHA2 UI direction to preserve: Radio FX Fine DSP is role-stacked (CAPCOM and SHIP side by side now, dynamic roles later), with only the active role stack editable. Stitch / Export has a DAW-like timeline with CAPCOM/SHIP lanes, QD markers, an FX/environment bed, stale reasons, and per-utterance A/B controls. Do not restore the old v3 persistent `Now Playing`, `Scene Brief`, or `NASA Reference` right-rail cards unless the design system is intentionally revised again.

Current ALPHA2 implementation contract: render decisions are now functional, not decorative. Radio FX "Process" resolves the actual source from Narrative Draft / Role Stack / Preset Override / Manual Override and stores that choice in the processing signature. Stitch/export hard-blocks until every utterance has current processed audio; stale reasons use `[V]` voice/raw/text, `[E]` environment or Narrative Draft context, `[C]` CAPCOM stack, and `[S]` SHIP stack. Earth Weather contributes macro overrides to environment audio and both Earth/Space Weather feed the dialogue-generation brief.

## Repo map (the parts you'll touch most)
- `apps/server/src/index.ts` — Express API (script gen, validate, TTS, audio process, stitch, sidecar health proxy). Single file by intent.
- `apps/server/src/audio/spectrogram.ts` — FFmpeg spectrogram pipeline + path safety.
- `apps/web/src/App.tsx` — primary React UI. Newer screens under `apps/web/src/screens/FXLab/` and `apps/web/src/screens/Space/`.
- `apps/web/src/screens/Space/SpaceScreen.tsx` — the orbital surface, now rendered **inside the Flight screen** (`App.tsx`, `activeScreen === "flight"`). ALPHA2 absorbed it into the Narrative lane; there is no standalone "Space" nav entry anymore. Hosts the orbital map + 20-satellite catalog (per-row visibility checkboxes + "Show all" / "Hide all") + sidecar online/offline state.
- `apps/web/src/workflow/audioStatus.ts` — processed audio status and `[V][E][C][S]` stale-reason derivation.
- `apps/web/src/workflow/renderDecisions.ts` — render decision source resolution and signature shape.
- `apps/web/src/workflow/stitchReadiness.ts` — Stitch/export readiness gate.
- `apps/web/src/workflow/narrativeAudio.ts` — Narrative/Weather bridge into dialogue prompts and environment macro overrides.
- `apps/web/src/space/` — TypeScript client for the Python sidecar: `types.ts`, `projection.ts` (equirectangular + polar-aware antimeridian unwrap via `pathFromRing` + multi-wrap offset loop), `terminator-math.ts` (client-side sine-wave day/night curve), `sidecar.ts` (REST + WebSocket hooks), `LiveOrbitView.tsx` (SVG globe; multi-track via per-satellite track layers + 20-colour palette indexed by catalog position).
- `src/space/` — Python sidecar (FastAPI + Skyfield + pyshp). Has its own `CLAUDE.md` and `AGENTS.md` — read those before editing the Python.
- `scripts/run_sidecar.sh`, `scripts/download_natural_earth.py`, `examples/node_client.mjs`, `requirements-sidecar.txt` — sidecar lifecycle + Node 22 smoke client.
- `packages/schema/src/index.ts` — Zod schema + OpenAI strict JSON Schema (single source of truth).
- `packages/script-composer/` — OpenAI Responses API call + `prompt.md` / `prompt-fallback.md`.
- `packages/tts/` — OpenAI speech client.
- `packages/audio-core/` — macro control model + preset resolution.
- `packages/audio-fx/` — deterministic DSP pipeline + WAV stitch.
- `tests/unit/*.test.ts` — Vitest. `tests/e2e/smoke.spec.ts` — Playwright (mocks all routes).
- `docs/` — API contract, architecture, presets, voice/spectrogram specs.
- `docs/alpha/ALPHA2_CANONICAL_FLOW.md` — current canonical ALPHA2 narrative/audio flow spec.
- `docs/alpha/ALPHA2_NARRATIVE_INSTRUMENT_FLOW.md` — earlier ALPHA2 planning spec kept for historical context.
- `design_handoff_voice_radio_alpha2/` — Claude Design brief for the ALPHA2 narrative instrument screens.

## Commands
- Install: `npm install`
- Dev (server + web): `npm run dev -- --host 127.0.0.1`
- Sidecar (separate terminal): `source venv/bin/activate && ./scripts/run_sidecar.sh` — uvicorn on `127.0.0.1:8765`
- Sidecar smoke (Node 22, no npm install needed): `node examples/node_client.mjs`
- Sidecar one-time setup: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements-sidecar.txt && python scripts/download_natural_earth.py`
- Tests (unit): `npm run test`  ✅ 57/57 pass
- Focused ALPHA2 handoff tests: `npm run test -- audio-status render-decisions narrative-audio stitch-readiness`
- Tests (e2e): `npm run test:e2e`  — needs `npx playwright install` first
- Build: `npm run build`  ✅ green
- Typecheck: `(cd apps/server && npx tsc --noEmit) && (cd apps/web && npx tsc --noEmit)`  ✅ clean
- Node pin fix: `npm run setup:node22`
- Docker: `npm run setup:docker`

## Hard constraints (don't break these)
- API contract is documented in `docs/api.md` — keep it in sync when changing routes.
- Schema lives in `packages/schema/src/index.ts` — every script-shape change goes there first; OpenAI strict JSON Schema is derived from it.
- CAPCOM/SHIP role alternation and Portuguese-language defaults are part of the schema/composer pipeline; preserve them.
- Determinism in `packages/audio-fx`: pseudo-random noise is seeded; do not introduce `Math.random()` without a seed.
- No API keys in code or commits. Server reads `voice-radio-poc/.env` explicitly (not the shell cwd).
- WAV pipeline parses RIFF chunks for 16-bit mono PCM WAVs. Non-PCM, non-16-bit, and non-mono inputs are intentionally rejected.
- **Sidecar boundary**: Node and Python never share a runtime — communication is HTTP/WebSocket on `127.0.0.1:8765` only. No FFI, no `child_process` from Node into Python source.
- **Sidecar health**: `GET /api/space/health` on the Node side proxies the sidecar with a 1.5 s `AbortController` timeout. Configurable via `SPACE_SIDECAR_URL` and `SPACE_SIDECAR_TIMEOUT_MS`. Keep it cheap — UI degrades gracefully when the Python process isn't running, that's the point.
- **Sidecar licensing**: `src/space/` is original code on permissive deps only (Skyfield/pyshp/Natural Earth/FastAPI). Do not vendor termtrack (GPL-3.0). See `src/space/AGENTS.md` for the allowed-deps list.
- **External assets (ALPHA2 exception, 2026-05-24)**: the otherwise local-only/no-cloud posture is relaxed for the browser map surface and typography only — external map tiles (Google/Esri) and CDN web fonts are sanctioned. These are the *only* outbound calls allowed from the browser; everything else still goes through Node/the sidecar. They MUST degrade gracefully: ship a documented fallback (NASA Blue Marble image tiles + an offline state) because the Google `mt0.google.com/vt` endpoint is undocumented/ToS-gray and may be blocked. This exception does not change the sidecar-is-`127.0.0.1`-only rule above.

## Known sharp edges
- E2E mocks all API routes (`tests/e2e/smoke.spec.ts`) **by design** per `AGENTS.md` — it's a UI happy-path smoke, not an integration test. Server-route coverage now exists in `tests/unit/server.test.ts`, but deeper OpenAI/audio failure integration tests are still future work.
- The server keeps v1 local-first CORS defaults. Set `CORS_ORIGIN` before exposing any non-local deployment.
- The Flight screen (Narrative lane) is the canonical home for `LiveOrbitView` (via `SpaceScreen`). When the sidecar is down it renders an offline panel with copy-paste setup commands instead of crashing. The rest of the app is unaffected.
- Antimeridian wraps are the **frontend's** job. `apps/web/src/space/projection.ts::pathFromRing` unwraps longitudes and renders at every `k*360` offset whose copy overlaps the viewport, so polygons and tracks that span up to 720° still draw continuously. **Polar exception**: an antimeridian crossing where both endpoints have `|lat| > 85°` is *not* unwrapped — the straight SVG line between (180,±90) and (-180,±90) is the pole edge, which is what we want. Unwrapping it (as v1 did) flipped Antarctica to the top of the map via a long Z-close diagonal. Don't re-introduce. (There is no `splitAtAntimeridian` — that was the older approach.)
- Day/night terminator is computed client-side in `terminator-math.ts` from the sub-solar lat/lon (one `/api/sun` call), not by stacking the sidecar's four twilight rings. The polygon is built directly in SVG coords and closes via the map edge (`x=0` / `x=MAP_WIDTH`) — never feed it to `pathFromRing`, the unwrap would collapse the closing edge to a diagonal.
- Multi-track palette (`TRACK_PALETTE` in `LiveOrbitView.tsx`, 20 colours) is indexed by **catalog position**, not selection order. A given satellite always gets the same colour. The sidecar (`src/space/api.py::_resolve_aliases`) clamps WebSocket subscriptions to 1–20; bump together if the catalog grows.
- Sidecar fetches TLEs from CelesTrak with a hardcoded `User-Agent`; default Python/curl UAs are rejected. Don't strip it — see `src/space/AGENTS.md`.

## How to work here (Claude-specific)
- Use plan mode for anything that touches the schema, the DSP graph, the API contract, or the sidecar's HTTP/WebSocket surface — these have ripple effects across packages and the Python ↔ TS boundary.
- Prefer editing existing files (`App.tsx`, `index.ts`) over splitting them prematurely; this is PoC v1 and the team values readability over file count.
- For ALPHA2 work, preserve the current PoC audio pipeline while adding the new narrative lane structure. Mission Control creates Narrative Setup JSON, Dialogue creates Radio Dialogue JSON, and Radio FX creates explicit render decisions. Do not merge those concepts back into one vague JSON object.
- When changing the render-decision, stale-status, Stitch/export, or Narrative-to-audio handoff, update `INDEX.md`, `AGENTS.md`, `CLAUDE.md`, relevant `.claude/rules/`, and the focused tests in the same patch. These quiet files are part of the handoff surface.
- The space client (`apps/web/src/space/`) is the exception: it's a self-contained subsystem and deserves its own folder — don't fold it into `App.tsx`.
- When editing the Python sidecar, read `src/space/CLAUDE.md` first; it documents the footguns (CelesTrak UA, Skyfield numpy casts, `--reload-dir` scope, uvicorn cwd) that already bit during the initial build.
- Skip e2e during exploration unless you've already run `npx playwright install` — it's slow to bootstrap and unrelated to most PR scopes.
- When changing a server route, update `docs/api.md` in the same diff.
- When changing the schema, regenerate consumers (`script-composer` and any UI validation) in the same diff.
- Do NOT add lint configuration in v1 (`package.json` declares `"lint": "echo 'lint not configured for v1'"` deliberately).
- **After every commit + push, end the reply with the canonical run commands** so the user can pull and verify on their Mac without having to remember them. The block must cover (1) `git pull origin <current-branch>` from the local repo root, (2) sidecar in terminal A (`cd voice-radio-poc && source venv/bin/activate && ./scripts/run_sidecar.sh`), (3) dev stack in terminal B (`cd voice-radio-poc && npm run dev`), (4) the URL (`http://localhost:5173/`) and which left-rail screen to click. Include one-time setup (`python3 -m venv venv && pip install -r requirements-sidecar.txt && python scripts/download_natural_earth.py`, `npm install`) only when relevant.

## Multi-AI handoff
- `AGENTS.md` — canonical scope and DoD for any AI agent (Claude Code, Codex, others).
- `src/space/AGENTS.md` + `src/space/CLAUDE.md` — sidecar-scoped memory; AI agents working under `src/space/` should read these first (they're auto-loaded by Claude Code's memory chain).
- `docs/agent-changelog.md` — chronological log of cross-cutting agent interventions (security passes, CI, conventions). Read this for the *why* behind state that doesn't fit in commit messages.
- `docs/handoff/new-codex-window-handoff.md` — Codex-specific session bootstrapping notes.
- `docs/handoff/chatgpt-radio-controls-prompt.md` — design-spec handoff prompt for ChatGPT.
- `docs/alpha/ALPHA2_CANONICAL_FLOW.md` — latest ALPHA2 product/architecture handoff.
- `docs/alpha/ALPHA2_NARRATIVE_INSTRUMENT_FLOW.md` — earlier ALPHA2 planning spec kept for historical context.
- `design_handoff_voice_radio_alpha2/README.md` — Claude Design handoff for the ALPHA2 visual/workflow pass; includes the current role-stack DSP and DAW Stitch design deltas.
- `llms.txt` — top-level TOC for any LLM doing first-pass discovery.
