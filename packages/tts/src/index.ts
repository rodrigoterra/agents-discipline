import fs from "node:fs/promises";
import { normalizeTtsInput, type SpeechVoice } from "@voice-radio/voice-core";

export async function synthesizeSpeech(params: {
  client: { audio: { speech: { create: (args: any) => Promise<any> } } };
  model: string;
  voice: SpeechVoice;
  input: string;
  outPath: string;
  instructions?: string;
  speed?: number;
  responseFormat?: "wav" | "mp3" | "opus" | "aac" | "flac" | "pcm";
}) {
  const responseFormat = params.responseFormat || "wav";
  const response = await params.client.audio.speech.create({
    model: params.model,
    voice: params.voice,
    input: normalizeTtsInput(params.input),
    ...(params.instructions ? { instructions: params.instructions } : {}),
    ...(params.speed ? { speed: params.speed } : {}),
    response_format: responseFormat
  });

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(params.outPath, bytes);
  return { path: params.outPath, bytes: bytes.length };
}

export function buildSpeechRequestPayload(params: {
  model: string;
  voice: SpeechVoice;
  input: string;
  instructions?: string;
  speed?: number;
  responseFormat?: "wav" | "mp3" | "opus" | "aac" | "flac" | "pcm";
}) {
  return {
    model: params.model,
    voice: params.voice,
    input: normalizeTtsInput(params.input),
    ...(params.instructions ? { instructions: params.instructions } : {}),
    ...(params.speed ? { speed: params.speed } : {}),
    response_format: params.responseFormat || "wav"
  };
}
