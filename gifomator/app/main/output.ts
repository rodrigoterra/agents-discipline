/**
 * What happens after the encode finishes: write the file, put it on the clipboard,
 * tell the user.
 *
 * The clipboard write is a FILE REFERENCE, not an image. clipboard.writeImage()
 * flattens an animated GIF to a static bitmap — pasting it into Slack would silently
 * drop the animation, which is the entire point of the tool.
 */
import { Notification, clipboard, shell } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { EncodeResult } from '../../core/types.js';

function timestampName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `Gifomator-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.gif`
  );
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Places a file reference on the clipboard in the OS-native flavour, plus the path
 * as plain text so it can be pasted into a terminal.
 *
 * Electron has no cross-platform file-list clipboard API, so this uses the buffer
 * flavours each platform's paste targets actually read.
 */
function writeFileReference(filePath: string): void {
  try {
    if (process.platform === 'darwin') {
      // NSFilenamesPboardType expects a plist array of paths.
      const plist =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ' +
        '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">' +
        `<plist version="1.0"><array><string>${filePath}</string></array></plist>`;
      clipboard.writeBuffer('NSFilenamesPboardType', Buffer.from(plist, 'utf8'));
      clipboard.writeText(filePath);
    } else if (process.platform === 'win32') {
      // CF_HDROP is not exposed by Electron; the text path is the portable fallback.
      clipboard.writeText(filePath);
    } else {
      clipboard.write({ text: filePath });
    }
  } catch (err) {
    console.error('[gifomator] clipboard write failed:', err);
    clipboard.writeText(filePath);
  }
}

export async function deliver(result: EncodeResult, outputFolder: string): Promise<string> {
  const filePath = path.join(outputFolder, timestampName());
  await writeFile(filePath, result.gif);

  writeFileReference(filePath);

  const notification = new Notification({
    title: 'GIF ready',
    body:
      `${path.basename(filePath)} — ${humanSize(result.bytes)}, ` +
      `${result.width}×${result.height}, ${result.frameCount} frames ` +
      `(${(result.durationMs / 1000).toFixed(1)}s)`,
  });
  notification.on('click', () => shell.showItemInFolder(filePath));
  notification.show();

  return filePath;
}
