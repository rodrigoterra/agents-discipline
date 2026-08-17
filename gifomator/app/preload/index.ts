/**
 * Preload bridge. contextIsolation is on, so renderers get exactly these calls and
 * no Node access.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gifomator', {
  // Region overlay
  sendRegion: (rect: { x: number; y: number; width: number; height: number } | null) =>
    ipcRenderer.send('overlay:region', rect),
  cancel: () => ipcRenderer.send('overlay:cancel'),

  // Window picker
  onSources: (cb: (sources: unknown[]) => void) =>
    ipcRenderer.on('picker:sources', (_e, sources) => cb(sources)),
  pickWindow: (payload: { id: string; width: number } | null) =>
    ipcRenderer.send('overlay:window-picked', payload),

  // Recorder
  onStart: (cb: (arg: { sourceId: string; maxWidth: number; maxHeight: number }) => void) =>
    ipcRenderer.on('recorder:start', (_e, arg) => cb(arg)),
  onStop: (cb: () => void) => ipcRenderer.on('recorder:stop', () => cb()),
  onDiscard: (cb: () => void) => ipcRenderer.on('recorder:discard', () => cb()),
  sendData: (buffer: ArrayBuffer, width: number, height: number) =>
    ipcRenderer.send('recorder:data', buffer, width, height),

  // Floating desktop indicator
  onIndicatorState: (cb: (state: string, stopKey: string, mode: string) => void) =>
    ipcRenderer.on('indicator:state', (_e, state, stopKey, mode) => cb(state, stopKey, mode)),
  indicatorStart: () => ipcRenderer.send('indicator:start'),
  indicatorStop: () => ipcRenderer.send('indicator:stop'),
  indicatorMenu: (x: number, y: number) => ipcRenderer.send('indicator:menu', x, y),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (update: unknown) => ipcRenderer.invoke('settings:set', update),
  getPresets: () => ipcRenderer.invoke('settings:presets'),
  chooseFolder: () => ipcRenderer.invoke('settings:chooseFolder'),
});
