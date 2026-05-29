import { type Tool } from "./tool";

/** A single click drops a numbered callout pin. The number is assigned by state. */
export const markerTool: Tool = {
  type: "marker",
  mode: "click",
  opensNote: true,
  defaultSemantic: "step",
  build(drag) {
    return { x: drag.current.x, y: drag.current.y };
  },
};
