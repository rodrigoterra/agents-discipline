---
name: annotate
description: Annotate a screenshot or image with shapes, arrows, numbered markers, redaction boxes and text notes in a browser canvas, then pull the marked-up image plus a structured JSON description into context. Use when the user wants to mark up, comment on, point at, or redact parts of a screenshot/image.
argument-hint: "[path/to/screenshot.png]"
allowed-tools: mcp__screenshot-annotator__annotate_screenshot, Read
license: MIT
---

# Annotate a screenshot

Use the **`annotate_screenshot`** MCP tool to let the user visually mark up an image,
then read the result back.

## Steps

1. Determine the image path:
   - If the user passed one as `$ARGUMENTS`, use it.
   - Otherwise, if a screenshot was just captured or referenced in the conversation, use that path.
   - If no path is available, call the tool with no `imagePath` — the canvas shows a file picker.
2. Call `annotate_screenshot({ imagePath })`. This **opens a browser window** with the
   annotation canvas and **blocks until the user clicks "Done"**, so do not call anything
   else meanwhile. (If the browser does not open — e.g. a remote/headless session — the
   server logs the local URL to stderr for the user to open manually.)
3. The tool returns two things in one result:
   - the **flattened annotated image** (look at it directly), and
   - a **JSON document** with one entry per mark.
4. Interpret the JSON together with the image. For each annotation use:
   - `type` — `rect` | `ellipse` | `arrow` | `pen` | `marker` | `redact`
   - `semantic` — the user's intent: `block`, `eliminate`, `highlight`, `note`, `step`, `redact`
   - `geometry` — coordinates **normalized to 0..1** of the source image (multiply by
     `image.width` / `image.height` for pixels)
   - `note` — the user's typed comment for that mark (absent on redactions)
   - `label` — the number shown for `marker` pins
5. Act on the user's request using that intent. **Redactions intentionally carry no note and
   their pixels are already destroyed in the returned image** — never try to infer or restate
   the hidden content.

The annotated PNG and JSON are also saved to disk (paths are in the tool's text output); you
can `Read` them again later if needed.
