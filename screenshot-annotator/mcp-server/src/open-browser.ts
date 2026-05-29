// Best-effort cross-platform "open this URL in the default browser". Never
// throws — returns false so the caller can fall back to printing the URL.
import { spawn } from "node:child_process";

export function openBrowser(url: string): boolean {
  try {
    const platform = process.platform;
    let command: string;
    let args: string[];
    if (platform === "darwin") {
      command = "open";
      args = [url];
    } else if (platform === "win32") {
      command = "cmd";
      // `start` is a shell builtin; the empty "" is the window title.
      args = ["/c", "start", "", url];
    } else {
      command = "xdg-open";
      args = [url];
    }
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", () => {
      /* swallow — caller prints the URL */
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}
