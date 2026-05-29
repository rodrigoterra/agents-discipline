import { MIN_EXTENT, type Tool, type ToolDrag } from "./tool";

/** Normalize a drag into an axis-aligned bounding box {x,y,w,h}. */
export function dragToBox(drag: ToolDrag) {
  const x = Math.min(drag.start.x, drag.current.x);
  const y = Math.min(drag.start.y, drag.current.y);
  const w = Math.abs(drag.current.x - drag.start.x);
  const h = Math.abs(drag.current.y - drag.start.y);
  return { x, y, w, h };
}

export const rectTool: Tool = {
  type: "rect",
  mode: "drag",
  opensNote: true,
  defaultSemantic: "highlight",
  build(drag) {
    const box = dragToBox(drag);
    if (box.w < MIN_EXTENT || box.h < MIN_EXTENT) return null;
    return box;
  },
};
