// Ephemeral localhost HTTP server that serves the annotation webapp, streams the
// source screenshot, and waits for the browser to POST the finished result. It
// binds only to 127.0.0.1 and shuts down as soon as the work is done.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDonePayload, type DonePayload } from "./flatten";

// dist/index.js lives at mcp-server/dist/, so the webapp is two levels up.
const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const WEBAPP_DIR = resolve(SERVER_DIR, "../../webapp");

const MAX_BODY = 64 * 1024 * 1024; // 64 MB — generous for a flattened PNG

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

export interface UiSession {
  url: string;
  /** Resolves once the user clicks Done (or rejects on timeout). */
  done: Promise<DonePayload>;
  close(): void;
}

export interface UiServerOptions {
  /** Absolute path to the screenshot to annotate, if any. */
  imagePath?: string;
  /** Milliseconds to wait for the user before giving up. */
  timeoutMs?: number;
}

export function startUiServer(opts: UiServerOptions): Promise<UiSession> {
  return new Promise((resolveSession, rejectSession) => {
    let resolveDone!: (p: DonePayload) => void;
    let rejectDone!: (e: Error) => void;
    const done = new Promise<DonePayload>((res, rej) => {
      resolveDone = res;
      rejectDone = rej;
    });

    const server = createServer((req, res) => {
      handle(req, res, opts, resolveDone).catch((err) => {
        sendText(res, 500, `Internal error: ${err instanceof Error ? err.message : String(err)}`);
      });
    });

    const timeout = setTimeout(() => {
      rejectDone(new Error("Timed out waiting for annotation"));
      server.close();
    }, opts.timeoutMs ?? 20 * 60 * 1000);
    timeout.unref();

    const close = () => {
      clearTimeout(timeout);
      server.close();
    };

    server.on("error", rejectSession);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr === null || typeof addr === "string") {
        rejectSession(new Error("Failed to bind local server"));
        return;
      }
      resolveSession({ url: `http://127.0.0.1:${addr.port}/`, done, close });
    });
  });
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  opts: UiServerOptions,
  resolveDone: (p: DonePayload) => void,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (req.method === "GET" && (path === "/" || path === "/index.html")) {
    return sendFile(res, resolve(WEBAPP_DIR, "index.html"), "text/html; charset=utf-8");
  }
  if (req.method === "GET" && path === "/bundle.js") {
    return sendFile(res, resolve(WEBAPP_DIR, "dist/bundle.js"), "text/javascript; charset=utf-8");
  }
  if (req.method === "GET" && path === "/styles.css") {
    return sendFile(res, resolve(WEBAPP_DIR, "styles.css"), "text/css; charset=utf-8");
  }
  if (req.method === "GET" && path === "/meta") {
    const meta = { hasImage: Boolean(opts.imagePath), source: opts.imagePath ? basename(opts.imagePath) : undefined };
    return sendJson(res, 200, meta);
  }
  if (req.method === "GET" && path === "/image") {
    if (!opts.imagePath) return sendText(res, 404, "no image");
    try {
      await stat(opts.imagePath);
    } catch {
      return sendText(res, 404, "image not found");
    }
    const mime = IMAGE_MIME[extname(opts.imagePath).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" });
    const stream = createReadStream(opts.imagePath);
    // If the read fails mid-stream, tear down the response so the browser's
    // <img> fires onerror promptly instead of hanging.
    stream.on("error", () => res.destroy());
    stream.pipe(res);
    return;
  }
  if (req.method === "POST" && path === "/done") {
    const body = await readBody(req);
    try {
      const payload = validateDonePayload(JSON.parse(body));
      sendJson(res, 200, { ok: true });
      resolveDone(payload);
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err instanceof Error ? err.message : String(err) });
    }
    return;
  }
  sendText(res, 404, "not found");
}

async function sendFile(res: ServerResponse, file: string, contentType: string): Promise<void> {
  try {
    await stat(file);
  } catch {
    return sendText(res, 404, `missing asset: ${basename(file)} (did you run the build?)`);
  }
  const data = await readFile(file);
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-store" });
  res.end(data);
}

function sendJson(res: ServerResponse, status: number, obj: unknown): void {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

function sendText(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
