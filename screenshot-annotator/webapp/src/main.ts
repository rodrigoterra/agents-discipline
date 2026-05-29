// Bootstraps the annotation canvas: loads the screenshot, wires the toolbar and
// pointer interactions, opens the note popup after each mark, and ships the
// result on "Done".
import type { Annotation, Semantic, ToolType } from "../../shared/annotation-schema";
import { CanvasView, type Draft } from "./canvas";
import { AnnotationStore, nextId, type ToolbarState } from "./state";
import { TOOLS, penTool, redactTool, type Pt, type ToolDrag } from "./tools";
import { openNotePopup } from "./text-popup";
import { buildDoc, postDone } from "./export";

const store = new AnnotationStore();
const toolbar: ToolbarState = { tool: "rect", stroke: "#e11d48", fill: "none", semantic: "highlight" };
let view: CanvasView | null = null;
let source: string | undefined;
let finished = false;

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`missing element: ${sel}`);
  return el;
};

function setStatus(msg: string): void {
  $("#status").textContent = msg;
}

async function main(): Promise<void> {
  const meta = await fetch("/meta")
    .then((r) => r.json())
    .catch(() => ({ hasImage: false }));
  source = meta.source;

  if (meta.hasImage) {
    try {
      await loadImage("/image?t=" + Date.now());
    } catch {
      // The provided image couldn't be decoded — let the user pick one instead
      // of leaving them staring at a blank canvas.
      setStatus("Could not load the provided image — choose one to annotate.");
      await pickFile();
    }
  } else {
    await pickFile();
  }
  wireToolbar();
  wireCanvas();
  selectTool("rect");
  setStatus("Pick a tool and start annotating.");
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

/** Fallback when the tool was launched without an image path. */
function pickFile(): Promise<void> {
  return new Promise((resolve) => {
    const picker = $("#picker");
    picker.style.display = "flex";
    const input = $<HTMLInputElement>("#file");
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
    setStatus(`Sent ${annotations.length} annotation(s) to Claude. You can close this tab.`);
  } catch (err) {
    setStatus(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
  }
}

main().catch((err) => setStatus(`Error: ${err.message}`));
