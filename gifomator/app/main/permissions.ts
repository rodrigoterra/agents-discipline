/**
 * macOS Screen Recording (TCC) permission handling.
 *
 * This is the single most likely source of "it's broken" reports: the permission is
 * mandatory, cannot be scripted around, and for an UNSIGNED build the grant can be
 * invalidated whenever the binary changes — so testers may have to re-grant on every
 * update. The app must therefore always explain, never fail silently.
 */
import { dialog, shell, systemPreferences } from 'electron';

const SETTINGS_URL =
  'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';

export type ScreenAccess = 'granted' | 'denied' | 'not-determined' | 'unknown';

export function screenAccessStatus(): ScreenAccess {
  if (process.platform !== 'darwin') return 'granted';
  try {
    const status = systemPreferences.getMediaAccessStatus('screen');
    if (status === 'granted') return 'granted';
    if (status === 'denied' || status === 'restricted') return 'denied';
    return 'not-determined';
  } catch {
    return 'unknown';
  }
}

/**
 * Returns true if capture may proceed. When it returns false the user has already
 * been told why and offered the System Settings deep-link.
 */
export async function ensureScreenAccess(): Promise<boolean> {
  const status = screenAccessStatus();
  if (status === 'granted' || status === 'unknown') return true;

  const { response } = await dialog.showMessageBox({
    type: 'warning',
    title: 'Screen Recording permission needed',
    message: 'Gifomator needs permission to record your screen.',
    detail:
      'Open System Settings → Privacy & Security → Screen Recording and enable Gifomator, ' +
      'then restart the app.\n\n' +
      'Note: because this build is unsigned, macOS may ask you to grant permission again ' +
      'after an update.',
    buttons: ['Open System Settings', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 0) await shell.openExternal(SETTINGS_URL);
  return false;
}
