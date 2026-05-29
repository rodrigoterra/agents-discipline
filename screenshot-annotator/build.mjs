// Bundles the two halves of the plugin into self-contained artifacts so the
// installed plugin needs only `node` at runtime (no node_modules to ship).
//
//   node build.mjs           # build both
//   node build.mjs server    # MCP server only  -> mcp-server/dist/index.js
//   node build.mjs webapp    # browser canvas    -> webapp/dist/bundle.js
import * as esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const which = process.argv[2] ?? "all";

/** Node MCP server: ESM, deps inlined, targeting the running Node major. */
const serverBuild = {
  entryPoints: [resolve(root, "mcp-server/src/index.ts")],
  outfile: resolve(root, "mcp-server/dist/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // Help Node resolve `import` of bundled ESM-only deps cleanly.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
};

/** Standalone dev launcher (smoke-test the UI without an MCP client). */
const devBuild = {
  ...serverBuild,
  entryPoints: [resolve(root, "mcp-server/src/dev-serve.ts")],
  outfile: resolve(root, "mcp-server/dist/dev-serve.js"),
};

/** Browser canvas app: a single IIFE bundle the local server serves to the page. */
const webappBuild = {
  entryPoints: [resolve(root, "webapp/src/main.ts")],
  outfile: resolve(root, "webapp/dist/bundle.js"),
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["chrome120", "firefox120", "safari17"],
};

const jobs = [];
if (which === "all" || which === "server") jobs.push(esbuild.build(serverBuild), esbuild.build(devBuild));
if (which === "all" || which === "webapp") jobs.push(esbuild.build(webappBuild));

if (jobs.length === 0) {
  console.error(`Unknown target "${which}". Use: server | webapp | all`);
  process.exit(1);
}

await Promise.all(jobs);
console.log(`Built: ${which}`);
