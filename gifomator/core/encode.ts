/**
 * Encode orchestration: backend selection, fallback, timing, cleanup.
 *
 * The public contract is bytes in, bytes out — no filesystem paths cross this
 * boundary. That keeps core/ callable by a future MCP wrapper with no file
 * conventions to agree on, and keeps it testable with no GUI present.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { probeBinaries, resolveBinaries } from './binaries.js';
import { encodeWithFfmpeg } from './backends/ffmpeg.js';
import { encodeWithGifski } from './backends/gifski.js';
import { readGifInfo } from './gifinfo.js';
import { getPreset, outputWidth } from './presets.js';
import { createWorkspace } from './tmpdir.js';
import { AbortError, EncodeError } from './types.js';
import type { Backend, EncodeOptions, EncodeResult } from './types.js';

async function chooseBackend(requested: Backend | undefined): Promise<Backend> {
  if (requested) return requested;
  const available = await probeBinaries();
  return available.gifski ? 'gifski' : 'ffmpeg';
}

export async function encode(input: Uint8Array, opts: EncodeOptions): Promise<EncodeResult> {
  const started = Date.now();
  const preset = getPreset(opts.preset);
  const targetWidth = outputWidth(preset, opts.sourceWidth);
  const binaries = resolveBinaries();
  const workspace = await createWorkspace();

  try {
    if (opts.signal?.aborted) throw new AbortError();

    await writeFile(workspace.inputPath, input);

    let backendUsed = await chooseBackend(opts.backend);
    if (backendUsed === 'gifski' && !binaries.gifski) {
      // Requested or defaulted to gifski but the binary is absent: the fallback
      // exists precisely so this is a degraded success, not a failure.
      backendUsed = 'ffmpeg';
    }

    if (backendUsed === 'gifski') {
      await encodeWithGifski(
        { ffmpeg: binaries.ffmpeg, gifski: binaries.gifski! },
        workspace,
        preset,
        targetWidth,
        opts.signal,
        opts.crop,
      );
    } else {
      await encodeWithFfmpeg(
        { ffmpeg: binaries.ffmpeg },
        workspace,
        preset,
        targetWidth,
        opts.signal,
        opts.crop,
      );
    }

    const gif = new Uint8Array(await readFile(workspace.outputPath));
    if (gif.length === 0) {
      throw new EncodeError('Encoder produced an empty file', '', null);
    }

    const info = readGifInfo(gif);

    return {
      gif,
      width: info.width,
      height: info.height,
      frameCount: info.frameCount,
      fps: preset.fps,
      bytes: gif.length,
      backendUsed,
      durationMs: Date.now() - started,
    };
  } finally {
    // Runs on success, failure and abort alike — this is what makes "no temp file
    // survives" assertable.
    await workspace.cleanup();
  }
}
