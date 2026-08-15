# Gifomator Phase 1 — `core/` encoder pipeline

- **Status:** draft (rev 2 — post measurement + blind review)
- **Owner:** @rodrigoterra
- **Created:** 2026-08-15
- **Spec ID:** gifomator-phase1-core
- **Parent:** [`specs/gifomator-vision.md`](./gifomator-vision.md)

> **Rev 2 changelog.** Rev 1 was written from documentation and registry metadata. Running
> the actual binaries falsified three of its core claims: the pipeline design, the ffmpeg
> licence mitigation, and the performance target. Rev 1's expected test values were also
> arithmetic guesses; rev 2's are measured. A **Requirements** section is added — rev 1 omitted
> it, violating the house template, which is why nothing traced.

## Why

Phase 1 builds the one part of Gifomator this Linux container can both **write and verify**:
the encoder. `core/` takes a recorded webm blob and returns GIF bytes — no Electron import, no
OS API, no window. Headless-testable here, and directly callable by the future MCP wrapper.

Scope: **the module and its tests.** No app shell, no capture, no UI.

## Non-goals

- No Electron, `desktopCapturer`, tray, or windows.
- No capture logic — `core/` starts from an already-recorded blob.
- No preset *tuning* — values below are provisional pending real-content measurement.
- No packaging, signing, or installers. No MCP server.

---

## Measured baseline

Run in this container. **10 s @ 1280×720 → 1200 px, 15 fps, `balanced`:**

| Stage / backend | Wall clock | Output |
|---|---|---|
| ffmpeg decode + scale → PNG | 1.4 s (13%) | 11 MB temp, 150 files |
| gifski quantize + encode | 9.4 s (87%) | — |
| **gifski total** | **10.8 s** | 4.99 MB |
| **ffmpeg-only total** | **8.0 s** | 6.17 MB |

Verified GIF structure (gifski output): **1200 × 676**, **150 frames**, delays
`{6cs ×50, 7cs ×100}`, mean 6.67 cs = exactly 15 fps.

**Conclusions:** (1) quantization dominates at 87%, so the PNG detour is not the bottleneck and
a custom y4m-capable gifski would recover ~13% at most; (2) rev 1's `<2 s` target was wrong by
5×; (3) gifski costs ~35% more time for ~19% smaller output.

**Caveat:** `testsrc` is flat synthetic motion — the easiest possible input for palette
quantization. These numbers likely do **not** transfer to text-heavy screen content, which is
why a text fixture is now required (below).

---

## Dependency verification

> Rev 1 called registry metadata "verified." It is not. Every bundled binary is inspected
> directly, and the manifest is treated as a claim to be tested.

| Package | Manifest | **Shipped binary** | Verdict |
|---|---|---|---|
| `gifski` 1.7.1 | AGPL-3.0+ | AGPL-3.0+; **PNG input only** | ✅ use, with caveats |
| `ffmpeg-static` 5.3.0 | GPL-3.0-or-later | GPL | ❌ reject |
| `@ffmpeg-installer/ffmpeg` 1.1.0 | **LGPL-2.1** | **GPL-3.0** — see below | ❌ **reject** |

### ⚠️ The LGPL supplier does not exist

Rev 1 mandated `@ffmpeg-installer/ffmpeg` *because* its manifest says LGPL-2.1. The binary:

```
ffmpeg version N-47683-g0e8eb07980-static  Copyright (c) 2000-2018 the FFmpeg developers
configuration: --enable-gpl --enable-version3 --enable-libx264 --enable-libx265 --enable-libvidstab ...
```

**GPL-3.0 in fact, and a 2018 build.** Both npm options are GPL, so the LGPL fallback path —
the thing that keeps gifski's AGPL from ever forcing a rewrite — currently has no supplier.

**Requirement: build ffmpeg in CI with `--disable-gpl --disable-nonfree`, and gate on parsing
the binary's own configuration string.** Phase 1 blocker.

### gifski accepts PNG files only

```
USAGE:  gifski [OPTIONS] --output <a.gif> <FILE>...
ARGS:   <FILE>...    PNG image files
```

The npm binary is built without the `video` feature: `-` on stdin fails with
`Unable to find the input file: "-"`. **Rev 1 specified a y4m pipe that does not run.**
Since the detour costs only 13%, we write PNG frames to a temp directory rather than build a
custom gifski.

---

## Pipeline

**Primary (gifski):**
```
ffmpeg -i <in> -vf "fps=<fps>,scale=<w>:-2:flags=lanczos" <tmp>/f%05d.png
gifski -o <out> --fps <fps> --quality <q> --width <w> <tmp>/f*.png
```

**Fallback (ffmpeg-only, no AGPL exposure):**
```
ffmpeg -i <in> -vf "fps=<fps>,scale=<w>:-2:flags=lanczos,split[a][b];
                    [a]palettegen=max_colors=<n>[p];[b][p]paletteuse=dither=bayer"
       -loop 0 <out>
```

### I/O contract

*Rev 1 claimed "no temp-file sprawl, no disk round-trip" while its own commands read and wrote
paths. Stated honestly:*

- The **public API** is bytes in, bytes out — no paths cross the boundary.
- **Internally, temp files are unavoidable**: ffmpeg needs an input path and gifski needs PNG
  files on disk.
- All intermediates live in **one per-encode directory** under `os.tmpdir()`, removed on
  success, failure, and abort alike. This is what makes "no temp file survives" assertable —
  rev 1 asserted absence of files whose location was undefined.

---

## Module layout

```
gifomator/
  core/                      ← no Electron imports, ever
    index.ts                 ← public API
    encode.ts                ← orchestration + backend selection
    backends/{gifski,ffmpeg}.ts
    presets.ts               ← preset data + policy
    binaries.ts              ← path resolution, availability probe, licence assertion
    tmpdir.ts                ← per-encode dir lifecycle
    types.ts
  test/
    presets.test.mjs         ← pure; no binaries
    encode.test.mjs          ← real encode
    licence.test.mjs         ← ffmpeg build-flag gate
    fixtures/make-fixtures.mjs
```

### Public API

```ts
export type PresetName = 'small' | 'balanced' | 'sharp';
export type Backend = 'gifski' | 'ffmpeg';

export interface EncodeOptions {
  preset: PresetName;
  sourceWidth: number;
  backend?: Backend;          // omitted → gifski, falling back to ffmpeg
  signal?: AbortSignal;
}

export interface EncodeResult {
  gif: Uint8Array;
  width: number; height: number;
  frameCount: number; fps: number; bytes: number;
  backendUsed: Backend;       // callers CAN inspect which ran — see note
  durationMs: number;
}

export function encode(input: Uint8Array, opts: EncodeOptions): Promise<EncodeResult>;
export function probeBinaries(): Promise<{ gifski: boolean; ffmpeg: boolean }>;
export function assertFfmpegIsLgpl(): Promise<void>;  // throws on --enable-gpl
```

> *Rev 1 said "callers never know which ran" three paragraphs before defining `backendUsed`.
> Corrected: callers do not have to **choose** a backend, but the result reports which ran —
> necessary for benchmarking and for the licence-fallback test.*

### Enforcing purity

Mechanical, not conventional: ESLint `no-restricted-imports` banning `electron` on `core/**`,
**plus** a CI job type-checking `core/` with Electron types absent — and a meta-test that
writes a temp file importing `electron` and asserts lint exits nonzero.

---

## Presets

**Provisional.** Values are reasoned, not measured against real content.

| Preset | fps | Max width | gifski `--quality` | ffmpeg `max_colors` |
|---|---|---|---|---|
| `small` | 10 | 800 | 60 | 64 |
| `balanced` | 15 | 1200 | 80 | 128 |
| `sharp` | 20 | 1600 | 95 | 256 |

Rules: never upscale (`min(preset.maxWidth, sourceWidth)`); height via `scale=w:-2` (even);
presets are plain data so policy tests need no binaries.

### Quality proxies *(new — rev 1 said "tuned against real captures," which meant a human squinting)*

Machine-checkable stand-ins, run against the text fixture:
- `small`: 10 s 720p text fixture encodes to **≤ 2 MB**.
- `sharp`: OCR over output frames recovers **≥ 95%** of characters present in the source.
- All presets: output is a valid GIF whose frame count matches `duration × preset.fps ± 1`.

If these prove unworkable, tuning is relabeled a **[MANUAL]** protocol with named fixtures and
judges — not quietly left as an unowned checkbox.

---

## Test fixtures

Both generated, both committed to the generator (not to git as binaries):

1. **`synthetic`** — `testsrc`, 10 s, 1280×720, 30 fps. Fast, deterministic, easy case.
2. **`text`** — `drawtext` rendering paragraph text over a scrolling background, same
   geometry. **Required**, because palette quantization on text is the case that actually
   matters and `testsrc` cannot exercise it.

The ffmpeg version used for fixture generation is **pinned**; rev 1 called `testsrc` output
"deterministic," which is only true at a fixed version.

---

## Requirements

*Rev 1 had no Requirements section — a house-template violation, and the reason its acceptance
criteria traced to nothing.*

- [ ] **[AUTO]** `core/` imports no Electron, enforced by lint and by an Electron-free type-check.
- [ ] **[AUTO]** Public API is bytes-in/bytes-out; no filesystem paths cross it.
- [ ] **[AUTO]** gifski is the default backend; ffmpeg-only is a complete substitute.
- [ ] **[AUTO]** Bundled ffmpeg is built without `--enable-gpl`.
- [ ] **[AUTO]** `ffmpeg-static` never appears in the dependency tree.
- [ ] **[AUTO]** Never upscales.
- [ ] **[AUTO]** All intermediates live in one per-encode temp dir, always cleaned up.
- [ ] **[AUTO]** Encoding is abortable; aborting leaves no live child process and no temp dir.
- [ ] **[AUTO]** Failures surface a typed error carrying ffmpeg/gifski stderr — never a silent
      empty GIF.
- [ ] **[AUTO]** `durationMs` is reported for every encode (feeds the CI benchmark).

---

## Acceptance criteria

All **[AUTO]**. Expected values are **measured**, not derived — and are read from `presets.ts`
at test time so preset tuning cannot silently break them.

- [ ] Given `core/`, when a file importing `electron` is added, then lint exits nonzero.
- [ ] Given a clean checkout in a Linux container with no `electron` in `node_modules`, when
      `npm test` runs, then the suite passes.
- [ ] Given the 10 s 1280×720 synthetic fixture and `balanced` (gifski), when encoded, then
      output is `GIF89a`, **1200 × 676**, **150 frames ±1**, every frame delay ∈ **{6, 7} cs**,
      mean delay within 5% of **66.7 ms**.
      *(Rev 1 asserted "15 fps" — unsatisfiable, since GIF delays are integer centiseconds and
      1/15 s = 6.67 cs. Height 676 is measured; arithmetic alone predicts 674.)*
- [ ] Given a 640×480 source and `sharp` (max width 1600), when encoded, then output width is
      **640** — never upscaled.
- [ ] Given gifski is unavailable (probe forced false), when `encode` runs, then a valid GIF
      returns with `backendUsed: 'ffmpeg'`.
- [ ] Given both backends and the same fixture, when each encodes, then both produce valid
      `GIF89a` of identical dimensions.
- [ ] Given the bundled ffmpeg, when `assertFfmpegIsLgpl()` runs, then it resolves for an
      `--disable-gpl` build and **throws for the current `@ffmpeg-installer` binary** — a test
      that fails today, by design, until CI supplies an LGPL build.
- [ ] Given `package.json` and the lockfile, when scanned, then `ffmpeg-static` is absent.
- [ ] Given an in-flight encode, when the `AbortSignal` fires, then the promise rejects with
      `AbortError`, `kill(pid,0)` throws `ESRCH` for both child PIDs within 500 ms, and the
      per-encode temp dir does not exist.
- [ ] Given the synthetic fixture truncated to 1 KB, when encoded, then it rejects with
      `EncodeError` whose `.stderr` is non-empty.
- [ ] Given the text fixture and `small`, when encoded, then output is ≤ 2 MB.
- [ ] Given the standard fixture, when the CI benchmark runs, then `durationMs` is within 125%
      of the committed baseline (gifski ≈ 10.8 s, ffmpeg ≈ 8.0 s on a 4-core Linux runner).

---

## Tasks

- [ ] Scaffold `gifomator/` (TypeScript); ESLint rule + Electron-free type-check job.
- [ ] **Build LGPL ffmpeg in CI** (`--disable-gpl --disable-nonfree`) and wire `binaries.ts` to
      it. **Blocks the licence AC.**
- [ ] `types.ts`, `presets.ts`, policy unit tests.
- [ ] `binaries.ts` (resolve, probe, cache) + `assertFfmpegIsLgpl()`.
- [ ] `tmpdir.ts` — per-encode directory lifecycle with guaranteed cleanup.
- [ ] `backends/gifski.ts` (ffmpeg → PNG → gifski) with abort support.
- [ ] `backends/ffmpeg.ts` (palettegen/paletteuse).
- [ ] `encode.ts` — selection, fallback, timing, typed errors.
- [ ] Fixture generator: synthetic **and** text.
- [ ] GIF-parsing test helper (dimensions, frame count, delay histogram).
- [ ] CI benchmark job recording `durationMs` against a committed baseline.
- [ ] SessionStart hook to provision binaries in future web sessions.

## Open questions

- **Q: Can CI actually build an LGPL ffmpeg for all three platforms?**
  A: Unproven, and the licence fallback depends on it entirely. Highest-risk Phase 1 item.

- **Q: Do the preset quality proxies (OCR ≥ 95%, ≤ 2 MB) hold?**
  A: Invented, not calibrated. First real measurement may move them; if they can't be made to
  work, tuning becomes explicitly manual.

- **Q: Is ~11 s per 10 s of video tolerable for longer recordings?**
  A: Linear extrapolation puts a 2-minute capture near 2 minutes of encoding. Probably needs
  incremental encoding during capture — a vision-level lever, flagged not solved.

- **Q: `MediaRecorder` webm in practice?**
  A: Fixtures are ffmpeg-produced webm, which may differ from Chromium's. Needs one real
  sample from Phase 2 before the contract is considered proven.

## Adversarial review (Codex)

- **The licence gate ships red.** An AC designed to fail until CI supplies an LGPL ffmpeg is
  honest but unusual — does it actually get fixed, or get skipped?
- **Two-process cleanup on Windows.** POSIX PID assertions won't port; the abort AC may
  silently be Linux-only.
- **Fixture realism.** Does `drawtext` over a scroll actually resemble screen content, or is it
  a second synthetic case wearing a costume?
- **OCR proxy.** Is character recovery a real stand-in for perceptual readability, or an easily
  gamed metric?
- **Measured expected values.** 1200×676 and the {6,7} cs histogram come from one ffmpeg and
  one gifski version. Do they survive a version bump, or is the AC pinned to today's binaries?
- **Benchmark baseline.** A ±25% gate on a shared CI runner may be too noisy to mean anything.
