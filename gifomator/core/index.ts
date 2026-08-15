/**
 * Gifomator encoder core — public surface.
 *
 * Nothing under core/ imports Electron. This is enforced by eslint.config.mjs and by
 * an Electron-free type-check (tsconfig.core.json), because the headless-test story
 * and the future MCP wrapper both depend on it.
 */
export { encode } from './encode.js';
export { assertFfmpegIsLgpl, ffmpegConfiguration, probeBinaries, resolveBinaries, clearBinaryCache } from './binaries.js';
export { PRESETS, DEFAULT_PRESET, getPreset, outputWidth, evenHeight } from './presets.js';
export { readGifInfo } from './gifinfo.js';
export { livePids } from './run.js';
export { AbortError, EncodeError, LicenceError } from './types.js';
export type { Backend, EncodeOptions, EncodeResult, Preset, PresetName } from './types.js';
export type { GifInfo } from './gifinfo.js';
