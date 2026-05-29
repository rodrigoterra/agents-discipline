// Real-browser smoke test of the full pipeline: spawn the MCP server, open the
// annotation canvas in Chromium, draw a striped rectangle and a numbered marker
// (each with a text note), click Done, and assert the tool returns the
// annotated PNG + JSON sidecar.
//
// Requires a Playwright browser binary, so it is NOT part of `npm test`
// (which runs headless in CI). Run locally:
//     npm run build && npx playwright install chromium && npm run test:browser
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { makePng } from "./make-png.mjs";

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

test("draw in the real canvas and ingest image + JSON", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "annot-browser-"));
  const imgPath = join(dataDir, "shot.png");
  writeFileSync(imgPath, makePng(800, 600, [40, 90, 160]));

  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server/dist/index.js"],
    stderr: "pipe",
    env: { PATH: process.env.PATH, HOME: process.env.HOME, CLAUDE_PLUGIN_DATA: dataDir },
  });
  const client = new Client({ name: "browser-e2e", version: "1.0.0" });
  await client.connect(transport);

  const browser = await chromium.launch();
  try {
    const urlPromise = waitForUrl(transport.stderr);
    const resultPromise = client.callTool({
      name: "annotate_screenshot",
      arguments: { imagePath: imgPath, openBrowser: false },
    });
    const url = await urlPromise;

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(url);

    // App is ready once the status line invites annotating (image has loaded).
    await page.waitForFunction(() =>
      document.querySelector("#status")?.textContent?.includes("start annotating"),
    );

    const canvas = page.locator("#canvas");
    const box = await canvas.boundingBox();
    assert.ok(box, "canvas should have a layout box");

    const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });

    // 1) Rectangle (default tool) with a note.
    let p = at(0.2, 0.2);
    let q = at(0.6, 0.5);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(q.x, q.y, { steps: 8 });
    await page.mouse.up();
    await page.locator(".note-box textarea").fill("blocked region");
    await page.locator(".note-box button.primary").click();

    // 2) Numbered marker with a note.
    await page.locator('[data-tool="marker"]').click();
    const m = at(0.75, 0.3);
    await page.mouse.click(m.x, m.y);
    await page.locator(".note-box textarea").fill("check this control");
    await page.locator(".note-box button.primary").click();

    // Finish.
    await page.locator("#done").click();
    await page.waitForFunction(() => document.body.classList.contains("finished"));

    const result = await resultPromise;
    const image = result.content.find((c) => c.type === "image");
    const textBlock = result.content.find((c) => c.type === "text");
    assert.ok(image && image.mimeType === "image/png" && image.data.length > 100, "expected a PNG image block");
    assert.ok(textBlock, "expected a text block");

    const json = JSON.parse(textBlock.text.slice(textBlock.text.indexOf("{")));
    assert.equal(json.annotations.length, 2, "two marks drawn");
    assert.equal(json.image.width, 800);
    assert.equal(json.image.height, 600);
    const types = json.annotations.map((a) => a.type).sort();
    assert.deepEqual(types, ["marker", "rect"]);
    const notes = json.annotations.map((a) => a.note);
    assert.ok(notes.includes("blocked region") && notes.includes("check this control"), "notes captured");
    const marker = json.annotations.find((a) => a.type === "marker");
    assert.equal(marker.label, "1", "first marker numbered 1");

    // Files persisted.
    const pngLine = textBlock.text.match(/Saved PNG:\s+(\S+)/);
    assert.ok(pngLine && existsSync(pngLine[1]), "annotated.png written");
  } finally {
    await browser.close();
    await client.close();
  }
});
