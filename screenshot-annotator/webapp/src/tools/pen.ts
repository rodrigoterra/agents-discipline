import { MIN_EXTENT, type Tool } from "./tool";

/**
 * Freehand pen. The toolbar can toggle an arrowhead on the final point so the
 * stroke reads as a hand-drawn arrow ("pen with arrows"). The flag is read at
 * commit time via `penTool.arrowhead`.
 */
export const penTool: Tool & { arrowhead: boolean } = {
  type: "pen",
  mode: "freehand",
  opensNote: true,
  defaultSemantic: "note",
  arrowhead: false,
  build(drag) {
    const pts = drag.path;
    if (pts.length < 2) return null;
    // Reject a stroke that never really moved.
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    if (extent < MIN_EXTENT) return null;
    return {
      points: pts.map((p) => [p.x, p.y] as [number, number]),
      arrowhead: this.arrowhead,
    };
  },
};
