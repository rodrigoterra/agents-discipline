import { MIN_EXTENT, type Tool } from "./tool";

export const arrowTool: Tool = {
  type: "arrow",
  mode: "drag",
  opensNote: true,
  defaultSemantic: "note",
  build(drag) {
    const dx = drag.current.x - drag.start.x;
    const dy = drag.current.y - drag.start.y;
    if (Math.hypot(dx, dy) < MIN_EXTENT) return null;
    return { x1: drag.start.x, y1: drag.start.y, x2: drag.current.x, y2: drag.current.y };
  },
};
