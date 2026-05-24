import fs from "node:fs/promises";
import { resolveAudioPreset, type MacroControls, type ResolvedDspParams } from "@voice-radio/audio-core";

const pcm16FormatCode = 1;

type Pcm16Wav = {
  header: Buffer;
  data: Buffer;
  dataSizeOffset: number;
  sampleRate: number;
};

function clamp(v: number) {
  return Math.max(-32768, Math.min(32767, v));
}

function seededNoise(i: number, seed = 17) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function toFloat(input: Int16Array) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) out[i] = input[i] / 32768;
  return out;
}

function toInt16(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) out[i] = clamp(Math.round(input[i] * 32767));
  return out;
}

function telemetryTone(sampleRate: number, hz: number, ms: number, level: number, drive: number, offsetMs = 0) {
  const len = Math.floor((ms / 1000) * sampleRate);
  const offset = Math.floor((offsetMs / 1000) * sampleRate);
  const buf = new Float32Array(len + offset);
  for (let i = offset; i < buf.length; i += 1) {
    const t = (i - offset) / sampleRate;
    const pure = Math.sin(2 * Math.PI * hz * t + Math.PI / 2) * level;
    buf[i] = Math.tanh(pure * (1 + drive * 4));
  }
  return buf;
}

function applyPttClip(input: Float32Array, clipMs: number, sampleRate: number) {
  if (clipMs <= 0) return input;
  const out = new Float32Array(input);
  const len = Math.min(out.length, Math.floor((clipMs / 1000) * sampleRate));
  for (let i = 0; i < len; i += 1) {
    out[i] *= i / Math.max(1, len);
  }
  return out;
}

function applyBandPass(input: Float32Array, sampleRate: number, hpHz: number, lpHz: number) {
  const out = new Float32Array(input.length);
  const hpRC = 1 / (2 * Math.PI * hpHz);
  const lpRC = 1 / (2 * Math.PI * lpHz);
  const dt = 1 / sampleRate;
  const hpA = hpRC / (hpRC + dt);
  const lpA = dt / (lpRC + dt);
  let hpY = 0;
  let prevX = 0;
  let lpY = 0;
  for (let i = 0; i < input.length; i += 1) {
    hpY = hpA * (hpY + input[i] - prevX);
    prevX = input[i];
    lpY = lpY + lpA * (hpY - lpY);
    out[i] = lpY;
  }
  return out;
}

function applyBitcrusher(input: Float32Array, bitDepth: number, downsample: number) {
  const out = new Float32Array(input.length);
  const levels = Math.pow(2, bitDepth);
  let hold = 0;
  for (let i = 0; i < input.length; i += 1) {
    if (i % downsample === 0) hold = Math.round(input[i] * levels) / levels;
    out[i] = hold;
  }
  return out;
}

function applyScintillation(input: Float32Array, params: ResolvedDspParams, sampleRate: number) {
  const out = new Float32Array(input.length);
  const depth = params.scintillationDepth;
  const rate = params.scintillationRate;
  const phaseMax = Math.max(0, Math.floor((params.phaseScintillationMs / 1000) * sampleRate));
  const alpha = 1 / Math.max(12, sampleRate / Math.max(0.05, rate));
  let fadeState = 0;
  let phaseState = 0;
  for (let i = 0; i < input.length; i += 1) {
    fadeState += (seededNoise(i, 41) - fadeState) * alpha;
    phaseState += (seededNoise(i, 53) - phaseState) * alpha * 1.6;
    const slowRoll = Math.sin((2 * Math.PI * rate * i) / sampleRate) * 0.5 + 0.5;
    const stochastic = Math.pow(clamp01((fadeState + 1) / 2), 1 + depth * 4);
    const fade = clamp01(1 - depth + depth * (0.18 + slowRoll * 0.32 + stochastic * 0.5));
    const micro = Math.floor(clamp01((phaseState + 1) / 2) * phaseMax);
    const delayedIndex = Math.max(0, i - micro);
    out[i] = input[delayedIndex] * fade;
  }
  return out;
}

function applyReflection(input: Float32Array, params: ResolvedDspParams, sampleRate: number) {
  if (params.reflectionDelayMs <= 0 || params.reflectionMix <= 0) return input;
  const out = new Float32Array(input.length);
  const delay = Math.max(1, Math.floor((params.reflectionDelayMs / 1000) * sampleRate));
  for (let i = 0; i < input.length; i += 1) {
    const reflected = i >= delay ? input[i - delay] * params.reflectionMix : 0;
    out[i] = Math.max(-1, Math.min(1, input[i] + reflected));
  }
  return out;
}

function applyPacketLoss(input: Float32Array, params: ResolvedDspParams) {
  const out = new Float32Array(input.length);
  const frame = 160;
  let lastFrame = new Float32Array(frame);
  for (let i = 0; i < input.length; i += frame) {
    const noiseVal = (seededNoise(i, 71) + 1) / 2;
    const repeatVal = (seededNoise(i, 91) + 1) / 2;
    const end = Math.min(input.length, i + frame);
    if (noiseVal < params.dropoutProbability) {
      for (let j = i; j < end; j += 1) out[j] = 0;
    } else if (repeatVal < params.repeatProbability && lastFrame.length === frame) {
      for (let j = i; j < end; j += 1) out[j] = lastFrame[(j - i) % frame];
    } else {
      for (let j = i; j < end; j += 1) out[j] = input[j];
      if (end - i === frame) lastFrame = input.slice(i, end);
    }
  }
  return out;
}

function applyGranularCodecFailure(input: Float32Array, params: ResolvedDspParams, sampleRate: number) {
  if (params.jitterAmount <= 0 && params.granularDensity >= 1 && params.plcStutter <= 0) return input;
  const out = new Float32Array(input.length);
  const grain = Math.max(1, Math.floor((params.grainSizeMs / 1000) * sampleRate));
  const jitterWindow = Math.floor(grain * 5 * params.jitterAmount);
  let lastStart = 0;

  for (let start = 0; start < input.length; start += grain) {
    const keepRoll = (seededNoise(start, 135) + 1) / 2;
    const stutterRoll = (seededNoise(start, 151) + 1) / 2;
    const sourceNoise = seededNoise(start, 171);

    if (keepRoll > params.granularDensity) continue;

    let sourceStart = start;
    if (stutterRoll < params.plcStutter) {
      sourceStart = lastStart;
    } else if (jitterWindow > 0) {
      sourceStart = start + Math.floor(sourceNoise * jitterWindow);
    }
    sourceStart = Math.max(0, Math.min(input.length - 1, sourceStart));
    lastStart = sourceStart;

    for (let j = 0; j < grain && start + j < input.length; j += 1) {
      const src = Math.min(input.length - 1, sourceStart + j);
      out[start + j] = input[src];
    }
  }

  return out;
}

function applyDatamosh(input: Float32Array, amount: number) {
  if (amount <= 0) return input;
  const out = new Float32Array(input.length);
  const stride = Math.max(1, Math.floor(8 - amount * 6));
  for (let i = 0; i < input.length; i += 1) {
    const src = Math.min(input.length - 1, i + ((i % stride) * Math.floor(amount * 5)));
    const fold = Math.tanh(input[src] * (1 + amount * 6));
    out[i] = fold;
  }
  return out;
}

function applyNoiseBed(input: Float32Array, params: ResolvedDspParams, sampleRate: number) {
  if (params.whiteNoise <= 0 && params.pinkNoise <= 0 && params.brownNoise <= 0) return input;
  const out = new Float32Array(input.length);
  const lfoDepth = params.noiseLfoDepth;
  const lfoRate = params.noiseLfoRate;
  const gateThreshold = params.noiseGateThreshold;
  const gateDepth = params.noiseGateDepth;
  let pink = 0;
  let brown = 0;
  let envelope = 0;

  for (let i = 0; i < input.length; i += 1) {
    const s = input[i];
    envelope += (Math.abs(s) - envelope) * 0.0025;

    const white = seededNoise(i, 211);
    pink = pink * 0.985 + white * 0.015;
    brown = Math.max(-1, Math.min(1, brown + white * 0.018));

    const lfo = 1 - lfoDepth * 0.5 + (Math.sin((2 * Math.PI * lfoRate * i) / sampleRate) * 0.5 + 0.5) * lfoDepth;
    const gateClosed = gateThreshold > 0 && envelope > gateThreshold;
    const gate = gateClosed ? 1 - gateDepth : 1;
    const hiss = (
      white * params.whiteNoise +
      pink * params.pinkNoise * 3.2 +
      brown * params.brownNoise * 0.7
    ) * lfo * gate;

    out[i] = Math.max(-1, Math.min(1, s + hiss));
  }

  return out;
}

function applyMasterDynamics(input: Float32Array, compression: number, drive: number, noise: number) {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    let s = input[i] * (1 + drive * 2.5);
    s = Math.tanh(s * (1 + compression));
    s += seededNoise(i, 123) * noise;
    out[i] = Math.max(-0.98, Math.min(0.98, s));
  }
  return out;
}

function bracketWithTelemetry(input: Float32Array, params: ResolvedDspParams, sampleRate: number) {
  if (!params.telemetry.introEnabled && !params.telemetry.outroEnabled) return input;
  const intro = params.telemetry.introEnabled
    ? telemetryTone(sampleRate, params.telemetry.introHz, params.telemetry.toneMs, params.telemetry.level, params.telemetry.drive, params.telemetry.offsetMs)
    : new Float32Array(0);
  const outro = params.telemetry.outroEnabled
    ? telemetryTone(sampleRate, params.telemetry.outroHz, params.telemetry.toneMs, params.telemetry.level, params.telemetry.drive, params.telemetry.offsetMs)
    : new Float32Array(0);
  const out = new Float32Array(input.length + intro.length + outro.length);
  out.set(intro, 0);
  out.set(input, intro.length);
  out.set(outro, intro.length + input.length);
  return out;
}

function parsePcm16Wav(source: Buffer): Pcm16Wav {
  if (source.length < 44 || source.toString("ascii", 0, 4) !== "RIFF" || source.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Unsupported WAV: expected RIFF/WAVE PCM data");
  }

  let cursor = 12;
  let fmt: { audioFormat: number; channels: number; sampleRate: number; bitsPerSample: number } | undefined;
  let dataStart = -1;
  let dataSize = -1;
  let dataSizeOffset = -1;

  while (cursor + 8 <= source.length) {
    const id = source.toString("ascii", cursor, cursor + 4);
    const size = source.readUInt32LE(cursor + 4);
    const payloadStart = cursor + 8;
    const payloadEnd = payloadStart + size;

    if (id === "fmt ") {
      if (payloadEnd > source.length) throw new Error(`Unsupported WAV: malformed ${id || "chunk"} chunk`);
      if (size < 16) throw new Error("Unsupported WAV: malformed fmt chunk");
      fmt = {
        audioFormat: source.readUInt16LE(payloadStart),
        channels: source.readUInt16LE(payloadStart + 2),
        sampleRate: source.readUInt32LE(payloadStart + 4),
        bitsPerSample: source.readUInt16LE(payloadStart + 14)
      };
    } else if (id === "data") {
      const availableDataSize = source.length - payloadStart;
      if (availableDataSize <= 0) throw new Error("Unsupported WAV: malformed data chunk");
      dataStart = payloadStart;
      dataSize = payloadEnd > source.length ? availableDataSize : size;
      dataSizeOffset = cursor + 4;
      break;
    } else if (payloadEnd > source.length) {
      throw new Error(`Unsupported WAV: malformed ${id || "chunk"} chunk`);
    }

    cursor = payloadEnd + (size % 2);
  }

  if (!fmt) throw new Error("Unsupported WAV: missing fmt chunk");
  if (dataStart < 0 || dataSize < 0) throw new Error("Unsupported WAV: missing data chunk");
  if (fmt.audioFormat !== pcm16FormatCode || fmt.bitsPerSample !== 16) {
    throw new Error("Unsupported WAV: only 16-bit PCM WAV files are supported");
  }
  if (fmt.channels !== 1) {
    throw new Error("Unsupported WAV: only mono WAV files are supported");
  }
  if (dataSize % 2 !== 0) throw new Error("Unsupported WAV: PCM data length must be 16-bit aligned");

  return {
    header: Buffer.from(source.subarray(0, dataStart)),
    data: Buffer.from(source.subarray(dataStart, dataStart + dataSize)),
    dataSizeOffset,
    sampleRate: fmt.sampleRate
  };
}

function writeWavSizes(out: Buffer, dataSizeOffset: number, dataLength: number) {
  out.writeUInt32LE(Math.max(0, out.length - 8), 4);
  out.writeUInt32LE(dataLength, dataSizeOffset);
}

export function processPcm16(input: Int16Array, macro: Partial<MacroControls>, sampleRate = 24000): Int16Array {
  const params = resolveAudioPreset(macro);
  let signal = toFloat(input);
  signal = applyPttClip(signal, params.pttClipMs, sampleRate);
  signal = applyBandPass(signal, sampleRate, params.hpHz, params.lpHz);
  signal = applyBitcrusher(signal, params.bitDepth, params.downsample);
  signal = applyScintillation(signal, params, sampleRate);
  signal = applyReflection(signal, params, sampleRate);
  signal = applyPacketLoss(signal, params);
  signal = applyGranularCodecFailure(signal, params, sampleRate);
  signal = applyDatamosh(signal, params.datamoshAmount);
  signal = applyNoiseBed(signal, params, sampleRate);
  signal = applyMasterDynamics(signal, params.compression, params.drive, params.noise);
  signal = bracketWithTelemetry(signal, params, sampleRate);
  return toInt16(signal);
}

export async function processWavFile(inPath: string, outPath: string, macro: Partial<MacroControls>, sampleRate?: number) {
  const source = await fs.readFile(inPath);
  const wav = parsePcm16Wav(source);
  const view = new Int16Array(wav.data.buffer.slice(wav.data.byteOffset, wav.data.byteOffset + wav.data.byteLength));
  const processed = processPcm16(view, macro, sampleRate ?? wav.sampleRate);
  const outData = Buffer.from(processed.buffer);
  const out = Buffer.concat([wav.header, outData]);
  writeWavSizes(out, wav.dataSizeOffset, outData.length);
  await fs.writeFile(outPath, out);
  return outPath;
}

export async function stitchWavs(paths: string[], outPath: string, gapMs: number | number[] = 120, sampleRate = 24000) {
  if (!paths.length) throw new Error("No paths to stitch");
  const chunks: Buffer[] = [];
  let header: Buffer | null = null;

  for (let i = 0; i < paths.length; i += 1) {
    const file = await fs.readFile(paths[i]);
    const wav = parsePcm16Wav(file);
    if (!header) header = wav.header;
    chunks.push(wav.data);
    if (i < paths.length - 1) {
      const gapForJoin = Array.isArray(gapMs) ? gapMs[i] ?? gapMs[gapMs.length - 1] ?? 120 : gapMs;
      const gapSamples = Math.floor((Math.max(0, gapForJoin) / 1000) * sampleRate);
      chunks.push(Buffer.alloc(gapSamples * 2, 0));
    }
  }

  const data = Buffer.concat(chunks);
  const out = Buffer.concat([header!, data]);
  writeWavSizes(out, header!.length - 4, data.length);
  await fs.writeFile(outPath, out);
  return outPath;
}
