# Gifomator — Vision

- **Status:** draft (rev 2 — post measurement + blind review)
- **Owner:** @rodrigoterra
- **Created:** 2026-08-15
- **Spec ID:** gifomator-vision

> Vision doc: fixes the *what* and the *why*. Per-feature specs live in
> `specs/gifomator-<feature>.md` per `templates/specs/SPEC-TEMPLATE.md`.

> **Rev 2 changelog.** Rev 1 was measured against real binaries and independently
> reviewed for machine-checkability. Three of its load-bearing claims were false and are
> corrected here: the encoder pipeline design, the ffmpeg licence mitigation, and the
> headline performance target. Criteria are now split into **[AUTO]** and **[MANUAL]** —
> rev 1 presented human judgment calls as CI checkboxes.

---

## Why

Sharing a short screen recording is a daily act — a bug repro, a UI review, a "look what it
does now" in Slack or a PR. Every existing path is slower than the thing it documents:
record, find the file, open a converter, pick settings, wait, hunt for the output.

Gifomator collapses that to: **hotkey → pick region → record → hotkey → the GIF is in your
output folder and on your clipboard.** No dialog, no export step, no file hunting.

**Why now:** `screenshot-annotator` already proves the pattern of a small, sharp capture tool
that hands artifacts back into a Claude workflow. Gifomator is the motion-picture sibling.

---

## Non-goals

- **Not a video editor.** No timeline, no layers, no transitions.
- **Not a post-capture editor.** ScreenToGif's frame editor is its largest surface area and
  the single biggest thing we are deliberately not building.
- **No webcam, sketchboard, or audio.**
- **No cloud, accounts, telemetry, or auto-update.**
- **Not a screenshot tool** — that's `screenshot-annotator`.
- **No output formats beyond GIF in v1.**
- **Not publicly distributed in v1.** Unsigned, internal/dev only.

---

## Research: the ScreenToGif question

Starting instruction: *"don't reinvent the wheel — use ScreenToGif's source, rip out what we
don't need."* Right instinct; the vehicle doesn't survive the requirements.

| Finding | Source | Consequence |
|---|---|---|
| C# + WPF, .NET 9 | [repo](https://github.com/NickeManarin/ScreenToGif) | WPF is **Windows-only**. No macOS target, ever. |
| Windows-exclusive | project docs | Conflicts with the Windows **and** Mac requirement. |
| **Ms-PL** licence | [LICENSE.txt](https://github.com/NickeManarin/ScreenToGif/blob/master/LICENSE.txt) | Copying any portion obliges retaining notices + shipping Ms-PL. |
| Capture layer is Win32 P/Invoke (`ScreenToGif.Native`) | repo structure | The part we'd most want is the least portable. |
| **`GifskiInterop.cs`** — it shells out to gifski | `ScreenToGif.Util/` | **Decisive.** It didn't write its own encoder either. |

**Decision: design reference, not code ancestor.** We copy no code, so no Ms-PL obligation
attaches. We take the same wheel ScreenToGif took — gifski — one layer down where it's
cross-platform. What we write is glue and UX: region selector, hotkey routing, preset policy,
output pipeline.

> If Windows-only ever became acceptable, forking ScreenToGif is the correct answer again.
> That door stays open.

---

## Research: environment verdict

Measured in this container, not assumed:

| Capability | Status |
|---|---|
| Linux x86_64, **4 cores**, ~30 GB, ephemeral | — |
| Node 22.22, Rust 1.94, Python 3.11, clang 18 | ✅ |
| Playwright + Chromium (headless) | ✅ |
| Swift/Xcode, .NET, macOS/Windows runner, real GUI | ❌ |

**Verdict: right for this phase, wrong for shipping.** Cannot build macOS (no Xcode), cannot
sign or notarize (**signing credentials must never enter a container**), cannot produce or
test Windows binaries, cannot judge how fast something feels.

| Phase | Where |
|---|---|
| Specs, `core/` encoder, headless tests, CI authoring | **This container** |
| Real builds, artifacts, benchmarks, later signing | **Actions matrix** (`macos-latest` + `windows-latest`) |
| Hotkeys, tray, capture feel, permission prompts | **Local Mac + PC** |

**Consequence:** the encoder must be a pure, headless-testable module with zero Electron
imports. It is the only part this container can verify — so the architecture maximizes it.

---

## Product definition

### The promise

**Speed.** Open, capture, stop, done. Every tie-break resolves toward fewer clicks and lower
perceived latency.

> **What "speed" actually means — corrected in rev 2.** Rev 1 promised the *encode* finishes
> in under 2 s. Measurement (below) shows that is off by 4–5×. But because we chose **silent
> save with no preview, the user never waits on the encode** — they've already moved on. The
> promise is therefore about *perceived* latency: **stop is instantaneous and the UI never
> blocks.** Encode wall-clock is a background concern reported by a toast, not a wall the
> user stands at. Rev 1 was measuring the wrong thing.

### Capture modes

| Mode | Behavior |
|---|---|
| **Region** | Drag a box over a dimmed overlay. Live pixel dimensions. |
| **Window** | Hover to highlight, click to select. Only that window's content. |
| **Full screen** | Whole display; on multi-monitor, the display under the cursor. |

### Native behavior parity

- **macOS:** menu-bar item, no dock icon. Window capture matches the **`Cmd+Shift+4` then
  `Space`** window-capture behavior — clean window content, correct edges, no neighboring
  pixels. *(Rev 1 cited two different shortcuts in two places; `Cmd+Shift+4`+`Space` is the
  reference. The `Ctrl` variant copies to clipboard instead of saving — not our reference.)*
  Retina captured at native scale.
- **Windows:** system-tray item, Snipping-Tool-like overlay conventions, per-monitor DPI
  awareness.
- **Both:** opt-in launch at login; respect reduced-motion and dark-mode in overlay chrome.

### Input state machine

*(New in rev 2 — rev 1 assigned `Esc` two contradictory meanings.)*

| State | Key | Action |
|---|---|---|
| Idle | mode hotkey | Enter selection overlay for that mode |
| Selecting | `Esc` | **Cancel** — dismiss overlay, record nothing |
| Selecting | click/drag complete | Begin recording |
| Recording | stop hotkey *or* re-press start | **Stop and save** |
| Recording | `Esc` | **Stop and save** (same as stop — `Esc` never discards a recording) |
| Recording | `Cmd/Ctrl+.` | **Discard** — stop, encode nothing, delete buffer |
| Encoding | `Cmd/Ctrl+.` | Abort encode, delete partial output |

**Rule:** `Esc` is always the *gentle* exit and never destroys a completed recording.
Destruction requires the explicit discard chord.

### Hotkeys

All rebindable; conflict detection at bind time. Defaults (**unreviewed — see open questions**):

| Action | macOS | Windows |
|---|---|---|
| Capture region | `Cmd+Shift+9` | `Ctrl+Shift+9` |
| Capture window | `Cmd+Shift+0` | `Ctrl+Shift+0` |
| Capture full screen | `Cmd+Shift+8` | `Ctrl+Shift+8` |
| Stop | `Esc` / re-press start | same |
| Discard | `Cmd+.` | `Ctrl+.` |

> "Conflict detection" means two checkable things only: (a) a key already bound *within*
> Gifomator is rejected; (b) when the OS refuses registration, the UI says so. Collisions with
> *other running apps* are not reliably detectable on either platform and are **not** promised.

### After stop — the fast path

1. Recording stops immediately; tray shows encoding state.
2. Encode runs off the UI thread. **The UI never blocks.**
3. GIF written to the configured folder — default `~/Downloads`, set at first run.
4. Clipboard receives a **file reference** (macOS `public.file-url`, Windows `CF_HDROP`) plus
   the plain-text path. *(Rev 1 said "the GIF"; that was ambiguous — `clipboard.writeImage`
   flattens animation to a static bitmap, so a file reference is what actually preserves it.)*
5. Toast with filename and size; click reveals the file.

No preview. No dialog. No save-as.

### Presets

Selected per capture from the tray or a per-preset hotkey — never a dialog.

| Preset | Intent | Direction |
|---|---|---|
| **Small** | Slack/chat; size over fidelity | Lower fps, downscale hard, tight palette |
| **Balanced** *(default)* | Everyday sharing | Middle |
| **Sharp** | UI text must stay readable | Highest supported scale, high fps, generous palette |

> **`sharp` clarification (rev 2).** Rev 1's prose said "native scale" while its table capped
> width at 1600 — contradictory for a 4K capture. Resolution: `sharp` caps at 1600 like the
> others, because unbounded native-scale 4K GIFs are unusable at any file size. The intent is
> *"the most readable output we can produce within a sane cap,"* not literal native scale.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Electron main                                            │
│   • Tray / menu-bar    • globalShortcut    • permissions  │
│   • display + window enumeration (desktopCapturer)        │
└───────────────┬──────────────────────────────────────────┘
                │  MediaRecorder → webm blob
      ┌─────────┴──────────┐
      ▼                    ▼
┌──────────────┐   ┌──────────────────────────────────────┐
│ Overlay      │   │  core/ — PURE, NO ELECTRON IMPORTS    │
│ (renderer)   │   │   webm blob + options → GIF bytes     │
│ region drag  │   │   ffmpeg → PNG frames → gifski        │
│ window pick  │   │   preset policy • backend selection   │
└──────────────┘   └──────────────────────────────────────┘
                             ▲
                   headless-testable — in THIS container
```

**`core/`'s contract, stated once:** it takes a **webm blob** (what `MediaRecorder` natively
produces) and returns **GIF bytes**. *(Rev 1 said "frames" in the vision doc and "blob" in the
Phase 1 doc — a contradiction at the only boundary this container can test. Blob wins; a
raw-frame path is a possible v2 interface extension, not a v1 ambiguity.)*

**The load-bearing rule:** `core/` never imports Electron — enforced by lint and CI, not
convention. It is the only layer testable here and exactly what a future MCP wrapper calls.

---

## Measured reality

Run in this container against the real binaries. **10 s @ 1280×720 → 1200 px, 15 fps,
`balanced`:**

| Stage / backend | Wall clock | Output |
|---|---|---|
| ffmpeg decode + scale → PNG | 1.4 s (13%) | 11 MB temp |
| gifski quantize + encode | 9.4 s (87%) | — |
| **gifski total** | **10.8 s** | 4.99 MB |
| **ffmpeg-only total** | **8.0 s** | 6.17 MB |
| *rev 1 target* | *< 2 s* | — |

Three conclusions:

1. **The `<2 s` target was wrong by 4–5×** and is replaced below. A faster laptop might win
   2–3×, landing at 3–5 s — still not 2.
2. **Quantization is 87% of the cost.** The PNG temp-directory detour is 13%, so building
   gifski with y4m/stdin support would recover almost nothing. Not worth chasing.
3. **gifski is ~35% slower than ffmpeg-only but ~19% smaller.** A real preset-policy input.

**Caveats, stated rather than buried:** 4-core shared container, not a laptop; `testsrc` is
synthetic flat-color motion — the easiest possible case for palette quantization, and likely
*unrepresentative* of text-heavy screen content.

### That caveat, now quantified (rev 3)

Once the encoder existed, both fixtures were measured. The gap is not a rounding error:

| preset | synthetic | stress (text over gradients) | ratio | encode (stress) |
|---|---|---|---|---|
| small | 1.18 MB | **9.20 MB** | 7.8× | 8.7 s |
| balanced | 4.76 MB | **37.77 MB** | 7.9× | 24.2 s |
| sharp | 9.70 MB | **68.49 MB** | 7.1× | 39.6 s |

The stress fixture is a deliberate worst case (continuous mandelbrot gradients under text);
real screen content has large flat regions and should land between the columns. Two
consequences: **a synthetic-only test suite cannot support any size claim**, and **the preset
values are wrong for real content** — see the revised design decision below.

**The architectural consequence:** if encode latency ever needs to drop materially, the fix is
**encoding incrementally during recording**, not tuning the post-stop pipeline. Deferred, but
this is the lever.

---

## Dependency and licence review

> **Rev 2 correction.** Rev 1's table said "✅ Verified" on the strength of npm *metadata*.
> The blind review flagged this as asserting a conclusion the doc's own standard called
> insufficient — and direct inspection proved it wrong. Metadata is not verification.

| Dependency | Manifest says | **Shipped binary actually is** | Status |
|---|---|---|---|
| Electron | MIT | — | ✅ |
| `gifski` 1.7.1 | AGPL-3.0+ | AGPL-3.0+ | ⚠️ see below |
| `ffmpeg-static` 5.3.0 | GPL-3.0-or-later | GPL | ❌ reject |
| `@ffmpeg-installer/ffmpeg` 1.1.0 | **LGPL-2.1** | **`--enable-gpl --enable-version3`, +libx264/x265/vidstab → GPL-3.0** | ❌ **reject** |
| ScreenToGif | Ms-PL | not used | n/a |

### ⚠️ Finding: no LGPL ffmpeg supplier currently exists

Rev 1's entire licence mitigation was "use `@ffmpeg-installer/ffmpeg` (LGPL-2.1) instead of
`ffmpeg-static` (GPL-3.0)." Inspecting the shipped binary:

```
ffmpeg version N-47683-g0e8eb07980-static  Copyright (c) 2000-2018 the FFmpeg developers
configuration: --enable-gpl --enable-version3 ... --enable-libx264 --enable-libx265 ...
```

It is **GPL-3.0 in fact and 2018-vintage**, whatever `package.json` claims. So *both* npm
options are GPL, and the LGPL fallback — which exists solely to stop gifski's AGPL from ever
forcing a rewrite — **has no supplier today.**

**Requirement: build ffmpeg in CI with `--disable-gpl --disable-nonfree`, verified by parsing
the binary's own configuration string.** This is a Phase 1 blocker, not a footnote. Never
trust a manifest licence for a bundled binary.

### ⚠️ The gifski AGPL question — open, not settled

gifski is AGPL-3.0+. Rev 1 asserted that a subprocess boundary makes this fine and that AGPL's
network clause doesn't apply to a desktop app. **Those are legal conclusions stated as fact,
and this doc retracts them as settled.** ScreenToGif uses the same arm's-length pattern, which
is evidence of common practice, not a legal opinion. Note also that distributing binaries to
teammates may still count as conveying.

**Before any distribution beyond the author's own machine,** pick one: (a) counsel sign-off on
the aggregation argument, (b) a commercial gifski licence — the author offers one, (c) ship
the ffmpeg-only path.

Because of (c), **gifski must be a pluggable backend, never a hard dependency.** Measured
cost of that insurance: ~19% larger files, ~35% faster. Cheap.

---

## Distribution

**v1: unsigned, internal/dev only.** Consequences to accept:

- macOS Gatekeeper quarantines the app on every new machine.
- **Screen Recording permission (TCC) is mandatory on macOS** and cannot be scripted around.
  **An unsigned app's grant can be invalidated when the binary changes** — testers may re-grant
  on every update. Most likely source of "it's broken" reports.
- No auto-update; distribution is an Actions artifact.

Signing is a v2 decision (~$99/yr Apple, ~$100–400/yr Windows), required before public release.

---

## Requirements

Each tagged **[AUTO]** (a machine produces PASS/FAIL) or **[MANUAL]** (needs a human, with a
named protocol). *Rev 1 presented these uniformly, hiding which were checkable.*

**Encoder — verifiable in this container**
- [ ] **[AUTO]** `core/` contains no Electron import (lint + CI with `electron` absent).
- [ ] **[AUTO]** `core/` accepts a webm blob and returns GIF bytes; no file paths in the API.
- [ ] **[AUTO]** gifski is swappable; ffmpeg-only fallback produces a valid GIF.
- [ ] **[AUTO]** Bundled ffmpeg's configuration string contains no `--enable-gpl`.
- [ ] **[AUTO]** No `ffmpeg-static` in the dependency tree.
- [ ] **[AUTO]** Never upscales: output width = `min(preset.maxWidth, sourceWidth)`.

**App behavior — verifiable on CI runners**
- [ ] **[AUTO]** Three capture modes exist and are invocable via IPC.
- [ ] **[AUTO]** Every capture action is bindable; intra-app duplicate bindings are rejected;
      OS registration failure surfaces an error.
- [ ] **[AUTO]** Stopping writes a GIF to the configured folder with no modal window created.
- [ ] **[AUTO]** Clipboard receives a file reference + text path in the OS-specific flavors.
- [ ] **[AUTO]** Preset selection reachable via tray menu template and IPC; no `dialog.*` call
      on the selection path.
- [ ] **[AUTO]** `Tray` instantiated at launch; `app.dock` hidden on macOS; settings window exists.
- [ ] **[AUTO]** Permission `denied` → guidance window + System Settings deep-link, and
      recording does not start.
- [ ] **[AUTO]** Idle memory: summed private bytes across processes (`app.getAppMetrics()`) at
      60 s post-launch, no capture performed, < 200 MB.

**Requires real hardware**
- [ ] **[MANUAL]** Runs on Windows 10 and macOS 12 (the support floor). CI runners are always
      newer, so the floor is a named hardware checklist — **not** a CI checkbox.
- [ ] **[MANUAL]** Window capture yields only the target window's content, per the chroma-key
      protocol below.
- [ ] **[MANUAL]** Correct on mixed-DPI multi-monitor: a W×H logical-px region on a display of
      scale `s` yields exactly `⌈W·s⌉×⌈H·s⌉` px. Named display pairs, recorded results.
- [ ] **[MANUAL]** Perceptual quality of each preset on real screen content.

### Window-purity protocol *(new — rev 1 had no oracle)*

Fill the desktop with `#FF00FF`, record a reference window, then scan every frame: **no pixel
within ΔE < 5 of `#FF00FF` may appear.** Corner-radius pixels resolve to the window's own
background color — GIF has only 1-bit transparency, so "transparent corners" is not available
and rev 1's "correct corner radius" had no definable expected value.

### Performance targets

> **Rev 2 rewrite.** Rev 1's four targets had no reference hardware, no trial count, no
> percentile, and no instrumentation — and its headline number was measurably impossible.
> Perceived latency is what the product promises, so that is what is measured.

- [ ] **[AUTO]** **Stop → recording ends: p95 < 100 ms**, from stop-hotkey callback to the
      capture stream closing. 50 trials. This is the number the user actually feels.
- [ ] **[AUTO]** **UI never blocks:** during encode, the main process responds to an IPC ping
      with p99 < 50 ms.
- [ ] **[AUTO]** **Encode wall clock is recorded, not gated.** `EncodeResult.durationMs` is
      logged per CI benchmark run on the standard fixture; the build fails only on a **>25%
      regression** against the committed baseline. Absolute numbers are hardware-dependent —
      regressions are not.
- [ ] **[AUTO]** Idle memory < 200 MB (as defined above).
- [ ] **[MANUAL]** **Hotkey → overlay on glass < 150 ms.** The instrumented half (callback →
      window `paint` event, p95 over 50 trials) is **[AUTO]**; true on-glass latency needs a
      camera and is a manual protocol.
- [ ] **[AUTO]** **Dropped frames < 1%.** Requires the capture layer to expose `framesExpected`
      and `framesReceived` — **that instrumentation is itself a requirement**, since rev 1
      asserted a threshold with no sensor to read it.

---

## Design decisions

**Decision:** Electron, not Tauri.
- *Alternatives:* Tauri; native per-OS.
- *Why:* `desktopCapturer` provides screen and window capture on both OSes. Tauri means
  hand-written ScreenCaptureKit and DXGI bindings — reintroducing exactly the platform-specific
  work that ruled ScreenToGif out. Bundle size is not a constraint for an internal tool.
- *Risk, stated plainly:* whether `desktopCapturer` can match native window-edge capture is
  this doc's highest-risk unknown. This decision rests on a claim not yet demonstrated.

**Decision:** ScreenToGif as design reference, zero code copied.
- *Why:* WPF cannot reach macOS; porting costs more than starting fresh while inheriting an
  unwanted editor. Its best decision — gifski — is available directly.

**Decision:** Silent save + clipboard; no preview.
- *Why:* A preview is a decision point on *every* capture; a bad take costs one re-record.
  This is also what makes the encode latency finding survivable — the user isn't waiting.

**Decision:** `core/` is pure and Electron-free.
- *Why:* Only layer testable in this container; exactly what the MCP wrapper needs. One rule
  buys both.

**Decision:** Presets, not a size-budget solver. **⚠️ Under revision — see below.**
- *Why:* A solver re-encodes to converge. At a measured ~10 s per encode, iterating would be
  catastrophic. Measurement turned this from a preference into a hard constraint.
- *Rev 3 problem:* running the built encoder against realistic content shows fixed presets
  produce **unusable output** — `balanced` emitted 37.8 MB and `sharp` 68.5 MB for 10 s at
  720p on the stress fixture (~8× the synthetic fixture). A preset that can emit 38 MB fails
  the product regardless of how fast it was chosen.
- *Resolution (not yet designed):* a **single-pass size estimate** — predict output bytes from
  frame count × area × a measured bytes-per-pixel-frame constant, and step fps/width down
  *before* encoding. Keeps the one-shot property that killed the iterative solver while
  refusing to emit a file nobody can post. Tracked as the top open question.

**Decision:** PNG temp directory, not a y4m stdin pipe.
- *Alternatives:* pipe ffmpeg → gifski (rev 1's design); build gifski with `--features video`.
- *Why:* The shipped gifski binary accepts **PNG files only** — `-` on stdin fails. And the
  detour costs 13% of wall clock, so building a custom gifski would recover almost nothing.
  Rev 1 specified a pipeline that does not run.

---

## Acceptance criteria

**[AUTO] — CI must prove these**
- [ ] Given `core/`, when anything imports `electron`, then lint fails.
- [ ] Given a clean checkout in a Linux container with no Electron installed, when `npm test`
      runs, then the suite passes.
- [ ] Given gifski is unavailable, when `encode` runs, then a valid GIF returns with
      `backendUsed: 'ffmpeg'`.
- [ ] Given the bundled ffmpeg binary, when its configuration string is parsed, then
      `--enable-gpl` is absent.
- [ ] Given a 640×480 source and `sharp`, when encoded, then output width is **640**.
- [ ] Given a recording in progress, when the stop hotkey fires, then the capture stream closes
      with p95 < 100 ms over 50 trials.
- [ ] Given an encode in progress, when an IPC ping is sent, then it returns p99 < 50 ms.
- [ ] Given the standard fixture, when the CI benchmark runs, then `durationMs` is within 125%
      of the committed baseline.
- [ ] Given permission is `denied`, when capture is attempted, then the guidance window opens,
      `shell.openExternal` is called with the Screen Capture settings URL, and no recording starts.
- [ ] Given a completed capture, when the clipboard is read, then it contains a file reference
      (`public.file-url` / `CF_HDROP`) and the text path.
- [ ] Given the app 60 s after launch with no capture, when `getAppMetrics()` is summed, then
      private bytes < 200 MB.
- [ ] Given a key already bound in Gifomator, when it is bound again, then the binding is rejected.

**[MANUAL] — named protocol, recorded results, not a CI checkbox**
- [ ] Window purity on macOS and Windows, per the chroma-key protocol.
- [ ] Mixed-DPI dimension check on named display pairs.
- [ ] Pasting into Slack renders the animation. *(Rev 1 made this an acceptance criterion; it
      tests a third party's paste arbitration, which we neither control nor can assert. The
      clipboard-flavor check above is the part we own.)*
- [ ] Support-floor smoke test on Windows 10 and macOS 12 hardware.
- [ ] Preset perceptual quality on real screen content.

---

## Open questions

- **Q: Is the gifski AGPL subprocess argument sound?**
  A: **Unresolved, and rev 2 retracts rev 1's claim that it was.** Must be settled before any
  distribution. The pluggable-backend requirement keeps the answer from forcing a rewrite.

- **Q: Where does an LGPL ffmpeg come from?**
  A: No npm supplier exists. Building in CI with `--disable-gpl` is the plan; unproven.

- **Q: Can `desktopCapturer` reproduce macOS clean-window-edge capture?**
  A: **Still the highest-risk unknown.** Needs a throwaway prototype on a real Mac before
  Phase 2 is committed. Fallback: a native helper for window capture only.

- **Q: Is ~8–11 s encode acceptable given silent save?**
  A: Believed yes, since the user doesn't wait — but unvalidated with a real person. If not,
  incremental encoding during recording is the lever.

- **Q: Do the default hotkeys collide with anything you use?**
  A: **Still needs your review.**

- **Q: Does `testsrc` tell us anything about real screen content?**
  A: Probably not — it's flat synthetic motion. A text-heavy fixture is required before any
  quality claim means anything.

---

## Adversarial review (Codex)

- **The perceived-latency reframe.** Is "the user doesn't wait" actually true, or does an
  8–11 s gap between capture and paste break the workflow in practice?
- **Window-edge capture.** May be unreachable via `desktopCapturer`. What is the fallback cost?
- **Multi-monitor + mixed DPI.** Display coordinate spaces remain under-designed.
- **Hotkey conflicts and focus stealing** — the classic tray-app failure mode.
- **Long recordings.** Frame buffering is still unspecified. At ~11 s of encode per 10 s of
  video, what happens at 5 minutes — memory *and* latency?
- **The `core/` purity rule.** Does it hold once real `MediaStream` data arrives?
- **Licence exposure.** Both npm ffmpeg builds are GPL. Is a CI-built LGPL ffmpeg actually
  achievable, or does the fallback path quietly not exist?
- **The [AUTO]/[MANUAL] split.** Are any [AUTO] items secretly manual?
