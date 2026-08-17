/**
 * Encoder integration tests — the Phase 1 acceptance criteria.
 *
 * Expected values are MEASURED from real output, not derived arithmetically, and
 * geometry is read from presets.ts at test time so tuning a preset cannot silently
 * invalidate a criterion.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  encode,
  readGifInfo,
  probeBinaries,
  clearBinaryCache,
  PRESETS,
  outputWidth,
  evenHeight,
  livePids,
  AbortError,
  EncodeError,
} from '../dist/core/index.js';
import { ensureFixtures } from './fixtures/make-fixtures.mjs';

const SOURCE_W = 1280;
const SOURCE_H = 720;
const DURATION = 10;

let fixtures;
let available;

test.before(async () => {
  fixtures = await ensureFixtures({ duration: DURATION });
  available = await probeBinaries();
});

async function load(which = 'synthetic') {
  return new Uint8Array(await readFile(fixtures[which]));
}

function gifomatorTmpDirs() {
  return readdir(tmpdir()).then((names) => names.filter((n) => n.startsWith('gifomator-')));
}

test('produces a valid GIF89a with measured geometry and frame timing', async () => {
  const preset = PRESETS.balanced;
  const result = await encode(await load(), { preset: 'balanced', sourceWidth: SOURCE_W });

  assert.equal(String.fromCharCode(...result.gif.slice(0, 6)), 'GIF89a');

  const expectedWidth = outputWidth(preset, SOURCE_W);
  const expectedHeight = evenHeight(SOURCE_W, SOURCE_H, expectedWidth);
  assert.equal(result.width, expectedWidth);
  assert.equal(result.height, expectedHeight);

  // 10s at 15fps = 150 frames, +/-1 because the fps filter may duplicate or drop one.
  const expectedFrames = DURATION * preset.fps;
  assert.ok(
    Math.abs(result.frameCount - expectedFrames) <= 1,
    `expected ~${expectedFrames} frames, got ${result.frameCount}`,
  );

  // GIF delays are integer centiseconds. 1/15s = 6.67cs, so the encoder must emit a
  // mix of 6 and 7 — asserting "15 fps" exactly would be unsatisfiable.
  const info = readGifInfo(result.gif);
  const distinct = [...new Set(info.delays)].sort();
  for (const d of distinct) {
    assert.ok(d === 6 || d === 7, `unexpected frame delay ${d}cs (expected 6 or 7)`);
  }
  const mean = info.delays.reduce((a, b) => a + b, 0) / info.delays.length;
  const expectedMean = 100 / preset.fps;
  assert.ok(
    Math.abs(mean - expectedMean) / expectedMean < 0.05,
    `mean delay ${mean.toFixed(2)}cs is >5% from the expected ${expectedMean.toFixed(2)}cs`,
  );
});

test('never upscales a narrow source', async () => {
  // Encoded at 640 wide so `sharp` (max 1600) has something to not upscale.
  const small = await encode(await load(), {
    preset: 'sharp',
    sourceWidth: 640,
    crop: { x: 0, y: 0, width: 640, height: 480 },
  });
  assert.equal(small.width, 640);
});

test('crop is applied in source pixels before scaling', async () => {
  const result = await encode(await load(), {
    preset: 'small',
    sourceWidth: 400,
    crop: { x: 100, y: 50, width: 400, height: 300 },
  });
  assert.equal(result.width, 400); // below small's 800 cap, so unscaled
  assert.equal(result.height, 300);
});

test('both backends produce valid GIFs of identical dimensions', async (t) => {
  if (!available.gifski) return t.skip('gifski binary unavailable');
  const input = await load();
  const viaGifski = await encode(input, { preset: 'balanced', sourceWidth: SOURCE_W, backend: 'gifski' });
  const viaFfmpeg = await encode(input, { preset: 'balanced', sourceWidth: SOURCE_W, backend: 'ffmpeg' });

  assert.equal(viaGifski.backendUsed, 'gifski');
  assert.equal(viaFfmpeg.backendUsed, 'ffmpeg');
  assert.equal(viaGifski.width, viaFfmpeg.width);
  assert.equal(viaGifski.height, viaFfmpeg.height);
  assert.equal(String.fromCharCode(...viaFfmpeg.gif.slice(0, 6)), 'GIF89a');
});

test('falls back to ffmpeg when gifski is unavailable', async () => {
  // The fallback exists as licence insurance: gifski is AGPL-3.0+, so the app must
  // remain fully functional without it.
  const result = await encode(await load(), {
    preset: 'balanced',
    sourceWidth: SOURCE_W,
    backend: 'ffmpeg',
  });
  assert.equal(result.backendUsed, 'ffmpeg');
  assert.equal(String.fromCharCode(...result.gif.slice(0, 6)), 'GIF89a');
});

test('falls back to ffmpeg when gifski CRASHES, not just when it is missing', async (t) => {
  // Regression: gifski died with STATUS_STACK_OVERFLOW (0xC00000FD / 3221225725) on
  // Windows for large native-resolution frames, and the whole capture was lost —
  // the fallback only handled gifski being ABSENT, never gifski failing. A recording
  // cannot be retaken, so a crash must degrade to ffmpeg rather than throw.
  const stub = path.join(tmpdir(), `gifski-crash-${process.pid}`);
  if (process.platform === 'win32') return t.skip('shell stub is POSIX-only');

  await writeFile(stub, '#!/bin/sh\necho "simulated crash" >&2\nexit 134\n', { mode: 0o755 });
  const previous = process.env.GIFOMATOR_GIFSKI;
  process.env.GIFOMATOR_GIFSKI = stub;
  clearBinaryCache();

  try {
    const result = await encode(await load(), { preset: 'small', sourceWidth: SOURCE_W });
    assert.equal(result.backendUsed, 'ffmpeg', 'a crashing gifski should fall back');
    assert.equal(String.fromCharCode(...result.gif.slice(0, 6)), 'GIF89a');
  } finally {
    if (previous === undefined) delete process.env.GIFOMATOR_GIFSKI;
    else process.env.GIFOMATOR_GIFSKI = previous;
    clearBinaryCache();
    await rm(stub, { force: true });
  }
});

test('an explicitly requested gifski backend does not silently substitute', async (t) => {
  // Automatic fallback is for the default path. If a caller names a backend, a
  // substitution would make benchmarks and the licence test meaningless.
  const stub = path.join(tmpdir(), `gifski-crash2-${process.pid}`);
  if (process.platform === 'win32') return t.skip('shell stub is POSIX-only');

  await writeFile(stub, '#!/bin/sh\nexit 134\n', { mode: 0o755 });
  const input = await load();
  const previous = process.env.GIFOMATOR_GIFSKI;
  process.env.GIFOMATOR_GIFSKI = stub;
  clearBinaryCache();

  try {
    await assert.rejects(
      () => encode(input, { preset: 'small', sourceWidth: SOURCE_W, backend: 'gifski' }),
      (err) => err instanceof EncodeError,
    );
  } finally {
    if (previous === undefined) delete process.env.GIFOMATOR_GIFSKI;
    else process.env.GIFOMATOR_GIFSKI = previous;
    clearBinaryCache();
    await rm(stub, { force: true });
  }
});

test('encodes a large capture at 1:1 without exhausting memory', async () => {
  // Regression: with the preset width cap removed for window/region captures, a
  // single-pass palettegen graph buffered every full-size frame and ffmpeg exited 1
  // ("ffmpeg (palettegen/paletteuse) exited with code 1"). A 10s 2560x1440 capture
  // needs ~2GB that way. The palette is now built from a downscaled, time-sampled
  // copy so pass two can stream.
  const input = new Uint8Array(await readFile(fixtures.large));
  const result = await encode(input, {
    preset: 'balanced',
    sourceWidth: 1920,
    nativeScale: true,
    backend: 'ffmpeg',
  });

  assert.equal(result.width, 1920, 'nativeScale must not downscale');
  assert.equal(String.fromCharCode(...result.gif.slice(0, 6)), 'GIF89a');
  assert.ok(result.frameCount > 0);
});

test('corrupt input rejects with a typed error carrying stderr', async () => {
  const truncated = (await load()).slice(0, 1024);
  await assert.rejects(
    () => encode(truncated, { preset: 'small', sourceWidth: SOURCE_W }),
    (err) => {
      assert.ok(err instanceof EncodeError, `expected EncodeError, got ${err?.name}`);
      assert.ok(err.stderr.length > 0, 'EncodeError carried no stderr');
      return true;
    },
  );
});

test('abort rejects, kills children, and leaves no temp directory', async () => {
  const before = await gifomatorTmpDirs();
  const controller = new AbortController();
  const promise = encode(await load(), {
    preset: 'sharp',
    sourceWidth: SOURCE_W,
    signal: controller.signal,
  });

  // Let the pipeline actually spawn something before pulling the plug.
  await new Promise((r) => setTimeout(r, 400));
  const spawned = [...livePids];
  controller.abort();

  await assert.rejects(promise, (err) => err instanceof AbortError);

  await new Promise((r) => setTimeout(r, 500));
  for (const pid of spawned) {
    assert.throws(
      () => process.kill(pid, 0),
      /ESRCH/,
      `child ${pid} survived the abort`,
    );
  }

  const after = await gifomatorTmpDirs();
  assert.deepEqual(
    after.filter((d) => !before.includes(d)),
    [],
    'abort left a temp directory behind',
  );
});

test('cleans up its temp directory on the success path too', async () => {
  const before = await gifomatorTmpDirs();
  await encode(await load(), { preset: 'small', sourceWidth: SOURCE_W });
  const after = await gifomatorTmpDirs();
  assert.deepEqual(after.filter((d) => !before.includes(d)), []);
});

test('reports durationMs for benchmark tracking', async () => {
  const result = await encode(await load(), { preset: 'small', sourceWidth: SOURCE_W });
  assert.ok(result.durationMs > 0);
  assert.equal(result.bytes, result.gif.length);
});

/*
 * Size behaviour on the stress fixture.
 *
 * MEASURED, 10s @720p (gifski):
 *            synthetic   stress    ratio
 *   small      1.18 MB   9.20 MB    7.8x
 *   balanced   4.76 MB  37.77 MB    7.9x
 *   sharp      9.70 MB  68.49 MB    7.1x
 *
 * The ~8x gap is why a synthetic-only suite is worthless for size claims. The stress
 * fixture (continuous mandelbrot gradients under text) is a deliberate WORST case —
 * real screen content has large flat regions and should land between the two columns.
 *
 * These bounds are regression guards against measured reality, not product targets.
 * The product target (a Slack-postable `small`) is NOT met on this fixture and is
 * tracked as an open question in specs/gifomator-phase1-core.md — a preset that can
 * emit 38MB needs size-aware selection, which is a design change, not a test tweak.
 */
const STRESS_CEILING_MB = { small: 12, balanced: 48, sharp: 88 };

test('stress fixture: sizes stay within measured regression bounds', async () => {
  for (const preset of ['small', 'balanced']) {
    const result = await encode(await load('text'), { preset, sourceWidth: SOURCE_W });
    const mb = result.bytes / (1024 * 1024);
    assert.ok(
      mb <= STRESS_CEILING_MB[preset],
      `${preset} produced ${mb.toFixed(2)}MB on the stress fixture ` +
        `(regression bound ${STRESS_CEILING_MB[preset]}MB)`,
    );
  }
});

test('stress fixture: presets are monotonic in size', async () => {
  // The ordering is the real contract: whatever the absolute numbers, `small` must
  // always be smaller than `balanced`. A tuning change that breaks this broke the presets.
  const input = await load('text');
  const small = await encode(input, { preset: 'small', sourceWidth: SOURCE_W });
  const balanced = await encode(input, { preset: 'balanced', sourceWidth: SOURCE_W });
  assert.ok(
    small.bytes < balanced.bytes,
    `small (${small.bytes}) should be smaller than balanced (${balanced.bytes})`,
  );
});
