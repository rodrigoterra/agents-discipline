import { describe, expect, it } from "vitest";
import { evaluateStitchReadiness, formatStitchBlockers } from "../../apps/web/src/workflow/stitchReadiness";

const currentSignature = JSON.stringify({
  rawSource: "/generated/u001.raw.wav",
  utteranceText: "Copy, telemetry nominal.",
  voice: { speaker: "CAPCOM" },
  clipControls: { channelProfile: "capcom_loop" },
  utteranceEnvironment: { event: "none" },
  renderDecision: { mode: "narrative_draft", presetId: "", label: "" }
});

describe("stitch readiness", () => {
  it("allows stitching only when every utterance is current", () => {
    const result = evaluateStitchReadiness([
      {
        id: "u001",
        role: "CAPCOM",
        rawUrl: "/generated/u001.raw.wav",
        processedUrl: "/generated/u001.fx.wav",
        processedSignature: currentSignature,
        currentSignature
      }
    ]);

    expect(result.ready).toBe(true);
    expect(result.blocked).toEqual([]);
  });

  it("blocks missing and stale utterances with formatted reason codes", () => {
    const staleSignature = JSON.stringify({
      ...JSON.parse(currentSignature),
      clipControls: { channelProfile: "ship_comm" },
      renderDecision: { mode: "role_stack", presetId: "", label: "Old SHIP stack" }
    });

    const result = evaluateStitchReadiness([
      {
        id: "u001",
        role: "CAPCOM",
        currentSignature
      },
      {
        id: "u002",
        role: "SHIP",
        rawUrl: "/generated/u002.raw.wav",
        processedUrl: "/generated/u002.fx.wav",
        processedSignature: staleSignature,
        currentSignature
      }
    ]);

    expect(result.ready).toBe(false);
    expect(result.blocked.map((row) => row.status)).toEqual(["missing_raw", "stale"]);
    expect(result.blocked[1].staleReasons).toEqual(["S"]);
    expect(formatStitchBlockers(result.blocked)).toBe("u001:missing_raw, u002:stale[S]");
  });
});
