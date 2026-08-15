/**
 * Generates test fixtures with ffmpeg. Nothing binary is committed to git.
 *
 * Two fixtures, because one is not enough:
 *   synthetic — testsrc. Fast, but flat-coloured synthetic motion: the EASIEST
 *               possible case for palette quantization. Green tests here say very
 *               little about real output.
 *   text      — rendered text over a moving background. This is the case that
 *               actually matters, since screen recordings are mostly text and UI
 *               chrome, and it is where quantization decisions become visible.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_DIR = here;
export const SYNTHETIC = path.join(here, 'synthetic.webm');
export const TEXT = path.join(here, 'text.webm');

export function ffmpegPath() {
  if (process.env.GIFOMATOR_FFMPEG) return process.env.GIFOMATOR_FFMPEG;
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    return 'ffmpeg';
  }
}

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`)),
    );
  });
}

export async function ensureFixtures({ duration = 10 } = {}) {
  mkdirSync(FIXTURE_DIR, { recursive: true });

  if (!existsSync(SYNTHETIC)) {
    await run([
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', `testsrc=duration=${duration}:size=1280x720:rate=30`,
      '-pix_fmt', 'yuv420p', SYNTHETIC,
    ]);
  }

  if (!existsSync(TEXT)) {
    // mandelbrot gives continuous colour gradients — far harder for a 64-colour
    // palette than testsrc's flat blocks — and the text on top is the detail that
    // actually has to survive quantization in a real screen recording.
    //
    // Deliberately NOT `gradients`: that source filter postdates the ffmpeg build
    // currently bundled (2018), and fixtures must generate on whatever ffmpeg is
    // resolved rather than assuming a modern one.
    const filter =
      `drawtext=text='Gifomator quantization test 0123456789':` +
      `fontcolor=white:fontsize=36:x=40:y=h/2-120,` +
      `drawtext=text='The quick brown fox jumps over the lazy dog':` +
      `fontcolor=white:fontsize=28:x=40:y=h/2-40,` +
      `drawtext=text='%{n}':fontcolor=yellow:fontsize=48:x=40:y=h/2+40`;
    await run([
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', `mandelbrot=size=1280x720:rate=30`,
      '-t', String(duration),
      '-vf', filter, '-pix_fmt', 'yuv420p', TEXT,
    ]);
  }

  return { synthetic: SYNTHETIC, text: TEXT };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  ensureFixtures().then(
    () => console.log('fixtures ready'),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
