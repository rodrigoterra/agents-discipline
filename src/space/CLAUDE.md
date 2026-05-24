# CLAUDE.md — voice-radio-poc / src/space (sidecar)

Claude-specific addendum for the orbital-tracking sidecar. **Read
`AGENTS.md` in this folder first** — that's the canonical scope, workflow,
constraints, and DoD shared with Codex and any other AI agent. This file
only covers Claude Code's quirks.

## Memory chain
Claude Code will already have loaded, in order:
1. `voice-radio-poc/CLAUDE.md` — PoC-wide project memory (TypeScript stack).
2. `voice-radio-poc/src/space/AGENTS.md` (this folder, sibling).
3. This file.

You don't need to re-read those — they're in context. This file just
captures Claude-specific working tips for the sidecar.

## When to use plan mode
- Any change to the HTTP/WebSocket surface (`api.py` routes, payload
  shape, query params). The Node consumer in `apps/web` / `apps/server`
  depends on these shapes — plan first, then edit `README.md` table +
  code in the same diff.
- Any new dep in `requirements-sidecar.txt`. Check the licence (no GPL —
  see `AGENTS.md` § Constraints) before proposing the change.
- Adding a satellite to `DEFAULT_SATELLITES` in `config.py`. NORAD ID +
  alias name + an existence sanity check at CelesTrak. Always 10 entries
  or fewer in v1.

## Safe to edit without a plan
- Comments, docstrings, README copy.
- Test-only changes inside `examples/node_client.mjs`.
- Bumping cache TTLs in `config.py` (within the 1 h – 24 h band).

## Smoke-test discipline
Before reporting a sidecar change as done, run the **full** Node 22 smoke:

```bash
# Terminal A
cd voice-radio-poc && source venv/bin/activate && ./scripts/run_sidecar.sh

# Terminal B
cd voice-radio-poc && node examples/node_client.mjs
```

The Node client exercises `/api/health`, `/api/satellites`,
`/api/satellites/ISS/state`, `/api/terminator`, and the WebSocket — i.e.
the contract the React app will rely on. A green smoke run is the
deliverable. Unit tests do not replace it: there are no Python unit tests
in v1 by design, the integration smoke IS the test.

## Things that already bit Claude once — don't repeat
- **`--reload` watcher scope.** Default uvicorn `--reload` watches the cwd
  and triggers on every `node_modules/` write. Always pass
  `--reload-dir src/space` (already in `scripts/run_sidecar.sh`). If you
  add another Python source dir, add it as another `--reload-dir`.
- **CelesTrak 403.** No User-Agent ⇒ rejected. The `http_user_agent` in
  `config.py` is non-negotiable — don't "clean up" by removing it.
- **`np.degrees` on Skyfield `.radians`.** Cast to `np.float64` first.
  See `propagator.py` and `terminator.py` for the pattern; copy it.
- **Running uvicorn from the repo root.** Imports break — `from
  src.space.config` resolves from `voice-radio-poc/` as cwd, not the repo
  root. Always cd into `voice-radio-poc/` first (the
  `scripts/run_sidecar.sh` does this).

## Multi-AI handoff
For cross-cutting protocol with Codex, the canonical file is
`AGENTS.md` next to this one. Keep these two files in sync only on the
parts that genuinely apply to both — Claude-specific tips stay here,
Codex-specific tips (if any are ever needed) would go in a Codex
addendum, not in `AGENTS.md`.
