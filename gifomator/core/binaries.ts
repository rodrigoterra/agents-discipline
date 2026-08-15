/**
 * Resolves the ffmpeg and gifski binaries and inspects what they actually are.
 *
 * The licence check here exists because npm manifest metadata proved unreliable:
 * @ffmpeg-installer/ffmpeg declares LGPL-2.1 but ships a binary configured
 * `--enable-gpl --enable-version3`. Never trust a manifest for a bundled binary —
 * parse the binary's own configuration string. See specs/gifomator-phase1-core.md.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { LicenceError } from './types.js';

const require = createRequire(import.meta.url);

export interface BinaryPaths {
  ffmpeg: string;
  gifski: string | null;
}

let cached: BinaryPaths | null = null;

/** Env overrides let CI point at a self-built LGPL ffmpeg without code changes. */
function fromEnv(name: string): string | null {
  const value = process.env[name];
  return value && existsSync(value) ? value : null;
}

function resolveFfmpeg(): string {
  const override = fromEnv('GIFOMATOR_FFMPEG');
  if (override) return override;
  try {
    const installer = require('@ffmpeg-installer/ffmpeg') as { path: string };
    // Under electron-builder the binary is unpacked out of the asar archive.
    return installer.path.replace('app.asar', 'app.asar.unpacked');
  } catch {
    return 'ffmpeg';
  }
}

function resolveGifski(): string | null {
  const override = fromEnv('GIFOMATOR_GIFSKI');
  if (override) return override;

  const platformDir =
    process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'debian';
  const exe = process.platform === 'win32' ? 'gifski.exe' : 'gifski';

  try {
    const pkg = require.resolve('gifski/package.json');
    const binary = path
      .join(path.dirname(pkg), 'bin', platformDir, exe)
      .replace('app.asar', 'app.asar.unpacked');
    return existsSync(binary) ? binary : null;
  } catch {
    return null;
  }
}

export function resolveBinaries(): BinaryPaths {
  if (!cached) cached = { ffmpeg: resolveFfmpeg(), gifski: resolveGifski() };
  return cached;
}

/** Test seam: forces re-resolution after the environment changes. */
export function clearBinaryCache(): void {
  cached = null;
}

export async function probeBinaries(): Promise<{ ffmpeg: boolean; gifski: boolean }> {
  const { ffmpeg, gifski } = resolveBinaries();
  const [ffmpegOk, gifskiOk] = await Promise.all([
    runsCleanly(ffmpeg, ['-version']),
    gifski ? runsCleanly(gifski, ['--version']) : Promise.resolve(false),
  ]);
  return { ffmpeg: ffmpegOk, gifski: gifskiOk };
}

function runsCleanly(binary: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/** Reads ffmpeg's self-reported build configuration. */
export function ffmpegConfiguration(): Promise<string> {
  const { ffmpeg } = resolveBinaries();
  return new Promise((resolve, reject) => {
    let out = '';
    const child = spawn(ffmpeg, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.stderr.on('data', (d: Buffer) => (out += d.toString()));
    child.on('error', reject);
    child.on('close', () => {
      const line = out.split('\n').find((l) => l.trim().startsWith('configuration:'));
      resolve(line ? line.trim() : '');
    });
  });
}

/**
 * Throws unless the resolved ffmpeg is a non-GPL build.
 *
 * Currently EXPECTED TO THROW for the default @ffmpeg-installer binary. That is
 * deliberate: the failure is the spec's open licence question made visible rather
 * than left as prose. Set GIFOMATOR_FFMPEG to a `--disable-gpl` build to satisfy it.
 */
export async function assertFfmpegIsLgpl(): Promise<void> {
  const configuration = await ffmpegConfiguration();
  if (!configuration) {
    throw new LicenceError('Could not read ffmpeg build configuration', '');
  }
  if (configuration.includes('--enable-gpl') || configuration.includes('--enable-nonfree')) {
    throw new LicenceError(
      'Bundled ffmpeg is a GPL build. The LGPL fallback path is what prevents gifski\'s ' +
        'AGPL licence from forcing a rewrite; a GPL ffmpeg defeats it. Build ffmpeg with ' +
        '--disable-gpl --disable-nonfree and point GIFOMATOR_FFMPEG at it.',
      configuration,
    );
  }
}
