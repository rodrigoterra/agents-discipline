/**
 * Minimal GIF structure reader — dimensions, frame count, frame delays.
 *
 * Written rather than pulled in as a dependency because we need exactly three facts
 * and they come from well-defined header offsets. Used both by encode() to populate
 * EncodeResult and by the test suite to assert on real output.
 *
 * The parser walks blocks properly rather than scanning for marker bytes: a naive
 * byte scan for 0x21 0xF9 finds false positives inside LZW-compressed image data.
 */

export interface GifInfo {
  width: number;
  height: number;
  frameCount: number;
  /** Per-frame delays in centiseconds, in file order. */
  delays: number[];
}

export function readGifInfo(bytes: Uint8Array): GifInfo {
  if (bytes.length < 13) throw new Error('Not a GIF: too short');
  const magic = String.fromCharCode(...bytes.slice(0, 6));
  if (magic !== 'GIF89a' && magic !== 'GIF87a') {
    throw new Error(`Not a GIF: bad magic ${JSON.stringify(magic)}`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);

  let i = 10;
  const flags = bytes[i]!;
  i += 3; // packed field + background colour index + pixel aspect ratio

  // Global colour table, if present.
  if (flags & 0x80) i += 3 * (1 << ((flags & 0x07) + 1));

  const delays: number[] = [];
  let frameCount = 0;
  let pendingDelay = 0;

  const skipSubBlocks = () => {
    while (i < bytes.length) {
      const size = bytes[i]!;
      i += 1;
      if (size === 0) break;
      i += size;
    }
  };

  while (i < bytes.length) {
    const block = bytes[i]!;

    if (block === 0x3b) break; // trailer

    if (block === 0x21) {
      // Extension
      const label = bytes[i + 1]!;
      i += 2;
      if (label === 0xf9) {
        // Graphic Control Extension: [blockSize][packed][delay lo][delay hi][transparent][0]
        const size = bytes[i]!;
        pendingDelay = view.getUint16(i + 2, true);
        i += 1 + size;
        skipSubBlocks();
      } else {
        skipSubBlocks();
      }
      continue;
    }

    if (block === 0x2c) {
      // Image descriptor
      frameCount += 1;
      delays.push(pendingDelay);
      pendingDelay = 0;

      const localFlags = bytes[i + 9]!;
      i += 10;
      if (localFlags & 0x80) i += 3 * (1 << ((localFlags & 0x07) + 1));
      i += 1; // LZW minimum code size
      skipSubBlocks();
      continue;
    }

    // Unknown byte — bail rather than loop forever.
    break;
  }

  return { width, height, frameCount, delays };
}
