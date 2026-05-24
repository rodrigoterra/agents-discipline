import { Readable } from "node:stream";
import { afterAll, describe, expect, it } from "vitest";

const originalOpenAIKey = process.env.OPENAI_API_KEY;
process.env.OPENAI_API_KEY = "";

const serverModule = await import("../../apps/server/src/index.js");

function invokeApp(method: "GET" | "POST", url: string, body?: unknown) {
  return new Promise<{ status: number; json: any }>((resolve, reject) => {
    const payload = body === undefined ? "" : JSON.stringify(body);
    const req = Readable.from(payload ? [payload] : []) as any;
    req.method = method;
    req.url = url;
    req.headers = payload
      ? { "content-type": "application/json", "content-length": Buffer.byteLength(payload) }
      : {};

    const chunks: Buffer[] = [];
    const headers = new Map<string, unknown>();
    const res: any = {
      statusCode: 200,
      headersSent: false,
      setHeader(name: string, value: unknown) {
        headers.set(name.toLowerCase(), value);
      },
      getHeader(name: string) {
        return headers.get(name.toLowerCase());
      },
      removeHeader(name: string) {
        headers.delete(name.toLowerCase());
      },
      write(chunk: unknown) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      },
      end(chunk?: unknown) {
        if (chunk) this.write(chunk);
        this.headersSent = true;
        const text = Buffer.concat(chunks).toString("utf-8");
        resolve({ status: this.statusCode, json: text ? JSON.parse(text) : undefined });
      }
    };

    serverModule.app.handle(req, res, reject);
  });
}

describe("server routes and config", () => {
  afterAll(() => {
    if (originalOpenAIKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAIKey;
  });

  it("reports OpenAI key status without leaking secrets", async () => {
    const result = await invokeApp("GET", "/api/health");
    expect(result.status).toBe(200);
    expect(result.json).toMatchObject({ ok: true, openaiConfigured: false });
    expect(JSON.stringify(result.json)).not.toContain("sk-");
  });

  it("returns a clear 400 when script generation lacks an OpenAI key", async () => {
    const result = await invokeApp("POST", "/api/script/generate", { sceneBrief: "test" });
    expect(result.status).toBe(400);
    expect(result.json.error).toBe("OPENAI_API_KEY missing");
  });

  it("returns route errors for invalid generated audio paths", async () => {
    const result = await invokeApp("POST", "/api/audio/process", { inputPath: "/tmp/outside.wav" });
    expect(result.status).toBe(500);
    expect(result.json.error).toContain("/generated/");
  });

  it("rejects malformed numeric cost guard env values", () => {
    const oldValue = process.env.MAX_REQUESTS;
    process.env.MAX_REQUESTS = "nope";
    expect(() => serverModule.parseRequestLimits()).toThrow("MAX_REQUESTS must be a finite number");
    if (oldValue === undefined) delete process.env.MAX_REQUESTS;
    else process.env.MAX_REQUESTS = oldValue;
  });
});
