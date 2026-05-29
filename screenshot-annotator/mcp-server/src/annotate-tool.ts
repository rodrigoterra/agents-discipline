// The `annotate_screenshot` tool: launches the browser canvas, waits for the
// user to finish, persists the result, and returns the annotated PNG plus the
// structured JSON sidecar into the model's context in a single call.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { mkdir, writeFile, access } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { startUiServer } from "./ui-server";
import { openBrowser } from "./open-browser";

const DESCRIPTION = `Open an interactive browser canvas to annotate a screenshot, then return the
annotated image plus a compact JSON description.

Use this when the user wants to mark up, comment on, or redact a screenshot/image.
Tools available in the canvas: outlined or diagonally-striped rectangles & ellipses
(for blocking/eliminating regions), straight arrows, freehand pen, auto-numbered
markers, and redaction boxes that destroy the underlying pixels. Each non-redaction
mark can carry a short text note.

The call blocks until the user clicks "Done" in the browser. It returns (1) the
flattened annotated PNG and (2) a JSON document whose geometry is normalized to
0..1, each annotation tagged with a semantic intent (block / eliminate / highlight /
note / step / redact) and its note. Read both: the image to see the marks, the JSON
for exact intent and coordinates.`;

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function registerAnnotateTool(server: McpServer): void {
  server.registerTool(
    "annotate_screenshot",
    {
      title: "Annotate screenshot",
      description: DESCRIPTION,
      inputSchema: {
        imagePath: z
          .string()
          .optional()
          .describe("Absolute or cwd-relative path to the screenshot. If omitted, the canvas shows a file picker."),
        openBrowser: z
          .boolean()
          .optional()
          .describe("Whether to auto-open the default browser (default true). Set false in headless setups."),
      },
    },
    async ({ imagePath, openBrowser: shouldOpen }): Promise<CallToolResult> => {
      let absImage: string | undefined;
      if (imagePath) {
        absImage = isAbsolute(imagePath) ? imagePath : resolve(process.cwd(), imagePath);
        try {
          await access(absImage);
        } catch {
          return { isError: true, content: [{ type: "text", text: `Image not found: ${absImage}` }] };
        }
      }

      const session = await startUiServer({ imagePath: absImage });
      // Always surface the URL on stderr so it is recoverable if the browser
      // can't be opened (e.g. remote/headless sessions).
      console.error(`[screenshot-annotator] annotation UI: ${session.url}`);
      if (shouldOpen !== false) openBrowser(session.url);

      let payload;
      try {
        payload = await session.done;
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Annotation was not completed (${err instanceof Error ? err.message : String(err)}). The UI was served at ${session.url}.`,
            },
          ],
        };
      } finally {
        session.close();
      }

      const outDir = join(process.env.CLAUDE_PLUGIN_DATA || tmpdir(), "screenshot-annotator", timestamp());
      await mkdir(outDir, { recursive: true });
      const pngPath = join(outDir, "annotated.png");
      const jsonPath = join(outDir, "annotations.json");
      await writeFile(pngPath, Buffer.from(payload.png, "base64"));
      await writeFile(jsonPath, JSON.stringify(payload.doc, null, 2));

      const text = [
        `Annotated screenshot ready — ${payload.doc.annotations.length} annotation(s). ${payload.doc.summary ?? ""}`.trim(),
        `Saved PNG:  ${pngPath}`,
        `Saved JSON: ${jsonPath}`,
        "",
        "Annotation data (coordinates normalized to 0..1 of the source image):",
        JSON.stringify(payload.doc),
      ].join("\n");

      return {
        content: [
          { type: "image", data: payload.png, mimeType: "image/png" },
          { type: "text", text },
        ],
      };
    },
  );
}
