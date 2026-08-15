# Windows review checklist

Everything in Gifomator was built and verified in a headless Linux container. The encoder
is genuinely tested (24 tests, green). **Nothing below has ever run on Windows.** This is
the list of things only you can check.

## Getting it

1. Open the [Gifomator workflow runs](https://github.com/rodrigoterra/agents-discipline/actions/workflows/gifomator.yml).
2. Open the newest green run on `claude/gifomator-vision-env-9eb43i`.
3. Download the **`gifomator-windows`** artifact and unzip it.
4. Unzip the inner `Gifomator-0.1.0-win-x64.zip`, run `Gifomator.exe`.

**SmartScreen will warn you** — the build is unsigned by design (v1 is internal/dev only).
"More info" → "Run anyway".

Gifomator has **no window on launch**. It lives in the system tray, near the clock. If
nothing appears there, that is finding #1 — write it down.

## Fast path — the whole product in 15 seconds

1. Press `Ctrl+Shift+9`.
2. Drag a box over something moving.
3. Press `Ctrl+Shift+9` again (or `Esc`) to stop.
4. Wait for the toast.
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

### Output
- [ ] GIF lands in Downloads (or your configured folder) with no dialog
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
| **Files are large** | `balanced` hit 37.8 MB on the stress fixture. Try `small` first. |
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
