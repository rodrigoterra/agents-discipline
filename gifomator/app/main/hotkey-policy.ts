/**
 * Which global hotkeys are bound in which app state.
 *
 * Pure and Electron-free so it can be tested headlessly. The registration itself
 * (globalShortcut) lives in index.ts and simply applies this table on every state
 * change.
 *
 * Why scoping matters: on Windows, RegisterHotKey consumes the keystroke before the
 * foreground application sees it. v0.1.2–0.1.5 bound the stop key (Ctrl+Shift+S) and
 * the discard key (Ctrl+.) permanently at startup, so while Gifomator ran, Save As
 * stopped working in VS Code, Office and browsers, and Ctrl+. (VS Code Quick Fix) went
 * dead. Those keys only mean something during a capture, so that is the only time they
 * are held.
 *
 * The capture keys (Ctrl+Shift+8/9/0 by default) stay bound in every state: they are
 * the app's entry points, they double as "stop" while recording, and the defaults were
 * chosen to be rare chords.
 */

export type AppState = 'idle' | 'selecting' | 'recording' | 'encoding';

export type HotkeyAction = 'region' | 'window' | 'screen' | 'stop' | 'discard' | 'escape';

const CAPTURE_KEYS: readonly HotkeyAction[] = ['region', 'window', 'screen'];

export function activeHotkeys(state: AppState): HotkeyAction[] {
  switch (state) {
    case 'recording':
      // Every way of ending a recording is live: re-press a capture key, the dedicated
      // stop key, Esc (always the gentle exit — it saves), or the discard chord.
      return [...CAPTURE_KEYS, 'stop', 'escape', 'discard'];
    case 'encoding':
      // Only discard has meaning: it aborts the encode and deletes partial output.
      return [...CAPTURE_KEYS, 'discard'];
    case 'idle':
    case 'selecting':
      // Selection has its own Esc inside the overlay window; nothing else is needed.
      return [...CAPTURE_KEYS];
  }
}
