/**
 * Persisted user settings: output folder, hotkeys, preset, launch-at-login.
 *
 * Stored as JSON in Electron's userData directory. Deliberately not a dependency —
 * the whole config is five fields and a hotkey map.
 */
import { app } from 'electron';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { PresetName } from '../../core/types.js';

export type CaptureMode = 'region' | 'window' | 'screen';

export interface Hotkeys {
  region: string;
  window: string;
  screen: string;
  discard: string;
}

export interface Settings {
  outputFolder: string;
  preset: PresetName;
  hotkeys: Hotkeys;
  launchAtLogin: boolean;
}

/**
 * Defaults per specs/gifomator-vision.md. These are unreviewed and WILL collide on
 * some machines — conflict detection at bind time is the mitigation, not good luck.
 */
function defaults(): Settings {
  const mod = process.platform === 'darwin' ? 'Command' : 'Control';
  return {
    outputFolder: app.getPath('downloads'),
    preset: 'balanced',
    hotkeys: {
      region: `${mod}+Shift+9`,
      window: `${mod}+Shift+0`,
      screen: `${mod}+Shift+8`,
      discard: `${mod}+.`,
    },
    launchAtLogin: false,
  };
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

let cache: Settings | null = null;

export function loadSettings(): Settings {
  if (cache) return cache;
  const base = defaults();
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf8')) as Partial<Settings>;
    cache = {
      ...base,
      ...raw,
      hotkeys: { ...base.hotkeys, ...(raw.hotkeys ?? {}) },
    };
  } catch {
    cache = base;
  }
  return cache;
}

export function saveSettings(update: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...update };
  if (update.hotkeys) next.hotkeys = { ...loadSettings().hotkeys, ...update.hotkeys };
  cache = next;
  try {
    mkdirSync(path.dirname(settingsPath()), { recursive: true });
    writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
  } catch (err) {
    console.error('[gifomator] failed to persist settings:', err);
  }
  return next;
}

/**
 * Rejects a binding already used by another action within Gifomator.
 *
 * Deliberately does NOT promise to detect collisions with other running apps —
 * neither platform exposes that reliably, and claiming it would be a requirement
 * we cannot meet. OS-level registration failure is reported separately, by the
 * caller checking globalShortcut.register()'s return value.
 */
export function findInternalConflict(
  hotkeys: Hotkeys,
  action: keyof Hotkeys,
  accelerator: string,
): keyof Hotkeys | null {
  for (const [key, value] of Object.entries(hotkeys) as [keyof Hotkeys, string][]) {
    if (key !== action && value.toLowerCase() === accelerator.toLowerCase()) return key;
  }
  return null;
}
