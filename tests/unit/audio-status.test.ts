import { describe, expect, it } from "vitest";
import { getProcessedAudioStatus, getProcessedAudioStatusDetail, isProcessedAudioCurrent } from "../../apps/web/src/workflow/audioStatus";

describe("processed audio workflow status", () => {
  it("requires a raw source before processing can begin", () => {
    expect(getProcessedAudioStatus({
      currentSignature: "recipe-a",
      processedSignature: "recipe-a",
      processedUrl: "/generated/u001.fx.wav"
    })).toBe("missing_raw");
  });

  it("asks for processing when raw audio exists without a processed clip", () => {
    expect(getProcessedAudioStatus({
      currentSignature: "recipe-a",
      rawUrl: "/generated/u001.raw.wav"
    })).toBe("needs_processing");
  });

  it("marks processed audio current when signatures match", () => {
    const input = {
      currentSignature: "recipe-a",
      processedSignature: "recipe-a",
      rawUrl: "/generated/u001.raw.wav",
      processedUrl: "/generated/u001.fx.wav"
    };

    expect(getProcessedAudioStatus(input)).toBe("current");
    expect(isProcessedAudioCurrent(input)).toBe(true);
  });

  it("marks processed audio stale when the current recipe changed", () => {
    const input = {
      currentSignature: "recipe-b",
      processedSignature: "recipe-a",
      rawUrl: "/generated/u001.raw.wav",
      processedUrl: "/generated/u001.fx.wav"
    };

    expect(getProcessedAudioStatus(input)).toBe("stale");
    expect(isProcessedAudioCurrent(input)).toBe(false);
  });

  it("attributes stale processed audio to voice/text, environment, and role stack changes", () => {
    const processedSignature = JSON.stringify({
      rawSource: "/generated/u001.raw.wav",
      utteranceText: "Go for burn.",
      voice: { voiceId: "ash" },
      clipControls: { noise: 0.1 },
      utteranceEnvironment: { spaceWeather: "calm" },
      narrativeContext: { label: "calm" },
      renderDecision: { mode: "narrative_draft" }
    });
    const currentSignature = JSON.stringify({
      rawSource: "/generated/u001.raw.wav",
      utteranceText: "Go for reentry.",
      voice: { voiceId: "ash" },
      clipControls: { noise: 0.2 },
      utteranceEnvironment: { spaceWeather: "flare" },
      narrativeContext: { label: "flare" },
      renderDecision: { mode: "role_stack" }
    });

    expect(getProcessedAudioStatusDetail({
      currentSignature,
      processedSignature,
      rawUrl: "/generated/u001.raw.wav",
      processedUrl: "/generated/u001.fx.wav",
      role: "CAPCOM"
    })).toEqual({ status: "stale", staleReasons: ["V", "E", "C"] });
  });
});
