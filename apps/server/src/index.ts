import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import OpenAI from "openai";
import { composeScript } from "@voice-radio/script-composer";
import { utteranceSchema, validateScript, type Utterance } from "@voice-radio/schema";
import { hashObject, nowIso } from "@voice-radio/shared";
import { synthesizeSpeech } from "@voice-radio/tts";
import { processWavFile, stitchWavs } from "@voice-radio/audio-fx";
import { getProfileControls, resolveEnvironmentalAudioControls, type EnvironmentalAudioConfig, type MacroControls } from "@voice-radio/audio-core";
import {
  assertBuiltInVoiceId,
  buildTtsInstructions,
  clampNumber,
  normalizeTtsInput,
  organicVariantHint,
  resolveVoiceProfile,
  roleFromSpeaker,
  type SpeechVoice,
  type VoiceProfile
} from "@voice-radio/voice-core";
import {
  checkFfmpegAvailable,
  ffmpegMissingMessage,
  finalArtifactPaths,
  generateFinalSpectrograms,
  generateNasaReferenceSpectrogram,
  generateUtteranceSpectrogramPair,
  nasaReferencePaths,
  publicArtifactUrl,
  sanitizePathSegment,
  spectrogramPublicUrls,
  utteranceArtifactPaths
} from "./audio/spectrogram.js";

const APP_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
dotenv.config({ path: path.join(APP_ROOT, ".env") });

export const app = express();
const allowedCorsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedCorsOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("CORS origin not allowed"));
  }
}));
app.use(express.json({ limit: "3mb" }));

const PORT = Number(process.env.PORT || 3001);
const ROOT = path.resolve(APP_ROOT, "fixtures/generated");
const ARTIFACTS_ROOT = path.resolve(APP_ROOT, "artifacts");
const SPACE_SIDECAR_URL = process.env.SPACE_SIDECAR_URL || "http://127.0.0.1:8765";
const SPACE_SIDECAR_TIMEOUT_MS = Math.max(250, Number(process.env.SPACE_SIDECAR_TIMEOUT_MS) || 1500);
const usageLogPath = path.join(ROOT, "usage-log.jsonl");
const openaiKey = process.env.OPENAI_API_KEY;
const client = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

function parseEnvNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a finite number`);
  return value;
}

export function parseRequestLimits() {
  const maxRequests = parseEnvNumber("MAX_REQUESTS", 200);
  const hardStopUsd = parseEnvNumber("COST_HARD_STOP_USD", 3);
  if (maxRequests < 0) throw new Error("MAX_REQUESTS must be >= 0");
  if (hardStopUsd < 0) throw new Error("COST_HARD_STOP_USD must be >= 0");
  return { maxRequests, hardStopUsd };
}

const requestLimits = parseRequestLimits();

let requestCount = 0;
let estimatedSpend = 0;

async function ensureDirs() {
  await fs.mkdir(ROOT, { recursive: true });
  await fs.mkdir(path.join(ROOT, "script"), { recursive: true });
  await fs.mkdir(path.join(ROOT, "tts"), { recursive: true });
  await fs.mkdir(path.join(ROOT, "processed"), { recursive: true });
  await fs.mkdir(path.join(ROOT, "final"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "audio", "raw"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "audio", "processed"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "audio", "nasa-reference"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "audio", "final"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "spectrograms", "utterances"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "spectrograms", "nasa-reference"), { recursive: true });
  await fs.mkdir(path.join(ARTIFACTS_ROOT, "spectrograms", "final"), { recursive: true });
}

function enforceCostGuard() {
  if (requestCount >= requestLimits.maxRequests) throw new Error("Request hard stop reached");
  if (estimatedSpend >= requestLimits.hardStopUsd) throw new Error("Estimated spend hard stop reached");
}

function reserveCostSlot() {
  enforceCostGuard();
  requestCount += 1;
}

function estimateSpend(amount: number) {
  estimatedSpend += amount;
}

function requireOpenAIClient() {
  if (!client) throw new Error("OPENAI_API_KEY missing");
  return client;
}

async function logUsage(entry: Record<string, unknown>) {
  await fs.appendFile(usageLogPath, `${JSON.stringify({ time: nowIso(), ...entry })}\n`);
}

async function readJsonCache(cachePath: string) {
  try {
    return JSON.parse(await fs.readFile(cachePath, "utf-8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Cache read failed for ${path.basename(cachePath)}: ${detail}`);
  }
}

export async function resolveGeneratedPath(publicPath: string) {
  const generatedPrefix = "/generated/";
  if (!String(publicPath || "").startsWith(generatedPrefix)) {
    throw new Error("inputPath must be a /generated/ path");
  }
  const resolved = path.resolve(ROOT, publicPath.slice(generatedPrefix.length));
  const relative = path.relative(ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("inputPath is outside generated audio");
  }
  const [realRoot, realPath] = await Promise.all([fs.realpath(ROOT), fs.realpath(resolved)]);
  const realRelative = path.relative(realRoot, realPath);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    throw new Error("inputPath resolves outside generated audio");
  }
  return realPath;
}

async function copyIfSessionArtifact(srcPath: string, destPath?: string) {
  if (!destPath) return;
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(srcPath, destPath);
}

async function preserveRawUtteranceArtifact(srcPath: string, sessionId: unknown, utteranceId: string) {
  if (!sessionId) return;
  const paths = utteranceArtifactPaths(ARTIFACTS_ROOT, String(sessionId), utteranceId);
  await copyIfSessionArtifact(srcPath, paths.rawAudioPath);
}

async function preserveProcessedUtteranceArtifact(srcPath: string, sessionId: unknown, utteranceId: unknown) {
  if (!sessionId || !utteranceId) return;
  const paths = utteranceArtifactPaths(ARTIFACTS_ROOT, String(sessionId), String(utteranceId));
  await copyIfSessionArtifact(srcPath, paths.processedAudioPath);
}

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: nowIso(), openaiConfigured: Boolean(openaiKey) });
});

app.get("/api/space/health", async (_req, res) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SPACE_SIDECAR_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const target = new URL("/api/health", SPACE_SIDECAR_URL);
    const response = await fetch(target, { signal: controller.signal });
    const body = (await response.json().catch(() => null)) as { ok?: boolean; now?: string } | null;
    res.json({
      ok: response.ok && Boolean(body?.ok),
      sidecarUrl: SPACE_SIDECAR_URL,
      sidecar: body,
      status: response.status,
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    res.status(503).json({
      ok: false,
      sidecarUrl: SPACE_SIDECAR_URL,
      error: aborted ? `sidecar did not respond within ${SPACE_SIDECAR_TIMEOUT_MS}ms` : error instanceof Error ? error.message : "unknown error",
      latencyMs: Date.now() - startedAt
    });
  } finally {
    clearTimeout(timer);
  }
});

app.post("/api/script/generate", async (req, res) => {
  try {
    if (!openaiKey) return res.status(400).json({ error: "OPENAI_API_KEY missing" });
    const { sceneBrief, defaults = {} } = req.body;
    const cacheKey = hashObject({ sceneBrief, defaults, kind: "script" });
    const cachePath = path.join(ROOT, "script", `${cacheKey}.json`);
    const cached = await readJsonCache(cachePath);
    if (cached) {
      return res.json({ cached: true, script: cached });
    }

    reserveCostSlot();
    const script = await composeScript(requireOpenAIClient(), sceneBrief, {
      model: process.env.DEFAULT_TEXT_MODEL || "gpt-5.4-nano",
      fallbackModel: process.env.DEFAULT_TEXT_MODEL_FALLBACK || "gpt-5.4-mini",
      language: defaults.language,
      radioPreset: defaults.radio_preset
    });

    await fs.writeFile(cachePath, JSON.stringify(script, null, 2));
    estimateSpend(0.002);
    await logUsage({ type: "script", cacheKey, sceneBriefChars: String(sceneBrief || "").length });
    res.json({ cached: false, script });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "unknown error" });
  }
});

app.post("/api/script/validate", (req, res) => {
  const result = validateScript(req.body?.candidate);
  res.json(result);
});

app.post("/api/tts/utterance", async (req, res) => {
  try {
    if (!openaiKey) return res.status(400).json({ error: "OPENAI_API_KEY missing" });
    const { utterance, voice, voiceProfile, instructions, model, speed, responseFormat, utteranceIndex = 0, sessionId } = req.body as {
      utterance: Utterance;
      voice?: string | Record<string, unknown>;
      voiceProfile?: Partial<VoiceProfile>;
      instructions?: string;
      model?: string;
      speed?: number;
      responseFormat?: "wav" | "mp3" | "opus" | "aac" | "flac" | "pcm";
      utteranceIndex?: number;
      sessionId?: string;
    };
    const parsed = utteranceSchema.safeParse(utterance);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });

    const explicitVoiceId = typeof voice === "string" ? assertBuiltInVoiceId(voice) : undefined;
    const profile = resolveVoiceProfile(
      { ...(voiceProfile || {}), ...(parsed.data.voice || {}), ...(explicitVoiceId ? { voiceId: explicitVoiceId } : {}) },
      roleFromSpeaker(parsed.data.speaker)
    );
    const voiceSelection: SpeechVoice = typeof voice === "object" && voice ? voice : profile.voiceId;
    const effectiveSpeed = clampNumber(speed ?? profile.speed, 0.25, 4, profile.speed);
    const variationHint = organicVariantHint(utteranceIndex, profile.organicVariation);
    const effectiveInstructions = [instructions || buildTtsInstructions(profile), variationHint].filter(Boolean).join(" ");
    const effectiveInput = normalizeTtsInput(parsed.data.text, profile.organicVariation);
    const format = responseFormat || "wav";
    if (format !== "wav") return res.status(400).json({ error: "voice-radio-poc currently supports wav output for audio processing" });

    const cacheKey = hashObject({ utterance: effectiveInput, voice: voiceSelection, instructions: effectiveInstructions, model, speed: effectiveSpeed, responseFormat: format, kind: "tts" });
    const outPath = path.join(ROOT, "tts", `${cacheKey}.${format}`);
    try {
      await fs.access(outPath);
      await preserveRawUtteranceArtifact(outPath, sessionId, parsed.data.id);
      return res.json({ cached: true, path: `/generated/tts/${cacheKey}.${format}`, meta: { id: parsed.data.id, voiceProfile: profile, instructions: effectiveInstructions, speed: effectiveSpeed } });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) throw error;
    }

    reserveCostSlot();
    await synthesizeSpeech({
      client: requireOpenAIClient(),
      model: model || process.env.DEFAULT_TTS_MODEL || "gpt-4o-mini-tts",
      voice: voiceSelection,
      input: effectiveInput,
      outPath,
      instructions: effectiveInstructions,
      speed: effectiveSpeed,
      responseFormat: format
    });
    await preserveRawUtteranceArtifact(outPath, sessionId, parsed.data.id);
    estimateSpend(0.001);
    await logUsage({ type: "tts", cacheKey, utteranceId: parsed.data.id, voice: profile.voiceId });
    res.json({ cached: false, path: `/generated/tts/${cacheKey}.${format}`, meta: { id: parsed.data.id, voiceProfile: profile, instructions: effectiveInstructions, speed: effectiveSpeed } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(message.startsWith("Unknown OpenAI TTS voice") ? 400 : 500).json({ error: message });
  }
});

app.post("/api/tts/batch", async (req, res) => {
  const { utterances = [], voice, voiceProfile, instructions, model, speed, responseFormat, sessionId } = req.body;
  const success: any[] = [];
  const failed: string[] = [];
  for (let utteranceIndex = 0; utteranceIndex < utterances.length; utteranceIndex += 1) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/tts/utterance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utterance: utterances[utteranceIndex], voice, voiceProfile, instructions, model, speed, responseFormat, utteranceIndex, sessionId })
      });
      const payload = await r.json();
      if (!r.ok) throw new Error(payload.error || "tts failed");
      success.push(payload);
    } catch (error) {
      failed.push(error instanceof Error ? error.message : "unknown");
      if (failed[failed.length - 1].includes("hard stop")) break;
    }
  }
  res.json({ success, failed });
});

app.post("/api/tts/audition", async (req, res) => {
  try {
    if (!openaiKey) return res.status(400).json({ error: "OPENAI_API_KEY missing" });
    const { text = "Odyssey, this is CAPCOM. Confirm signal lock and proceed with vector correction.", voiceProfile = {}, voice, model, speed } = req.body as {
      text?: string;
      voiceProfile?: Partial<VoiceProfile>;
      voice?: string | Record<string, unknown>;
      model?: string;
      speed?: number;
    };
    const explicitVoiceId = typeof voice === "string" ? assertBuiltInVoiceId(voice) : undefined;
    const profile = resolveVoiceProfile({ ...voiceProfile, ...(explicitVoiceId ? { voiceId: explicitVoiceId } : {}) }, voiceProfile.speakerRole || "CAPCOM");
    const effectiveSpeed = clampNumber(speed ?? profile.speed, 0.25, 4, profile.speed);
    const effectiveInput = normalizeTtsInput(String(text).slice(0, 260), profile.organicVariation);
    const effectiveInstructions = buildTtsInstructions(profile);
    const voiceSelection: SpeechVoice = typeof voice === "object" && voice ? voice : profile.voiceId;
    const cacheKey = hashObject({ text: effectiveInput, voice: voiceSelection, instructions: effectiveInstructions, model, speed: effectiveSpeed, kind: "tts-audition" });
    const outPath = path.join(ROOT, "tts", `${cacheKey}.wav`);
    try {
      await fs.access(outPath);
      return res.json({ cached: true, path: `/generated/tts/${cacheKey}.wav`, meta: { voiceProfile: profile, instructions: effectiveInstructions, speed: effectiveSpeed } });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) throw error;
    }
    reserveCostSlot();
    await synthesizeSpeech({
      client: requireOpenAIClient(),
      model: model || process.env.DEFAULT_TTS_MODEL || "gpt-4o-mini-tts",
      voice: voiceSelection,
      input: effectiveInput,
      outPath,
      instructions: effectiveInstructions,
      speed: effectiveSpeed,
      responseFormat: "wav"
    });
    estimateSpend(0.001);
    await logUsage({ type: "tts-audition", cacheKey, voice: profile.voiceId });
    res.json({ cached: false, path: `/generated/tts/${cacheKey}.wav`, meta: { voiceProfile: profile, instructions: effectiveInstructions, speed: effectiveSpeed } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(message.startsWith("Unknown OpenAI TTS voice") ? 400 : 500).json({ error: message });
  }
});

app.post("/api/audio/process", async (req, res) => {
  try {
    const { inputPath, controls = {}, macro, environment, sessionId, utteranceId } = req.body as {
      inputPath: string;
      controls?: Partial<MacroControls>;
      macro?: Partial<MacroControls>;
      environment?: EnvironmentalAudioConfig;
      sessionId?: string;
      utteranceId?: string;
    };
    const macroControls = { ...(controls || {}), ...(macro || {}) };
    const baseProfile = environment?.baseProfile || macroControls.channelProfile || "ship_comm";
    const resolvedControls = environment
      ? resolveEnvironmentalAudioControls({
        ...environment,
        baseProfile,
        macroOverrides: { ...macroControls, ...(environment.macroOverrides || {}) }
      })
      : { ...getProfileControls(baseProfile), ...macroControls, channelProfile: baseProfile };
    const key = hashObject({ inputPath, controls: resolvedControls, environment, kind: "process" });
    const outPath = path.join(ROOT, "processed", `${key}.wav`);
    await processWavFile(await resolveGeneratedPath(inputPath), outPath, resolvedControls);
    await preserveProcessedUtteranceArtifact(outPath, sessionId, utteranceId);
    res.json({
      ok: true,
      path: `/generated/processed/${key}.wav`,
      processedPath: `/generated/processed/${key}.wav`,
      resolvedEnvironment: environment ? {
        baseProfile,
        missionGeometry: environment.missionGeometry?.geometry,
        missionGeometryIntensity: environment.missionGeometry?.intensity,
        spaceWeather: environment.spaceWeather?.event,
        spaceWeatherIntensity: environment.spaceWeather?.intensity,
        durationMode: environment.spaceWeather?.durationMode,
        envelope: environment.spaceWeather?.envelope
      } : undefined,
      resolvedMacro: resolvedControls
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "unknown error" });
  }
});

app.post("/api/audio/stitch", async (req, res) => {
  try {
    const { processedPaths = [], rawPaths = [], gapMs = 120, sessionId } = req.body;
    const stitchGapMs = Array.isArray(gapMs) ? gapMs.map((value) => Math.max(0, Number(value) || 0)) : Math.max(0, Number(gapMs) || 120);
    const key = hashObject({ processedPaths, gapMs: stitchGapMs, kind: "stitch" });
    const outPath = path.join(ROOT, "final", `${key}.wav`);
    const resolved = await Promise.all(processedPaths.map((p: string) => resolveGeneratedPath(p)));
    await stitchWavs(resolved, outPath, stitchGapMs);
    const artifactPaths = sessionId ? finalArtifactPaths(ARTIFACTS_ROOT, String(sessionId)) : undefined;
    if (artifactPaths) {
      await copyIfSessionArtifact(outPath, artifactPaths.processedAudioPath);
      if (rawPaths.length) {
        await stitchWavs(await Promise.all(rawPaths.map((p: string) => resolveGeneratedPath(p))), artifactPaths.rawAudioPath, stitchGapMs);
      }
    }
    res.json({
      path: `/generated/final/${key}.wav`,
      ...(artifactPaths ? {
        artifacts: {
          processedFinal: publicArtifactUrl(ARTIFACTS_ROOT, artifactPaths.processedAudioPath),
          ...(rawPaths.length ? { rawFinal: publicArtifactUrl(ARTIFACTS_ROOT, artifactPaths.rawAudioPath) } : {})
        }
      } : {})
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "unknown error" });
  }
});

app.get("/api/spectrogram/health", async (_req, res) => {
  res.json({
    ffmpegAvailable: await checkFfmpegAvailable(),
    outputRoot: "artifacts/spectrograms"
  });
});

app.post("/api/spectrogram/utterance", async (req, res) => {
  try {
    const { sessionId, utteranceId } = req.body as { sessionId?: string; utteranceId?: string };
    if (!sessionId || !utteranceId) return res.status(400).json({ error: "sessionId and utteranceId are required" });
    const paths = await generateUtteranceSpectrogramPair(ARTIFACTS_ROOT, sessionId, utteranceId);
    res.json({
      ok: true,
      paths: {
        rawSpectrogram: paths.rawSpectrogramPath,
        processedSpectrogram: paths.processedSpectrogramPath,
        comparison: paths.comparisonPath
      },
      publicUrls: spectrogramPublicUrls(ARTIFACTS_ROOT, {
        rawSpectrogram: paths.rawSpectrogramPath,
        processedSpectrogram: paths.processedSpectrogramPath
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(message === ffmpegMissingMessage ? 503 : 500).json({ error: message });
  }
});

app.post("/api/spectrogram/batch", async (req, res) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    const safeSession = sanitizePathSegment(sessionId, "session");
    const rawDir = path.join(ARTIFACTS_ROOT, "audio", "raw", safeSession);
    let files: string[] = [];
    try {
      files = (await fs.readdir(rawDir)).filter((file) => file.endsWith(".wav"));
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) throw error;
    }
    const results = [];
    for (const file of files) {
      const utteranceId = file.replace(/\.wav$/i, "");
      const processedPath = utteranceArtifactPaths(ARTIFACTS_ROOT, safeSession, utteranceId).processedAudioPath;
      try {
        await fs.access(processedPath);
        const paths = await generateUtteranceSpectrogramPair(ARTIFACTS_ROOT, safeSession, utteranceId);
        results.push({
          utteranceId,
          publicUrls: spectrogramPublicUrls(ARTIFACTS_ROOT, {
            rawSpectrogram: paths.rawSpectrogramPath,
            processedSpectrogram: paths.processedSpectrogramPath
          })
        });
      } catch (error) {
        if (error instanceof Error && error.message === ffmpegMissingMessage) throw error;
        results.push({ utteranceId, skipped: true, reason: "missing processed audio" });
      }
    }
    res.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(message === ffmpegMissingMessage ? 503 : 500).json({ error: message });
  }
});

app.post("/api/spectrogram/final", async (req, res) => {
  try {
    const { sessionId } = req.body as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ error: "sessionId is required" });
    const paths = await generateFinalSpectrograms(ARTIFACTS_ROOT, sessionId);
    res.json({
      ok: true,
      paths: {
        rawSpectrogram: paths.rawSpectrogramPath,
        processedSpectrogram: paths.processedSpectrogramPath
      },
      publicUrls: spectrogramPublicUrls(ARTIFACTS_ROOT, {
        finalRawSpectrogram: paths.rawSpectrogramPath,
        finalProcessedSpectrogram: paths.processedSpectrogramPath
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(message === ffmpegMissingMessage ? 503 : 500).json({ error: message });
  }
});

async function resolveNasaReferenceSource(nasaSlug: string, source?: string) {
  const paths = nasaReferencePaths(ARTIFACTS_ROOT, nasaSlug);
  const candidate = String(source || "").trim();
  if (/^https?:\/\//i.test(candidate)) {
    throw new Error("Direct NASA reference URL import is not enabled in v1. Download the audio into artifacts/audio/nasa-reference/ and retry.");
  }
  const names = candidate
    ? [candidate]
    : [`${paths.safeSlug}.wav`, `${paths.safeSlug}.mp3`, `${paths.safeSlug}.m4a`, `${paths.safeSlug}.flac`];
  for (const name of names) {
    const safeName = sanitizePathSegment(path.basename(name), paths.safeSlug);
    const resolved = path.join(paths.audioDir, safeName);
    try {
      await fs.access(resolved);
      return resolved;
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT")) throw error;
    }
  }
  throw new Error(`NASA reference audio not found in artifacts/audio/nasa-reference for ${paths.safeSlug}`);
}

app.get("/api/nasa-reference/list", async (_req, res) => {
  try {
    const paths = nasaReferencePaths(ARTIFACTS_ROOT, "nasa-reference");
    const entries = await fs.readdir(paths.audioDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /\.(wav|mp3|m4a|flac|aac|ogg)$/i.test(entry.name))
      .map((entry) => {
        const slug = sanitizePathSegment(entry.name, "nasa-reference").replace(/\.(wav|mp3|m4a|flac|aac|ogg)$/i, "");
        const audioPath = path.join(paths.audioDir, entry.name);
        return {
          filename: entry.name,
          slug,
          publicUrl: publicArtifactUrl(ARTIFACTS_ROOT, audioPath)
        };
      });
    res.json({ ok: true, files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(500).json({ error: message });
  }
});

app.post("/api/spectrogram/nasa-reference", async (req, res) => {
  try {
    const { nasaSlug, source } = req.body as { nasaSlug?: string; source?: string };
    if (!nasaSlug) return res.status(400).json({ error: "nasaSlug is required" });
    const sourceAudioPath = await resolveNasaReferenceSource(nasaSlug, source);
    const paths = await generateNasaReferenceSpectrogram(ARTIFACTS_ROOT, sourceAudioPath, nasaSlug);
    res.json({
      ok: true,
      paths: {
        nasaAudio: sourceAudioPath,
        nasaSpectrogram: paths.spectrogramPath,
        metadata: paths.metadataPath
      },
      publicUrls: spectrogramPublicUrls(ARTIFACTS_ROOT, {
        nasaAudio: sourceAudioPath,
        nasaSpectrogram: paths.spectrogramPath
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(message === ffmpegMissingMessage ? 503 : 500).json({ error: message });
  }
});

app.use("/generated", express.static(ROOT));
app.use("/artifacts", express.static(ARTIFACTS_ROOT, {
  dotfiles: "deny",
  index: false
}));

export async function startServer() {
  await ensureDirs();
  return app.listen(PORT, () => {
    console.log(`server listening on ${PORT}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
