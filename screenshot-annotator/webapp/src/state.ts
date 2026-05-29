// In-memory annotation store with undo/redo and the marker counter.
import type { Annotation, Semantic, ToolType } from "../../shared/annotation-schema";

let idSeq = 0;
export function nextId(): string {
  idSeq += 1;
  return `a${idSeq}`;
}

export class AnnotationStore {
  private annotations: Annotation[] = [];
  private undone: Annotation[] = [];
  /** Next marker number (1-based), independent of undo so numbers stay stable). */
  private markerSeq = 0;

  list(): readonly Annotation[] {
    return this.annotations;
  }

  add(ann: Annotation): void {
    this.annotations.push(ann);
    this.undone = []; // a fresh action invalidates the redo stack
  }

  /** Allocate the next marker label, e.g. "1", "2", ... */
  nextMarkerLabel(): string {
    this.markerSeq += 1;
    return String(this.markerSeq);
  }

  /** Replace the note text on an existing annotation (skips redactions, which have none). */
  setNote(id: string, note: string): void {
    const ann = this.annotations.find((a) => a.id === id);
    if (ann && ann.type !== "redact") {
      if (note.trim()) ann.note = note.trim();
      else delete ann.note;
    }
  }

  remove(id: string): void {
    this.annotations = this.annotations.filter((a) => a.id !== id);
  }

  undo(): void {
    const popped = this.annotations.pop();
    if (popped) this.undone.push(popped);
  }

  redo(): void {
    const restored = this.undone.pop();
    if (restored) this.annotations.push(restored);
  }

  clear(): void {
    this.annotations = [];
    this.undone = [];
    this.markerSeq = 0;
  }

  canUndo(): boolean {
    return this.annotations.length > 0;
  }
  canRedo(): boolean {
    return this.undone.length > 0;
  }
}

/** Current toolbar selection shared across modules. */
export interface ToolbarState {
  tool: ToolType;
  stroke: string;
  fill: "none" | "striped" | "solid";
  semantic: Semantic;
}
