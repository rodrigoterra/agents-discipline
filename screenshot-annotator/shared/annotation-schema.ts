/**
 * AnnotationDoc — the shared contract between the browser canvas (webapp) and the
 * MCP server. Imported by both sides so the wire format can never drift.
 *
 * All geometry coordinates are NORMALIZED to the source image: 0..1 on each axis,
 * where (0,0) is the top-left and (1,1) is the bottom-right of the screenshot.
 * This keeps the document resolution-independent — the same doc renders correctly
 * whether the image is 800px or 4000px wide.
 */
import { z } from "zod";

export const TOOL_TYPES = ["rect", "ellipse", "arrow", "pen", "marker", "redact"] as const;
export type ToolType = (typeof TOOL_TYPES)[number];

/** Semantic intent — what the mark MEANS, so the model reads intent without guessing. */
export const SEMANTICS = ["block", "eliminate", "highlight", "note", "step", "redact"] as const;
export type Semantic = (typeof SEMANTICS)[number];

/** How a shape's interior is painted. "striped" = diagonal hatching (block/eliminate). */
export const FILL_STYLES = ["none", "striped", "solid"] as const;
export type FillStyle = (typeof FILL_STYLES)[number];

/** How a redaction destroys the underlying pixels. */
export const REDACT_MODES = ["solid", "pixelate"] as const;
export type RedactMode = (typeof REDACT_MODES)[number];

const Style = z.object({
  /** Stroke / outline color, CSS hex. */
  stroke: z.string(),
  /** Stroke width in source-image pixels. */
  strokeWidth: z.number().positive().optional(),
  /** Interior fill style. */
  fill: z.enum(FILL_STYLES).optional(),
  /** Fill color when fill !== "none", CSS hex. */
  fillColor: z.string().optional(),
});
export type Style = z.infer<typeof Style>;

// --- Per-type geometry (normalized 0..1) ---
const RectGeom = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const ArrowGeom = z.object({ x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number() });
const PenGeom = z.object({
  points: z.array(z.tuple([z.number(), z.number()])).min(2),
  /** Draw an arrowhead at the last point. */
  arrowhead: z.boolean().optional(),
});
const PointGeom = z.object({ x: z.number(), y: z.number() });

const noteField = z.string().max(2000).optional();

// --- Discriminated union over `type` ---
const RectAnn = z.object({
  id: z.string(),
  type: z.literal("rect"),
  semantic: z.enum(SEMANTICS),
  geometry: RectGeom,
  style: Style.optional(),
  note: noteField,
});
const EllipseAnn = z.object({
  id: z.string(),
  type: z.literal("ellipse"),
  semantic: z.enum(SEMANTICS),
  geometry: RectGeom, // bounding box
  style: Style.optional(),
  note: noteField,
});
const ArrowAnn = z.object({
  id: z.string(),
  type: z.literal("arrow"),
  semantic: z.enum(SEMANTICS),
  geometry: ArrowGeom,
  style: Style.optional(),
  note: noteField,
});
const PenAnn = z.object({
  id: z.string(),
  type: z.literal("pen"),
  semantic: z.enum(SEMANTICS),
  geometry: PenGeom,
  style: Style.optional(),
  note: noteField,
});
const MarkerAnn = z.object({
  id: z.string(),
  type: z.literal("marker"),
  semantic: z.enum(SEMANTICS),
  geometry: PointGeom,
  /** The auto-incremented number shown in the pin (e.g. "1", "2"). */
  label: z.string(),
  style: Style.optional(),
  note: noteField,
});
/**
 * Redaction deliberately has NO `note`/`label` field: nothing describing the
 * hidden content may leak into the JSON or the model's context. The underlying
 * pixels are destroyed in the flattened PNG, never returned.
 */
const RedactAnn = z.object({
  id: z.string(),
  type: z.literal("redact"),
  semantic: z.literal("redact"),
  geometry: RectGeom,
  mode: z.enum(REDACT_MODES).default("solid"),
});

export const Annotation = z.discriminatedUnion("type", [
  RectAnn,
  EllipseAnn,
  ArrowAnn,
  PenAnn,
  MarkerAnn,
  RedactAnn,
]);
export type Annotation = z.infer<typeof Annotation>;

export const AnnotationDoc = z.object({
  version: z.literal("1.0"),
  image: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    /** Original filename/path of the screenshot, for reference only. */
    source: z.string().optional(),
  }),
  annotations: z.array(Annotation),
  /** Optional one-line natural-language recap, cheap for the model to skim. */
  summary: z.string().optional(),
});
export type AnnotationDoc = z.infer<typeof AnnotationDoc>;
