/**
 * Primary backend: ffmpeg decodes and scales to PNG frames, gifski quantizes and encodes.
 *
 * Why PNG frames rather than a y4m pipe: the shipped gifski binary is built without
 * the `video` feature and accepts PNG files only — `-` on stdin fails outright. And
 * measurement showed the detour costs ~13% of wall clock while quantization is ~87%,
 * so building a custom gifski would recover almost nothing. See the spec's measured
 * baseline.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { run } from '../run.js';
import { videoFilter } from '../filter.js';
import type { CropRect, Preset } from '../types.js';
import { EncodeError } from '../types.js';
import type { EncodeWorkspace } from '../tmpdir.js';

export async function encodeWithGifski(
  binaries: { ffmpeg: string; gifski: string },
  workspace: EncodeWorkspace,
  preset: Preset,
  targetWidth: number,
  signal?: AbortSignal,
  crop?: CropRect,
): Promise<void> {
  await mkdir(workspace.framesDir, { recursive: true });

  await run(
    binaries.ffmpeg,
    [
      '-v', 'error',
      '-i', workspace.inputPath,
      '-vf', videoFilter(preset, targetWidth, crop),
      workspace.framePattern,
    ],
    { signal, label: 'ffmpeg (decode/scale)' },
  );

  // Basenames, not full paths: gifski takes every frame as a command-line argument,
  // and Windows caps a command line at 32767 characters. Long captures at native
  // resolution can produce hundreds of frames, so the run happens with cwd set to the
  // frames directory to keep the command line short.
  const frames = (await readdir(workspace.framesDir)).filter((f) => f.endsWith('.png')).sort();

  if (frames.length === 0) {
    throw new EncodeError('ffmpeg produced no frames from the input', '', null);
  }

  await run(
    binaries.gifski,
    [
      '-q',
      '-o', path.resolve(workspace.outputPath),
      '--fps', String(preset.fps),
      '--quality', String(preset.quality),
      '--width', String(targetWidth),
      ...frames,
    ],
    { signal, label: 'gifski', cwd: workspace.framesDir },
  );
}
