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

## Known limitations

**Encoding is slow, and file sizes on real content are large.** Measured on a 4-core
Linux runner, 10 s at 720p:

| preset | synthetic fixture | stress fixture | encode time (stress) |
|---|---|---|---|
| small | 1.18 MB | 9.20 MB | 8.7 s |
| balanced | 4.76 MB | 37.77 MB | 24.2 s |
| sharp | 9.70 MB | 68.49 MB | 39.6 s |

The stress fixture is a deliberate worst case (continuous mandelbrot gradients under
text); real screen content has large flat regions and should land between the columns.
But the direction is clear: **`balanced` can emit a file far too large to post**, and
preset values still need calibration against genuine screen recordings. Tracked as an
open question in the Phase 1 spec — the likely fix is size-aware preset selection, which
is a design change rather than a tuning tweak.

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
