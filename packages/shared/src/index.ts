import crypto from "node:crypto";

export function hashObject(input: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export function nowIso() {
  return new Date().toISOString();
}
