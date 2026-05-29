"use strict";
(() => {
  // webapp/src/canvas.ts
  var DEFAULT_STROKE = "#e11d48";
  var CanvasView = class {
    constructor(canvas, img) {
      this.canvas = canvas;
      this.img = img;
      this.naturalW = img.naturalWidth;
      this.naturalH = img.naturalHeight;
      this.defaultStroke = clamp(Math.round(this.naturalW / 400), 2, 8);
      this.markerRadius = clamp(Math.round(this.naturalW / 55), 12, 40);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("2D canvas context unavailable");
      this.ctx = ctx;
    }
    naturalW;
    naturalH;
    /** Default stroke width in source-image pixels, scaled to the image size. */
    defaultStroke;
    /** Marker pin radius in source-image pixels. */
    markerRadius;
    ctx;
    dpr = Math.max(1, window.devicePixelRatio || 1);
    displayW = 0;
    displayH = 0;
    /** Size the canvas to fit within the given box while preserving aspect ratio. */
    fit(boxW, boxH) {
      const scale = Math.min(boxW / this.naturalW, boxH / this.naturalH, 1);
      this.displayW = Math.max(1, Math.round(this.naturalW * scale));
      this.displayH = Math.max(1, Math.round(this.naturalH * scale));
      this.canvas.style.width = `${this.displayW}px`;
      this.canvas.style.height = `${this.displayH}px`;
      this.canvas.width = Math.round(this.displayW * this.dpr);
      this.canvas.height = Math.round(this.displayH * this.dpr);
    }
    /** Convert a pointer event to normalized image coordinates (clamped to 0..1). */
    normalize(ev) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clamp((ev.clientX - rect.left) / rect.width, 0, 1),
        y: clamp((ev.clientY - rect.top) / rect.height, 0, 1)
      };
    }
    /** Repaint the on-screen canvas with the committed annotations and an optional draft. */
    render(annotations, draft) {
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
    flatten(annotations, maxSide = 2400) {
      const scale = Math.min(maxSide / this.naturalW, maxSide / this.naturalH, 1);
      const w = Math.max(1, Math.round(this.naturalW * scale));
      const h = Math.max(1, Math.round(this.naturalH * scale));
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const octx = off.getContext("2d");
      if (!octx) throw new Error("2D canvas context unavailable");
      paint(octx, this.img, w, h, annotations, void 0, this);
      const base64 = off.toDataURL("image/png").split(",")[1] ?? "";
      return { base64, width: this.naturalW, height: this.naturalH };
    }
  };
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }
  function paint(ctx, img, W, H, annotations, draft, view2) {
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, W, H);
    const px = W / view2.naturalW;
    for (const ann of annotations) drawAnnotation(ctx, ann, img, W, H, px, view2);
    if (draft) drawAnnotation(ctx, { ...draft, id: "__draft__" }, img, W, H, px, view2);
  }
  function drawAnnotation(ctx, ann, img, W, H, px, view2) {
    const stroke = ann.type === "redact" ? "#000" : ann.style?.stroke ?? DEFAULT_STROKE;
    const lineWidth = (ann.type === "redact" ? 0 : ann.style?.strokeWidth ?? view2.defaultStroke) * px;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    switch (ann.type) {
      case "rect": {
        const { x, y, w, h } = ann.geometry;
        fillShape(ctx, ann, stroke, px, () => ctx.rect(x * W, y * H, w * W, h * H));
        ctx.strokeRect(x * W, y * H, w * W, h * H);
        if (ann.note) caption(ctx, ann.note, x * W, y * H, px);
        break;
      }
      case "ellipse": {
        const { x, y, w, h } = ann.geometry;
        const cx = (x + w / 2) * W;
        const cy = (y + h / 2) * H;
        fillShape(ctx, ann, stroke, px, () => ctx.ellipse(cx, cy, w / 2 * W, h / 2 * H, 0, 0, Math.PI * 2));
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2 * W, h / 2 * H, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (ann.note) caption(ctx, ann.note, x * W, y * H, px);
        break;
      }
      case "arrow": {
        const { x1, y1, x2, y2 } = ann.geometry;
        drawArrow(ctx, x1 * W, y1 * H, x2 * W, y2 * H, lineWidth);
        if (ann.note) caption(ctx, ann.note, (x1 + x2) / 2 * W, (y1 + y2) / 2 * H, px);
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
          caption(ctx, ann.note, last[0] * W, last[1] * H, px);
        }
        break;
      }
      case "marker": {
        const cx = ann.geometry.x * W;
        const cy = ann.geometry.y * H;
        const r = view2.markerRadius * px;
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
        if (ann.note) caption(ctx, `${ann.label}. ${ann.note}`, cx + r, cy - r, px);
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
  function fillShape(ctx, ann, stroke, px, pathFn) {
    const fill = ann.type === "redact" ? "none" : ann.style?.fill ?? "none";
    if (fill === "none") return;
    const color = ann.type !== "redact" && ann.style?.fillColor || stroke;
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
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }
  var patternCache = /* @__PURE__ */ new Map();
  function stripePattern(ctx, color, px) {
    const tileSize = Math.max(6, Math.round(10 * px));
    const key = `${color}@${tileSize}`;
    const cached = patternCache.get(key);
    if (cached) return cached;
    const tile = document.createElement("canvas");
    tile.width = tileSize;
    tile.height = tileSize;
    const tctx = tile.getContext("2d");
    tctx.strokeStyle = color;
    tctx.lineWidth = Math.max(1, Math.round(tileSize / 4));
    tctx.beginPath();
    tctx.moveTo(-tileSize / 2, tileSize / 2);
    tctx.lineTo(tileSize / 2, -tileSize / 2);
    tctx.moveTo(tileSize / 2, tileSize * 1.5);
    tctx.lineTo(tileSize * 1.5, tileSize / 2);
    tctx.stroke();
    const pattern = ctx.createPattern(tile, "repeat");
    patternCache.set(key, pattern);
    return pattern;
  }
  function drawArrow(ctx, x1, y1, x2, y2, lw) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    arrowHead(ctx, x1, y1, x2, y2, lw);
  }
  function arrowHead(ctx, fromX, fromY, toX, toY, lw) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const len = Math.max(8, lw * 3.5);
    const spread = Math.PI / 7;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - len * Math.cos(angle - spread), toY - len * Math.sin(angle - spread));
    ctx.lineTo(toX - len * Math.cos(angle + spread), toY - len * Math.sin(angle + spread));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }
  function pixelate(ctx, img, nx, ny, nw, nh, W, H) {
    const sx = nx * img.naturalWidth;
    const sy = ny * img.naturalHeight;
    const sw = Math.max(1, nw * img.naturalWidth);
    const sh = Math.max(1, nh * img.naturalHeight);
    const blocks = 14;
    const tmp = document.createElement("canvas");
    tmp.width = blocks;
    tmp.height = Math.max(1, Math.round(blocks * sh / sw));
    const tctx = tmp.getContext("2d");
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(img, sx, sy, sw, sh, 0, 0, tmp.width, tmp.height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, nx * W, ny * H, nw * W, nh * H);
    ctx.restore();
  }
  function caption(ctx, text, x, y, px) {
    const max = 48;
    const label = text.length > max ? `${text.slice(0, max - 1)}\u2026` : text;
    const fontPx = Math.max(11, Math.round(13 * px));
    ctx.save();
    ctx.font = `${fontPx}px sans-serif`;
    const padding = Math.round(fontPx * 0.4);
    const w = ctx.measureText(label).width + padding * 2;
    const h = fontPx + padding * 2;
    let bx = x;
    let by = y - h - padding;
    if (by < 0) by = y + padding;
    bx = Math.min(bx, ctx.canvas.width - w);
    bx = Math.max(0, bx);
    ctx.fillStyle = "rgba(17,17,17,0.82)";
    ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + padding, by + h / 2);
    ctx.restore();
  }

  // webapp/src/state.ts
  var idSeq = 0;
  function nextId() {
    idSeq += 1;
    return `a${idSeq}`;
  }
  var AnnotationStore = class {
    annotations = [];
    undone = [];
    /** Next marker number (1-based), independent of undo so numbers stay stable). */
    markerSeq = 0;
    list() {
      return this.annotations;
    }
    add(ann) {
      this.annotations.push(ann);
      this.undone = [];
    }
    /** Allocate the next marker label, e.g. "1", "2", ... */
    nextMarkerLabel() {
      this.markerSeq += 1;
      return String(this.markerSeq);
    }
    /** Replace the note text on an existing annotation (skips redactions, which have none). */
    setNote(id, note) {
      const ann = this.annotations.find((a) => a.id === id);
      if (ann && ann.type !== "redact") {
        if (note.trim()) ann.note = note.trim();
        else delete ann.note;
      }
    }
    remove(id) {
      this.annotations = this.annotations.filter((a) => a.id !== id);
    }
    undo() {
      const popped = this.annotations.pop();
      if (popped) this.undone.push(popped);
    }
    redo() {
      const restored = this.undone.pop();
      if (restored) this.annotations.push(restored);
    }
    clear() {
      this.annotations = [];
      this.undone = [];
      this.markerSeq = 0;
    }
    canUndo() {
      return this.annotations.length > 0;
    }
    canRedo() {
      return this.undone.length > 0;
    }
  };

  // webapp/src/tools/tool.ts
  var MIN_EXTENT = 4e-3;

  // webapp/src/tools/rect.ts
  function dragToBox(drag) {
    const x = Math.min(drag.start.x, drag.current.x);
    const y = Math.min(drag.start.y, drag.current.y);
    const w = Math.abs(drag.current.x - drag.start.x);
    const h = Math.abs(drag.current.y - drag.start.y);
    return { x, y, w, h };
  }
  var rectTool = {
    type: "rect",
    mode: "drag",
    opensNote: true,
    defaultSemantic: "highlight",
    build(drag) {
      const box = dragToBox(drag);
      if (box.w < MIN_EXTENT || box.h < MIN_EXTENT) return null;
      return box;
    }
  };

  // webapp/src/tools/ellipse.ts
  var ellipseTool = {
    type: "ellipse",
    mode: "drag",
    opensNote: true,
    defaultSemantic: "highlight",
    build(drag) {
      const box = dragToBox(drag);
      if (box.w < MIN_EXTENT || box.h < MIN_EXTENT) return null;
      return box;
    }
  };

  // webapp/src/tools/arrow.ts
  var arrowTool = {
    type: "arrow",
    mode: "drag",
    opensNote: true,
    defaultSemantic: "note",
    build(drag) {
      const dx = drag.current.x - drag.start.x;
      const dy = drag.current.y - drag.start.y;
      if (Math.hypot(dx, dy) < MIN_EXTENT) return null;
      return { x1: drag.start.x, y1: drag.start.y, x2: drag.current.x, y2: drag.current.y };
    }
  };

  // webapp/src/tools/pen.ts
  var penTool = {
    type: "pen",
    mode: "freehand",
    opensNote: true,
    defaultSemantic: "note",
    arrowhead: false,
    build(drag) {
      const pts = drag.path;
      if (pts.length < 2) return null;
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      if (extent < MIN_EXTENT) return null;
      return {
        points: pts.map((p) => [p.x, p.y]),
        arrowhead: this.arrowhead
      };
    }
  };

  // webapp/src/tools/marker.ts
  var markerTool = {
    type: "marker",
    mode: "click",
    opensNote: true,
    defaultSemantic: "step",
    build(drag) {
      return { x: drag.current.x, y: drag.current.y };
    }
  };

  // webapp/src/tools/redact.ts
  var redactTool = {
    type: "redact",
    mode: "drag",
    opensNote: false,
    defaultSemantic: "redact",
    pixelate: false,
    build(drag) {
      const box = dragToBox(drag);
      if (box.w < MIN_EXTENT || box.h < MIN_EXTENT) return null;
      return box;
    }
  };

  // webapp/src/tools/index.ts
  var TOOLS = {
    rect: rectTool,
    ellipse: ellipseTool,
    arrow: arrowTool,
    pen: penTool,
    marker: markerTool,
    redact: redactTool
  };

  // webapp/src/text-popup.ts
  function openNotePopup(clientX, clientY, existing = "") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "note-overlay";
      const box = document.createElement("div");
      box.className = "note-box";
      const left = Math.min(clientX, window.innerWidth - 280);
      const top = Math.min(clientY, window.innerHeight - 140);
      box.style.left = `${Math.max(8, left)}px`;
      box.style.top = `${Math.max(8, top)}px`;
      const label = document.createElement("label");
      label.textContent = "Note for this mark";
      const input = document.createElement("textarea");
      input.rows = 3;
      input.value = existing;
      input.placeholder = "Describe what this marks\u2026 (Enter to save, Esc to skip)";
      const actions = document.createElement("div");
      actions.className = "note-actions";
      const save = document.createElement("button");
      save.textContent = "Save";
      save.className = "primary";
      const skip = document.createElement("button");
      skip.textContent = "Skip";
      let done = false;
      const finish2 = (value) => {
        if (done) return;
        done = true;
        overlay.remove();
        resolve(value);
      };
      save.onclick = () => finish2(input.value);
      skip.onclick = () => finish2("");
      input.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          finish2(input.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish2("");
        }
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) finish2(input.value);
      };
      actions.append(save, skip);
      box.append(label, input, actions);
      overlay.append(box);
      document.body.append(overlay);
      input.focus();
    });
  }

  // webapp/src/export.ts
  function buildSummary(annotations) {
    if (annotations.length === 0) return "No annotations.";
    const bySemantic = /* @__PURE__ */ new Map();
    for (const a of annotations) bySemantic.set(a.semantic, (bySemantic.get(a.semantic) ?? 0) + 1);
    const parts = [...bySemantic.entries()].map(([s, n]) => `${n} ${s}`);
    return `${annotations.length} mark(s): ${parts.join(", ")}.`;
  }
  function buildDoc(view2, annotations, source2) {
    return {
      version: "1.0",
      image: { width: view2.naturalW, height: view2.naturalH, source: source2 },
      annotations: [...annotations],
      summary: buildSummary(annotations)
    };
  }
  async function postDone(payload) {
    const res = await fetch("/done", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.ok;
  }

  // webapp/src/main.ts
  var store = new AnnotationStore();
  var toolbar = { tool: "rect", stroke: "#e11d48", fill: "none", semantic: "highlight" };
  var view = null;
  var source;
  var finished = false;
  var $ = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`missing element: ${sel}`);
    return el;
  };
  function setStatus(msg) {
    $("#status").textContent = msg;
  }
  async function main() {
    const meta = await fetch("/meta").then((r) => r.json()).catch(() => ({ hasImage: false }));
    source = meta.source;
    if (meta.hasImage) {
      await loadImage("/image?t=" + Date.now());
    } else {
      await pickFile();
    }
    wireToolbar();
    wireCanvas();
    selectTool("rect");
    setStatus("Pick a tool and start annotating.");
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        view = new CanvasView($("#canvas"), img);
        relayout();
        resolve();
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = src;
    });
  }
  function pickFile() {
    return new Promise((resolve) => {
      const picker = $("#picker");
      picker.style.display = "flex";
      const input = $("#file");
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        source = file.name;
        picker.style.display = "none";
        await loadImage(URL.createObjectURL(file));
        resolve();
      };
    });
  }
  function relayout() {
    if (!view) return;
    const stage = $("#stage");
    view.fit(stage.clientWidth - 24, stage.clientHeight - 24);
    view.render(store.list());
  }
  function render(draft) {
    view?.render(store.list(), draft);
    $("#undo").disabled = !store.canUndo();
    $("#redo").disabled = !store.canRedo();
  }
  function selectTool(tool) {
    toolbar.tool = tool;
    const def = TOOLS[tool];
    toolbar.semantic = def.defaultSemantic;
    toolbar.fill = tool === "rect" || tool === "ellipse" ? "striped" : "none";
    syncToolbarInputs();
    for (const btn of document.querySelectorAll("[data-tool]")) {
      btn.classList.toggle("active", btn.dataset.tool === tool);
    }
    $("#pen-opts").style.display = tool === "pen" ? "flex" : "none";
    $("#redact-opts").style.display = tool === "redact" ? "flex" : "none";
    $("#shape-opts").style.display = tool === "redact" || tool === "marker" ? "none" : "flex";
  }
  function syncToolbarInputs() {
    $("#stroke").value = toolbar.stroke;
    $("#fill").value = toolbar.fill;
    $("#semantic").value = toolbar.semantic;
  }
  function wireToolbar() {
    for (const btn of document.querySelectorAll("[data-tool]")) {
      btn.onclick = () => selectTool(btn.dataset.tool);
    }
    $("#stroke").oninput = (e) => toolbar.stroke = e.target.value;
    $("#fill").onchange = (e) => toolbar.fill = e.target.value;
    $("#semantic").onchange = (e) => toolbar.semantic = e.target.value;
    $("#pen-arrowhead").onchange = (e) => penTool.arrowhead = e.target.checked;
    $("#redact-pixelate").onchange = (e) => redactTool.pixelate = e.target.checked;
    $("#undo").onclick = () => {
      store.undo();
      render();
    };
    $("#redo").onclick = () => {
      store.redo();
      render();
    };
    $("#clear").onclick = () => {
      if (store.canUndo() && confirm("Clear all annotations?")) {
        store.clear();
        render();
      }
    };
    $("#done").onclick = () => finish();
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        render();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        store.redo();
        render();
      }
    });
    window.addEventListener("resize", relayout);
  }
  function wireCanvas() {
    const canvas = $("#canvas");
    let drag = null;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    canvas.addEventListener("pointerdown", (e) => {
      if (finished || !view) return;
      const p = view.normalize(e);
      drag = { start: p, current: p, path: [p] };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!drag || !view) return;
      const p = view.normalize(e);
      drag.current = p;
      if (TOOLS[toolbar.tool].mode === "freehand" && dist(drag.path[drag.path.length - 1], p) > 2e-3) {
        drag.path.push(p);
      }
      render(draftFrom(drag));
    });
    canvas.addEventListener("pointerup", async (e) => {
      if (!drag || !view) return;
      const d = drag;
      drag = null;
      await commit(d, e.clientX, e.clientY);
      render();
    });
  }
  function draftFrom(drag) {
    const tool = TOOLS[toolbar.tool];
    const geom = tool.build(drag);
    if (!geom) return void 0;
    return assemble(tool.type, geom, "preview");
  }
  async function commit(drag, clientX, clientY) {
    const tool = TOOLS[toolbar.tool];
    const geom = tool.build(drag);
    if (!geom) return;
    const id = nextId();
    const ann = assemble(tool.type, geom, id);
    store.add(ann);
    render();
    if (tool.opensNote) {
      const note = await openNotePopup(clientX, clientY);
      if (note) store.setNote(id, note);
    }
  }
  function assemble(type, geom, id) {
    const style = { stroke: toolbar.stroke, fill: toolbar.fill, fillColor: toolbar.stroke };
    switch (type) {
      case "rect":
        return { id, type, semantic: toolbar.semantic, geometry: geom, style };
      case "ellipse":
        return { id, type, semantic: toolbar.semantic, geometry: geom, style };
      case "arrow":
        return { id, type, semantic: toolbar.semantic, geometry: geom, style };
      case "pen":
        return { id, type, semantic: toolbar.semantic, geometry: geom, style };
      case "marker":
        return {
          id,
          type,
          semantic: toolbar.semantic,
          geometry: geom,
          label: id === "preview" ? "?" : store.nextMarkerLabel(),
          style
        };
      case "redact":
        return { id, type, semantic: "redact", geometry: geom, mode: redactTool.pixelate ? "pixelate" : "solid" };
    }
  }
  async function finish() {
    if (finished || !view) return;
    setStatus("Saving\u2026");
    const annotations = store.list();
    const flat = view.flatten(annotations);
    const doc = buildDoc(view, annotations, source);
    try {
      const ok = await postDone({ doc, png: flat.base64 });
      if (!ok) throw new Error("server rejected");
      finished = true;
      $("#done").setAttribute("disabled", "true");
      document.body.classList.add("finished");
      setStatus(`Sent ${annotations.length} annotation(s) to Claude. You can close this tab.`);
    } catch (err) {
      setStatus(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  main().catch((err) => setStatus(`Error: ${err.message}`));
})();
