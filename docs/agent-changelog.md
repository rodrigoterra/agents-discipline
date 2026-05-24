# Agent changelog

Log of changes made by AI agents (Claude Code, Codex, others) on this repo, organized by intervention. Kept terse and chronological. Newer entries at the top. For per-PR detail use `git log`; this file captures cross-cutting context that doesn't fit in a commit message.

If you are an AI agent dropping in cold, also read `CLAUDE.md` (Claude Code memory), `AGENTS.md` (multi-AI rules), and `llms.txt` (TOC).

---

## 2026-05-14 — Security baseline and CI workflows (Claude Code)

**Why**: User asked for a security audit and CI gates. GitHub Advanced Security features (code scanning, secret scanning, private vuln reporting) are unavailable on this private repo (verified via API: 422 / 404), so equivalents had to live in `.github/workflows/`.

**Did**:
- **Bumped 3 deps to clear all critical/high `npm audit` findings.**
  - `vitest` 2.1.8 → 2.1.9 (was critical)
  - `@playwright/test` 1.54.0 → 1.60.0 (was high)
  - `express` (in `@voice-radio/server`) → 4.22.2 (was high; pulls fixed `body-parser`, `path-to-regexp`, `qs`)
  - Result: 12 vulns (1 critical + 4 high + 6 moderate + 1 low) → **6 moderate**, all in the `vite-node`/`vite`/`esbuild` dev-server chain ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)). Clearing the rest needs a vitest major bump (3.x); not worth it for a dev-server-only issue.
  - Verified: `npm run test` 45/45 pass, `npm run build` clean.
- **Created 3 GitHub Actions workflows** at `../.github/workflows/` (parent repo root, NOT inside `voice-radio-poc/` — GitHub only reads `.github/` from the repo root):
  - `codeql.yml` — CodeQL JS/TS scan, `security-extended` queries, scoped to `voice-radio-poc/**`. Triggers: push (main/work/codex/feat), PR-to-main, weekly Mon 06:37 UTC.
  - `gitleaks.yml` — secret scanning across whole repo (full git history via `fetch-depth: 0`). Triggers: every push, every PR, weekly Mon 07:13 UTC.
  - `npm-audit.yml` — `npm audit --audit-level=high` scoped to `voice-radio-poc/`. Triggers: manifest/lockfile changes, PR-to-main, weekly Mon 07:21 UTC. Uses `voice-radio-poc/.nvmrc` for Node pin.

**State of GitHub-side defenses** (verified 2026-05-14):
- ✅ Dependabot alerts + automated security updates: enabled.
- ❌ Secret scanning + push protection: GHAS-only, not available on this private personal repo.
- ❌ Private vulnerability reporting: 404 on the toggle endpoint.
- ❌ Code scanning (native): GHAS-only — covered instead by the CodeQL workflow above.

**Findings still open** (won't be caught by the workflows above; need code edits):
- HIGH — `pronunciation_hints` array unbounded (`packages/schema/src/index.ts:89`). Add `.max(50)` on the array and `.max(240)` per element.
- HIGH — `sceneBrief` unbounded going to OpenAI (`apps/server/src/index.ts:183,192,201`). Wrap in `z.string().min(3).max(8000)` validation.
- HIGH — `docker-compose.yml:9` exposes `OPENAI_API_KEY` via env-var (visible to `docker inspect`). Fine for local dev; switch to Docker Secrets before any deployment.
- MEDIUM — `gapMs` accepts unsanitized arrays/numbers in `/api/audio/stitch`. Validate with Zod.
- MEDIUM — `Dockerfile` runs as root. Add `USER node`.
- MEDIUM — `setup-node22.sh:30` does `curl | bash` of NVM installer without SHA pin.
- MEDIUM — `voice-radio-poc/.gitignore` doesn't list `.env` (currently covered by parent repo's root `.gitignore`; would break if subdir is extracted to its own repo). One-line backstop: add `.env` to it.
- LOW — localStorage profile keys not namespaced; no per-IP rate limiting; theoretical WAV integer overflow.

**Findings already closed by Codex** (re-verified 2026-05-13/14, do not re-flag):
- Path traversal (`fs.realpath` defense in `resolveGeneratedPath`)
- `parseEnvNumber` rejects NaN/Infinity
- FFmpeg uses `spawn(...args)` argv form (no shell interpolation)
- JSON.parse on routes wrapped with ENOENT-discriminating try/catch
- CORS allowlist via `CORS_ORIGIN`
- `composeScript` JSON.parse wrapped via `parseModelJson(raw, "primary"|"fallback")`
- `OpenAI` client constructed conditionally instead of `apiKey: || "missing"`
- Cost-guard refactored into `reserveCostSlot()` + `estimateSpend()` helpers (call-site ordering still warrants a quick eyeball)
- WAV parser now does proper RIFF-chunk parsing, accepts 16-bit mono PCM only
- Dockerfile base pinned to `node:22.10-bookworm-slim`
- New `tests/unit/server.test.ts` (in-process Express handler invocation) and `tests/unit/script-composer.test.ts` (malformed-JSON paths)

**Files written by this intervention**:
- `voice-radio-poc/docs/agent-changelog.md` (this file)
- `Teste-Voice-Radio/.github/workflows/codeql.yml`
- `Teste-Voice-Radio/.github/workflows/gitleaks.yml`
- `Teste-Voice-Radio/.github/workflows/npm-audit.yml`
- `voice-radio-poc/package.json`, `voice-radio-poc/apps/server/package.json`, `voice-radio-poc/package-lock.json` (dep bumps)

**Caveats for the next agent**:
- Pushing the CI workflows for the first time will run all three on the next push. CodeQL ~10–15 min initial run. `npm-audit` will pass now that the criticals/highs are gone.
- Gitleaks scans full history. If any committed secret exists from before the parent `.gitignore` covered `.env`, it will surface. Run locally first to know what'll trigger:
  `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks detect --source=/repo --redact`
- The parent `.gitignore` (at `Teste-Voice-Radio/.gitignore` line 12) is what protects `.env` today. Verified `git ls-files .env` is empty and `git log -- .env` has no history.

---

## 2026-05-13 — Codex change re-evaluation (Claude Code)

**Why**: User shared Codex's review of the prior code review and asked to recheck what Codex actually shipped against the findings.

**Did**:
- Inspected diffs of all modified files via `git diff --stat` and targeted `git diff` reads (no full re-read of files).
- Confirmed each previously-flagged issue against the live source:
  - JSON.parse wrap: ✅ landed (`packages/script-composer/src/index.ts`)
  - Symlink-safe paths: ✅ `resolveGeneratedPath` now async, uses `fs.realpath`
  - CORS: ✅ allowlist from `CORS_ORIGIN`
  - API-key fail-fast: ✅ conditional client construction; `/api/health` reports `openaiConfigured`
  - NaN env parsing: ✅ `parseEnvNumber()` validates `Number.isFinite`
  - WAV header: ✅ proper RIFF parsing for 16-bit mono PCM
  - Docker pin: ✅ `node:22.10-bookworm-slim`
  - Server route tests: ✅ new `tests/unit/server.test.ts`
  - Composer error tests: ✅ new `tests/unit/script-composer.test.ts`
- Refactored CLAUDE.md "Known sharp edges" section to reflect Codex's nuances:
  - `JSON.parse` doesn't crash the process — caught by route try/catch, surfaces as generic 500 (UX bug, not stability bug).
  - `apiKey: || "missing"` is a nit; routes guard the missing-key case before any synthesis call.
  - E2E full-mock is intentional per `AGENTS.md`; the right fix is server-route integration tests (which Codex added), not unmasking the e2e.

**Files written by this intervention**:
- `voice-radio-poc/CLAUDE.md` (3 targeted Edit calls)

**Caveats**:
- Cost-guard race: Codex extracted `reserveCostSlot()` + `estimateSpend()` helpers. Whether the race is fully closed depends on the call-site ordering (must be called BEFORE any `await openai.something()`). Not yet verified in this session.

---

## 2026-05-12 — Initial review and multi-AI conventions (Claude Code)

**Why**: User asked for a code review, validation, stress-test, and to add missing file-based conventions for multi-AI workability (Claude Code + OpenAI Codex).

**Did**:
- **Validation**: typecheck (server + web) clean; `npm run test` 36/36 pass; `npm run build` green. Skipped e2e (Playwright not yet installed locally at the time).
- **Code review** (delegated to Explore agent; full notes in chat history). Tagged findings as critical / high / medium / low with `file:line` citations. Most have since been resolved by Codex (see 2026-05-13 entry).
- **Convention audit**:
  - Already present: `README.md`, `AGENTS.md`, `docs/`, `design_handoff_voice_radio_v3/`, `docs/handoff/{chatgpt-radio-controls-prompt,new-codex-window-handoff}.md`, `packages/script-composer/{prompt,prompt-fallback}.md`.
  - Wrote `voice-radio-poc/CLAUDE.md` — Claude Code project memory: repo map, commands, hard constraints, known sharp edges, Claude-specific working notes.
  - Wrote `voice-radio-poc/llms.txt` — top-level TOC per [llmstxt.org](https://llmstxt.org/), grouping links by Setup / Architecture / Audio-DSP / Design / Source-of-truth.
  - Skipped: `CODEX.md` (Codex reads `AGENTS.md`), `SKILL.md`/`MEMORY.md` (agent-private), `DESIGN.md` (covered by `design_handoff_voice_radio_v3/`).

**Files written by this intervention**:
- `voice-radio-poc/CLAUDE.md`
- `voice-radio-poc/llms.txt`

---

## How to use this log

- **Adding an entry**: prepend a section dated `YYYY-MM-DD — short title (agent name)`. Sections: **Why**, **Did**, **Files written**, **Caveats** (or relevant variants).
- **What belongs here**: cross-cutting interventions (security passes, dep bumps, convention changes, CI work, schema migrations, big refactors) where the *why* doesn't fit in a commit message.
- **What doesn't**: routine bug fixes (use git log), in-flight discussions (use issues/PRs), agent-private notes (those go in the agent's own memory store).
- **Pruning**: when an entry's caveats and open items are all resolved, you can shorten it to a one-line summary or delete it. Keep the file readable; it's not an audit trail.
