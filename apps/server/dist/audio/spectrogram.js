import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
export const ffmpegMissingMessage = "FFmpeg is required to generate spectrograms. Install FFmpeg and retry.";
export const defaultSpectrogramOptions = {
    size: "1600x900",
    mode: "combined",
    color: "viridis",
    scale: "log",
    fscale: "lin",
    legend: 1,
    drange: 100
};
export function sanitizePathSegment(value, fallback = "item") {
    const safe = String(value || "")
        .trim()
        .replace(/\.[/\\]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^\.+/, "")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120);
    return safe || fallback;
}
export function ensureInside(root, candidate) {
    const resolvedRoot = path.resolve(root);
    const resolvedCandidate = path.resolve(candidate);
    const relative = path.relative(resolvedRoot, resolvedCandidate);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        throw new Error("Path is outside the allowed artifacts directory");
    }
    return resolvedCandidate;
}
export function buildSpectrogramFilter(options = {}) {
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
export function buildSpectrogramArgs(inputAudioPath, outputPngPath, options = {}) {
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
    return new Promise((resolve) => {
        const child = spawn(ffmpegPath, ["-version"], { stdio: "ignore" });
        child.on("error", () => resolve(false));
        child.on("close", (code) => resolve(code === 0));
    });
}
export function assertFfmpegAvailable(available) {
    if (!available)
        throw new Error(ffmpegMissingMessage);
}
async function runFfmpeg(args, ffmpegPath = "ffmpeg") {
    return new Promise((resolve, reject) => {
        const child = spawn(ffmpegPath, args, { stdio: ["ignore", "ignore", "pipe"] });
        const errors = [];
        child.stderr.on("data", (chunk) => errors.push(Buffer.from(chunk)));
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0)
                return resolve();
            const stderr = Buffer.concat(errors).toString("utf-8").slice(-1200);
            reject(new Error(stderr || `ffmpeg exited with code ${code}`));
        });
    });
}
export async function ensureSpectrogramOutputDir(artifactsRoot, outputPngPath) {
    const output = ensureInside(artifactsRoot, outputPngPath);
    await fs.mkdir(path.dirname(output), { recursive: true });
    return output;
}
export function utteranceArtifactPaths(artifactsRoot, sessionId, utteranceId) {
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
export function finalArtifactPaths(artifactsRoot, sessionId) {
    const safeSession = sanitizePathSegment(sessionId, "session");
    return {
        rawAudioPath: path.join(artifactsRoot, "audio", "final", `${safeSession}.raw.wav`),
        processedAudioPath: path.join(artifactsRoot, "audio", "final", `${safeSession}.processed.wav`),
        rawSpectrogramPath: path.join(artifactsRoot, "spectrograms", "final", `${safeSession}.final.raw.png`),
        processedSpectrogramPath: path.join(artifactsRoot, "spectrograms", "final", `${safeSession}.final.processed.png`)
    };
}
export function nasaReferencePaths(artifactsRoot, nasaSlug) {
    const safeSlug = sanitizePathSegment(nasaSlug, "nasa-reference").replace(/\.(wav|mp3|m4a|flac|aac|ogg)$/i, "");
    return {
        audioDir: path.join(artifactsRoot, "audio", "nasa-reference"),
        spectrogramPath: path.join(artifactsRoot, "spectrograms", "nasa-reference", `${safeSlug}.png`),
        metadataPath: path.join(artifactsRoot, "spectrograms", "nasa-reference", `${safeSlug}.metadata.json`),
        safeSlug
    };
}
export function publicArtifactUrl(artifactsRoot, filePath) {
    const safePath = ensureInside(artifactsRoot, filePath);
    return `/artifacts/${path.relative(artifactsRoot, safePath).split(path.sep).map(encodeURIComponent).join("/")}`;
}
export function spectrogramPublicUrls(artifactsRoot, paths) {
    const urls = {};
    for (const [key, value] of Object.entries(paths)) {
        if (value)
            urls[key] = publicArtifactUrl(artifactsRoot, value);
    }
    return urls;
}
export async function generateSpectrogram(inputAudioPath, outputPngPath, options = {}, config = { artifactsRoot: process.cwd() }) {
    const input = ensureInside(config.artifactsRoot, inputAudioPath);
    const output = ensureInside(config.artifactsRoot, outputPngPath);
    await fs.access(input);
    const available = await checkFfmpegAvailable(config.ffmpegPath);
    assertFfmpegAvailable(available);
    await ensureSpectrogramOutputDir(config.artifactsRoot, output);
    await runFfmpeg(buildSpectrogramArgs(input, output, options), config.ffmpegPath);
    return output;
}
export async function generateUtteranceSpectrogramPair(artifactsRoot, sessionId, utteranceId, options = {}) {
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
export async function generateFinalSpectrograms(artifactsRoot, sessionId, options = {}) {
    const paths = finalArtifactPaths(artifactsRoot, sessionId);
    await generateSpectrogram(paths.rawAudioPath, paths.rawSpectrogramPath, options, { artifactsRoot });
    await generateSpectrogram(paths.processedAudioPath, paths.processedSpectrogramPath, options, { artifactsRoot });
    return paths;
}
export async function generateNasaReferenceSpectrogram(artifactsRoot, referenceAudioPath, nasaSlug, sourceUrl, options = {}) {
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
