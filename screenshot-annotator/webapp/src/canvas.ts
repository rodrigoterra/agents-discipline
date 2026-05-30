// Canvas rendering for the annotation surface. The same paint routine drives the
// on-screen preview and the full-resolution flattened export, so what the user
// sees is exactly what Claude receives.
import type { Annotation } from "../../shared/annotation-schema";

const DEFAULT_STROKE = "#e11d48";

/** A draft is an in-progress annotation drawn during a gesture (no id yet). */
export type Draft = Omit<Annotation, "id">;

export interface FlatResult {
  /** Bare base64 PNG (no data: prefix). */
  base64: string;
  /** Dimensions of the original source image (the normalized-coord reference). */
  width: number;
  height: number;
}

export class CanvasView {
  readonly naturalW: number;
  readonly naturalH: number;
  /** Default stroke width in source-image pixels, scaled to the image size. */
  readonly defaultStroke: number;
  /** Marker pin radius in source-image pixels. */
  readonly markerRadius: number;

  private ctx: CanvasRenderingContext2D;
  private dpr = Math.max(1, window.devicePixelRatio || 1);
  private displayW = 0;
  private displayH = 0;

  constructor(private canvas: HTMLCanvasElement, private img: HTMLImageElement) {
    this.naturalW = img.naturalWidth;
    this.naturalH = img.naturalHeight;
    this.defaultStroke = clamp(Math.round(this.naturalW / 400), 2, 8);
    this.markerRadius = clamp(Math.round(this.naturalW / 55), 12, 40);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
  }

  /** Size the canvas to fit within the given box while preserving aspect ratio. */
  fit(boxW: number, boxH: number): void {
    const scale = Math.min(boxW / this.naturalW, boxH / this.naturalH, 1);
    this.displayW = Math.max(1, Math.round(this.naturalW * scale));
    this.displayH = Math.max(1, Math.round(this.naturalH * scale));
    this.canvas.style.width = `${this.displayW}px`;
    this.canvas.style.height = `${this.displayH}px`;
    this.canvas.width = Math.round(this.displayW * this.dpr);
    this.canvas.height = Math.round(this.displayH * this.dpr);
  }

  /** Convert a pointer event to normalized image coordinates (clamped to 0..1). */
  normalize(ev: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp((ev.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((ev.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  /** Repaint the on-screen canvas with the committed annotations and an optional draft. */
  render(annotations: readonly Annotation[], draft?: Draft): void {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.displayW, this.displayH);
    paint(ctx, this.img, this.displayW, this.displayH, annotations, draft, this);
  }

  /**
   * Render at (capped) full resolution and return a base64 PNG. Redactions
   * destroy the underlying pixels here, so the returned image never carries the
   * hidden content.
   */
  flatten(annotations: readonly Annotation[], maxSide = 2400): FlatResult {
    const scale = Math.min(maxSide / this.naturalW, maxSide / this.naturalH, 1);
    const w = Math.max(1, Math.round(this.naturalW * scale));
    const h = Math.max(1, Math.round(this.naturalH * scale));
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");
    if (!octx) throw new Error("2D canvas context unavailable");
    paint(octx, this.img, w, h, annotations, undefined, this);
    const base64 = off.toDataURL("image/png").split(",")[1] ?? "";
    return { base64, width: this.naturalW, height: this.naturalH };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Paint the base image then every annotation onto `ctx` sized W×H. */
function paint(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  annotations: readonly Annotation[],
  draft: Draft | undefined,
  view: CanvasView,
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, W, H);
  const px = W / view.naturalW; // source-px -> render-px scale
  for (const ann of annotations) drawAnnotation(ctx, ann, img, W, H, px, view);
  if (draft) drawAnnotation(ctx, { ...draft, id: "__draft__" } as Annotation, img, W, H, px, view);
}

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  img: HTMLImageElement,
  W: number,
  H: number,
  px: number,
  view: CanvasView,
): void {
  const stroke = ann.type === "redact" ? "#000" : ann.style?.stroke ?? DEFAULT_STROKE;
  const lineWidth = (ann.type === "redact" ? 0 : ann.style?.strokeWidth ?? view.defaultStroke) * px;
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  switch (ann.type) {
    case "rect": {
      const { x, y, w, h } = ann.geometry;
      fillShape(ctx, ann, stroke, px, () => ctx.rect(x * W, y * H, w * W, h * H));
      ctx.strokeRect(x * W, y * H, w * W, h * H);
      if (ann.note) caption(ctx, ann.note, x * W, y * H, H);
      break;
    }
    case "ellipse": {
      const { x, y, w, h } = ann.geometry;
      const cx = (x + w / 2) * W;
      const cy = (y + h / 2) * H;
      fillShape(ctx, ann, stroke, px, () => ctx.ellipse(cx, cy, (w / 2) * W, (h / 2) * H, 0, 0, Math.PI * 2));
      ctx.beginPath();
      ctx.ellipse(cx, cy, (w / 2) * W, (h / 2) * H, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (ann.note) caption(ctx, ann.note, x * W, y * H, H);
      break;
    }
    case "arrow": {
      const { x1, y1, x2, y2 } = ann.geometry;
      drawArrow(ctx, x1 * W, y1 * H, x2 * W, y2 * H, lineWidth);
      if (ann.note) caption(ctx, ann.note, ((x1 + x2) / 2) * W, ((y1 + y2) / 2) * H, H);
      break;
    }
    case "pen": {
      const pts = ann.geometry.points;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * W, pts[i][1] * H);
      ctx.stroke();
      if (ann.geometry.arrowhead && pts.length >= 2) {
        const [ax, ay] = pts[pts.length - 2];
        const [bx, by] = pts[pts.length - 1];
        arrowHead(ctx, ax * W, ay * H, bx * W, by * H, lineWidth);
      }
      if (ann.note) {
        const last = pts[pts.length - 1];
        caption(ctx, ann.note, last[0] * W, last[1] * H, H);
      }
      break;
    }
    case "marker": {
      const cx = ann.geometry.x * W;
      const cy = ann.geometry.y * H;
      const r = view.markerRadius * px;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = stroke;
      ctx.fill();
      ctx.lineWidth = Math.max(1, px * 1.5);
      ctx.strokeStyle = "#fff";
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(r * 1.1)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ann.label, cx, cy);
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      if (ann.note) caption(ctx, `${ann.label}. ${ann.note}`, cx + r, cy - r, H);
      break;
    }
    case "redact": {
      const { x, y, w, h } = ann.geometry;
      if (ann.mode === "pixelate") {
        pixelate(ctx, img, x, y, w, h, W, H);
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(x * W, y * H, w * W, h * H);
      }
      break;
    }
  }
}

/** Apply a shape's interior fill (none | striped | solid) inside the given path. */
function fillShape(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  stroke: string,
  px: number,
  pathFn: () => void,
): void {
  const fill = ann.type === "redact" ? "none" : ann.style?.fill ?? "none";
  if (fill === "none") return;
  const color = (ann.type !== "redact" && ann.style?.fillColor) || stroke;
  ctx.save();
  ctx.beginPath();
  pathFn();
  ctx.clip();
  if (fill === "striped") {
    ctx.fillStyle = stripePattern(ctx, color, px);
  } else {
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = color;
  }
  // Fill the whole clipped region.
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

const patternCache = new Map<string, CanvasPattern>();
function stripePattern(ctx: CanvasRenderingContext2D, color: string, px: number): CanvasPattern {
  const tileSize = Math.max(6, Math.round(10 * px));
  const key = `${color}@${tileSize}`;
  const cached = patternCache.get(key);
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = tileSize;
  tile.height = tileSize;
  const tctx = tile.getContext("2d")!;
  tctx.strokeStyle = color;
  tctx.lineWidth = Math.max(1, Math.round(tileSize / 4));
  tctx.beginPath();
  // Two diagonals for a seamless 45° hatch.
  tctx.moveTo(-tileSize / 2, tileSize / 2);
  tctx.lineTo(tileSize / 2, -tileSize / 2);
  tctx.moveTo(tileSize / 2, tileSize * 1.5);
  tctx.lineTo(tileSize * 1.5, tileSize / 2);
  tctx.stroke();
  const pattern = ctx.createPattern(tile, "repeat")!;
  patternCache.set(key, pattern);
  return pattern;
}

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  arrowHead(ctx, x1, y1, x2, y2, lw);
}

function arrowHead(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, lw: number): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const len = Math.max(8, lw * 3.5);
  const spread = Math.PI / 7;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - len * Math.cos(angle - spread), toY - len * Math.sin(angle - spread));
  ctx.lineTo(toX - len * Math.cos(angle + spread), toY - len * Math.sin(angle + spread));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}

/** Pixelate a normalized region by sampling ONLY the original image (never other marks). */
function pixelate(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  nx: number,
  ny: number,
  nw: number,
  nh: number,
  W: number,
  H: number,
): void {
  const sx = nx * img.naturalWidth;
  const sy = ny * img.naturalHeight;
  const sw = Math.max(1, nw * img.naturalWidth);
  const sh = Math.max(1, nh * img.naturalHeight);
  const blocks = 14;
  const tmp = document.createElement("canvas");
  tmp.width = blocks;
  tmp.height = Math.max(1, Math.round((blocks * sh) / sw));
  const tctx = tmp.getContext("2d")!;
  tctx.imageSmoothingEnabled = true;
  tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, nx * W, ny * H, nw * W, nh * H);
  ctx.restore();
}

/**
 * A short truncated caption rendered in a pill, anchored above-left of (x,y).
 * Font is sized off the render height (not source pixels) so it stays legible on
 * both the on-screen preview and the full-resolution flattened export.
 */
function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, renderH: number): void {
  const max = 48;
  const label = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  const fontPx = Math.round(Math.min(28, Math.max(13, renderH * 0.018)));
  ctx.save();
  ctx.font = `${fontPx}px sans-serif`;
  const padding = Math.round(fontPx * 0.4);
  const w = ctx.measureText(label).width + padding * 2;
  const h = fontPx + padding * 2;
  let bx = x;
  let by = y - h - padding;
  if (by < 0) by = y + padding; // flip below if it would clip the top
  bx = Math.min(bx, ctx.canvas.width - w);
  bx = Math.max(0, bx);
  ctx.fillStyle = "rgba(17,17,17,0.82)";
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx + padding, by + h / 2);
  ctx.restore();
}

// --- Hit testing (for right-click delete) ---

/** Return the id of the topmost annotation under normalized point (x,y), or null. */
export function hitTest(
  annotations: readonly Annotation[],
  x: number,
  y: number,
  view: CanvasView,
): string | null {
  const markerR = view.markerRadius / view.naturalW; // approx normalized radius
  const lineTol = 0.012;
  for (let i = annotations.length - 1; i >= 0; i--) {
    if (contains(annotations[i], x, y, markerR, lineTol)) return annotations[i].id;
  }
  return null;
}

function contains(ann: Annotation, x: number, y: number, markerR: number, lineTol: number): boolean {
  switch (ann.type) {
    case "rect":
    case "redact": {
      const g = ann.geometry;
      return x >= g.x && x <= g.x + g.w && y >= g.y && y <= g.y + g.h;
    }
    case "ellipse": {
      const g = ann.geometry;
      const rx = g.w / 2;
      const ry = g.h / 2;
      if (rx === 0 || ry === 0) return false;
      const dx = (x - (g.x + rx)) / rx;
      const dy = (y - (g.y + ry)) / ry;
      return dx * dx + dy * dy <= 1;
    }
    case "arrow": {
      const g = ann.geometry;
      return distToSegment(x, y, g.x1, g.y1, g.x2, g.y2) <= lineTol;
    }
    case "pen": {
      const pts = ann.geometry.points;
      for (let i = 1; i < pts.length; i++) {
        if (distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= lineTol) return true;
      }
      return false;
    }
    case "marker": {
      const dx = x - ann.geometry.x;
      const dy = y - ann.geometry.y;
      return Math.hypot(dx, dy) <= markerR;
    }
  }
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
