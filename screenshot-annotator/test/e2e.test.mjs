// End-to-end test of the MCP server loop without a real browser: spawn the
// server over stdio, call annotate_screenshot, read the local UI URL it logs,
// POST a synthetic AnnotationDoc to /done (the role the browser plays), and
// assert the tool returns one image block + one text block and persists files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// A real 1×1 PNG — valid magic bytes, doubles as the "flattened" image.
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function waitForUrl(stderr) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => {
      stderr.off("data", onData);
      reject(new Error("never saw UI url; stderr:\n" + buf));
    }, 10000);
    const onData = (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/annotation UI: (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (m) {
        clearTimeout(timer);
        stderr.off("data", onData);
        resolve(m[1]);
      }
    };
    stderr.on("data", onData);
  });
}

test("annotate_screenshot returns image + JSON and writes files", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "annot-data-"));
  const imgPath = join(dataDir, "shot.png");
  writeFileSync(imgPath, Buffer.from(PNG_B64, "base64"));

  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server/dist/index.js"],
    stderr: "pipe",
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CLAUDE_PLUGIN_DATA: dataDir },
  });
  const client = new Client({ name: "e2e", version: "1.0.0" });
  await client.connect(transport);

  try {
    const urlPromise = waitForUrl(transport.stderr);
    const resultPromise = client.callTool({
      name: "annotate_screenshot",
      arguments: { imagePath: imgPath, openBrowser: false },
    });

    const url = await urlPromise;

    // The server should reject a malformed payload (zod safety net).
    const bad = await fetch(url + "done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc: { version: "2.0" }, png: "nope" }),
    });
    assert.equal(bad.status, 400, "malformed payload must be rejected");

    // Now the genuine result — a striped block plus a redaction (which carries no note).
    const doc = {
      version: "1.0",
      image: { width: 1, height: 1, source: "shot.png" },
      annotations: [
        {
          id: "a1",
          type: "rect",
          semantic: "block",
          geometry: { x: 0.1, y: 0.1, w: 0.3, h: 0.2 },
          style: { stroke: "#e11d48", fill: "striped" },
          note: "blocked region",
        },
        { id: "a2", type: "redact", semantic: "redact", geometry: { x: 0.5, y: 0.5, w: 0.2, h: 0.1 }, mode: "solid" },
      ],
      summary: "2 marks",
    };
    const good = await fetch(url + "done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc, png: PNG_B64 }),
    });
    assert.equal(good.status, 200, "valid payload must be accepted");

    const result = await resultPromise;
    const content = result.content;
    assert.equal(content.length, 2, "expected an image block and a text block");

    const image = content.find((c) => c.type === "image");
    assert.ok(image, "missing image content block");
    assert.equal(image.mimeType, "image/png");
    assert.equal(image.data, PNG_B64, "image data should be the flattened PNG");

    const textBlock = content.find((c) => c.type === "text");
    assert.ok(textBlock, "missing text content block");
    assert.match(textBlock.text, /2 annotation\(s\)/);
    assert.match(textBlock.text, /"type":"redact"/, "JSON sidecar should be embedded");

    // Files persisted under CLAUDE_PLUGIN_DATA.
    const pngLine = textBlock.text.match(/Saved PNG:\s+(\S+)/);
    const jsonLine = textBlock.text.match(/Saved JSON:\s+(\S+)/);
    assert.ok(pngLine && existsSync(pngLine[1]), "annotated.png should exist on disk");
    assert.ok(jsonLine && existsSync(jsonLine[1]), "annotations.json should exist on disk");
  } finally {
    await client.close();
  }
});
