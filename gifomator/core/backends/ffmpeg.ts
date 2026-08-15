/**
 * Fallback backend: ffmpeg alone, via palettegen/paletteuse.
 *
 * This exists for licence insurance, not performance. gifski is AGPL-3.0+; if that
 * ever becomes untenable for distribution, this path must be able to take over
 * without a rewrite — which is why gifski is a pluggable backend rather than a hard
 * dependency. Measured cost of the insurance: ~19% larger output, ~35% faster.
 */
import { run } from '../run.js';
import { videoFilter } from '../filter.js';
import type { CropRect, Preset } from '../types.js';
import type { EncodeWorkspace } from '../tmpdir.js';

export async function encodeWithFfmpeg(
  binaries: { ffmpeg: string },
  workspace: EncodeWorkspace,
  preset: Preset,
  targetWidth: number,
  signal?: AbortSignal,
  crop?: CropRect,
): Promise<void> {
  const filter =
    `${videoFilter(preset, targetWidth, crop)},split[a][b];` +
    `[a]palettegen=max_colors=${preset.maxColors}[p];[b][p]paletteuse=dither=bayer`;

  await run(
    binaries.ffmpeg,
    ['-v', 'error', '-y', '-i', workspace.inputPath, '-vf', filter, '-loop', '0', workspace.outputPath],
    { signal, label: 'ffmpeg (palettegen/paletteuse)' },
  );
}
