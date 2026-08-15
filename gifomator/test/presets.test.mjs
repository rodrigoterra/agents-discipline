/**
 * Pure preset-policy tests. No binaries, no Electron, no filesystem.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, getPreset, outputWidth, evenHeight } from '../dist/core/index.js';

test('three presets exist with coherent ordering', () => {
  assert.deepEqual(Object.keys(PRESETS).sort(), ['balanced', 'sharp', 'small']);
  assert.ok(PRESETS.small.fps < PRESETS.balanced.fps);
  assert.ok(PRESETS.balanced.fps < PRESETS.sharp.fps);
  assert.ok(PRESETS.small.maxWidth < PRESETS.balanced.maxWidth);
  assert.ok(PRESETS.balanced.maxWidth < PRESETS.sharp.maxWidth);
});

test('unknown preset is rejected', () => {
  assert.throws(() => getPreset('enormous'), /Unknown preset/);
});

test('never upscales: a narrow source keeps its own width', () => {
  // Acceptance criterion: 640x480 source under `sharp` (max 1600) stays 640.
  assert.equal(outputWidth(getPreset('sharp'), 640), 640);
  assert.equal(outputWidth(getPreset('small'), 320), 320);
});

test('downscales a wide source to the preset cap', () => {
  assert.equal(outputWidth(getPreset('balanced'), 2560), PRESETS.balanced.maxWidth);
  assert.equal(outputWidth(getPreset('small'), 1920), PRESETS.small.maxWidth);
});

test('invalid source widths are rejected rather than silently coerced', () => {
  assert.throws(() => outputWidth(getPreset('balanced'), 0), /Invalid sourceWidth/);
  assert.throws(() => outputWidth(getPreset('balanced'), NaN), /Invalid sourceWidth/);
});

test('height rounds to even, matching ffmpeg scale=w:-2', () => {
  // 1280x720 scaled to 1200 wide: exact is 675, ffmpeg rounds to nearest even = 676.
  // Naive truncation would predict 674 — this is why the value is measured, not derived.
  assert.equal(evenHeight(1280, 720, 1200), 676);
  assert.equal(evenHeight(1920, 1080, 800), 450);
  assert.equal(evenHeight(1000, 1000, 640), 640);
});

test('every computed height is even', () => {
  for (const w of [1280, 1920, 2560, 1366, 1440]) {
    for (const h of [720, 1080, 800, 900]) {
      for (const preset of Object.values(PRESETS)) {
        const target = outputWidth(preset, w);
        assert.equal(evenHeight(w, h, target) % 2, 0);
      }
    }
  }
});
