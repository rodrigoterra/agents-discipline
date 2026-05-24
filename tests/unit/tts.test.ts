import { describe, expect, it } from "vitest";
import { buildSpeechRequestPayload } from "@voice-radio/tts";

describe("tts request payload", () => {
  it("includes voice, instructions, speed, and response_format", () => {
    const payload = buildSpeechRequestPayload({
      model: "gpt-4o-mini-tts",
      voice: "cedar",
      input: "Odyssey, confirm vector correction.",
      instructions: "Speak clearly.",
      speed: 0.95,
      responseFormat: "wav"
    });

    expect(payload).toMatchObject({
      model: "gpt-4o-mini-tts",
      voice: "cedar",
      input: "Odyssey, confirm vector correction.",
      instructions: "Speak clearly.",
      speed: 0.95,
      response_format: "wav"
    });
  });
});
