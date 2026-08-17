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
  desktopCapturer,
  globalShortcut,
  ipcMain,
  screen,
  shell,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from '../../core/encode.js';
import { PRESETS } from '../../core/presets.js';
import { AbortError } from '../../core/types.js';
import type { CropRect, PresetName } from '../../core/types.js';
import { trayIcon } from './icon.js';
import { deliver } from './output.js';
import { ensureScreenAccess } from './permissions.js';
import { loadSettings, saveSettings } from './settings.js';
import type { CaptureMode } from './settings.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererDir = path.join(dirname, '..', '..', 'app', 'renderer');
const preloadPath = path.join(dirname, '..', 'preload', 'index.cjs');

type AppState = 'idle' | 'selecting' | 'recording' | 'encoding';

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
  updateTray();
  indicator?.webContents.send('indicator:state', next);
}

/* --------------------------------------------------- floating indicator -- */

/**
 * Small always-on-top badge showing the app is alive and what it is doing.
 *
 * setContentProtection(true) is what keeps it out of captures: on Windows it applies
 * WDA_EXCLUDEFROMCAPTURE and on macOS it sets the window's sharing type, so the badge
 * stays visible to the user while being invisible to the recorder — including our own.
 */
function createIndicator(): void {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 132;
  const height = 32;

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
    webPreferences: { preload: preloadPath, contextIsolation: true, nodeIntegration: false },
  });
  void recorder.loadFile(path.join(rendererDir, 'recorder.html'));
  return recorder;
}

async function startCapture(mode: CaptureMode): Promise<void> {
  if (state !== 'idle') return;
  if (!(await ensureScreenAccess())) return;

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
}

function discard(): void {
  if (state === 'recording') {
    recorder?.webContents.send('recorder:discard');
    setState('idle');
  } else if (state === 'encoding') {
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

  // Recorder finished: raw webm arrives, core/ turns it into a GIF.
  ipcMain.on('recorder:data', async (_e, buffer: ArrayBuffer, width: number, height: number) => {
    const settings = loadSettings();
    if (buffer.byteLength === 0 || width === 0) {
      console.error('[gifomator] capture produced no data');
      setState('idle');
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
      await deliver(result, settings.outputFolder);
    } catch (err) {
      if (!(err instanceof AbortError)) {
        console.error('[gifomator] encode failed:', err);
        new (await import('electron')).Notification({
          title: 'Gifomator — encode failed',
          body: err instanceof Error ? err.message : String(err),
        }).show();
      }
    } finally {
      encodeAbort = null;
      pendingCrop = undefined;
      pendingNativeScale = false;
      setState('idle');
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

  // Exposed so an automated smoke test can assert responsiveness during encode.
  ipcMain.handle('app:ping', () => ({ state, at: Date.now() }));
}

/* -------------------------------------------------------------- hotkeys -- */

/** Bindings the OS refused, surfaced in Settings rather than failing silently. */
export const failedBindings = new Set<string>();

function registerHotkeys(): void {
  globalShortcut.unregisterAll();
  failedBindings.clear();
  const { hotkeys } = loadSettings();

  const bind = (accelerator: string, fn: () => void) => {
    if (!accelerator) return;
    try {
      if (!globalShortcut.register(accelerator, fn)) failedBindings.add(accelerator);
    } catch {
      failedBindings.add(accelerator);
    }
  };

  // Mode keys double as stop while recording — "re-press the start key" from the spec.
  bind(hotkeys.region, () => (state === 'recording' ? stopRecording() : void startCapture('region')));
  bind(hotkeys.window, () => (state === 'recording' ? stopRecording() : void startCapture('window')));
  bind(hotkeys.screen, () => (state === 'recording' ? stopRecording() : void startCapture('screen')));
  bind(hotkeys.discard, () => discard());
}

/* ----------------------------------------------------------- lifecycle -- */

app.whenReady().then(() => {
  // Menu-bar / tray resident: no dock icon on macOS.
  if (process.platform === 'darwin') app.dock?.hide();

  tray = new Tray(trayIcon(false));
  registerIpc();
  registerHotkeys();
  updateTray();
  ensureRecorder();
  createIndicator();
});

app.on('window-all-closed', () => {
  // Tray-resident: closing every window must not quit the app.
});

app.on('will-quit', () => globalShortcut.unregisterAll());
