/**
 * Build: bundles core/ and the Electron main + preload into dist/.
 *
 * core/ is bundled separately from the app so the test suite can import it with no
 * Electron present — the purity rule is a build-level fact, not just a lint rule.
 */
import esbuild from 'esbuild';
import { rm } from 'node:fs/promises';

const target = 'node20';
const external = ['electron', '@ffmpeg-installer/ffmpeg', 'gifski'];

await rm('dist', { recursive: true, force: true });

/** @type {import('esbuild').BuildOptions} */
const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target,
  external,
  sourcemap: true,
  logLevel: 'info',
};

await esbuild.build({
  ...common,
  entryPoints: ['core/index.ts'],
  outfile: 'dist/core/index.js',
});

await esbuild.build({
  ...common,
  entryPoints: ['app/main/index.ts'],
  outfile: 'dist/main/index.js',
});

await esbuild.build({
  ...common,
  format: 'cjs',
  entryPoints: ['app/preload/index.ts'],
  outfile: 'dist/preload/index.cjs',
});

console.log('build: ok');
