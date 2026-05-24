import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { processPcm16, processWavFile, stitchWavs } from "@voice-radio/audio-fx";

function testWav(samples: Int16Array, sampleRate = 24000, extraChunk = false) {
  const fmt = Buffer.alloc(24);
  fmt.write("fmt ", 0, "ascii");
  fmt.writeUInt32LE(16, 4);
  fmt.writeUInt16LE(1, 8);
  fmt.writeUInt16LE(1, 10);
  fmt.writeUInt32LE(sampleRate, 12);
  fmt.writeUInt32LE(sampleRate * 2, 16);
  fmt.writeUInt16LE(2, 20);
  fmt.writeUInt16LE(16, 22);

  const junk = extraChunk ? Buffer.from("JUNK\x04\x00\x00\x00abcd", "ascii") : Buffer.alloc(0);
  const data = Buffer.from(samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength));
  const dataHeader = Buffer.alloc(8);
  dataHeader.write("data", 0, "ascii");
  dataHeader.writeUInt32LE(data.length, 4);
  const riffSize = 4 + fmt.length + junk.length + dataHeader.length + data.length;
  const riff = Buffer.alloc(12);
  riff.write("RIFF", 0, "ascii");
  riff.writeUInt32LE(riffSize, 4);
  riff.write("WAVE", 8, "ascii");
  return Buffer.concat([riff, fmt, junk, dataHeader, data]);
}

describe("audio fx", () => {
  it("is deterministic for same preset/intensity", () => {
    const input = new Int16Array(Array.from({ length: 1000 }, (_, i) => Math.round(Math.sin(i / 12) * 12000)));
    const controls = { channelProfile: "ship_comm" as const, signalQuality: 0.42, degradationMode: "nominal" as const };
    const a = processPcm16(input, controls);
    const b = processPcm16(input, controls);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("can bracket utterances with separate Quindar intro and outro tones", () => {
    const input = new Int16Array(Array.from({ length: 1000 }, (_, i) => Math.round(Math.sin(i / 9) * 8000)));
    const intro = processPcm16(input, {
      channelProfile: "apollo_heritage_clean",
      quindarMode: "intro",
      telemetryStyle: "quindar",
      telemetryLevel: 0.2
    }, 24000);
    const both = processPcm16(input, {
      channelProfile: "apollo_heritage_clean",
      quindarMode: "both",
      telemetryStyle: "quindar",
      telemetryLevel: 0.2
    }, 24000);

    expect(intro.length).toBe(input.length + 6000);
    expect(both.length).toBe(input.length + 12000);
  });

  it("keeps Quindar tone isolated from voice degradation", () => {
    const input = new Int16Array(Array.from({ length: 2000 }, (_, i) => Math.round(Math.sin(i / 11) * 9000)));
    const clean = processPcm16(input, {
      channelProfile: "apollo_heritage_clean",
      quindarMode: "intro",
      telemetryStyle: "quindar",
      telemetryLevel: 0.22,
      quindarToneMs: 250,
      quindarDrive: 0.12,
      noise: 0,
      whiteNoise: 0,
      pinkNoise: 0,
      brownNoise: 0
    }, 24000);
    const degraded = processPcm16(input, {
      channelProfile: "codec_failure_datamosh",
      quindarMode: "intro",
      telemetryStyle: "quindar",
      telemetryLevel: 0.22,
      quindarToneMs: 250,
      quindarDrive: 0.12,
      noise: 0.5,
      whiteNoise: 0.5,
      pinkNoise: 0.5,
      brownNoise: 0.5,
      packetLossDynamics: 1
    }, 24000);

    expect(Array.from(degraded.slice(0, 6000))).toEqual(Array.from(clean.slice(0, 6000)));
  });

  it("makes codec failure profile harsher than clean profile", () => {
    const input = new Int16Array(Array.from({ length: 4000 }, (_, i) => Math.round(Math.sin(i / 10) * 10000)));
    const clean = processPcm16(input, { channelProfile: "apollo_heritage_clean", quindarMode: "off", noise: 0, whiteNoise: 0, pinkNoise: 0, brownNoise: 0 });
    const broken = processPcm16(input, { channelProfile: "codec_failure_datamosh", quindarMode: "off", noise: 0, whiteNoise: 0, pinkNoise: 0, brownNoise: 0 });
    const cleanZeros = Array.from(clean).filter((v) => v === 0).length;
    const brokenZeros = Array.from(broken).filter((v) => v === 0).length;
    expect(brokenZeros).toBeGreaterThan(cleanZeros);
  });

  it("renders deterministic organic hiss beds", () => {
    const input = new Int16Array(1200);
    const controls = {
      channelProfile: "earth_capcom" as const,
      quindarMode: "off" as const,
      noise: 0,
      whiteNoise: 0.05,
      pinkNoise: 0.04,
      brownNoise: 0.03,
      noiseLfoRate: 0.7,
      noiseLfoDepth: 0.6,
      noiseGateThreshold: 0.2,
      noiseGateDepth: 0.8
    };
    const a = processPcm16(input, controls);
    const b = processPcm16(input, controls);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a).some((v) => v !== 0)).toBe(true);
  });

  it("processes WAV files with non-audio chunks before data", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-radio-wav-"));
    const inPath = path.join(dir, "input.wav");
    const outPath = path.join(dir, "output.wav");
    const samples = new Int16Array(Array.from({ length: 600 }, (_, i) => Math.round(Math.sin(i / 10) * 8000)));
    await fs.writeFile(inPath, testWav(samples, 24000, true));

    await processWavFile(inPath, outPath, { channelProfile: "ship_comm", quindarMode: "off", noise: 0 });
    const output = await fs.readFile(outPath);
    const dataIndex = output.indexOf("data", 12, "ascii");

    expect(output.toString("ascii", 0, 4)).toBe("RIFF");
    expect(output.toString("ascii", 8, 12)).toBe("WAVE");
    expect(dataIndex).toBeGreaterThan(44);
    expect(output.readUInt32LE(dataIndex + 4)).toBe(output.length - dataIndex - 8);
  });

  it("processes streaming-style WAV files with sentinel data sizes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-radio-streaming-wav-"));
    const inPath = path.join(dir, "input.wav");
    const outPath = path.join(dir, "output.wav");
    const samples = new Int16Array(Array.from({ length: 600 }, (_, i) => Math.round(Math.sin(i / 8) * 7000)));
    const wav = testWav(samples);
    const dataIndex = wav.indexOf("data", 12, "ascii");
    wav.writeUInt32LE(0xffffffff, 4);
    wav.writeUInt32LE(0xffffffff, dataIndex + 4);
    await fs.writeFile(inPath, wav);

    await processWavFile(inPath, outPath, { channelProfile: "ship_comm", quindarMode: "off", noise: 0 });
    const output = await fs.readFile(outPath);
    const outputDataIndex = output.indexOf("data", 12, "ascii");

    expect(output.toString("ascii", 0, 4)).toBe("RIFF");
    expect(output.toString("ascii", 8, 12)).toBe("WAVE");
    expect(output.readUInt32LE(4)).toBe(output.length - 8);
    expect(output.readUInt32LE(outputDataIndex + 4)).toBe(output.length - outputDataIndex - 8);
  });

  it("stitches WAV files by locating the data chunk instead of assuming byte 44", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voice-radio-stitch-"));
    const a = path.join(dir, "a.wav");
    const b = path.join(dir, "b.wav");
    const outPath = path.join(dir, "stitched.wav");
    await fs.writeFile(a, testWav(new Int16Array([1, 2, 3, 4]), 24000, true));
    await fs.writeFile(b, testWav(new Int16Array([5, 6]), 24000, true));

    await stitchWavs([a, b], outPath, 0);
    const output = await fs.readFile(outPath);
    const dataIndex = output.indexOf("data", 12, "ascii");

    expect(dataIndex).toBeGreaterThan(44);
    expect(output.readUInt32LE(dataIndex + 4)).toBe(12);
    expect(output.subarray(dataIndex + 8).length).toBe(12);
  });
});
