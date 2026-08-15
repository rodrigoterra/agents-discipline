# Gifomator Phase 1 — `core/` encoder pipeline

- **Status:** draft
- **Owner:** @rodrigoterra
- **Created:** 2026-08-15
- **Spec ID:** gifomator-phase1-core
- **Parent:** [`specs/gifomator-vision.md`](./gifomator-vision.md)

## Why

Phase 1 builds the one part of Gifomator this remote Linux container can both **write and
verify**: the encoder. Everything else — tray, hotkeys, overlays, capture — needs a real
Mac or PC to mean anything.

`core/` takes a recorded video blob and options, and returns GIF bytes. It imports no
Electron, touches no OS API, and opens no window. That makes it unit-testable headlessly
here, and directly callable by the future MCP wrapper without launching a GUI.

Scope: **the module and its tests only.** No app shell, no capture, no UI.

## Non-goals

- No Electron code, no `desktopCapturer`, no tray, no windows.
- No capture logic — `core/` starts from an already-recorded blob.
- No preset *tuning*. Values below are starting points; real tuning needs real captures on
  real hardware (Phase 2).
- No packaging, signing, or installers.
- No MCP server. Phase 1 only avoids foreclosing it.

---

## Dependency verification

Checked against the registry rather than assumed, per the trusted-sources rule:

| Package | Version | Licence | Verdict |
|---|---|---|---|
| `gifski` | 1.7.1 | **AGPL-3.0+** | ✅ Use. Official [ImageOptim](https://github.com/ImageOptim/gifski) repo. AGPL handled per vision doc. |
| `ffmpeg-static` | 5.3.0 | **GPL-3.0-or-later** | ❌ **Reject.** |
| `@ffmpeg-installer/ffmpeg` | 1.1.0 | **LGPL-2.1** | ✅ Use. |

### ⚠️ The ffmpeg packaging trap

The obvious, most-downloaded choice — `ffmpeg-static` — ships a **GPL-3.0** build. Bundling
it would place the whole app under GPL-3.0 and **destroy the LGPL fallback path** the vision
doc relies on to keep the gifski AGPL question from ever forcing a rewrite. The safe fallback
would itself be copyleft-encumbered, defeating its entire purpose.

**Requirement: use `@ffmpeg-installer/ffmpeg` (LGPL-2.1). Do not add `ffmpeg-static`.**

Two caveats to handle rather than assume away:
1. `@ffmpeg-installer/ffmpeg` is less actively maintained. If it goes stale, the fallback is
   building our own LGPL ffmpeg in CI (`--disable-gpl --disable-nonfree`), not switching to
   the GPL package.
2. **The declared licence must be verified against the shipped binary**, not trusted from
   `package.json`. A build configured `--enable-gpl` is GPL regardless of what the manifest
   says — this is a required Phase 1 task, not a footnote.

---

## Pipeline

gifski accepts a **y4m stream on stdin**, so ffmpeg pipes straight into it — no PNG frame
directory, no temp-file sprawl, no disk round-trip:

```
webm/mp4 blob
     │
     ▼
  ffmpeg  ── fps + scale (lanczos) ──▶  yuv4mpegpipe on stdout
     │
     ▼  (pipe)
  gifski  ── quantize + encode ──▶  GIF bytes
```

**Primary backend (gifski):**
```
ffmpeg -i <input> -vf "fps=<fps>,scale=<w>:-2:flags=lanczos" -f yuv4mpegpipe -
  | gifski -o <out> --fps <fps> --quality <q> --width <w> -
```

**Fallback backend (ffmpeg-only, LGPL, no AGPL exposure):**
```
ffmpeg -i <input> -vf "fps=<fps>,scale=<w>:-2:flags=lanczos,split[a][b];
                       [a]palettegen=max_colors=<n>[p];[b][p]paletteuse=dither=bayer"
       -loop 0 <out>
```

Both sit behind one interface. Callers never know which ran.

---

## Module layout

```
gifomator/
  core/                      ← no Electron imports, ever
    index.ts                 ← public API surface
    encode.ts                ← orchestration + backend selection
    backends/
      gifski.ts              ← primary
      ffmpeg.ts              ← LGPL fallback
    presets.ts               ← preset data + selection policy
    binaries.ts              ← resolve binary paths; probe availability
    types.ts
  test/
    presets.test.mjs         ← pure, no binaries needed
    encode.test.mjs          ← real encode over synthetic input
    fixtures/
      make-fixture.mjs       ← generates test video via ffmpeg testsrc
```

### Public API

```ts
export type PresetName = 'small' | 'balanced' | 'sharp';
export type Backend = 'gifski' | 'ffmpeg';

export interface EncodeOptions {
  preset: PresetName;
  sourceWidth: number;         // for scale decisions; never upscale
  backend?: Backend;           // omitted → gifski, falling back to ffmpeg
  signal?: AbortSignal;        // cancellation must work; long encodes are killable
}

export interface EncodeResult {
  gif: Uint8Array;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  bytes: number;
  backendUsed: Backend;
  durationMs: number;          // feeds the <2s performance target
}

export function encode(input: Uint8Array, opts: EncodeOptions): Promise<EncodeResult>;
export function probeBinaries(): Promise<{ gifski: boolean; ffmpeg: boolean }>;
```

`encode` takes and returns bytes — no file paths. Keeps it pure, keeps it testable, and lets
the MCP wrapper call it without a filesystem contract.

### Enforcing the purity rule

The Electron-free constraint is load-bearing, so it is enforced mechanically, not by
convention. An ESLint `no-restricted-imports` rule on `core/**` banning `electron` and
`electron/*`, plus a CI check that `core/` type-checks against a config with Electron types
absent. If it can only be tested here when it's pure, purity has to fail the build.

---

## Presets

Starting points — **explicitly provisional**, to be tuned in Phase 2 against real captures:

| Preset | fps | Max width | gifski `--quality` | ffmpeg `max_colors` | Intent |
|---|---|---|---|---|---|
| `small` | 10 | 800 | 60 | 64 | Slack/chat; size over fidelity |
| `balanced` | 15 | 1200 | 80 | 128 | Default |
| `sharp` | 20 | 1600 | 95 | 256 | Readable UI text |

Rules:
- **Never upscale.** Output width is `min(preset.maxWidth, sourceWidth)`.
- Height derives from aspect ratio, rounded to even (`scale=w:-2`) — odd dimensions break
  some encoders.
- Presets are plain data, so the policy is testable with no binaries present.

---

## Test strategy

The container has no camera, no screen, and (currently) no ffmpeg or gifski — so fixtures
are **synthesized**, not captured:

```
ffmpeg -f lavfi -i testsrc=duration=3:size=1280x720:rate=30 -pix_fmt yuv420p fixture.webm
```

Deterministic, hermetic, no binary fixtures in git.

**Tests:**
1. **Preset policy** (no binaries): correct fps/width per preset; never upscales; even heights.
2. **Valid GIF output**: starts with `GIF89a`; parses; dimensions match expectation.
3. **Frame count and fps** match the preset for a known-duration input.
4. **Backend parity**: both backends produce a valid GIF from the same input.
5. **Fallback**: with gifski unavailable, `encode` transparently uses ffmpeg and reports
   `backendUsed: 'ffmpeg'`.
6. **Cancellation**: aborting mid-encode kills the child processes and leaves no orphans or
   temp files.
7. **Failure surfaces**: corrupt input yields a typed error carrying ffmpeg's stderr — never
   a silent empty GIF.

**Not testable here** (deferred to Phase 2, stated so nobody mistakes green CI for done):
perceptual quality, real capture input, the <2s target on real hardware, memory under long
recordings.

---

## Tasks

- [ ] Scaffold `gifomator/` with TypeScript; add the ESLint rule banning Electron imports in `core/`.
- [ ] Provision `ffmpeg` + `gifski` in this container so tests can run (see *Open questions*).
- [ ] **Verify the shipped `@ffmpeg-installer/ffmpeg` binary is genuinely LGPL** — inspect its build configuration for `--enable-gpl`.
- [ ] `types.ts` + `presets.ts` with the table above; unit-test the policy.
- [ ] `binaries.ts`: resolve paths, probe availability, cache the result.
- [ ] `backends/gifski.ts`: the ffmpeg→y4m→gifski pipe, with abort support.
- [ ] `backends/ffmpeg.ts`: the palettegen/paletteuse fallback.
- [ ] `encode.ts`: backend selection, fallback, timing, typed errors.
- [ ] Fixture generator + the seven tests above.
- [ ] `npm test` green in this container.
- [ ] SessionStart hook so future web sessions provision binaries automatically (the repo already has a `session-start-hook` skill for exactly this).

## Acceptance criteria

- [ ] Given `core/`, when anything imports `electron`, then lint fails.
- [ ] Given a 3 s 1280×720 fixture and `balanced`, when encoded, then a valid `GIF89a` of width 1200 at 15 fps is returned.
- [ ] Given a 640×480 source and `sharp` (max width 1600), when encoded, then output width is **640** — never upscaled.
- [ ] Given gifski is absent, when `encode` runs, then a valid GIF returns with `backendUsed: 'ffmpeg'`.
- [ ] Given an in-flight encode, when the `AbortSignal` fires, then the promise rejects and no child process or temp file survives.
- [ ] Given corrupt input, when `encode` runs, then it rejects with a typed error containing ffmpeg's stderr.
- [ ] Given a clean checkout in a Linux container, when `npm test` runs, then the suite passes with no Electron installed.

## Open questions

- **Q: How do ffmpeg/gifski get into this container?**
  A: `@ffmpeg-installer/ffmpeg` via npm should work. `gifski`'s npm package ships prebuilt
  binaries; if the Linux build doesn't resolve, Rust 1.94 is present and `cargo install
  gifski` works as a fallback. Needs confirming as the first task — everything else is
  blocked on it.

- **Q: Is `@ffmpeg-installer/ffmpeg`'s staleness a real risk?**
  A: Unknown. If its ffmpeg is too old for the filter syntax above, the answer is a CI-built
  LGPL ffmpeg — **not** `ffmpeg-static`.

- **Q: What does `core/` receive from the capture layer — webm from `MediaRecorder`, or raw frames?**
  A: Assumed webm blob (what `MediaRecorder` produces natively). If Phase 2 finds webm
  round-tripping too slow for the <2 s target, a raw-frame path gets added behind the same
  interface. Flagged in the vision doc as a purity risk worth watching.

- **Q: Should `core/` cap input duration?**
  A: The vision doc names long-recording memory blowup as unaddressed. `core/` streams
  through pipes, so it is likely fine; the risk sits in the capture buffer, which is Phase 2.

## Adversarial review (Codex)

- **Licence verification.** Is inspecting build flags sufficient to establish the ffmpeg
  binary is LGPL? If `@ffmpeg-installer` turns out GPL too, the fallback path collapses and
  the vision doc's central licence mitigation is void.
- **The y4m pipe.** Backpressure and partial-write handling between two child processes is a
  classic source of silent truncation. What happens if gifski exits before ffmpeg finishes?
- **Cancellation.** Killing a two-process pipe cleanly on both POSIX and Windows is harder
  than the spec implies. Orphaned children are the likely bug.
- **Synthetic fixtures.** `testsrc` is synthetic motion with flat colors — the easiest
  possible case for palette quantization. Green tests here may say nothing about real screen
  content with text and gradients.
- **Preset values.** Invented from reasoning, not measurement. Are they defensible even as
  starting points?
- **Frame-count assertions.** ffmpeg's `fps` filter duplicates/drops frames; exact frame
  counts may be off by one and make tests flaky.
