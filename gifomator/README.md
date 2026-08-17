# Gifomator

Screen recording → GIF. Tray-resident, hotkey-driven, silent save.

Hotkey → pick a region → record → hotkey → the GIF is in your output folder and on your
clipboard. No dialog, no export step, no file hunting.

Specs: [`../specs/gifomator-vision.md`](../specs/gifomator-vision.md) ·
[`../specs/gifomator-phase1-core.md`](../specs/gifomator-phase1-core.md)

## Status

**v0.1.0 — unsigned, internal/dev only.** Not for public distribution. See *Known
limitations*, which are real and worth reading before you judge the output.

## Install and run

```bash
cd gifomator
npm install
npm run build
npm start
```

## Hotkeys

| Action | macOS | Windows |
|---|---|---|
| Capture region | `Cmd+Shift+9` | `Ctrl+Shift+9` |
| Capture window | `Cmd+Shift+0` | `Ctrl+Shift+0` |
| Capture full screen | `Cmd+Shift+8` | `Ctrl+Shift+8` |
| Stop and save | press the capture hotkey again, or `Esc` | same |
| Discard | `Cmd+.` | `Ctrl+.` |

All rebindable in Settings. `Esc` is always the gentle exit — it stops and saves a
recording, and cancels a *selection*, but never destroys a completed recording.
Destruction requires the explicit discard chord.

Defaults are **unreviewed** and may collide with something you already use. Gifomator
detects collisions with its own bindings and reports OS-level registration failures, but
cannot reliably detect a clash with another running app — if a hotkey does nothing, that
is the likely cause.

## Architecture

```
Electron main ──── tray · globalShortcut · desktopCapturer · permissions
      │
      │  MediaRecorder → webm blob
      ▼
   core/  ─────── NO ELECTRON IMPORTS ───────────────────────
      ffmpeg (crop → fps → scale) → PNG frames → gifski → GIF
      preset policy · backend selection · temp-dir lifecycle
```

`core/` never imports Electron. This is enforced two ways — an ESLint rule on sources and
`test/purity.test.mjs` against the *built bundle* (which catches transitive imports lint
can't see). It matters because `core/` is the only layer testable without a GUI, and the
layer a future MCP wrapper would call directly.

## Commands

| Command | Purpose |
|---|---|
| `npm run build` | Bundle `core/`, main, preload into `dist/` |
| `npm test` | Build, then run the full suite |
| `npm run test:core` | Encoder tests only |
| `npm run lint` | Purity rule + app lint |
| `npm run typecheck:core` | Type-check `core/` with Electron types absent |
| `npm run dist:win` / `dist:mac` | Package installers into `release/` |

## Capture resolution

| Mode | Output |
|---|---|
| **Window** | **1:1** — the window's own pixel dimensions |
| **Region** | **1:1** — the area you drew |
| **Full screen** | Downscaled to the preset's width cap |

Window and region captures are exact areas you chose, so they come back at native size —
downscaling a window makes its UI text unreadable, which is the reason for capturing it.
Full screen keeps the cap because a 4K display at 1:1 produces an unusable file.

**Consequence:** 1:1 window captures are larger than the preset table below implies. If a
file is too big to post, use `small`, or capture a tighter region.

## Desktop indicator

A small floating bar shows the app is alive and what it's doing (idle / selecting /
recording / encoding), and carries two controls:

- **Capture ▾** — pick Region / Window / Full screen; choosing one starts that capture.
- **● / ■** — start the last-used mode, or stop and save.

It is **excluded from captures** via `setContentProtection` — `WDA_EXCLUDEFROMCAPTURE` on
Windows, window sharing type on macOS — so it never appears in your GIFs, including captures
of the screen it sits on. Drag it by the label; toggle it from the tray menu.

## Dither quality

The ffmpeg backend uses `dither=bayer:bayer_scale=5`, chosen by measurement rather than
taste. ffmpeg's default bayer uses a coarse ordered matrix whose pattern is plainly visible
as regular lines on flat dark UI. Measured against the source on a dark-UI fixture (SSIM)
and on a gradient-heavy fixture (size):

| dither | UI SSIM | UI size | gradients |
|---|---|---|---|
| `bayer` (ffmpeg default, scale 2) | 0.8577 | 238K | 33.0 MB |
| **`bayer_scale=5`** | **0.9993** | **234K** | **26.4 MB** |
| `sierra2_4a` (error diffusion) | 0.9994 | 236K | 52.4 MB |

`bayer_scale=5` matches error diffusion's fidelity on UI content while producing the
smallest files on both fixtures — error diffusion's noise compresses badly on gradients.

## Known limitations

**Encoding is slow, and size depends enormously on content.** Measured on a 4-core Linux
runner:

| fixture | preset | size | note |
|---|---|---|---|
| dark UI, 6 s | small | **80 KB** | realistic screen recording |
| dark UI, 6 s | balanced | **234 KB** | realistic screen recording |
| mandelbrot gradients, 10 s | small | 9.2 MB | deliberate worst case |
| mandelbrot gradients, 10 s | balanced | 26.4 MB | deliberate worst case |

**Real UI content is small** — flat regions and text compress extremely well. The alarming
multi-megabyte numbers come from a pathological gradient fixture chosen to stress palette
quantization, and are not representative of screen recordings. Content matters far more
than the preset does.

Encode time is the real cost: roughly 8–24 s for 10 s of 720p, dominated by quantization.
Because the app saves silently and puts the result on your clipboard, you are not *blocked*
during encoding — but the gap between stopping and the toast is real.

Because the app saves silently and puts the result on your clipboard, you are not
*blocked* during encoding — but the gap between stopping and the toast is real.

**The bundled ffmpeg is a GPL build.** `@ffmpeg-installer/ffmpeg` declares LGPL-2.1 in its
manifest but ships a binary configured `--enable-gpl --enable-version3` (and dates from
2018). `test/licence.test.mjs` parses the binary's own configuration and currently
**skips** rather than fails; set `GIFOMATOR_REQUIRE_LGPL=1` to make it a hard gate. Point
`GIFOMATOR_FFMPEG` at a `--disable-gpl` build to satisfy it. This matters because the
ffmpeg-only backend is the licence fallback for gifski (AGPL-3.0+) — a GPL ffmpeg defeats
the purpose of having it.

**macOS Screen Recording permission is mandatory**, and because this build is unsigned the
grant can be invalidated whenever the binary changes — expect to re-grant after updates.

**Untested on real hardware.** Everything here was built and verified in a headless Linux
container. The encoder is genuinely tested; the tray, hotkeys, overlays, window picker and
clipboard behaviour have never been exercised on Windows or macOS.

## Licences

| Component | Licence | Note |
|---|---|---|
| gifski | AGPL-3.0+ | Invoked as a separate binary. **Open question** for distribution — see the vision spec. |
| ffmpeg (bundled) | GPL-3.0 in practice | Manifest claims LGPL-2.1; the binary disagrees. |
| Electron | MIT | |
| ScreenToGif | Ms-PL | Design reference only — **no code copied**, so no obligation attaches. |
