import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export const ffmpegMissingMessage = "FFmpeg is required to generate spectrograms. Install FFmpeg and retry.";

export type SpectrogramOptions = {
  size: string;
  mode: "combined" | "separate";
  color: string;
  scale: "lin" | "sqrt" | "cbrt" | "log" | "4thrt" | "5thrt";
  fscale: "lin" | "log";
  legend: 0 | 1;
  drange: number;
};

export type ArtifactSpectrogramPaths = {
  rawAudioPath: string;
  processedAudioPath: string;
  rawSpectrogramPath: string;
  processedSpectrogramPath: string;
  comparisonPath: string;
};

export type PublicSpectrogramUrls = {
  rawSpectrogram?: string;
  processedSpectrogram?: string;
  nasaAudio?: string;
  nasaSpectrogram?: string;
  finalRawSpectrogram?: string;
  finalProcessedSpectrogram?: string;
};

export const defaultSpectrogramOptions: SpectrogramOptions = {
  size: "1600x900",
  mode: "combined",
  color: "viridis",
  scale: "log",
  fscale: "lin",
  legend: 1,
  drange: 100
};

export function sanitizePathSegment(value: string, fallback = "item") {
  const safe = String(value || "")
    .trim()
    .replace(/\.[/\\]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return safe || fallback;
}

export function ensureInside(root: string, candidate: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolvedCandidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path is outside the allowed artifacts directory");
  }
  return resolvedCandidate;
}

export function buildSpectrogramFilter(options: Partial<SpectrogramOptions> = {}) {
  const merged = { ...defaultSpectrogramOptions, ...options };
  return [
    `showspectrumpic=s=${merged.size}`,
    `mode=${merged.mode}`,
    `color=${merged.color}`,
    `scale=${merged.scale}`,
    `fscale=${merged.fscale}`,
    `legend=${merged.legend}`,
    `drange=${merged.drange}`
  ].join(":");
}

export function buildSpectrogramArgs(inputAudioPath: string, outputPngPath: string, options: Partial<SpectrogramOptions> = {}) {
  return [
    "-y",
    "-i",
    inputAudioPath,
    "-lavfi",
    buildSpectrogramFilter(options),
    outputPngPath
  ];
}

export async function checkFfmpegAvailable(ffmpegPath = "ffmpeg") {
  return new Promise<boolean>((resolve) => {
    const child = spawn(ffmpegPath, ["-version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export function assertFfmpegAvailable(available: boolean) {
  if (!available) throw new Error(ffmpegMissingMessage);
}

async function runFfmpeg(args: string[], ffmpegPath = "ffmpeg") {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
    const errors: Buffer[] = [];
    child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      const stderr = Buffer.concat(errors).toString("utf-8").slice(-1200);
      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

export async function ensureSpectrogramOutputDir(artifactsRoot: string, outputPngPath: string) {
  const output = ensureInside(artifactsRoot, outputPngPath);
  await fs.mkdir(path.dirname(output), { recursive: true });
  return output;
}

export function utteranceArtifactPaths(artifactsRoot: string, sessionId: string, utteranceId: string): ArtifactSpectrogramPaths {
  const safeSession = sanitizePathSegment(sessionId, "session");
  const safeUtterance = sanitizePathSegment(utteranceId, "utterance");
  return {
    rawAudioPath: path.join(artifactsRoot, "audio", "raw", safeSession, `${safeUtterance}.wav`),
    processedAudioPath: path.join(artifactsRoot, "audio", "processed", safeSession, `${safeUtterance}.wav`),
    rawSpectrogramPath: path.join(artifactsRoot, "spectrograms", "utterances", safeSession, `${safeUtterance}.raw.png`),
    processedSpectrogramPath: path.join(artifactsRoot, "spectrograms", "utterances", safeSession, `${safeUtterance}.processed.png`),
    comparisonPath: path.join(artifactsRoot, "spectrograms", "utterances", safeSession, `${safeUtterance}.comparison.json`)
  };
}

export function finalArtifactPaths(artifactsRoot: string, sessionId: string) {
  const safeSession = sanitizePathSegment(sessionId, "session");
  return {
    rawAudioPath: path.join(artifactsRoot, "audio", "final", `${safeSession}.raw.wav`),
    processedAudioPath: path.join(artifactsRoot, "audio", "final", `${safeSession}.processed.wav`),
    rawSpectrogramPath: path.join(artifactsRoot, "spectrograms", "final", `${safeSession}.final.raw.png`),
    processedSpectrogramPath: path.join(artifactsRoot, "spectrograms", "final", `${safeSession}.final.processed.png`)
  };
}

export function nasaReferencePaths(artifactsRoot: string, nasaSlug: string) {
  const safeSlug = sanitizePathSegment(nasaSlug, "nasa-reference").replace(/\.(wav|mp3|m4a|flac|aac|ogg)$/i, "");
  return {
    audioDir: path.join(artifactsRoot, "audio", "nasa-reference"),
    spectrogramPath: path.join(artifactsRoot, "spectrograms", "nasa-reference", `${safeSlug}.png`),
    metadataPath: path.join(artifactsRoot, "spectrograms", "nasa-reference", `${safeSlug}.metadata.json`),
    safeSlug
  };
}

export function publicArtifactUrl(artifactsRoot: string, filePath: string) {
  const safePath = ensureInside(artifactsRoot, filePath);
  return `/artifacts/${path.relative(artifactsRoot, safePath).split(path.sep).map(encodeURIComponent).join("/")}`;
}

export function spectrogramPublicUrls(artifactsRoot: string, paths: Partial<Record<keyof PublicSpectrogramUrls, string>>): PublicSpectrogramUrls {
  const urls: PublicSpectrogramUrls = {};
  for (const [key, value] of Object.entries(paths)) {
    if (value) urls[key as keyof PublicSpectrogramUrls] = publicArtifactUrl(artifactsRoot, value);
  }
  return urls;
}

export async function generateSpectrogram(
  inputAudioPath: string,
  outputPngPath: string,
  options: Partial<SpectrogramOptions> = {},
  config: { artifactsRoot: string; ffmpegPath?: string } = { artifactsRoot: process.cwd() }
) {
  const input = ensureInside(config.artifactsRoot, inputAudioPath);
  const output = ensureInside(config.artifactsRoot, outputPngPath);
  await fs.access(input);
  const available = await checkFfmpegAvailable(config.ffmpegPath);
  assertFfmpegAvailable(available);
  await ensureSpectrogramOutputDir(config.artifactsRoot, output);
  await runFfmpeg(buildSpectrogramArgs(input, output, options), config.ffmpegPath);
  return output;
}

export async function generateUtteranceSpectrogramPair(
  artifactsRoot: string,
  sessionId: string,
  utteranceId: string,
  options: Partial<SpectrogramOptions> = {}
) {
  const paths = utteranceArtifactPaths(artifactsRoot, sessionId, utteranceId);
  const ffmpegFilter = buildSpectrogramFilter(options);
  await generateSpectrogram(paths.rawAudioPath, paths.rawSpectrogramPath, options, { artifactsRoot });
  await generateSpectrogram(paths.processedAudioPath, paths.processedSpectrogramPath, options, { artifactsRoot });
  await fs.writeFile(paths.comparisonPath, JSON.stringify({
    sessionId: sanitizePathSegment(sessionId, "session"),
    utteranceId: sanitizePathSegment(utteranceId, "utterance"),
    rawAudioPath: paths.rawAudioPath,
    processedAudioPath: paths.processedAudioPath,
    rawSpectrogramPath: paths.rawSpectrogramPath,
    processedSpectrogramPath: paths.processedSpectrogramPath,
    ffmpegFilter,
    createdAt: new Date().toISOString(),
    notes: ["Raw TTS before radio FX", "Processed audio after radio FX"]
  }, null, 2));
  return paths;
}

export async function generateFinalSpectrograms(artifactsRoot: string, sessionId: string, options: Partial<SpectrogramOptions> = {}) {
  const paths = finalArtifactPaths(artifactsRoot, sessionId);
  await generateSpectrogram(paths.rawAudioPath, paths.rawSpectrogramPath, options, { artifactsRoot });
  await generateSpectrogram(paths.processedAudioPath, paths.processedSpectrogramPath, options, { artifactsRoot });
  return paths;
}

export async function generateNasaReferenceSpectrogram(
  artifactsRoot: string,
  referenceAudioPath: string,
  nasaSlug: string,
  sourceUrl?: string,
  options: Partial<SpectrogramOptions> = {}
) {
  const paths = nasaReferencePaths(artifactsRoot, nasaSlug);
  const sourceAudioPath = ensureInside(paths.audioDir, referenceAudioPath);
  await generateSpectrogram(sourceAudioPath, paths.spectrogramPath, options, { artifactsRoot });
  await fs.writeFile(paths.metadataPath, JSON.stringify({
    nasaSlug: paths.safeSlug,
    sourceAudioPath,
    spectrogramPath: paths.spectrogramPath,
    ...(sourceUrl ? { sourceUrl } : {}),
    createdAt: new Date().toISOString(),
    notes: ["Reference audio from NASA Artemis Audio Library"]
  }, null, 2));
  return { ...paths, sourceAudioPath };
}
