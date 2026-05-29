import { MIN_EXTENT, type Tool } from "./tool";
import { dragToBox } from "./rect";

/**
 * Redaction box. Unlike the striped "eliminate" shape (a visible suggestion),
 * this DESTROYS the underlying pixels in the flattened export — solid black by
 * default, or a coarse pixelation. It never opens a note popup, and the emitted
 * JSON carries no text describing what was hidden, so nothing sensitive leaks.
 */
export const redactTool: Tool & { pixelate: boolean } = {
  type: "redact",
  mode: "drag",
  opensNote: false,
  defaultSemantic: "redact",
  pixelate: false,
  build(drag) {
    const box = dragToBox(drag);
    if (box.w < MIN_EXTENT || box.h < MIN_EXTENT) return null;
    return box;
  },
};
