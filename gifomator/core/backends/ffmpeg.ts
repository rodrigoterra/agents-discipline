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
  // dither=bayer:bayer_scale=5, measured rather than guessed.
  //
  // ffmpeg's default bayer (scale 2) uses a coarse ordered matrix whose pattern is
  // plainly visible as regular lines on flat dark UI — the artifact that prompted
  // this change. Measured on a dark-UI fixture against the source (SSIM) and on a
  // gradient-heavy fixture (size):
  //
  //   bayer (scale 2)   SSIM 0.8577   UI 238K   gradients 33.0MB
  //   bayer_scale=5     SSIM 0.9993   UI 234K   gradients 26.4MB
  //   sierra2_4a        SSIM 0.9994   UI 236K   gradients 52.4MB
  //
  // bayer_scale=5 matches error diffusion's fidelity on UI content while staying the
  // smallest on both fixtures — error diffusion's noise compresses badly on gradients.
  const filter =
    `${videoFilter(preset, targetWidth, crop)},split[a][b];` +
    `[a]palettegen=max_colors=${preset.maxColors}[p];` +
    `[b][p]paletteuse=dither=bayer:bayer_scale=5`;

  await run(
    binaries.ffmpeg,
    ['-v', 'error', '-y', '-i', workspace.inputPath, '-vf', filter, '-loop', '0', workspace.outputPath],
    { signal, label: 'ffmpeg (palettegen/paletteuse)' },
  );
}
