/**
 * Public types for the Gifomator encoder core.
 *
 * This module — and everything under core/ — must not import Electron.
 * See specs/gifomator-vision.md.
 */

export type PresetName = 'small' | 'balanced' | 'sharp';
export type Backend = 'gifski' | 'ffmpeg';

export interface Preset {
  readonly name: PresetName;
  /** Target frame rate of the output GIF. */
  readonly fps: number;
  /** Upper bound on output width. Sources narrower than this are never upscaled. */
  readonly maxWidth: number;
  /** gifski -Q, 1-100. */
  readonly quality: number;
  /** ffmpeg palettegen max_colors, for the fallback backend. */
  readonly maxColors: number;
}

/** Pixel rectangle to crop from the source before scaling. */
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface EncodeOptions {
  readonly preset: PresetName;
  /**
   * Width the encoder should treat as the source, used to enforce the never-upscale
   * rule. For a cropped region capture this is the crop width, not the display width.
   */
  readonly sourceWidth: number;
  /**
   * Region to crop before scaling. Region captures record the whole display and crop
   * here, so cropping stays in one tested place rather than in renderer canvas code.
   */
  readonly crop?: CropRect;
  /** Force a backend. Omitted means gifski, falling back to ffmpeg if unavailable. */
  readonly backend?: Backend;
  readonly signal?: AbortSignal;
}

export interface EncodeResult {
  readonly gif: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly frameCount: number;
  readonly fps: number;
  readonly bytes: number;
  /**
   * Which backend actually ran. Callers never have to *choose* a backend, but the
   * result reports one — required for benchmarking and for the licence-fallback test.
   */
  readonly backendUsed: Backend;
  readonly durationMs: number;
}

/**
 * Thrown when the encode pipeline fails. Always carries the underlying tool's stderr
 * so failures are diagnosable rather than surfacing as a silent empty GIF.
 */
export class EncodeError extends Error {
  readonly stderr: string;
  readonly exitCode: number | null;

  constructor(message: string, stderr: string, exitCode: number | null) {
    super(message);
    this.name = 'EncodeError';
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

/** Thrown when an encode is cancelled via its AbortSignal. */
export class AbortError extends Error {
  constructor(message = 'Encode aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * Thrown when the bundled ffmpeg is a GPL build.
 *
 * Exists because the LGPL fallback path is what keeps gifski's AGPL licence from
 * being able to force a rewrite — a GPL ffmpeg silently defeats that. See the
 * licence section of specs/gifomator-phase1-core.md.
 */
export class LicenceError extends Error {
  readonly configuration: string;

  constructor(message: string, configuration: string) {
    super(message);
    this.name = 'LicenceError';
    this.configuration = configuration;
  }
}
