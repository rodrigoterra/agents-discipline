/**
 * Preset definitions and the output-geometry policy.
 *
 * Values are PROVISIONAL — reasoned, not yet measured against real screen content.
 * specs/gifomator-phase1-core.md tracks the quality proxies that will calibrate them.
 *
 * Tests derive their expected values from this table rather than hard-coding numbers,
 * so tuning a preset cannot silently invalidate an acceptance criterion.
 */
import type { Preset, PresetName } from './types.js';

export const PRESETS: Readonly<Record<PresetName, Preset>> = Object.freeze({
  small: Object.freeze({ name: 'small', fps: 10, maxWidth: 800, quality: 60, maxColors: 64 }),
  balanced: Object.freeze({ name: 'balanced', fps: 15, maxWidth: 1200, quality: 80, maxColors: 128 }),
  sharp: Object.freeze({ name: 'sharp', fps: 20, maxWidth: 1600, quality: 95, maxColors: 256 }),
});

export const DEFAULT_PRESET: PresetName = 'balanced';

export function getPreset(name: PresetName): Preset {
  const preset = PRESETS[name];
  if (!preset) throw new Error(`Unknown preset: ${name}`);
  return preset;
}

/**
 * Output width for a source of `sourceWidth` under `preset`.
 *
 * Never upscales: a 640px source under `sharp` (max 1600) stays 640px. Upscaling a
 * GIF only inflates bytes without adding information.
 */
export function outputWidth(preset: Preset, sourceWidth: number, nativeScale = false): number {
  if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) {
    throw new Error(`Invalid sourceWidth: ${sourceWidth}`);
  }
  const width = Math.floor(sourceWidth);
  // nativeScale bypasses the cap for window/region captures, which the user selected
  // deliberately and expects back 1:1. Widths must stay even for the encoders.
  if (nativeScale) return width % 2 === 0 ? width : width - 1;
  return Math.min(preset.maxWidth, width);
}

/**
 * Height for a target width at a given aspect ratio, rounded to an even number.
 *
 * Mirrors ffmpeg's `scale=w:-2`. Odd dimensions break some decoders, and ffmpeg
 * rounds to the *nearest* even value — not down — which is why a 1280x720 source
 * scaled to 1200 yields 676 rather than the 674 that naive truncation predicts.
 */
export function evenHeight(sourceWidth: number, sourceHeight: number, targetWidth: number): number {
  const exact = (sourceHeight * targetWidth) / sourceWidth;
  return 2 * Math.round(exact / 2);
}
