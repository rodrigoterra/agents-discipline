/**
 * Fallback backend: ffmpeg alone, via palettegen/paletteuse.
 *
 * This exists for licence insurance, not performance. gifski is AGPL-3.0+; if that
 * ever becomes untenable for distribution, this path must be able to take over
 * without a rewrite — which is why gifski is a pluggable backend rather than a hard
 * dependency.
 */
import path from 'node:path';
import { run } from '../run.js';
import { videoFilter } from '../filter.js';
import type { CropRect, Preset } from '../types.js';
import type { EncodeWorkspace } from '../tmpdir.js';

/**
 * Frames per second sampled when building the palette, and the width they are
 * sampled at.
 *
 * palettegen buffers EVERY frame it sees in order to compute one global palette, so a
 * single-pass graph at native resolution is a memory wall: a 10s 2560x1440 capture at
 * 15fps needs ~2 GB and ffmpeg simply exits 1. Colours do not depend on resolution or
 * on seeing every frame, so the palette is built from a downscaled, time-sampled copy
 * — a few dozen small frames instead of hundreds of full-size ones — and pass two
 * streams without buffering.
 */
const PALETTE_SAMPLE_FPS = 2;
const PALETTE_SAMPLE_WIDTH = 640;

export async function encodeWithFfmpeg(
  binaries: { ffmpeg: string },
  workspace: EncodeWorkspace,
  preset: Preset,
  targetWidth: number,
  signal?: AbortSignal,
  crop?: CropRect,
): Promise<void> {
  const palettePath = path.join(workspace.dir, 'palette.png');

  // Pass 1 — palette from a cheap sample. Crop first so the palette describes the
  // region actually being encoded, then downscale hard.
  const sampleStages: string[] = [];
  if (crop) {
    sampleStages.push(
      `crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)}`,
    );
  }
  sampleStages.push(`fps=${PALETTE_SAMPLE_FPS}`);
  sampleStages.push(`scale=${Math.min(PALETTE_SAMPLE_WIDTH, targetWidth)}:-2:flags=bilinear`);
  sampleStages.push(`palettegen=max_colors=${preset.maxColors}:stats_mode=diff`);

  await run(
    binaries.ffmpeg,
    ['-v', 'error', '-y', '-i', workspace.inputPath, '-vf', sampleStages.join(','), palettePath],
    { signal, label: 'ffmpeg (palettegen)' },
  );

  // Pass 2 — apply the palette while streaming.
  //
  // dither=bayer:bayer_scale=5, measured rather than guessed. ffmpeg's default bayer
  // (scale 2) uses a coarse ordered matrix whose pattern is plainly visible as regular
  // lines on flat dark UI. Measured on a dark-UI fixture against the source (SSIM) and
  // on a gradient-heavy fixture (size):
  //
  //   bayer (scale 2)   SSIM 0.8577   UI 238K   gradients 33.0MB
  //   bayer_scale=5     SSIM 0.9993   UI 234K   gradients 26.4MB
  //   sierra2_4a        SSIM 0.9994   UI 236K   gradients 52.4MB
  //
  // bayer_scale=5 matches error diffusion's fidelity on UI content while staying the
  // smallest on both fixtures — error diffusion's noise compresses badly on gradients.
  const filter =
    `[0:v]${videoFilter(preset, targetWidth, crop)}[v];` +
    `[v][1:v]paletteuse=dither=bayer:bayer_scale=5`;

  await run(
    binaries.ffmpeg,
    [
      '-v', 'error', '-y',
      '-i', workspace.inputPath,
      '-i', palettePath,
      '-lavfi', filter,
      '-loop', '0',
      workspace.outputPath,
    ],
    { signal, label: 'ffmpeg (paletteuse)' },
  );
}
