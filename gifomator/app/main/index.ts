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
  nativeImage,
  screen,
  shell,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encode } from '../../core/encode.js';
import { PRESETS } from '../../core/presets.js';
import { AbortError } from '../../core/types.js';
import type { CropRect, PresetName } from '../../core/types.js';
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
let state: AppState = 'idle';
let pendingCrop: CropRect | undefined;
let encodeAbort: AbortController | null = null;

function setState(next: AppState): void {
  state = next;
  updateTray();
}

/* ------------------------------------------------------------------ tray -- */

function trayIcon(): Electron.NativeImage {
  // A 16x16 filled circle, drawn inline so the build needs no binary asset.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <circle cx="8" cy="8" r="6" fill="${state === 'recording' ? '#e5484d' : '#8b8b8b'}"/>
  </svg>`;
  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
  image.setTemplateImage(state !== 'recording');
  return image;
}

function updateTray(): void {
  if (!tray) return;
  tray.setImage(trayIcon());

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

  // Full screen: the display under the cursor.
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  const source =
    sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
  if (!source) return;
  beginRecording(source.id, display.size.width * display.scaleFactor);
}

function beginRecording(sourceId: string, sourceWidth: number): void {
  setState('recording');
  ensureRecorder().webContents.send('recorder:start', { sourceId, sourceWidth });
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
    closeOverlay();
    if (!rect || rect.width < 8 || rect.height < 8) {
      setState('idle');
      return;
    }
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
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
    beginRecording(source.id, pendingCrop.width);
  });

  ipcMain.on('overlay:window-picked', (_e, payload: { id: string; width: number } | null) => {
    closeOverlay();
    if (!payload) {
      setState('idle');
      return;
    }
    beginRecording(payload.id, payload.width || 1280);
  });

  ipcMain.on('overlay:cancel', () => {
    closeOverlay();
    setState('idle');
  });

  // Recorder finished: raw webm arrives, core/ turns it into a GIF.
  ipcMain.on('recorder:data', async (_e, buffer: ArrayBuffer, sourceWidth: number) => {
    const settings = loadSettings();
    encodeAbort = new AbortController();
    try {
      const result = await encode(new Uint8Array(buffer), {
        preset: settings.preset,
        sourceWidth: pendingCrop ? pendingCrop.width : sourceWidth,
        crop: pendingCrop,
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

  tray = new Tray(trayIcon());
  registerIpc();
  registerHotkeys();
  updateTray();
  ensureRecorder();
});

app.on('window-all-closed', () => {
  // Tray-resident: closing every window must not quit the app.
});

app.on('will-quit', () => globalShortcut.unregisterAll());
