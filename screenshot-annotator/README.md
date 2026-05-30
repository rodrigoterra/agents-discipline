# screenshot-annotator

A Claude Code plugin for **visual + text annotation of screenshots**. Mark up an image in a
local browser canvas — outlined or diagonally-striped shapes, arrows, freehand pen, numbered
markers, and redaction boxes, each with an optional text note — then hand the flattened image
**plus a compact JSON sidecar** straight back into Claude's context in a single tool call.

## Flow

1. You (or Claude) call the **`annotate_screenshot`** MCP tool with a path to a screenshot.
2. A localhost server starts and opens the **annotation canvas** in your browser.
3. You draw marks. Closing a shape/stroke auto-opens a **note box** to comment on that mark.
4. Click **Done**. The tool returns the **annotated PNG** and a **JSON document** describing
   every mark; both enter Claude's context. Copies are saved to disk for re-reference.

## Annotation tools

| Tool | Purpose |
| --- | --- |
| **Rectangle / Ellipse** | Outline, diagonal-stripe fill, or solid fill — stripes signal *block* / *eliminate*. |
| **Arrow** | Straight arrow with arrowhead, to point at things. |
| **Pen** | Freehand stroke, with an optional arrowhead on release. |
| **Marker** | Auto-numbered callout pins (1, 2, 3 …) for ordered references. |
| **Redact** | **Destroys** the underlying pixels (solid black or pixelate). Carries no note — nothing sensitive leaks. |

Each mark is tagged with a **semantic** (`block`, `eliminate`, `highlight`, `note`, `step`,
`redact`) so the model reads intent without re-interpreting pixels.

**Editing:** `Ctrl/Cmd+Z` / `Shift+Z` undo/redo, **right-click a mark to delete it**, and
single-key tool shortcuts — `R` rect, `E` ellipse, `A` arrow, `P` pen, `M` marker, `X` redact.

## Why a JSON sidecar?

The flattened PNG lets the VLM *see* the marks; the JSON gives **exact intent, normalized
coordinates, and the typed note** for each mark. Together they're cheaper and less ambiguous
than asking the model to re-read hand-drawn annotations from pixels alone. Coordinates are
normalized to `0..1` of the source image, so the document is resolution-independent.

```jsonc
{
  "version": "1.0",
  "image": { "width": 1920, "height": 1080, "source": "shot.png" },
  "annotations": [
    { "id": "a1", "type": "rect", "semantic": "block",
      "geometry": { "x": 0.1, "y": 0.1, "w": 0.3, "h": 0.2 },
      "style": { "stroke": "#e11d48", "fill": "striped" }, "note": "legacy banner" },
    { "id": "a2", "type": "redact", "semantic": "redact",
      "geometry": { "x": 0.5, "y": 0.5, "w": 0.2, "h": 0.1 }, "mode": "solid" }
  ],
  "summary": "2 mark(s): 1 block, 1 redact."
}
```

## Install (development)

```bash
cd screenshot-annotator
npm install
npm run build         # bundles mcp-server/dist/index.js and webapp/dist/bundle.js
```

Load the plugin into Claude Code:

```bash
claude --plugin-dir ./screenshot-annotator
```

Then invoke it:

```
/screenshot-annotator:annotate path/to/screenshot.png
```

or just ask Claude to "annotate this screenshot" — it will call the `annotate_screenshot` tool.

For marketplace distribution, this plugin is registered in the repo's
`.claude-plugin/marketplace.json`; install with `/plugin install screenshot-annotator@<marketplace>`.

## Architecture

- **`mcp-server/`** — a stdio TypeScript MCP server (`@modelcontextprotocol/sdk`). It launches
  the UI, waits for *Done*, and returns an `image` + `text` content block. This is the
  **portable core**: any MCP client (including future Codex support) can spawn it unchanged.
- **`webapp/`** — a dependency-free HTML + Canvas-2D app, bundled to a single JS file.
- **`shared/annotation-schema.ts`** — the `AnnotationDoc` zod schema, the contract both halves
  import so the wire format can't drift.

Bundles are committed under `dist/`, so the installed plugin needs only `node` at runtime.

### Notes

- Large screenshots: the returned PNG is capped at 2400px on its longest side. If you still hit
  the MCP output limit, raise `MAX_MCP_OUTPUT_TOKENS`.
- Headless / remote sessions: if the browser can't be opened, the local UI URL is logged to the
  server's stderr — open it manually, or pass `openBrowser: false`.

## Develop

```bash
npm run typecheck     # tsc --noEmit over shared + server + webapp
npm test              # end-to-end MCP loop test (no browser needed)
npm run build:webapp  # rebuild just the canvas after UI changes
npm run build:server  # rebuild just the MCP server
```
