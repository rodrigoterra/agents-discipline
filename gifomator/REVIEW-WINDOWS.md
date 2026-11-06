# Windows review checklist

## Already machine-verified on a real Windows runner (v0.2.0)

Every release now passes a self-test on the packaged Windows app (`--smoke`, see the
README). You do **not** need to re-check these:

- the app boots; tray and floating indicator appear
- only `Ctrl+Shift+8/9/0` are held while idle; Stop/Discard/Esc are held only during a
  capture and released afterwards
- the bundled ffmpeg and gifski encode a 1920×1080 clip at 1:1 through both backends
- a real full-screen capture lands as a GIF, and the GIF is on the clipboard as a file

**Everything below is what a runner cannot check** — it needs eyes, hands, or a second
monitor.

## Getting it

Download the newest `-portable.exe` from the
[Releases page](https://github.com/rodrigoterra/agents-discipline/releases) and run it.
No install.

**SmartScreen will warn you** — the build is unsigned by design (v1 is internal/dev only).
"More info" → "Run anyway".

Gifomator has **no main window**. It lives in the system tray and in a small floating bar
near the top-right of the screen.

## Fast path — the whole product in 15 seconds

1. Press `Ctrl+Shift+9`.
2. Drag a box over something moving.
3. Press `Ctrl+Shift+9` again (or `Esc`) to stop.
4. Wait for the floating bar to turn green (`Saved … · copied`).
5. Paste into Slack.

If that worked, the product works. Everything below is detail.

## What to check

### Capture
- [ ] `Ctrl+Shift+9` — region overlay appears; screen dims; drag shows live pixel dimensions
- [ ] `Esc` during selection cancels cleanly, records nothing
- [ ] `Ctrl+Shift+0` — window picker lists real windows with readable thumbnails
- [ ] Window capture contains **only** that window — no desktop, no overlapping windows
- [ ] `Ctrl+Shift+8` — full screen; with two monitors, captures the one under the cursor
- [ ] Tray menu items work as well as the hotkeys

### Stop, discard, and the state machine
- [ ] Pressing the capture hotkey again stops and saves
- [ ] `Esc` while recording **stops and saves** — it must not discard
- [ ] `Ctrl+.` while recording discards; no file appears
- [ ] `Ctrl+.` during encoding aborts; no partial file left behind

### New in v0.2.0
- [ ] **Save As works in other apps while Gifomator is idle** — `Ctrl+Shift+S` in VS Code,
      Word or a browser opens their dialog, not a Gifomator stop. (v0.1.2–0.1.5 stole it.)
- [ ] `Ctrl+.` (VS Code Quick Fix) works while Gifomator is idle
- [ ] `Ctrl+Shift+S` **does** stop and save while recording
- [ ] The floating bar turns green with the size when a GIF lands; **clicking it opens the
      folder with the file selected**
- [ ] A failed capture turns the bar red; clicking it opens `gifomator-last-error.log`
- [ ] Toasts are headed **"Gifomator"**, not `electron.app.Gifomator`
- [ ] Launching the portable .exe a second time opens Settings instead of a second tray icon
- [ ] A `Gifomator-data` folder appears **beside the portable .exe**, holding the settings

### Output
- [ ] GIF lands in Downloads (or your configured folder) with no dialog
- [ ] Pasting into **Explorer** pastes the GIF file itself (new: real `CF_HDROP`)
- [ ] The GIF **animates** when pasted into Slack — a static image here means the clipboard
      flavour is wrong on Windows, which is the single most likely defect in this build
- [ ] Pasting into a terminal gives the file path
- [ ] Toast shows filename, size, dimensions; clicking it reveals the file
- [ ] The whole app stays responsive while encoding

### Settings
- [ ] Changing the output folder persists across a restart
- [ ] Rebinding a hotkey works, and rebinding to one already in use is rejected
- [ ] Switching preset changes output size in the expected direction
- [ ] Launch at login survives a reboot

### Multi-monitor (if you have one)
- [ ] Region capture on the **secondary** display crops the right area — this is the bug I
      fixed by reading the code, never by running it, so it deserves real scrutiny
- [ ] Mixed DPI (e.g. a 4K next to a 1080p): selected area matches captured area

## Expect these

Not bugs — known and recorded.

| Behaviour | Why |
|---|---|
| SmartScreen warning | Unsigned by design for v1 |
| Encoding takes seconds, not instant | Measured 8–24 s for 10 s at 720p; quantization is ~87% of it |
| Large files on busy content | Dark UI is small (6 s `balanced` ≈ 234 KB); gradient-heavy content is much larger. Try `small` first. |
| Tray icon is a plain circle | Placeholder; grey idle, red recording |

**The file size issue is the most important thing to judge.** The presets are provisional
and were never calibrated against real screen recordings — only synthetic fixtures, which
turned out to understate size by ~8×. Your real captures are the first honest data. If
`small` is unusable for Slack, that confirms fixed presets are the wrong design and
size-aware selection is needed (already flagged in the vision spec).

## Reporting back

Most useful to me, in order:

1. **Did the fast path work at all?** Yes/no beats any detail.
2. **Actual file sizes and encode times** for a few real captures, per preset.
3. Anything from the checklist that failed.
4. Whether the hotkey defaults collide with something you use — they were never reviewed.
