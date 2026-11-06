/**
 * What happens after the encode finishes: write the file, put it on the clipboard,
 * tell the user.
 *
 * The clipboard write is a FILE REFERENCE, not an image. clipboard.writeImage()
 * flattens an animated GIF to a static bitmap — pasting it into Slack would silently
 * drop the animation, which is the entire point of the tool.
 */
import { ClipboardItem, Notification, clipboard, shell } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { EncodeResult } from '../../core/types.js';

function timestampName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `Gifomator-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.gif`
  );
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Places the GIF on the clipboard as a real file, plus its path as plain text.
 *
 * Since Electron 44 the `text/uri-list` MIME type maps to each OS's native
 * copied-files format — CF_HDROP on Windows, NSFilenamesPboardType on macOS — so
 * pasting into Slack, Explorer or Finder pastes the actual file and keeps the
 * animation, while a terminal still gets the path from `text/plain`. Before this,
 * Windows had no way to receive a file reference at all and only ever got the path.
 *
 * Both representations go in one ClipboardItem, so they are committed atomically.
 */
async function writeFileReference(filePath: string): Promise<void> {
  try {
    await clipboard.write([
      new ClipboardItem({
        'text/uri-list': pathToFileURL(filePath).href,
        'text/plain': filePath,
      }),
    ]);
  } catch (err) {
    console.error('[gifomator] file-reference clipboard write failed; writing path only:', err);
    try {
      await clipboard.writeText(filePath);
    } catch (textErr) {
      console.error('[gifomator] clipboard unavailable:', textErr);
    }
  }
}

/** A human-readable one-liner describing a finished GIF. */
export function describeResult(filePath: string, result: EncodeResult): string {
  return (
    `${path.basename(filePath)} — ${humanSize(result.bytes)}, ` +
    `${result.width}×${result.height}, ${result.frameCount} frames ` +
    `(${(result.durationMs / 1000).toFixed(1)}s)`
  );
}

/**
 * Shows a system notification, reporting whether the OS actually displayed it.
 *
 * Since Electron 42, macOS notifications go through UNNotification, which refuses to
 * display for apps that are not code-signed and emits `failed` instead — and this
 * build is unsigned by design. The caller therefore always ALSO reports through the
 * floating indicator, which needs no OS permission; this function only tells it
 * whether the toast was the channel that worked.
 */
export function notify(title: string, body: string, onClick?: () => void): Notification {
  const notification = new Notification({ title, body });
  if (onClick) notification.on('click', onClick);
  notification.on('failed', (_e, error) => {
    console.error(`[gifomator] notification not shown (${title}):`, error);
  });
  notification.show();
  return notification;
}

export async function deliver(result: EncodeResult, outputFolder: string): Promise<string> {
  const filePath = path.join(outputFolder, timestampName());
  await writeFile(filePath, result.gif);

  await writeFileReference(filePath);

  notify('GIF ready', describeResult(filePath, result), () => shell.showItemInFolder(filePath));

  return filePath;
}
