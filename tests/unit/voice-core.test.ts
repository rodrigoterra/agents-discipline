import { describe, expect, it } from "vitest";
import {
  buildTtsInstructions,
  builtInVoiceIds,
  resolveVoiceProfile,
  speakerDefaultProfiles,
  voiceRegistry
} from "@voice-radio/voice-core";

describe("voice-core", () => {
  it("includes every supported built-in OpenAI TTS voice", () => {
    expect(builtInVoiceIds).toEqual([
      "alloy",
      "ash",
      "ballad",
      "coral",
      "echo",
      "fable",
      "nova",
      "onyx",
      "sage",
      "shimmer",
      "verse",
      "marin",
      "cedar"
    ]);
    expect(voiceRegistry.cedar.group).toBe("masculine-coded");
    expect(voiceRegistry.marin.group).toBe("feminine-coded");
    expect(voiceRegistry.alloy.group).toBe("neutral-or-flexible");
  });

  it("rejects unknown voice ids", () => {
    expect(() => resolveVoiceProfile({ voiceId: "bogus" as any })).toThrow("Unknown OpenAI TTS voice");
  });

  it("clamps speed and organic controls", () => {
    const profile = resolveVoiceProfile({ voiceId: "nova", speed: 9, intensity: -1, clarityPriority: 2, organicVariation: 2 });
    expect(profile.speed).toBe(4);
    expect(profile.intensity).toBe(0);
    expect(profile.clarityPriority).toBe(1);
    expect(profile.organicVariation).toBe(1);
  });

  it("builds deterministic instructions", () => {
    const a = buildTtsInstructions(speakerDefaultProfiles.CAPCOM);
    const b = buildTtsInstructions(speakerDefaultProfiles.CAPCOM);
    expect(a).toBe(b);
    expect(a).toContain("Speak as a calm, disciplined CAPCOM operator.");
    expect(a).not.toContain("<speak");
  });

  it("applies speaker defaults", () => {
    expect(speakerDefaultProfiles.CAPCOM.voiceId).toBe("cedar");
    expect(speakerDefaultProfiles.SHIP.clarityPriority).toBe(0.85);
    expect(speakerDefaultProfiles.AI_SYSTEM.organicVariation).toBe(0.05);
    expect(speakerDefaultProfiles.DISTRESS_SIGNAL.pauseStyle).toBe("fragmented");
  });
});
