/**
 * Per-encode temporary directory lifecycle.
 *
 * The public API is bytes-in/bytes-out, but temp files are unavoidable internally:
 * ffmpeg needs an input path and gifski reads PNG files from disk. Confining every
 * intermediate to ONE directory is what makes "no temp file survives an abort"
 * an assertable claim rather than a slogan.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface EncodeWorkspace {
  readonly dir: string;
  readonly inputPath: string;
  readonly framesDir: string;
  readonly framePattern: string;
  readonly outputPath: string;
  cleanup(): Promise<void>;
}

export async function createWorkspace(): Promise<EncodeWorkspace> {
  const dir = await mkdtemp(path.join(tmpdir(), 'gifomator-'));
  const framesDir = path.join(dir, 'frames');

  return {
    dir,
    inputPath: path.join(dir, 'input.webm'),
    framesDir,
    framePattern: path.join(framesDir, 'f%05d.png'),
    outputPath: path.join(dir, 'out.gif'),
    async cleanup() {
      // force: never throw on an already-removed directory — cleanup runs on the
      // success, failure and abort paths alike.
      await rm(dir, { recursive: true, force: true });
    },
  };
}
