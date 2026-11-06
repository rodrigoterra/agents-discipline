/**
 * Gifomator main process: tray, global hotkeys, capture orchestration.
 *
 * State machine (specs/gifomator-vision.md):
 *   idle --mode hotkey--> selecting --Esc--> idle (cancel, nothing recorded)
 *   selecting --selection made--> recording
 *   recording --stop hotkey | Esc--> encoding (stop ALWAYS saves)
 *   recording --discard chord--> idle (buffer dropped)
 *   encoding --discard chord--> idle (abort, partial output deleted)
 *
 * Esc is always the gentle exit and never destroys a completed recording;
 * destruction requires the explicit discard chord.
 */
import {
  BrowserWindow,
  Menu,
  Tray,
  app,
  clipboard,
  desktopCapturer,
  Notification,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from 'electron';
import { accessSync, constants as fsConstants, mkdirSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertFfmpegIsLgpl, ffmpegConfiguration, probeBinaries, resolveBinaries } from '../../core/binaries.js';
import { encode } from '../../core/encode.js';
import { run } from '../../core/run.js';
import { PRESETS } from '../../core/presets.js';
import { AbortError, EncodeError } from '../../core/types.js';
import type { CropRect, PresetName } from '../../core/types.js';
import { activeHotkeys } from './hotkey-policy.js';
import type { AppState, HotkeyAction } from './hotkey-policy.js';
import { trayIcon } from './icon.js';
import { deliver, humanSize, notify } from './output.js';
import { ensureScreenAccess } from './permissions.js';
import { loadSettings, saveSettings } from './settings.js';
import type { CaptureMode } from './settings.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.join(dirname, '..', '..', 'app', 'renderer');
const preloadPath = path.join(dirname, '..', 'preload', 'index.cjs');

let tray: Tray | null = null;
let recorder: BrowserWindow | null = null;
let overlay: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let indicator: BrowserWindow | null = null;
let state: AppState = 'idle';
let pendingCrop: CropRect | undefined;
/** Whether the in-flight capture should be emitted 1:1 rather than at the preset cap. */
let pendingNativeScale = false;
let encodeAbort: AbortController | null = null;

export const MODE_LABELS: Record<CaptureMode, string> = {
  region: 'Region',
  window: 'Window',
  screen: 'Full screen',
};

/**
 * Mode the indicator's record button uses, and the one shown on its label.
 * Remembered from the last capture so the button is one click, not two.
 */
let preferredMode: CaptureMode = 'region';
/**
 * The display the selection overlay was opened on.
 *
 * Captured at open time rather than re-resolved when the selection comes back: on a
 * multi-monitor setup the cursor can leave the overlay's display between opening and
 * confirming, and re-resolving would crop from the wrong screen at the wrong scale.
 */
let overlayDisplay: Electron.Display | null = null;

function setState(next: AppState): void {
  state = next;
  applyHotkeys();
  updateTray();
  // The indicator shows the stop key while recording, so it is discoverable without
  // opening Settings or remembering which mode started the capture.
  indicator?.webContents.send(
    'indicator:state',
    next,
    loadSettings().hotkeys.stop,
    MODE_LABELS[preferredMode],
  );
}

/* --------------------------------------------------- floating indicator -- */

/** What clicking the indicator's current result message opens. */
let flashRevealPath: string | null = null;

/**
 * Shows a transient result or failure on the floating indicator.
 *
 * Every outcome is reported here as well as by system notification, because macOS
 * (Electron 42+) refuses notifications from unsigned apps — and this build is
 * unsigned. The indicator needs no OS permission, so it is the channel that always
 * works when it is open.
 */
function flashIndicator(kind: 'success' | 'error', text: string, revealPath: string): void {
  flashRevealPath = revealPath;
  if (indicator && !indicator.isDestroyed()) {
    indicator.webContents.send('indicator:flash', kind, text);
  }
}

/**
 * Small always-on-top badge showing the app is alive and what it is doing.
 *
 * setContentProtection(true) is what keeps it out of captures: on Windows it applies
 * WDA_EXCLUDEFROMCAPTURE and on macOS it sets the window's sharing type, so the badge
 * stays visible to the user while being invisible to the recorder — including our own.
 */
function createIndicator(): void {
  const { workArea } = screen.getPrimaryDisplay();
  // Wide enough for the longest label plus the two control buttons.
  const width = 268;
  const height = 36;

  indicator = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 20,
    y: workArea.y + 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    show: false,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });

  // Must be set before the window is shown to take effect on Windows.
  indicator.setContentProtection(true);
  indicator.setAlwaysOnTop(true, 'screen-saver');
  indicator.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  void indicator.loadFile(path.join(rendererDir, 'indicator.html')).then(() => {
    indicator?.showInactive();
    indicator?.webContents.send('indicator:state', state);
  });

  indicator.on('closed', () => {
    indicator = null;
  });
}

/* ------------------------------------------------------------------ tray -- */

function updateTray(): void {
  if (!tray) return;
  tray.setImage(trayIcon(state === 'recording'));

  const settings = loadSettings();
  const label =
    state === 'recording'
      ? 'Recording — click Stop'
      : state === 'encoding'
        ? 'Encoding…'
        : 'Idle';

  const menu = Menu.buildFromTemplate([
    { label: `Gifomator — ${label}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Capture region',
      accelerator: settings.hotkeys.region,
      enabled: state === 'idle',
      click: () => void startCapture('region'),
    },
    {
      label: 'Capture window',
      accelerator: settings.hotkeys.window,
      enabled: state === 'idle',
      click: () => void startCapture('window'),
    },
    {
      label: 'Capture full screen',
      accelerator: settings.hotkeys.screen,
      enabled: state === 'idle',
      click: () => void startCapture('screen'),
    },
    { type: 'separator' },
    {
      label: 'Stop and save',
      accelerator: settings.hotkeys.stop,
      enabled: state === 'recording',
      click: () => stopRecording(),
    },
    {
      label: 'Discard',
      accelerator: settings.hotkeys.discard,
      enabled: state === 'recording' || state === 'encoding',
      click: () => discard(),
    },
    { type: 'separator' },
    {
      label: 'Preset',
      submenu: (Object.keys(PRESETS) as PresetName[]).map((name) => ({
        label: `${name[0]!.toUpperCase()}${name.slice(1)}`,
        type: 'radio' as const,
        checked: settings.preset === name,
        click: () => {
          saveSettings({ preset: name });
          updateTray();
        },
      })),
    },
    { label: 'Open output folder', click: () => void shell.openPath(settings.outputFolder) },
    { label: 'Settings…', click: () => openSettings() },
    {
      label: 'Show desktop indicator',
      type: 'checkbox',
      checked: Boolean(indicator && !indicator.isDestroyed()),
      click: () => {
        if (indicator && !indicator.isDestroyed()) indicator.close();
        else createIndicator();
        updateTray();
      },
    },
    { type: 'separator' },
    { label: 'Quit Gifomator', click: () => app.quit() },
  ]);

  tray.setContextMenu(menu);
  tray.setToolTip(`Gifomator — ${label}`);
}

/* ------------------------------------------------------------- capturing -- */

/** Hidden renderer that owns getUserMedia + MediaRecorder. */
function ensureRecorder(): BrowserWindow {
  if (recorder && !recorder.isDestroyed()) return recorder;
  recorder = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      // A hidden window is throttled by default, which can stall MediaRecorder's
      // timeslice callbacks and starve the capture.
      backgroundThrottling: false,
    },
  });
  void recorder.loadFile(path.join(rendererDir, 'recorder.html'));

  // If the recorder's process dies mid-capture, nothing would ever answer the stop.
  recorder.webContents.on('render-process-gone', (_e, details) => {
    const wasCapturing = state === 'recording' || state === 'encoding';
    recorder = null;
    if (wasCapturing) {
      void reportFailure('capture failed', new Error(`recorder process ended: ${details.reason}`));
    }
  });
  return recorder;
}

async function startCapture(mode: CaptureMode): Promise<void> {
  if (state !== 'idle') return;
  if (!(await ensureScreenAccess())) return;

  preferredMode = mode;
  pendingCrop = undefined;
  pendingNativeScale = false;

  if (mode === 'region') {
    setState('selecting');
    openOverlay();
    return;
  }

  if (mode === 'window') {
    setState('selecting');
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 320, height: 200 },
    });
    const payload = sources
      .filter((s) => s.name && s.name !== 'Gifomator')
      .map((s) => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
    openOverlay('picker', payload);
    return;
  }

  // Full screen: the display under the cursor. Keeps the preset cap — a 4K display
  // at 1:1 would produce an unusable file.
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  const source =
    sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
  if (!source) return;
  beginRecording(source.id, {
    maxWidth: Math.round(display.size.width * display.scaleFactor),
    maxHeight: Math.round(display.size.height * display.scaleFactor),
  });
}

/**
 * Starts the recorder.
 *
 * Note there is no sourceWidth parameter: the renderer reports the real captured
 * dimensions from the video track once the stream exists. Passing a guess from here
 * is what produced 320px-wide window captures — the picker thumbnail's width.
 */
function beginRecording(sourceId: string, limits: { maxWidth: number; maxHeight: number }): void {
  setState('recording');
  ensureRecorder().webContents.send('recorder:start', { sourceId, ...limits });
}

function stopRecording(): void {
  if (state !== 'recording') return;
  setState('encoding');
  recorder?.webContents.send('recorder:stop');
  // MediaRecorder's stop normally resolves in well under a second. If neither data nor
  // an error arrives, the renderer is wedged — recover instead of waiting forever.
  clearStopWatchdog();
  stopWatchdog = setTimeout(() => {
    void reportFailure(
      'capture failed',
      new Error(`recorder did not respond within ${STOP_WATCHDOG_MS / 1000}s of stopping`),
    );
  }, STOP_WATCHDOG_MS);
}

function discard(): void {
  if (state === 'recording') {
    recorder?.webContents.send('recorder:discard');
    setState('idle');
  } else if (state === 'encoding') {
    clearStopWatchdog();
    encodeAbort?.abort();
    setState('idle');
  }
}

/* --------------------------------------------------------------- overlay -- */

function openOverlay(kind: 'region' | 'picker' = 'region', payload?: unknown): void {
  closeOverlay();
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  overlayDisplay = display;

  overlay = new BrowserWindow({
    ...display.bounds,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    hasShadow: false,
    enableLargerThanScreen: true,
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });

  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  const file = kind === 'region' ? 'overlay.html' : 'picker.html';
  void overlay.loadFile(path.join(rendererDir, file)).then(() => {
    if (payload) overlay?.webContents.send('picker:sources', payload);
  });

  overlay.on('closed', () => {
    overlay = null;
  });
}

function closeOverlay(): void {
  if (overlay && !overlay.isDestroyed()) overlay.close();
  overlay = null;
  overlayDisplay = null;
}

function openSettings(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 560,
    title: 'Gifomator Settings',
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  void settingsWindow.loadFile(path.join(rendererDir, 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

/* --------------------------------------------------------- diagnostics -- */

/** How a capture ended — consumed by the --smoke self-test. */
export type CaptureOutcome =
  | { ok: true; filePath: string; width: number; height: number; bytes: number; backend: string; durationMs: number }
  | { ok: false; stage: string; error: string };

/** Resolved once per capture with its outcome; set by the --smoke self-test. */
let captureWaiter: ((outcome: CaptureOutcome) => void) | null = null;

/** Overrides the configured output folder without persisting it (used by --smoke). */
let outputFolderOverride: string | null = null;

/** Fires if the recorder neither delivers data nor reports an error after a stop. */
let stopWatchdog: NodeJS.Timeout | null = null;
const STOP_WATCHDOG_MS = 30_000;

function clearStopWatchdog(): void {
  if (stopWatchdog) clearTimeout(stopWatchdog);
  stopWatchdog = null;
}

function lastStderrLine(stderr: string): string {
  const lines = stderr.split('\n').map((l) => l.trim()).filter(Boolean);
  return lines[lines.length - 1]?.slice(0, 160) ?? '';
}

/**
 * Writes a failure to a log file and returns its path.
 *
 * Includes the capture geometry, because both encoder failures so far were caused by
 * frame size rather than by anything in the video itself.
 */
async function writeErrorLog(
  stage: string,
  err: unknown,
  geometry: { width: number; height: number },
): Promise<string> {
  const logPath = path.join(app.getPath('userData'), 'gifomator-last-error.log');
  const settings = loadSettings();
  const body = [
    `Gifomator ${app.getVersion()} — ${stage}`,
    `when:     ${new Date().toISOString()}`,
    `platform: ${process.platform} ${process.arch}  electron ${process.versions.electron}`,
    `capture:  ${geometry.width}x${geometry.height}` +
      `${pendingCrop ? ` crop ${Math.round(pendingCrop.width)}x${Math.round(pendingCrop.height)}` : ''}`,
    `preset:   ${settings.preset}  nativeScale=${pendingNativeScale}`,
    `error:    ${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}`,
    '',
    '--- tool stderr ---',
    err instanceof EncodeError ? err.stderr || '(empty)' : '(not an EncodeError)',
    '',
  ].join('\n');

  try {
    await writeFile(logPath, body, 'utf8');
  } catch (writeErr) {
    console.error('[gifomator] could not write error log:', writeErr);
  }
  return logPath;
}

/**
 * The single exit for every failed capture: log it, tell the user, and return to idle.
 *
 * Before this existed, several capture failures only reached console.error — invisible
 * in a packaged app — and some left the state machine stuck in 'recording' or
 * 'encoding', so hotkeys stopped responding and nothing ever landed.
 */
async function reportFailure(
  stage: string,
  err: unknown,
  geometry: { width: number; height: number } = { width: 0, height: 0 },
): Promise<void> {
  clearStopWatchdog();
  const logPath = await writeErrorLog(stage, err, geometry);
  console.error(`[gifomator] ${stage}:`, err);

  const message = err instanceof Error ? err.message : String(err);
  const detail = err instanceof EncodeError ? lastStderrLine(err.stderr) : '';
  notify(
    `Gifomator — ${stage}`,
    `${message}${detail ? `\n${detail}` : ''}\nClick to open the log.`,
    () => shell.showItemInFolder(logPath),
  );
  flashIndicator('error', `${stage[0]!.toUpperCase()}${stage.slice(1)} — click for log`, logPath);

  encodeAbort = null;
  pendingCrop = undefined;
  pendingNativeScale = false;
  setState('idle');
  captureWaiter?.({ ok: false, stage, error: message });
}

/* ------------------------------------------------------------------- ipc -- */

function registerIpc(): void {
  // Region overlay finished: either a rectangle, or a cancel.
  ipcMain.on('overlay:region', async (_e, rect: CropRect | null) => {
    const display = overlayDisplay ?? screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    closeOverlay();
    if (!rect || rect.width < 8 || rect.height < 8) {
      setState('idle');
      return;
    }
    // Overlay coordinates are display-relative because the overlay covers exactly one
    // display; scaleFactor converts them to the captured stream's physical pixels.
    const scale = display.scaleFactor;
    pendingCrop = {
      x: rect.x * scale,
      y: rect.y * scale,
      width: rect.width * scale,
      height: rect.height * scale,
    };
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    const source = sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    if (!source) {
      setState('idle');
      return;
    }
    // A region is an exact area the user drew — give it back 1:1.
    pendingNativeScale = true;
    beginRecording(source.id, {
      maxWidth: Math.round(display.size.width * scale),
      maxHeight: Math.round(display.size.height * scale),
    });
  });

  ipcMain.on('overlay:window-picked', (_e, payload: { id: string } | null) => {
    closeOverlay();
    if (!payload) {
      setState('idle');
      return;
    }
    // A picked window is emitted at its own resolution: downscaling it to the preset
    // cap makes the UI text unreadable, which is the reason for capturing it at all.
    pendingNativeScale = true;
    beginRecording(payload.id, { maxWidth: 3840, maxHeight: 2160 });
  });

  ipcMain.on('overlay:cancel', () => {
    closeOverlay();
    setState('idle');
  });

  // The recorder hit a failure it could not recover from (no stream, no MediaRecorder,
  // no data). Without this the app would sit in 'recording'/'encoding' indefinitely.
  ipcMain.on('recorder:error', (_e, message: string) => {
    // Only a capture in flight can fail; anything else is a late echo of a discard.
    if (state !== 'recording' && state !== 'encoding') {
      console.error('[gifomator] recorder error while idle (ignored):', message);
      return;
    }
    void reportFailure('capture failed', new Error(message));
  });

  // Recorder finished: raw webm arrives, core/ turns it into a GIF.
  ipcMain.on('recorder:data', async (_e, buffer: ArrayBuffer, width: number, height: number) => {
    clearStopWatchdog();
    // Data arriving after a discard (stop → discard before the buffer landed) must be
    // dropped: the user already chose to throw this recording away.
    if (state !== 'encoding') return;
    const settings = loadSettings();
    if (buffer.byteLength === 0 || width === 0) {
      await reportFailure(
        'capture failed',
        new Error(`recorder returned ${buffer.byteLength} bytes at ${width}x${height}`),
        { width, height },
      );
      return;
    }
    encodeAbort = new AbortController();
    try {
      const result = await encode(new Uint8Array(buffer), {
        preset: settings.preset,
        sourceWidth: pendingCrop ? pendingCrop.width : width,
        crop: pendingCrop,
        nativeScale: pendingNativeScale,
        signal: encodeAbort.signal,
      });
      const filePath = await deliver(result, outputFolderOverride ?? settings.outputFolder);
      flashIndicator('success', `Saved ${humanSize(result.bytes)} · copied`, filePath);
      encodeAbort = null;
      pendingCrop = undefined;
      pendingNativeScale = false;
      setState('idle');
      captureWaiter?.({
        ok: true,
        filePath,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        backend: result.backendUsed,
        durationMs: result.durationMs,
      });
    } catch (err) {
      if (err instanceof AbortError) {
        // A discard during encoding is the user's decision, not a failure.
        encodeAbort = null;
        pendingCrop = undefined;
        pendingNativeScale = false;
        setState('idle');
        captureWaiter?.({ ok: false, stage: 'discarded', error: 'aborted by user' });
        return;
      }
      // The tool's own stderr goes to the log; the toast links to it. The first two
      // encode failures were diagnosed by guesswork because only the exit code showed.
      await reportFailure('encode failed', err, { width, height });
    }
  });

  ipcMain.handle('settings:get', () => loadSettings());
  ipcMain.handle('settings:set', (_e, update) => {
    const next = saveSettings(update);
    registerHotkeys();
    updateTray();
    if (typeof update?.launchAtLogin === 'boolean') {
      app.setLoginItemSettings({ openAtLogin: update.launchAtLogin });
    }
    return next;
  });
  ipcMain.handle('settings:presets', () => PRESETS);
  ipcMain.handle('settings:chooseFolder', async () => {
    const { dialog } = await import('electron');
    const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths[0]) return null;
    saveSettings({ outputFolder: res.filePaths[0] });
    return res.filePaths[0];
  });

  // --- floating indicator controls ---

  ipcMain.on('indicator:start', () => void startCapture(preferredMode));
  ipcMain.on('indicator:stop', () => stopRecording());
  ipcMain.on('indicator:reveal', () => {
    if (flashRevealPath) shell.showItemInFolder(flashRevealPath);
  });

  ipcMain.on('indicator:menu', (_e, x: number, y: number) => {
    if (!indicator || indicator.isDestroyed()) return;
    const menu = Menu.buildFromTemplate(
      (Object.keys(MODE_LABELS) as CaptureMode[]).map((mode) => ({
        label: MODE_LABELS[mode],
        type: 'radio' as const,
        checked: preferredMode === mode,
        // Selecting a mode starts that capture immediately — the menu is the
        // capture button, not a settings pane.
        click: () => void startCapture(mode),
      })),
    );
    menu.popup({ window: indicator, x, y });
  });

  // Exposed so an automated smoke test can assert responsiveness during encode.
  ipcMain.handle('app:ping', () => ({ state, at: Date.now() }));
}

/* -------------------------------------------------------------- hotkeys -- */

/** Bindings the OS refused, surfaced in Settings rather than failing silently. */
export const failedBindings = new Set<string>();

/** Accelerators currently held, so a state change only touches what differs. */
const heldBindings = new Map<string, HotkeyAction>();

function acceleratorFor(action: HotkeyAction): string {
  if (action === 'escape') return 'Escape';
  return loadSettings().hotkeys[action] ?? '';
}

function handlerFor(action: HotkeyAction): () => void {
  switch (action) {
    // Capture keys double as stop while recording — "re-press the start key".
    case 'region':
    case 'window':
    case 'screen':
      return () => (state === 'recording' ? stopRecording() : void startCapture(action));
    case 'stop':
    case 'escape':
      return () => stopRecording();
    case 'discard':
      return () => discard();
  }
}

/**
 * Brings the OS-level registrations in line with activeHotkeys(state).
 *
 * Called on every state change. Stop, discard and Esc are only held during a capture,
 * because a global registration steals the key from every other application.
 */
function applyHotkeys(): void {
  const wanted = new Map<string, HotkeyAction>();
  for (const action of activeHotkeys(state)) {
    const accelerator = acceleratorFor(action);
    if (accelerator) wanted.set(accelerator, action);
  }

  for (const [accelerator, action] of heldBindings) {
    if (wanted.get(accelerator) !== action) {
      try {
        globalShortcut.unregister(accelerator);
      } catch {
        // Already gone — the desired state either way.
      }
      heldBindings.delete(accelerator);
    }
  }

  for (const [accelerator, action] of wanted) {
    if (heldBindings.has(accelerator)) continue;
    try {
      if (globalShortcut.register(accelerator, handlerFor(action))) {
        heldBindings.set(accelerator, action);
        failedBindings.delete(accelerator);
      } else {
        failedBindings.add(accelerator);
      }
    } catch {
      failedBindings.add(accelerator);
    }
  }
}

/** Re-registers from scratch — used when the user rebinds a key in Settings. */
function registerHotkeys(): void {
  globalShortcut.unregisterAll();
  heldBindings.clear();
  failedBindings.clear();
  applyHotkeys();
}

/* ---------------------------------------------------------- self-test -- */

/**
 * `--smoke [--smoke-out=<file>]`: boot the packaged app, exercise it, write a JSON
 * report, exit 0/1. Run by CI on the real Windows and macOS runners.
 *
 * It exists because the whole app/ layer had never been executed by anything but a
 * person. Every Windows defect so far — no bundled ffmpeg.exe, a 320px window capture,
 * gifski's stack overflow, palettegen's memory wall — lived in exactly the code no
 * headless test could reach. This checks, in the shipped binary:
 *   - the tray and the indicator come up,
 *   - only the capture keys are held while idle (the hotkey-scoping regression),
 *   - the BUNDLED ffmpeg/gifski resolve and encode a 1080p clip at 1:1,
 *   - on Windows (and Linux/Xvfb), a real 2.5 s screen capture runs end to end and
 *     lands as a GIF,
 *     with stop/discard/Esc held only while recording.
 * macOS skips the live capture: it needs a Screen Recording grant a runner cannot give.
 */
/** Reads the indicator buttons' disabled state straight from its DOM. */
async function readIndicatorControls(): Promise<{ recordDisabled: boolean; captureDisabled: boolean } | string> {
  if (!indicator || indicator.isDestroyed()) return 'indicator not open';
  try {
    const [recordDisabled, captureDisabled] = (await indicator.webContents.executeJavaScript(
      '[document.getElementById("record").disabled, document.getElementById("capture").disabled]',
    )) as [boolean, boolean];
    return { recordDisabled, captureDisabled };
  } catch (err) {
    return `read failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

function controlsEnabled(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { recordDisabled: boolean }).recordDisabled === false &&
    (value as { captureDisabled: boolean }).captureDisabled === false
  );
}

async function runSmoke(): Promise<void> {
  const outArg = process.argv.find((a) => a.startsWith('--smoke-out='));
  const outPath = outArg ? outArg.slice('--smoke-out='.length) : path.join(tmpdir(), 'gifomator-smoke.json');
  const checks: Record<string, unknown> = {};
  const report: Record<string, unknown> = {
    ok: false,
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: `${process.platform} ${process.arch}`,
    checks,
  };

  const finish = async (ok: boolean) => {
    report.ok = ok;
    const json = JSON.stringify(report, null, 2);
    try {
      await writeFile(outPath, json, 'utf8');
    } catch (err) {
      console.error('[smoke] could not write report:', err);
    }
    console.log(json);
    app.exit(ok ? 0 : 1);
  };

  // A hang must fail the job, not stall it until the runner's own timeout.
  const watchdog = setTimeout(() => {
    report.error = 'smoke timed out after 180s';
    void finish(false);
  }, 180_000);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const settings = loadSettings();
  const scopedKeys = [settings.hotkeys.stop, settings.hotkeys.discard, 'Escape'];

  try {
    checks.tray = Boolean(tray);
    checks.indicator = Boolean(indicator && !indicator.isDestroyed());
    checks.failedBindings = [...failedBindings];

    // Informational: does the OS actually display our toasts? Since Electron 42 macOS
    // refuses notifications from unsigned apps; this records whether that bites the
    // shipped build. The floating indicator reports every outcome regardless.
    checks.notification = await new Promise<string>((resolve) => {
      const probe = new Notification({ title: 'Gifomator self-test', body: 'notification probe', silent: true });
      const timer = setTimeout(() => resolve('no show/failed event within 5s'), 5_000);
      probe.on('show', () => {
        clearTimeout(timer);
        resolve('shown');
      });
      probe.on('failed', (_e, error) => {
        clearTimeout(timer);
        resolve(`failed: ${error}`);
      });
      probe.show();
    });

    checks.indicatorControlsIdle = await readIndicatorControls();

    const idleHeld = [...heldBindings.keys()];
    checks.idleHeldBindings = idleHeld;
    const leakedWhileIdle = idleHeld.filter((k) => scopedKeys.includes(k));
    checks.hotkeyScopingOk = leakedWhileIdle.length === 0;

    checks.binaries = await probeBinaries();
    checks.ffmpegConfiguration = (await ffmpegConfiguration()).slice(0, 120);
    try {
      await assertFfmpegIsLgpl();
      checks.ffmpegLgpl = true;
    } catch {
      checks.ffmpegLgpl = false; // known: the bundled build is GPL; informational
    }

    // Encode a synthesized 1080p clip through the bundled binaries, at 1:1.
    const workDir = await mkdtemp(path.join(tmpdir(), 'gifomator-smoke-'));
    const clip = path.join(workDir, 'clip.mp4');
    await run(
      resolveBinaries().ffmpeg,
      ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=1920x1080:rate=30',
        '-c:v', 'mpeg4', '-q:v', '5', clip],
      { label: 'ffmpeg (smoke clip)' },
    );
    const clipBytes = new Uint8Array(await readFile(clip));

    const tryEncode = async (backend?: 'gifski' | 'ffmpeg') => {
      try {
        const r = await encode(clipBytes, { preset: 'balanced', sourceWidth: 1920, nativeScale: true, backend });
        return { ok: true, backend: r.backendUsed, size: `${r.width}x${r.height}`, bytes: r.bytes, ms: r.durationMs };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
          stderr: err instanceof EncodeError ? err.stderr.slice(-400) : undefined,
        };
      }
    };
    // Default path (gifski, falling back to ffmpeg) and each backend explicitly, so a
    // gifski crash shows up as data instead of being hidden by the fallback.
    const encodeDefault = await tryEncode();
    const encodeGifski = await tryEncode('gifski');
    const encodeFfmpeg = await tryEncode('ffmpeg');
    checks.encodeDefault = encodeDefault;
    checks.encodeGifski = encodeGifski;
    checks.encodeFfmpeg = encodeFfmpeg;

    let captureOk = true;
    // Live capture everywhere except macOS, whose Screen Recording grant a runner
    // cannot give. On Linux under Xvfb it exercises the same recorder path as Windows.
    if (process.platform !== 'darwin') {
      outputFolderOverride = workDir;
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      const source = sources[0];
      if (!source) throw new Error('desktopCapturer returned no screen sources');
      const display = screen.getPrimaryDisplay();

      const outcome = new Promise<CaptureOutcome>((resolve) => {
        captureWaiter = resolve;
      });
      beginRecording(source.id, {
        maxWidth: Math.round(display.size.width * display.scaleFactor),
        maxHeight: Math.round(display.size.height * display.scaleFactor),
      });
      await sleep(2_500);
      const recordingHeld = [...heldBindings.keys()];
      stopRecording();

      const result = await Promise.race([
        outcome,
        sleep(90_000).then((): CaptureOutcome => ({ ok: false, stage: 'smoke', error: 'no outcome within 90s' })),
      ]);
      captureWaiter = null;
      checks.capture = result;
      checks.recordingHeldBindings = recordingHeld;

      // Read the clipboard back: the delivered GIF must be there as a FILE reference
      // (text/uri-list → CF_HDROP on Windows), not just as text — that is what makes a
      // paste into Slack or Explorer carry the animated file.
      let clipboardOk = false;
      if (result.ok) {
        try {
          const items = await clipboard.read();
          checks.clipboardTypes = items.flatMap((i) => i.types);
          const fileItem = items.find((i) => i.types.includes('text/uri-list'));
          const uris = fileItem ? await (await fileItem.getType('text/uri-list')).text() : '';
          // Output names are Gifomator-YYYYMMDD-HHMMSS.gif — nothing a file:// URI escapes.
          clipboardOk = uris.includes(path.basename(result.filePath));
          checks.clipboardFileReference = clipboardOk ? uris.trim() : `missing (got: ${uris || 'nothing'})`;
        } catch (err) {
          checks.clipboardFileReference = `read failed: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
      // The indicator's ● and Capture ▾ must be usable again the moment a capture ends —
      // including while its result message is still showing. In v0.2.0 they stayed
      // disabled for the whole 7–12 s message, worst right after a failure.
      checks.indicatorControlsAfterCapture = await readIndicatorControls();

      // Back at idle the scoped keys must be released again, or Save As stays broken
      // after the first capture even though startup looked fine.
      const afterHeld = [...heldBindings.keys()];
      checks.afterCaptureHeldBindings = afterHeld;
      checks.scopedKeysReleased = !afterHeld.some((k) => scopedKeys.includes(k));
      checks.stopHeldWhileRecording = recordingHeld.includes(settings.hotkeys.stop) || failedBindings.has(settings.hotkeys.stop);
      // Stop before the stream exists: start, then stop at once, so the stop lands while
      // getUserMedia is still pending. Main must recover to idle, and the stream that
      // resolves afterwards must be released — before the generation token it kept
      // recording forever (on macOS, with the screen-recording indicator lit).
      const raceOutcome = new Promise<CaptureOutcome>((resolve) => {
        captureWaiter = resolve;
      });
      beginRecording(source.id, { maxWidth: 1280, maxHeight: 720 });
      stopRecording();
      const race = await Promise.race([
        raceOutcome,
        sleep(30_000).then((): CaptureOutcome => ({ ok: false, stage: 'smoke', error: 'no outcome within 30s' })),
      ]);
      captureWaiter = null;
      await sleep(3_000); // let the pending getUserMedia resolve
      const recorderState = recorder
        ? await recorder.webContents
            .executeJavaScript('recorder ? recorder.state : "none"')
            .catch((err: unknown) => `read failed: ${String(err)}`)
        : 'no recorder window';
      checks.stopBeforeStream = { outcome: race, appState: state, recorderState };
      const noLeak = state === 'idle' && recorderState !== 'recording';
      checks.stopBeforeStreamNoLeak = noLeak;

      captureOk =
        result.ok &&
        checks.scopedKeysReleased === true &&
        clipboardOk &&
        controlsEnabled(checks.indicatorControlsAfterCapture) &&
        noLeak;
    } else {
      checks.capture = { skipped: 'live capture needs a Screen Recording grant a CI runner cannot give' };
    }

    const ok =
      checks.tray === true &&
      checks.indicator === true &&
      controlsEnabled(checks.indicatorControlsIdle) &&
      checks.hotkeyScopingOk === true &&
      encodeDefault.ok &&
      encodeFfmpeg.ok &&
      captureOk;
    clearTimeout(watchdog);
    await finish(ok);
  } catch (err) {
    clearTimeout(watchdog);
    report.error = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    await finish(false);
  }
}

/* ----------------------------------------------------------- lifecycle -- */

const SMOKE = process.argv.includes('--smoke');
const PORTABLE_DIR = process.env.PORTABLE_EXECUTABLE_DIR;

/**
 * Portable build: keep Electron's own data (Chromium profile, caches, the error log,
 * settings) in a folder beside the .exe instead of %APPDATA%.
 *
 * Must run before 'ready' and before the single-instance lock, which lives in userData.
 * Skipped if the folder is not writable (e.g. run from a read-only share), in which
 * case the normal per-user location is the only option that works.
 */
function configurePortableData(): void {
  if (!PORTABLE_DIR) return;
  const dataDir = path.join(PORTABLE_DIR, 'Gifomator-data');
  try {
    mkdirSync(dataDir, { recursive: true });
    accessSync(dataDir, fsConstants.W_OK);
    app.setPath('userData', dataDir);
  } catch (err) {
    console.error('[gifomator] portable data dir not writable, using default:', err);
  }
}

/**
 * Windows toast attribution.
 *
 * Without an AppUserModelID, toasts are headed "electron.app.Gifomator". The installer
 * build registers a Start-menu shortcut carrying the appId, so Windows resolves that ID
 * to the product name. The portable build has no shortcut, and Windows then shows the
 * raw ID — so it gets the bare product name instead.
 */
function configureToastIdentity(): void {
  if (process.platform !== 'win32') return;
  app.setAppUserModelId(PORTABLE_DIR ? 'Gifomator' : 'io.arvore.gifomator');
}

configurePortableData();
configureToastIdentity();

// One tray, one set of hotkeys. A second launch (easy with a portable .exe) would
// otherwise add a second tray icon whose hotkey registrations all fail. The smoke
// self-test skips the lock so it can always run.
const primaryInstance = SMOKE || app.requestSingleInstanceLock();

if (!primaryInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Give the second launch a visible answer instead of silently exiting.
    if (!indicator || indicator.isDestroyed()) createIndicator();
    openSettings();
  });

  app.whenReady().then(() => {
    // Menu-bar / tray resident: no dock icon on macOS.
    if (process.platform === 'darwin') app.dock?.hide();

    tray = new Tray(trayIcon(false));
    registerIpc();
    registerHotkeys();
    updateTray();
    ensureRecorder();
    createIndicator();

    if (SMOKE) void runSmoke();
  });
}

app.on('window-all-closed', () => {
  // Tray-resident: closing every window must not quit the app.
});

app.on('will-quit', () => globalShortcut.unregisterAll());
