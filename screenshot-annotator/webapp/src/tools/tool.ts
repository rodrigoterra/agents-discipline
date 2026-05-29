// Shared interface for an interactive annotation tool. A tool's only job is to
// turn a pointer gesture into the type-specific `geometry` for an Annotation;
// all rendering lives centrally in canvas.ts so it is identical on screen and
// in the flattened export.
import type { Annotation, Semantic, ToolType } from "../../../shared/annotation-schema";

/** A point in normalized image space (0..1 on each axis). */
export type Pt = { x: number; y: number };

/** Live gesture state, all coordinates already normalized to 0..1. */
export interface ToolDrag {
  start: Pt;
  current: Pt;
  /** Sampled path for freehand drawing. */
  path: Pt[];
}

/** Geometry payload for any annotation, keyed off the tool type. */
export type Geometry = Annotation["geometry"];

export interface Tool {
  type: ToolType;
  /** "drag" shapes commit on pointer-up; "click" commit on a single click. */
  mode: "drag" | "click" | "freehand";
  /** Whether to auto-open the text-note popup after committing. */
  opensNote: boolean;
  /** Default semantic intent assigned to marks from this tool. */
  defaultSemantic: Semantic;
  /**
   * Build the geometry from the current gesture, or null if the gesture is too
   * small / degenerate to be a real mark (e.g. an accidental click).
   */
  build(drag: ToolDrag): Geometry | null;
}

/** Minimum normalized extent below which a drag is treated as an accidental click. */
export const MIN_EXTENT = 0.004;
