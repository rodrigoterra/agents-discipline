# Gifomator — build journal

A chronological record of how Gifomator went from an idea to a downloadable Windows build,
including the things that turned out to be wrong. Written so the *reasoning* survives, not
just the diffs.

Sessions: **2026-08-15** (spec + build), **2026-08-16** (release delivery), **2026-08-17**
(field fixes from Windows testing) and **2026-11-06** (enhancement pass, v0.2.0).
Branch: `claude/gifomator-vision-env-9eb43i`.

---

## 1. Framing and environment probe

The request: a simple Windows + Mac app, branch `Gifomator`, check whether the remote
environment suits it, and spec a vision doc through an interview.

Rather than assume, the container was measured: Linux x86_64, **4 cores**, ~30 GB writable,
ephemeral. Node 22.22, Rust 1.94, Python 3.11, clang 18, Playwright + Chromium. **No** Swift,
Xcode, .NET, GUI, or Windows/macOS runner.

**Verdict recorded up front:** right for specs and pure logic, wrong for shipping. Cannot
build macOS, cannot sign or notarize, cannot judge how fast something *feels*. This produced
the three-environment split (container → CI matrix → real hardware) that shaped everything
after, including the architectural rule that `core/` must not import Electron.

> **Learning.** Probing the environment before designing changed the architecture, not just
> the plan. "What can I actually verify here?" turned out to be a *design* question.

## 2. Interview

Two rounds of structured questions established: screen recording → GIF; standalone app first
with an MCP wrapper later; **Electron**; speed as the single promise; tray + settings window;
per-capture presets; silent save; unsigned internal/dev distribution; and native OS behaviour
parity (explicitly: macOS `Cmd+Shift+4`+`Space` clean window capture).

## 3. ScreenToGif — right instinct, wrong vehicle

Mid-turn instruction: *"don't reinvent the wheel — use ScreenToGif's source, rip out what we
don't need."*

Research found a hard blocker:

| Finding | Consequence |
|---|---|
| C# + **WPF**, .NET 9 | Windows-only UI framework. No macOS path, ever. |
| Capture layer is Win32 P/Invoke | The most desirable part is the least portable. |
| Ms-PL licence | Copying any portion attaches notice + licence obligations. |
| **`GifskiInterop.cs`** | **It shells out to gifski — it didn't write an encoder either.** |

That last file settled it. ScreenToGif's own answer to "don't reinvent the wheel" was to
delegate encoding to gifski — which *is* cross-platform and directly available. So the
instruction was honoured by taking the same wheel one layer down, and using ScreenToGif as a
design reference with **zero code copied** (hence no Ms-PL obligation).

> **Learning.** When a proposed shortcut conflicts with a stated requirement, the useful move
> is to find *why* the shortcut was attractive and satisfy that reason another way. Reading
> one filename (`GifskiInterop.cs`) did more than any amount of arguing.

## 4. Vision doc, rev 1

Written against the repo's own `templates/specs/SPEC-TEMPLATE.md`. It was confident, well
structured, and contained three load-bearing claims that were **false**. They survived because
they came from documentation and registry metadata rather than from running anything.

## 5. Blind review + measurement — the pivot

Two independent checks ran against rev 1:

- A **blind Fable 5 reviewer**, given only the documents and asked whether every requirement
  was machine-checkable. No conversation context, so it couldn't inherit any reasoning.
- **Direct measurement** against the real binaries.

They converged on the same three defects from opposite directions — the reviewer flagged them
as *claims with no evidence*, while the measurements proved them *false*:

| rev 1 claim | Blind review | Measurement |
|---|---|---|
| gifski accepts y4m on stdin | "stated as fact, zero evidence" | **False** — `ARGS: <FILE>... PNG image files`; `-` errors out |
| `@ffmpeg-installer` is LGPL ✅ | "asserts a conclusion your own standard calls insufficient" | **False** — binary is `--enable-gpl --enable-version3`, GPL-3.0, built 2018 |
| Encode `< 2 s` | "no hardware, no trial count, no percentile" | **10.8 s** — off by 5× |

The reviewer's sharpest *structural* catch was different: rev 1 presented human judgement as
CI checkboxes. "Pasting into Slack renders the animation" tests a third party's paste
arbitration — that is a person looking at a screen, and it was dressed as an acceptance
criterion. Everything is now tagged `[AUTO]` or `[MANUAL]`.

It also caught that "output at 15 fps" is **literally unsatisfiable**: GIF delays are integer
centiseconds and 1/15 s = 6.67 cs.

> **Learning — the biggest one.** A confident document written from documentation is not
> evidence. Every falsified claim came from trusting a manifest or a README instead of running
> the thing. The blind review was valuable *because* it had no context to inherit.

### Measured baseline (10 s @ 720p → 1200 px, 15 fps)

| Stage / backend | Wall clock | Output |
|---|---|---|
| ffmpeg decode + scale → PNG | 1.4 s (13%) | 11 MB temp |
| gifski quantize + encode | 9.4 s (87%) | — |
| **gifski total** | **10.8 s** | 4.99 MB |
| **ffmpeg-only total** | **8.0 s** | 6.17 MB |

Because quantization is 87% of the cost, building a custom y4m-capable gifski would recover
~13% at most — so the PNG temp directory stayed, and the "elegant pipe" was abandoned on
evidence rather than taste.

### Reframing the performance target

The `< 2 s` target wasn't just missed, it was **measuring the wrong thing**. Silent-save means
the user never waits on the encode — they've moved on. So the target became *perceived*
latency: stop under 100 ms p95, UI responsive under 50 ms p99 during encode, and a
regression-gated benchmark instead of an absolute bound that hardware makes meaningless.

> **Learning.** When a measurement blows past a target by 5×, check whether the target
> measures what the product actually promises before lowering it.

## 6. Implementation

Both phases built against rev 2. Highlights and stumbles:

**`gradients` filter missing.** The text fixture failed on all 10 encode tests — the bundled
ffmpeg is from **2018** and predates the `gradients` source filter. An earlier check had
"confirmed" it existed; that check was wrong because `grep -w gradients` matched the word
inside `gradfun`'s *description*. Switched to `mandelbrot`, which is also a harsher
quantization case.

> **Learning.** A grep that matches free-text descriptions is not a capability check. The
> stale-2018-ffmpeg risk flagged in the spec bit within the hour.

**Purity enforcement, verified rather than assumed.** `core/` must not import Electron. This
is enforced twice — an ESLint rule on sources *and* a test scanning the **built bundle**
(lint cannot see transitive imports). Both were then confirmed to **actually fail** against a
deliberately injected `import { app } from 'electron'`. ESLint had initially not been parsing
`.ts` at all, so the rule was silently inert until a parser was added — which the injection
test is exactly what caught.

> **Learning.** An unfired guardrail is indistinguishable from a broken one. Test the test.

**The size finding — the most important result.** Once the encoder existed, both fixtures were
measured:

| preset | synthetic | stress (text over gradients) | ratio |
|---|---|---|---|
| small | 1.18 MB | **9.20 MB** | 7.8× |
| balanced | 4.76 MB | **37.77 MB** | 7.9× |
| sharp | 9.70 MB | **68.49 MB** | 7.1× |

A 10-second `balanced` capture emits ~38 MB — unpostable anywhere. This **contradicts an
earlier design decision** ("presets, not a size-budget solver"), which is now marked under
revision. The iterative solver is still ruled out on latency grounds, but a *single-pass size
estimate* — predict bytes from frame count × area, step fps/width down before encoding — keeps
the one-shot property while refusing to emit an unusable file.

The tests were changed to assert **measured regression bounds and preset monotonicity** rather
than a fictional 2 MB target. Moving the goalpost quietly would have hidden a product defect
behind a green suite.

> **Learning.** Synthetic fixtures understated size by ~8×. A test suite green on synthetic
> data proves the code runs, not that the product works.

**Two bugs found by reading, not running.** The first Windows package shipped with the ffmpeg
*resolver* but no `ffmpeg.exe` — `@ffmpeg-installer` is platform-split and the build happened
on Linux, so the app could not have encoded anything. And region capture re-resolved the
display from the cursor *after* the overlay closed, cropping from the wrong monitor on
multi-display setups. Both fixed; the multi-monitor one has still **never been executed**.

## 7. Delivery — artifacts vs releases

CI went green and produced Windows + macOS artifacts. **The user could not download them.**

Actions artifacts require a signed-in GitHub session with repo access. They are not public
URLs, so they fail from a phone, from Slack, or from a signed-out browser — and the download
is a zip *containing* a zip.

Relaying the file from the container was impossible in three separate ways:

| Attempt | Blocked by |
|---|---|
| Download the artifact | Redirects to `blob.core.windows.net` — egress policy denies |
| `git push` a tag | Session credentials scoped to the designated branch |
| Create tag/release via REST | Proxy denies write access to those API paths |

The fix was to stop trying to be the courier: CI publishes the release itself. Tagging
`gifomator-v*` — or a manual dispatch — now builds natively and attaches the zips via the
preinstalled `gh` CLI. Better outcome than the original plan, since the binaries are built
natively rather than cross-compiled.

One bug on the way: the upload glob was `gifomator/release/*.zip`, but the workflow sets
`defaults.run.working-directory: gifomator`, so it resolved to `gifomator/gifomator/release/`
and matched nothing — after the release had already been created. `working-directory` applies
to `run:` steps but **not** to action inputs, which is why the neighbouring
`actions/upload-artifact` path was correct with the prefix and the `run:` step was not.

Final verification was a ranged GET with no credentials: **HTTP 206, valid zip data.** An
earlier `HEAD` request returned 401 and nearly produced a false alarm — a control test against
a known-public asset showed the environment was fine and the method was wrong.

> **Learning.** "It builds" is not "it's delivered." And when a check fails, test the check
> against a known-good control before believing it.

## 8. Field fixes — v0.1.1 to v0.1.5 (2026-08-17)

Testing on a real Windows machine surfaced defects that no headless test could have reached.
Every one lived in `app/` or in how the bundled binaries met real data:

| Symptom reported | Cause | Fix |
|---|---|---|
| Window capture came out 320×160 | The picker passed its **thumbnail's** width (`thumbnailSize: 320`) as the source width; Chromium also silently caps desktop capture at 1280×720 without explicit `maxWidth` | Renderer reads real size from `track.getSettings()`; explicit maxima; window/region emitted 1:1 |
| No tray icon | Electron's `nativeImage` does not reliably rasterise SVG data URLs on Windows | Icon built from a raw BGRA bitmap |
| `gifski exited with code 3221225725` | `0xC00000FD` stack overflow on the larger 1:1 frames; and the ffmpeg fallback only ran when gifski was *absent*, never when it *crashed* | Crash now degrades to ffmpeg; explicitly requested backends never substitute |
| Vertical lines in the GIF | ffmpeg's default ordered `bayer` dither, exposed because the fallback was doing the encoding | `bayer_scale=5` — SSIM 0.858 → 0.999, files *smaller* |
| `palettegen/paletteuse exited with code 1` | Single-pass `palettegen` buffers every frame: ~2 GB at 2560×1440 1:1 | Two-pass palette from a 640 px, 2 fps sample; encode streams |

Also added: a dedicated stop hotkey, a floating indicator with capture controls excluded from
captures, a portable single-file build (dropping 107 MB of foreign-platform dead weight on
the way), and an error log linked from every failure toast.

> **Learning.** Two encoder crashes in a row came from the same change — removing the width
> cap for 1:1 — and both were first diagnosed by inference because the toast showed only an
> exit code. Throwing away stderr is throwing away the evidence.

## 9. Enhancement pass — v0.2.0 (2026-11-06)

Asked to "check for enhancements", nothing new had arrived from anyone: the branch was in sync,
and no issues were open. So the pass was an audit, ranked by user impact. An advisor review
before starting reordered it — the top item was not on the original list.

**Gifomator was breaking Save As system-wide.** The stop key (`Ctrl+Shift+S`) and discard key
(`Ctrl+.`) were registered globally at startup. On Windows, `RegisterHotKey` consumes the
keystroke before the foreground app sees it — so while Gifomator ran, Save As stopped working
in VS Code, Office and browsers, and VS Code's Quick Fix went dead. The fix generalised the
pattern already used for `Esc`: a pure `activeHotkeys(state)` table, applied on every state
change, holds Stop/Discard/Esc only during a capture.

**Silent failures that leave nothing landed.** `new MediaRecorder(stream, {vp9})` had no
try/catch; if it threw, main stayed in `recording`, and a stop left it in `encoding` forever.
A zero-byte capture only reached `console.error` — invisible in a packaged app. Every failure
now goes through one `reportFailure` that logs, notifies, flashes the indicator and returns to
idle, backed by a 30 s stop watchdog and a `render-process-gone` handler.

**A false claim in the README.** "Leaves nothing in AppData" was untrue for the portable build:
Chromium's profile and the error log still went to `%APPDATA%`. `userData` is now redirected
beside the .exe before `ready`, and the README states the one remaining exception (the
`%TEMP%` extraction cache).

**The app layer finally gets a machine check.** A `--smoke` flag boots the packaged app and
checks the tray, indicator, hotkey scoping (held while recording, released after), both bundled
encoders at 1:1 1080p, and — except on macOS — a real 2.5 s screen capture with a clipboard
read-back. CI runs it on Windows and macOS runners and under Xvfb on Linux; failure blocks the
release. Its first Windows run on Electron 33 gave the first machine-verified Windows capture
in the project's history — and showed gifski does **not** stack-overflow at 1080p, so the
user's crash needs larger frames.

**Electron 33 → 45**, gated by that smoke. `electronjs.org` is egress-blocked, so the
breaking-changes doc was read from raw GitHub and grepped against every API the app touches;
type-checking against Electron 45's declarations then flagged exactly the two predicted breaks
and nothing else. Three changes mattered:

- **Clipboard (44.0)** — `writeBuffer` removed; and `text/uri-list` now maps to `CF_HDROP`.
  This *fixed* something: Electron never exposed `CF_HDROP` before, so Windows only ever got
  the path as text. The GIF now goes on the clipboard as a real file, verified by reading it
  back.
- **Capture (45.0)** — `chromeMediaSource: 'desktop'` now rejects only WebContents ids;
  screen/window ids still work. Verified by the live-capture smoke, not just by reading.
- **macOS notifications (42.0)** — UNNotification refuses unsigned apps. Every outcome is now
  also shown on the floating indicator. The smoke's probe on the CI Mac build then failed
  with `UNErrorDomain error 1` — the prediction held, and the fallback was already in place.

On real runners, Electron 45 passed everywhere. Windows verified a real `CF_HDROP` file
reference on the clipboard after a live capture — the first time Gifomator has ever put a
file, not a path, on the Windows clipboard.

**Environment surprises.** Pushes from this session no longer trigger Actions at all — no run
since August despite pushes landing — so verification moved to manual dispatch, and releasing
became an explicit `release: true` input instead of a side effect of every dispatch. The
release step now also refuses to `--clobber` a published version built from a different
commit. And `upload-artifact@v5` turned out to still run on Node 20 — checked against each
tag's `action.yml`, not assumed from the version number.

> **Learning.** An audit of your own shipped code finds what feature work hides. The worst
> defect of the session — stealing Save As from every app — was invisible from inside
> Gifomator, because Gifomator itself worked perfectly.

---

## Distilled learnings

1. **Documentation is a claim; the binary is the evidence.** Every falsified statement came
   from a README or a `package.json`. Licence metadata was wrong in the one case that mattered.
2. **Probe the environment before designing.** "What can I verify here?" produced the `core/`
   purity rule, which is the best structural decision in the project.
3. **A blind reviewer beats a briefed one** for auditing your own work — it cannot inherit
   your assumptions. It independently flagged exactly the claims that measurement disproved.
4. **Tag criteria `[AUTO]` or `[MANUAL]`.** Human judgement dressed as a CI checkbox produces
   green runs that prove nothing.
5. **Test your guardrails by breaking them.** The purity lint was inert (no TS parser) and
   looked like it was passing.
6. **Synthetic fixtures flatter you.** ~8× understatement on the metric that decides whether
   the product is usable.
7. **When measurement contradicts a decision, reopen the decision** — don't quietly relax the
   test. The 38 MB result is a product problem, and it is recorded as one.
8. **Check whether the target measures the promise.** `< 2 s` was wrong in *kind*, not degree.
9. **Deliverability is part of the deliverable.** A green build nobody can download is not done.
10. **Never throw away stderr.** Two encoder crashes were diagnosed by inference because the
    toast showed only an exit code.
11. **A global hotkey is a tax on every other app.** Hold it only while it means something.
12. **Give the untestable layer a self-test in the shipped binary.** `--smoke` on real runners
    found nothing broken on Electron 33 — and that baseline is what made the Electron 45
    upgrade a comparison instead of a hope.
13. **Read the upgrade notes against your own API surface.** Twelve Electron majors reduced to
    three relevant changes, one of which was a fix you could not have built yourself.

## Open at time of writing

- **Preset calibration** — the top item. Real screen recordings are the first honest data;
  the likely fix is size-aware selection.
- **gifski AGPL-3.0+** — unresolved for any distribution beyond internal use. The pluggable
  backend keeps the answer from forcing a rewrite.
- **No LGPL ffmpeg supplier** — both npm options are GPL. The licence gate ships *skipped*;
  `GIFOMATOR_REQUIRE_LGPL=1` makes it a hard failure.
- **`desktopCapturer` vs native macOS window-edge capture** — still the highest-risk unknown,
  and the Electron decision rests on it.
- **Still needs a person** — the region overlay, window picker, mixed-DPI multi-monitor,
  indicator button clicks on a non-activating window, and whether a Slack paste animates.
  The smoke covers boot, hotkeys, encoders, full-screen capture and the clipboard; not these.
- **gifski's Windows stack overflow** — did not reproduce at 1080p on CI; needs the user's
  window size from a `gifomator-last-error.log` to pin down. The ffmpeg fallback covers it.
- **macOS notifications on an unsigned build** — the CI smoke's probe fails with
  `UNErrorDomain error 1` on Electron 45. Mac toasts are gone until the build is signed; the
  indicator reports every outcome. (Windows toasts verified shown.)
- **Not upgraded on purpose:** TypeScript 7 and ESLint 10 (risk, no user value);
  electron-builder 26 (changed signing config; only if CI forces it).
