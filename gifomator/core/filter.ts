/**
 * Builds the shared ffmpeg video-filter prefix used by both backends.
 *
 * Crop must precede scale: cropping in source pixels after a scale would mean the
 * caller's rectangle no longer refers to what they selected on screen.
 */
import type { CropRect, Preset } from './types.js';

export function videoFilter(preset: Preset, targetWidth: number, crop?: CropRect): string {
  const stages: string[] = [];
  if (crop) {
    stages.push(`crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)}`);
  }
  stages.push(`fps=${preset.fps}`);
  stages.push(`scale=${targetWidth}:-2:flags=lanczos`);
  return stages.join(',');
}
