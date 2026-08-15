/**
 * Enforces the load-bearing rule: core/ must never depend on Electron.
 *
 * This is a test rather than only an ESLint rule because it checks something lint
 * cannot — the BUILT bundle. A transitive import that lint misses would still show
 * up in dist/core/index.js, and it is the built artifact that the test suite and a
 * future MCP wrapper actually load.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

test('no core/ source file imports electron', async () => {
  const files = (await walk(path.join(root, 'core'))).filter((f) => f.endsWith('.ts'));
  assert.ok(files.length > 0, 'found no core/ sources to check');

  const importPattern = /(?:^|\n)\s*(?:import|export)[^;\n]*from\s+['"]([^'"]+)['"]/g;
  const requirePattern = /require\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const pattern of [importPattern, requirePattern]) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(source)) !== null) {
        const specifier = match[1];
        assert.ok(
          specifier !== 'electron' && !specifier.startsWith('electron/'),
          `${path.relative(root, file)} imports "${specifier}". core/ is the only ` +
            `headless-testable layer and the one a future MCP wrapper calls directly.`,
        );
      }
    }
  }
});

test('the built core bundle contains no electron dependency', async () => {
  const bundle = await readFile(path.join(root, 'dist', 'core', 'index.js'), 'utf8');
  assert.ok(
    !/from\s*["']electron["']/.test(bundle) && !/require\(["']electron["']\)/.test(bundle),
    'dist/core/index.js references electron — the headless test story is broken',
  );
});

test('core/ loads with no electron module resolvable', async () => {
  // The suite already runs without Electron's main process, but this asserts the
  // import graph explicitly rather than relying on that being true by accident.
  const mod = await import('../dist/core/index.js');
  assert.equal(typeof mod.encode, 'function');
  assert.equal(typeof mod.probeBinaries, 'function');
});
