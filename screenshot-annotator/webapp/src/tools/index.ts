import type { ToolType } from "../../../shared/annotation-schema";
import type { Tool } from "./tool";
import { rectTool } from "./rect";
import { ellipseTool } from "./ellipse";
import { arrowTool } from "./arrow";
import { penTool } from "./pen";
import { markerTool } from "./marker";
import { redactTool } from "./redact";

export { penTool } from "./pen";
export { redactTool } from "./redact";
export type { Tool, Pt, ToolDrag } from "./tool";

export const TOOLS: Record<ToolType, Tool> = {
  rect: rectTool,
  ellipse: ellipseTool,
  arrow: arrowTool,
  pen: penTool,
  marker: markerTool,
  redact: redactTool,
};
