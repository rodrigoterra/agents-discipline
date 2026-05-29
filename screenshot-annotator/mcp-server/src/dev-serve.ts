// Standalone dev launcher: opens the annotation canvas for a given image using
// the exact production server, then writes the result next to you. Lets you
// smoke-test the full UI without wiring up an MCP client.
//
//   npm run build
//   node mcp-server/dist/dev-serve.js path/to/screenshot.png
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { startUiServer } from "./ui-server";
import { openBrowser } from "./open-browser";

const arg = process.argv[2];
const imagePath = arg ? resolve(process.cwd(), arg) : undefined;

const session = await startUiServer({ imagePath });
console.log(`Annotation UI: ${session.url}`);
if (!imagePath) console.log("(no image given — the canvas will show a file picker)");
openBrowser(session.url);

try {
  const payload = await session.done;
  const pngPath = resolve(process.cwd(), "annotated.png");
  const jsonPath = resolve(process.cwd(), "annotations.json");
  await writeFile(pngPath, Buffer.from(payload.png, "base64"));
  await writeFile(jsonPath, JSON.stringify(payload.doc, null, 2));
  console.log(`Saved ${pngPath}`);
  console.log(`Saved ${jsonPath}`);
  console.log(`${payload.doc.annotations.length} annotation(s). ${payload.doc.summary ?? ""}`);
} catch (err) {
  console.error(`Annotation not completed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  session.close();
}
