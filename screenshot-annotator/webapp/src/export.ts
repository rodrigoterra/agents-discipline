// Builds the AnnotationDoc, flattens the canvas to PNG, and POSTs both to the
// local server's /done endpoint.
import type { Annotation, AnnotationDoc } from "../../shared/annotation-schema";
import type { CanvasView } from "./canvas";

/** Compose a one-line, token-cheap recap the model can skim before the JSON. */
export function buildSummary(annotations: readonly Annotation[]): string {
  if (annotations.length === 0) return "No annotations.";
  const bySemantic = new Map<string, number>();
  for (const a of annotations) bySemantic.set(a.semantic, (bySemantic.get(a.semantic) ?? 0) + 1);
  const parts = [...bySemantic.entries()].map(([s, n]) => `${n} ${s}`);
  return `${annotations.length} mark(s): ${parts.join(", ")}.`;
}

export function buildDoc(view: CanvasView, annotations: readonly Annotation[], source?: string): AnnotationDoc {
  return {
    version: "1.0",
    image: { width: view.naturalW, height: view.naturalH, source },
    annotations: [...annotations],
    summary: buildSummary(annotations),
  };
}

export interface DonePayload {
  doc: AnnotationDoc;
  /** Bare base64 PNG of the flattened, annotated image. */
  png: string;
}

/** Send the finished annotation to the server. Returns true on HTTP 2xx. */
export async function postDone(payload: DonePayload): Promise<boolean> {
  const res = await fetch("/done", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}
