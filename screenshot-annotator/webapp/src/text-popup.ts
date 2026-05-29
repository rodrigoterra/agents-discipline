// A small floating note editor that auto-opens after a mark is committed.
// Resolves with the entered text, or "" if the user dismisses without typing.
export function openNotePopup(clientX: number, clientY: number, existing = ""): Promise<string> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "note-overlay";

    const box = document.createElement("div");
    box.className = "note-box";
    // Keep the box on-screen.
    const left = Math.min(clientX, window.innerWidth - 280);
    const top = Math.min(clientY, window.innerHeight - 140);
    box.style.left = `${Math.max(8, left)}px`;
    box.style.top = `${Math.max(8, top)}px`;

    const label = document.createElement("label");
    label.textContent = "Note for this mark";

    const input = document.createElement("textarea");
    input.rows = 3;
    input.value = existing;
    input.placeholder = "Describe what this marks… (Enter to save, Esc to skip)";

    const actions = document.createElement("div");
    actions.className = "note-actions";
    const save = document.createElement("button");
    save.textContent = "Save";
    save.className = "primary";
    const skip = document.createElement("button");
    skip.textContent = "Skip";

    let done = false;
    const finish = (value: string) => {
      if (done) return;
      done = true;
      overlay.remove();
      resolve(value);
    };

    save.onclick = () => finish(input.value);
    skip.onclick = () => finish("");
    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        finish(input.value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish("");
      }
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) finish(input.value);
    };

    actions.append(save, skip);
    box.append(label, input, actions);
    overlay.append(box);
    document.body.append(overlay);
    input.focus();
  });
}
