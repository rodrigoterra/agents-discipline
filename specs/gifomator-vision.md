# Gifomator — Vision

- **Status:** draft
- **Owner:** @rodrigoterra
- **Created:** 2026-08-15
- **Spec ID:** gifomator-vision

> This is a **vision doc**, not an implementation spec. It fixes the *what* and the *why*,
> and records the research and decisions behind them. Per-feature specs follow in
> `specs/gifomator-<feature>.md` using `templates/specs/SPEC-TEMPLATE.md`.

---

## Why

Sharing a short screen recording is a daily act — a bug repro, a UI review, a "look what it
does now" in Slack or a PR. Every existing path is slower than the thing it's documenting:
record in QuickTime or Game Bar, find the file, open a converter, pick settings, wait, hunt
for the output. The recording takes 8 seconds and the delivery takes two minutes.

Gifomator collapses that to: **hotkey → pick region → record → hotkey → the GIF is already
in your output folder and on your clipboard.** No dialog, no export step, no file hunting.

**Why now:** the repo already has `screenshot-annotator` proving the pattern of a small,
sharp capture tool that hands artifacts straight back into a Claude workflow. Gifomator is
the motion-picture sibling, and the same MCP surface applies later.

---

## Non-goals

Named explicitly so they don't creep in:

- **Not a video editor.** No timeline, no layers, no transitions, no keyframes.
- **Not a post-capture editing suite.** ScreenToGif's frame-by-frame editor is its biggest
  surface area and the single largest thing we are deliberately *not* building.
- **No webcam, no sketchboard, no audio.** GIFs are silent; the rest is scope creep.
- **No cloud, no accounts, no telemetry, no auto-update service.** Local-only.
- **Not a screenshot tool.** Still images are `screenshot-annotator`'s job.
- **No output formats beyond GIF in v1.** MP4/WebM/APNG are plausible v2, not v1.
- **Not publicly distributed in v1.** Unsigned, internal/dev use (see *Distribution*).

---

## Research: the ScreenToGif question

The starting instruction was *"don't reinvent the wheel — use ScreenToGif's source and rip
out what we don't need."* That instinct is right; the specific vehicle doesn't survive
contact with the requirements. Findings:

| Finding | Source | Consequence |
|---|---|---|
| ScreenToGif is **C# + WPF, .NET 9** | [repo](https://github.com/NickeManarin/ScreenToGif) | WPF is a **Windows-only** UI framework. It has no macOS target and never will. |
| It is **Windows-exclusive** | project docs | Directly conflicts with the Windows **and** Mac requirement. |
| Licensed **Ms-PL** | [LICENSE.txt](https://github.com/NickeManarin/ScreenToGif/blob/master/LICENSE.txt) | Copying any portion — source or compiled — obliges us to retain all copyright/attribution notices and ship a full copy of Ms-PL. Manageable, but it *attaches*. |
| Capture layer is `ScreenToGif.Native` — Win32 P/Invoke | repo structure | The part we'd most want is the part that is most thoroughly Windows-specific. |
| **`GifskiInterop.cs`** — it shells out to gifski | `ScreenToGif.Util/` | **The decisive finding.** ScreenToGif did not write its own encoder either. |

### The decisive finding

ScreenToGif's own answer to "don't reinvent the wheel" was to **call gifski for encoding**.
The genuinely reusable wheel is therefore *gifski*, not ScreenToGif — and it is directly
available to us. What ScreenToGif adds on top is (a) a Win32 capture layer that cannot cross
to macOS and (b) a large frame editor that is an explicit non-goal.

Porting it would mean a full WPF→Avalonia UI rewrite **plus** writing a macOS capture layer
from scratch — strictly more work than starting fresh, while inheriting a Windows-shaped
architecture and an editor we don't want. That is the overengineering the instruction was
trying to avoid.

### Decision

**Use ScreenToGif as a design reference, not a code ancestor.** We copy no code and carry no
Ms-PL obligation. We *do* mine it for hard-won decisions: gifski for encoding, its
region-selection UX, its frame-timing model, its capture-loop pacing.

We still don't reinvent the wheel — we take the *same wheels ScreenToGif took*, one layer
down, where they're cross-platform:

| Need | We use | Reinvented? |
|---|---|---|
| Screen/window capture | Electron `desktopCapturer` (ScreenCaptureKit on macOS, DXGI on Windows) | No |
| Video encoding / scaling | ffmpeg | No |
| GIF quantization + encoding | gifski (same choice ScreenToGif made) | No |
| Global hotkeys | Electron `globalShortcut` | No |
| Tray/menu-bar shell | Electron `Tray` | No |

What we actually write is the **glue and the UX**: region selector, hotkey routing, preset
policy, output pipeline. That's the product.

> If Windows-only were ever acceptable, forking ScreenToGif becomes the correct answer again.
> It is a mature, 27.5k-star, battle-tested recorder. That door stays open — see *Open questions*.

---

## Research: is the remote environment right for this?

Measured directly in this container rather than assumed:

| Capability | Status |
|---|---|
| Linux x86_64, 4 cores, ~30 GB writable, **ephemeral** | — |
| Node 22.22 / npm 10.9 | ✅ |
| Rust 1.94 (gifski builds from source) | ✅ |
| Python 3.11, clang 18 | ✅ |
| Playwright + Chromium (headless) | ✅ |
| Swift / Xcode | ❌ |
| .NET SDK | ❌ |
| macOS or Windows runner | ❌ |
| Real GUI / input devices / display server | ❌ |
| Persistence across sessions | ❌ (git is the only durable output) |

### Verdict: right for this phase, wrong for shipping

This container **cannot** build a macOS app (needs Xcode), cannot code-sign or notarize
(needs Apple certs on macOS + an Authenticode cert on Windows — and **signing credentials
must never be pasted into a container**), cannot produce or test a Windows binary, and cannot
evaluate a tool whose entire value proposition is *how fast it feels*. Hotkeys, tray
behavior, region-drag latency, and native window capture are all untestable headlessly.

**Three-environment split:**

| Phase | Where | Why |
|---|---|---|
| Vision, specs, architecture, encoder pipeline + headless tests, CI authoring | **This container** | Text and pure logic. Ideal fit; no GUI needed. |
| Real builds, artifacts, (later) signing | **GitHub Actions matrix** — `macos-latest` + `windows-latest` | Only place both OSes exist. Secrets live in repo secrets, never in a session. |
| Hotkeys, tray, capture feel, permission prompts, latency | **Your local Mac + PC** | Irreducibly manual. No CI proves "it feels instant." |

**Practical consequence:** the encoder pipeline must be a **pure, headless-testable module**
that takes frames in and emits a GIF, with zero Electron imports. That is the only part this
container can meaningfully verify — so the architecture is drawn to maximize it.

---

## Product definition

### The one promise

**Speed.** Open, capture, stop, done — the GIF is in your folder and on your clipboard. Every
design tie-break resolves toward fewer clicks and lower latency.

### Capture modes

| Mode | Behavior |
|---|---|
| **Region** | Drag a box over a dimmed overlay. Live pixel dimensions; `Esc` cancels. |
| **Window** | Hover to highlight a window, click to select. Captures **only that window's content** — no surrounding desktop, no overlapping windows, matching the macOS `Cmd+Shift+4` → `Space` behavior. |
| **Full screen** | Whole display. On multi-monitor, the display under the cursor. |

### Native behavior parity

The app must feel like it belongs to the OS, not like a port:

- **macOS:** menu-bar item (no dock icon); window capture matches `Cmd+Ctrl+Shift+4`+`Space`
  semantics — clean window content, correct edges and corner radius, no neighboring pixels;
  `Esc` cancels any overlay; Retina/HiDPI captured at native scale.
- **Windows:** system-tray item; Snipping-Tool-like region overlay conventions; per-monitor
  DPI awareness; correct behavior across mixed-DPI multi-monitor setups.
- **Both:** launch at login (opt-in), respect the system's reduced-motion and dark-mode
  settings in overlay chrome.

### Hotkeys

Every mode and control is bindable. Proposed defaults (all rebindable; conflict detection at
bind time, since defaults *will* collide on some machines):

| Action | macOS | Windows |
|---|---|---|
| Capture region | `Cmd+Shift+9` | `Ctrl+Shift+9` |
| Capture window | `Cmd+Shift+0` | `Ctrl+Shift+0` |
| Capture full screen | `Cmd+Shift+8` | `Ctrl+Shift+8` |
| Stop recording | `Esc`, or re-press the start key | same |
| Cancel (discard) | `Cmd+.` | `Ctrl+.` |

### After stop — the fast path

Silent and zero-click:

1. Recording stops instantly; visual confirmation in the tray.
2. Encode runs in the background (UI never blocks).
3. GIF is written to the configured output folder — default `~/Downloads`, set once at
   first run.
4. The GIF **and** its path go on the clipboard, so paste works in both Slack and a terminal.
5. A toast confirms with filename and final size; clicking it reveals the file.

No preview. No dialog. No save-as. This is the promise.

### Presets

Chosen per capture, from the tray or by binding a hotkey per preset — never a dialog:

| Preset | Intent | Direction |
|---|---|---|
| **Small** | Slack/chat; size over fidelity | Lower fps, downscale harder, tighter palette |
| **Balanced** *(default)* | Everyday sharing | Middle ground |
| **Sharp** | Text and UI detail must stay readable | Native scale, higher fps, generous palette |

Exact fps/scale/palette values are a tuning task, not a vision decision — they get measured
against real captures and fixed in the encoder spec.

### App shell

Tray/menu-bar driven, with a real settings window for output folder, hotkey binding, preset
tuning, launch-at-login, and recent captures.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Electron main                                            │
│   • Tray / menu-bar    • globalShortcut    • permissions  │
│   • window + display enumeration (desktopCapturer)        │
└───────────────┬──────────────────────────────────────────┘
                │
      ┌─────────┴──────────┐
      ▼                    ▼
┌──────────────┐   ┌──────────────────────────────────────┐
│ Overlay      │   │  core/ — PURE, NO ELECTRON IMPORTS    │
│ (renderer)   │   │   frames + options → GIF bytes        │
│ region drag  │   │   ffmpeg (scale/fps) → gifski (encode)│
│ window pick  │   │   preset policy • size accounting     │
└──────────────┘   └──────────────────────────────────────┘
                             ▲
                   fully testable headlessly — in THIS container
```

**The load-bearing rule:** `core/` never imports Electron. It is the only layer this
container can test, it is where the actual encoding intelligence lives, and it is what the
future MCP wrapper will call directly without launching a GUI. Everything OS-specific stays
in main/renderer, behind a narrow interface, and is verified on real hardware.

### MCP wrapper (v2, designed for — not built now)

Because `core/` is pure, the later MCP server is a thin adapter over the same module,
mirroring `screenshot-annotator`'s structure. No v1 code is written *for* it; v1 simply
doesn't foreclose it.

---

## Dependency and licence review

Verified rather than assumed, per the "trusted sources only" rule:

| Dependency | Licence | Assessment |
|---|---|---|
| **Electron** | MIT | Clean. |
| **ffmpeg** | LGPL-2.1+ core; GPL only if built `--enable-gpl` | We need only core filters (`scale`, `fps`, `palettegen`/`paletteuse`) — **use an LGPL build, invoked as a subprocess.** Do not bundle a GPL build. |
| **gifski** | **AGPL-3.0** (commercial licence available on request) | ⚠️ **Flagged — see below.** |
| **ScreenToGif** | Ms-PL | Not used as code. No obligation, because we copy nothing. |

### ⚠️ The gifski licence flag

gifski is AGPL-3.0. This is genuinely fine for v1 (internal/dev, unsigned, not publicly
distributed) — AGPL's network-service clause doesn't trigger for a local desktop app, and
invoking gifski as a **separate binary over a subprocess boundary** is the arm's-length
pattern ScreenToGif itself uses via `GifskiInterop.cs`.

**But it must be decided before any public release.** If Gifomator is ever distributed
outside the team, three options exist, and the choice is a business call, not an engineering
one:

1. Keep the subprocess boundary and **get counsel to sign off** on the aggregation argument.
2. **Buy a commercial gifski licence** — the author explicitly offers one.
3. **Ship the ffmpeg-only path** (`palettegen`/`paletteuse`), which is LGPL and carries no
   AGPL exposure, at some quality cost.

Because of (3), the encoder must treat **gifski as a pluggable backend, not a hard
dependency** — an ffmpeg-only fallback path is an architectural requirement, not an
optimization. This keeps the licence question from ever becoming a rewrite.

---

## Distribution

**v1: unsigned, internal/dev only.** Users right-click→Open on macOS and click through
SmartScreen on Windows. Free; no certificates; nothing sensitive enters any container.

Consequences to accept up front:
- macOS Gatekeeper friction on every new machine; the app **will** be quarantined.
- **Screen Recording permission is mandatory on macOS** (TCC) and cannot be scripted around.
  The first-run experience must detect it via `systemPreferences.getMediaAccessStatus('screen')`
  and deep-link into System Settings. **An unsigned app's permission grant can be invalidated
  when the binary changes**, so testers may need to re-grant on updates — this is the single
  most likely source of "it's broken" reports.
- No auto-update. Distribution is a GitHub Actions artifact download.

Signing is a v2 decision (~$99/yr Apple + ~$100–400/yr Windows cert), required before any
public release.

---

## Requirements

Observable and testable:

- [ ] Runs on Windows 10+ and macOS 12+.
- [ ] Three capture modes: region, window, full screen.
- [ ] Window capture yields **only** the target window's content — no desktop, no overlapping windows.
- [ ] Every capture action is bindable to a global hotkey; conflicts are detected at bind time.
- [ ] Stopping produces a GIF in the configured folder with **zero further interaction**.
- [ ] The GIF and its path are both placed on the clipboard.
- [ ] Three presets selectable without a modal dialog.
- [ ] Lives in the tray/menu bar; settings window for configuration.
- [ ] Correct on HiDPI/Retina and on mixed-DPI multi-monitor setups.
- [ ] macOS Screen Recording permission is detected and guided, never failing silently.
- [ ] `core/` has no Electron imports and is fully unit-testable headlessly.
- [ ] gifski is a swappable backend with a working ffmpeg-only fallback.

### Performance targets

These are the product; if they're missed, the product has failed regardless of features.

- [ ] Hotkey → overlay visible: **< 150 ms**.
- [ ] Stop → file on disk: **< 2 s** for a 10 s 720p capture.
- [ ] Dropped frames during capture: **< 1%** at target fps.
- [ ] Idle memory (tray, not recording): **< 200 MB**.

---

## Design decisions

**Decision:** Electron, not Tauri.
- *Alternatives:* Tauri (Rust, ~10 MB, already available here); native per-OS.
- *Why:* `desktopCapturer` delivers screen and window capture on both OSes essentially free.
  Tauri would mean hand-writing ScreenCaptureKit and DXGI bindings — reintroducing exactly
  the platform-specific capture work that ruled ScreenToGif out. Bundle size is not a
  constraint for an internal tool; capture correctness is.

**Decision:** ScreenToGif as design reference, zero code copied.
- *Alternatives:* Fork it (Windows-only); port to Avalonia; two codebases.
- *Why:* WPF cannot reach macOS. Porting costs more than starting fresh while inheriting an
  unwanted editor. Its most valuable decision — gifski — is available to us directly.

**Decision:** Silent save + clipboard; no preview.
- *Alternatives:* Preview-then-save; trim handles; undoable toast.
- *Why:* Speed is the single promise. A preview step is a second decision point on every
  capture. A bad take costs one re-record; a preview costs a click *every single time*.

**Decision:** `core/` is pure and Electron-free.
- *Alternatives:* Encode inline in the main process.
- *Why:* It is the only layer testable in this container, and it is exactly what the future
  MCP wrapper needs to call headlessly. One rule buys both.

**Decision:** Presets, not a size-budget solver.
- *Alternatives:* Fixed defaults; auto-fit to a byte ceiling.
- *Why:* A solver means encoding repeatedly to converge — directly opposed to the speed
  promise. Presets are one decision, pre-made, bindable to a key.

---

## Tasks

Sequenced so this container does everything it usefully can before hardware is needed.

**Phase 1 — here, headless**
- [ ] Scaffold the Electron app; establish the `core/` boundary with a lint rule forbidding Electron imports.
- [ ] Build `core/`: frames → ffmpeg (scale/fps) → gifski → GIF bytes.
- [ ] Implement the ffmpeg-only fallback backend behind the same interface.
- [ ] Define the three presets as data; unit-test the selection policy.
- [ ] Headless tests over synthetic frames: output is a valid GIF, dimensions/fps/frame count correct.
- [ ] Author the GitHub Actions matrix (`macos-latest` + `windows-latest`) for real builds.

**Phase 2 — CI + local hardware**
- [ ] Tray/menu-bar shell and settings window (output folder, hotkeys, preset).
- [ ] Region-selection overlay with live dimensions and `Esc`-to-cancel.
- [ ] Window picker with hover-highlight; verify clean-edge capture on both OSes.
- [ ] `globalShortcut` binding with conflict detection.
- [ ] macOS permission detection + System Settings deep-link + re-grant guidance.
- [ ] Clipboard write (image + path) on both OSes.
- [ ] Measure against the performance targets on real hardware; tune preset values from real captures.

**Deferred (v2+)**
- [ ] MCP wrapper over `core/`.
- [ ] Signing + notarization.
- [ ] Size-budget solver; additional output formats.

---

## Acceptance criteria

- [ ] Given the app is in the tray, when the region hotkey is pressed, then the overlay appears in **< 150 ms**.
- [ ] Given a region recording is running, when the stop hotkey is pressed, then a valid GIF exists in the output folder in **< 2 s** for a 10 s 720p capture, with no further interaction.
- [ ] Given a GIF was just produced, when the user pastes into Slack, then the animation appears; when they paste into a terminal, then the file path appears.
- [ ] Given a window is selected on macOS, when the recording is exported, then no pixels outside that window appear in any frame.
- [ ] Given Screen Recording permission has not been granted on macOS, when a capture is attempted, then the app explains it and deep-links to System Settings — and never fails silently.
- [ ] Given a mixed-DPI multi-monitor setup, when a region is captured on the secondary display, then output dimensions match the selection at that display's native scale.
- [ ] Given `core/` alone, when the headless test suite runs in a Linux container, then the encoder is fully exercised with no Electron present.
- [ ] Given gifski is unavailable, when a capture is encoded, then the ffmpeg-only backend produces a valid GIF.

---

## Open questions

- **Q: Does the gifski AGPL subprocess boundary hold if this is ever public?**
  A: Undecided, and deliberately deferred — the pluggable-backend requirement means the
  answer can't force a rewrite. Must be resolved before any public release.

- **Q: Do unsigned-app permission re-grants on macOS make testing untenable?**
  A: Unknown until tested on real hardware. If painful, ad-hoc signing may be needed earlier
  than v2.

- **Q: Can `desktopCapturer` reproduce macOS's exact clean-window-edge capture, including
  corner radius and shadow handling?**
  A: **Highest-risk unknown in the doc.** Needs a throwaway prototype on a real Mac before
  Phase 2 is committed. If it can't, the fallback is a native helper for window capture only.

- **Q: Should Windows get a ScreenToGif fork after all, if Electron capture disappoints there?**
  A: Kept open. The `core/` boundary means the encoder survives either way.

- **Q: Default hotkeys — do the proposed bindings collide with anything you actually use?**
  A: Needs your review; conflict detection mitigates but good defaults matter.

---

## Adversarial review (Codex)

Attack these specifically:

- **The speed promise vs. reality.** Is < 2 s to disk achievable when gifski quantization is
  the bottleneck? If not, the central promise is wrong and the preview-step decision should
  be revisited.
- **The no-preview decision.** Quantify the real-world re-record rate. If users routinely
  fumble the last two seconds, "silent save" optimizes the wrong thing.
- **Window-edge capture.** The macOS parity requirement may simply not be reachable through
  `desktopCapturer`. What is the actual fallback cost?
- **Multi-monitor + mixed DPI.** The most common source of capture bugs; the design currently
  hand-waves display coordinate spaces.
- **Hotkey conflicts and focus stealing.** Global shortcuts that swallow keystrokes from other
  apps are the classic tray-app failure mode.
- **Long recordings.** Frame buffering strategy is unspecified — what happens at 5 minutes?
  Memory blowup is the obvious failure, and it isn't addressed.
- **The `core/` purity rule.** Does it actually hold once real capture streams arrive, or does
  Electron's `MediaStream` leak into it and quietly destroy the headless-test story?
- **Licence exposure.** Is the subprocess-aggregation argument for AGPL gifski actually sound,
  or is it wishful?
