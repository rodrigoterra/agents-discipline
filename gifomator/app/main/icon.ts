/**
 * Tray icon generation.
 *
 * Built from a raw BGRA bitmap rather than an SVG data URL: Electron's
 * nativeImage.createFromDataURL does not reliably rasterise SVG on Windows, which
 * left the tray with no visible icon at all. createFromBitmap takes pixels directly,
 * so there is nothing to rasterise and no binary asset to ship.
 */
import { nativeImage } from 'electron';

const SIZE = 32;

/**
 * Draws an anti-aliased filled circle, with a square "stop" cut-out while recording
 * so the state is readable at 16px without relying on colour alone.
 */
function circleBitmap(r: number, g: number, b: number, recording: boolean): Buffer {
  const buffer = Buffer.alloc(SIZE * SIZE * 4);
  const centre = (SIZE - 1) / 2;
  const radius = SIZE * 0.38;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - centre;
      const dy = y - centre;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 1px feather for anti-aliasing.
      let alpha = Math.max(0, Math.min(1, radius - distance + 0.5));

      if (recording) {
        const half = SIZE * 0.16;
        if (Math.abs(dx) < half && Math.abs(dy) < half) alpha = 0;
      }

      const i = (y * SIZE + x) * 4;
      // Electron expects BGRA, premultiplied.
      buffer[i] = Math.round(b * alpha);
      buffer[i + 1] = Math.round(g * alpha);
      buffer[i + 2] = Math.round(r * alpha);
      buffer[i + 3] = Math.round(255 * alpha);
    }
  }
  return buffer;
}

export function trayIcon(recording: boolean): Electron.NativeImage {
  // Recording is red everywhere. Idle is black on macOS so it can be a template image
  // (auto-inverting with the menu bar), and light grey elsewhere for dark taskbars.
  const [r, g, b] = recording
    ? [229, 72, 77]
    : process.platform === 'darwin'
      ? [0, 0, 0]
      : [200, 200, 200];

  const image = nativeImage.createFromBitmap(circleBitmap(r, g, b, recording), {
    width: SIZE,
    height: SIZE,
  });

  if (process.platform === 'darwin' && !recording) image.setTemplateImage(true);
  return image;
}
