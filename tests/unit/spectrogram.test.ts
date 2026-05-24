import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertFfmpegAvailable,
  buildSpectrogramArgs,
  buildSpectrogramFilter,
  ensureInside,
  ensureSpectrogramOutputDir,
  ffmpegMissingMessage,
  sanitizePathSegment,
  spectrogramPublicUrls,
  utteranceArtifactPaths
} from "../../apps/server/src/audio/spectrogram";

describe("spectrogram utility", () => {
  it("builds safe ffmpeg args without shell interpolation", () => {
    const args = buildSpectrogramArgs("/tmp/input file.wav", "/tmp/out.png");

    expect(args).toEqual([
      "-y",
      "-i",
      "/tmp/input file.wav",
      "-lavfi",
      "showspectrumpic=s=1600x900:mode=combined:color=viridis:scale=log:fscale=lin:legend=1:drange=100",
      "/tmp/out.png"
    ]);
    expect(buildSpectrogramFilter()).toContain("showspectrumpic=s=1600x900");
  });

  it("sanitizes path segments and rejects traversal outside artifacts", () => {
    expect(sanitizePathSegment("../bad session/with spaces")).toBe("bad-session-with-spaces");
    const root = path.join(os.tmpdir(), "voice-radio-artifacts");
    expect(() => ensureInside(root, path.join(root, "audio", "raw", "u001.wav"))).not.toThrow();
    expect(() => ensureInside(root, path.join(root, "..", "secrets.env"))).toThrow("Path is outside");
  });

  it("creates output directories for generated spectrograms", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "voice-radio-spectrogram-"));
    const output = path.join(root, "spectrograms", "utterances", "s1", "u001.raw.png");

    await ensureSpectrogramOutputDir(root, output);

    await expect(fs.access(path.dirname(output))).resolves.toBeUndefined();
  });

  it("produces useful missing ffmpeg errors", () => {
    expect(() => assertFfmpegAvailable(false)).toThrow(ffmpegMissingMessage);
  });

  it("returns expected public URLs for API responses", () => {
    const root = path.join(os.tmpdir(), "voice-radio-artifacts");
    const paths = utteranceArtifactPaths(root, "s1", "u001");

    expect(spectrogramPublicUrls(root, {
      rawSpectrogram: paths.rawSpectrogramPath,
      processedSpectrogram: paths.processedSpectrogramPath
    })).toEqual({
      rawSpectrogram: "/artifacts/spectrograms/utterances/s1/u001.raw.png",
      processedSpectrogram: "/artifacts/spectrograms/utterances/s1/u001.processed.png"
    });
  });
});
