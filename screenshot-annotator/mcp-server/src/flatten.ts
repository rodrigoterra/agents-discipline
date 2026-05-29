// Server-side validation safety net for whatever the browser POSTs to /done.
// Guarantees the MCP tool only ever returns a schema-valid document and a
// genuine PNG, no matter what hits the endpoint.
import { AnnotationDoc } from "../../shared/annotation-schema";

export interface DonePayload {
  doc: AnnotationDoc;
  /** Bare base64 PNG (no data: prefix). */
  png: string;
}

const PNG_MAGIC = "iVBORw0KGgo"; // base64 of the 8-byte PNG signature

export function validateDonePayload(raw: unknown): DonePayload {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("payload must be a JSON object");
  }
  const { doc, png } = raw as Record<string, unknown>;
  const parsedDoc = AnnotationDoc.parse(doc);
  if (typeof png !== "string" || !png.startsWith(PNG_MAGIC)) {
    throw new Error("png must be a base64-encoded PNG");
  }
  return { doc: parsedDoc, png };
}
