// Bootstraps the annotation canvas: loads the screenshot, wires the toolbar and
// pointer interactions, opens the note popup after each mark, and ships the
// result on "Done".
import type { Annotation, Semantic, ToolType } from "../../shared/annotation-schema";
import { CanvasView, hitTest, type Draft } from "./canvas";
import { AnnotationStore, nextId, type ToolbarState } from "./state";
import { TOOLS, penTool, redactTool, type Pt, type ToolDrag } from "./tools";
import { openNotePopup } from "./text-popup";
import { buildDoc, postDone } from "./export";

const store = new AnnotationStore();
const toolbar: ToolbarState = { tool: "rect", stroke: "#e11d48", fill: "none", semantic: "highlight" };
let view: CanvasView | null = null;
let source: string | undefined;
let finished = false;
/** Object URL of the image currently shown, so we can revoke it on replace. */
let currentObjectUrl: string | null = null;
/** "mcp" when launched by Claude's tool, "dev" via the standalone launcher. */
let mode: "mcp" | "dev" = "mcp";

/** Single-key shortcuts for tool selection. */
const TOOL_KEYS: Record<string, ToolType> = {
  r: "rect",
  e: "ellipse",
  a: "arrow",
  p: "pen",
  m: "marker",
  x: "redact",
};

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

function setStatus(msg: string): void {
  $("#status").textContent = msg;
}

/** True when focus is in a text field or the note popup is open. */
function isTyping(): boolean {
  const el = document.activeElement;
  return (
    Boolean(document.querySelector(".note-overlay")) ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLInputElement ||
    el instanceof HTMLSelectElement
  );
}

async function main(): Promise<void> {
  const meta = await fetch("/meta")
    .then((r) => r.json())
    .catch(() => ({ hasImage: false }));
  source = meta.source;
  if (meta.mode === "dev") mode = "dev";

  wireToolbar();
  wireCanvas();
  wireImageSources();
  selectTool("rect");

  if (meta.hasImage) {
    try {
      await loadImage("/image?t=" + Date.now());
      setReadyStatus();
    } catch {
      // The provided image couldn't be decoded — let the user supply one instead
      // of leaving them staring at a blank canvas.
      setStatus("Could not load the provided image — paste, drop, or choose one to annotate.");
      showPicker();
    }
  } else {
    showPicker();
  }
}

function setReadyStatus(): void {
  setStatus(
    "Shortcuts: R rect · E ellipse · A arrow · P pen · M marker · X redact. " +
      "Right-click a mark to delete it. Paste, drop, or “Change image” to swap the image.",
  );
}

function loadImage(src: string): Promise<void> {
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

/** Show the picker overlay (no image yet, or an undecodable one). */
function showPicker(): void {
  $("#picker").style.display = "flex";
}

/**
 * Load an image supplied locally — via the file picker, drag-drop, or clipboard
 * paste. Revokes the previous object URL once the new image has decoded.
 */
async function loadFromBlob(blob: Blob, name: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await loadImage(url);
  } catch {
    URL.revokeObjectURL(url);
    setStatus(`Could not load “${name}” — try a different image.`);
    return;
  }
  if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
  currentObjectUrl = url;
  source = name;
  $("#picker").style.display = "none";
  store.clear();
  render();
  setReadyStatus();
}

/** Wire the three ways to supply/replace an image: picker, paste, drag-drop. */
function wireImageSources(): void {
  const fileInput = $<HTMLInputElement>("#file");
  fileInput.onchange = async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    await loadFromBlob(file, file.name);
    fileInput.value = ""; // allow re-picking the same file name later
  };

  // Always-available toolbar button → opens the native file chooser.
  $("#change-image").onclick = () => fileInput.click();

  // Clipboard paste anywhere in the window (ignored while typing a note).
  window.addEventListener("paste", async (e) => {
    if (finished || isTyping()) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await loadFromBlob(file, file.name || "pasted-image.png");
        }
        return;
      }
    }
  });

  // Drag & drop an image file onto the stage.
  const stage = $("#stage");
  const halt = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  stage.addEventListener("dragover", (e) => {
    halt(e);
    if (!finished) stage.classList.add("drag-over");
  });
  stage.addEventListener("dragleave", (e) => {
    halt(e);
    stage.classList.remove("drag-over");
  });
  stage.addEventListener("drop", async (e) => {
    halt(e);
    stage.classList.remove("drag-over");
    if (finished) return;
    const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
    if (file) await loadFromBlob(file, file.name);
  });
}

function relayout(): void {
  if (!view) return;
  const stage = $("#stage");
  view.fit(stage.clientWidth - 24, stage.clientHeight - 24);
  view.render(store.list());
}

function render(draft?: Draft): void {
  view?.render(store.list(), draft);
  $<HTMLButtonElement>("#undo").disabled = !store.canUndo();
  $<HTMLButtonElement>("#redo").disabled = !store.canRedo();
}

// --- Toolbar ---

function selectTool(tool: ToolType): void {
  toolbar.tool = tool;
  const def = TOOLS[tool];
  toolbar.semantic = def.defaultSemantic;
  // Sensible fill default: blocking marks read better striped.
  toolbar.fill = tool === "rect" || tool === "ellipse" ? "striped" : "none";
  syncToolbarInputs();
  for (const btn of document.querySelectorAll<HTMLElement>("[data-tool]")) {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  }
  $("#pen-opts").style.display = tool === "pen" ? "flex" : "none";
  $("#redact-opts").style.display = tool === "redact" ? "flex" : "none";
  $("#shape-opts").style.display = tool === "redact" || tool === "marker" ? "none" : "flex";
}

function syncToolbarInputs(): void {
  $<HTMLInputElement>("#stroke").value = toolbar.stroke;
  $<HTMLSelectElement>("#fill").value = toolbar.fill;
  $<HTMLSelectElement>("#semantic").value = toolbar.semantic;
}

function wireToolbar(): void {
  for (const btn of document.querySelectorAll<HTMLElement>("[data-tool]")) {
    btn.onclick = () => selectTool(btn.dataset.tool as ToolType);
  }
  $<HTMLInputElement>("#stroke").oninput = (e) => (toolbar.stroke = (e.target as HTMLInputElement).value);
  $<HTMLSelectElement>("#fill").onchange = (e) =>
    (toolbar.fill = (e.target as HTMLSelectElement).value as ToolbarState["fill"]);
  $<HTMLSelectElement>("#semantic").onchange = (e) =>
    (toolbar.semantic = (e.target as HTMLSelectElement).value as Semantic);
  $<HTMLInputElement>("#pen-arrowhead").onchange = (e) =>
    (penTool.arrowhead = (e.target as HTMLInputElement).checked);
  $<HTMLInputElement>("#redact-pixelate").onchange = (e) =>
    (redactTool.pixelate = (e.target as HTMLInputElement).checked);

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
    } else if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
      e.preventDefault();
      store.redo();
      render();
    } else if (!e.metaKey && !e.ctrlKey && !e.altKey && !isTyping() && TOOL_KEYS[e.key.toLowerCase()]) {
      // Single-key tool shortcuts (only when not typing in a field).
      selectTool(TOOL_KEYS[e.key.toLowerCase()]);
    }
  });
  window.addEventListener("resize", relayout);
}

// --- Canvas interaction ---

function wireCanvas(): void {
  const canvas = $<HTMLCanvasElement>("#canvas");
  let drag: ToolDrag | null = null;

  const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

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
    if (TOOLS[toolbar.tool].mode === "freehand" && dist(drag.path[drag.path.length - 1], p) > 0.002) {
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

  // Right-click deletes the topmost annotation under the cursor.
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if (finished || !view) return;
    const p = view.normalize(e);
    const id = hitTest(store.list(), p.x, p.y, view);
    if (id) {
      store.remove(id);
      render();
      setStatus("Deleted 1 annotation. (Right-click a mark to delete it.)");
    }
  });
}

/** Build a preview-only draft annotation from the live gesture. */
function draftFrom(drag: ToolDrag): Draft | undefined {
  const tool = TOOLS[toolbar.tool];
  const geom = tool.build(drag);
  if (!geom) return undefined;
  return assemble(tool.type, geom, "preview");
}

async function commit(drag: ToolDrag, clientX: number, clientY: number): Promise<void> {
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

/** Assemble a fully-typed Annotation from the active toolbar state and geometry. */
function assemble(type: ToolType, geom: any, id: string): Annotation {
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
        style,
      };
    case "redact":
      return { id, type, semantic: "redact", geometry: geom, mode: redactTool.pixelate ? "pixelate" : "solid" };
  }
}

async function finish(): Promise<void> {
  if (finished || !view) return;
  setStatus("Saving…");
  const annotations = store.list();
  const flat = view.flatten(annotations);
  const doc = buildDoc(view, annotations, source);
  try {
    const ok = await postDone({ doc, png: flat.base64 });
    if (!ok) throw new Error("server rejected");
    finished = true;
    $("#done").setAttribute("disabled", "true");
    document.body.classList.add("finished");
    const dest = mode === "dev" ? "saved to disk" : "sent to Claude";
    setStatus(`${annotations.length} annotation(s) ${dest}. You can close this tab.`);
  } catch (err) {
    setStatus(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
  }
}

main().catch((err) => setStatus(`Error: ${err.message}`));
