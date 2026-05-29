import { MIN_EXTENT, type Tool } from "./tool";
import { dragToBox } from "./rect";

export const ellipseTool: Tool = {
  type: "ellipse",
  mode: "drag",
  opensNote: true,
  defaultSemantic: "highlight",
  build(drag) {
    const box = dragToBox(drag); // bounding box of the ellipse
    if (box.w < MIN_EXTENT || box.h < MIN_EXTENT) return null;
    return box;
  },
};
