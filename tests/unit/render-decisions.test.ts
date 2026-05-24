import { describe, expect, it } from "vitest";
import { getProfileControls } from "@voice-radio/audio-core";
import { renderDecisionSignature, resolveRenderDecisionSource, type RenderDecisionSource } from "../../apps/web/src/workflow/renderDecisions";

const source = (label: string, channelProfile: Parameters<typeof getProfileControls>[0]): RenderDecisionSource => ({
  label,
  controls: getProfileControls(channelProfile)
});

describe("render decision source resolution", () => {
  it("uses the narrative draft when the decision mode says narrative_draft", () => {
    const resolved = resolveRenderDecisionSource({
      decision: { targetId: "u001", role: "CAPCOM", mode: "narrative_draft", label: "Narrative Draft", status: "needs_render", note: "" },
      fallbackMode: "role_stack",
      narrativeDraft: source("Narrative", "deep_space_degraded"),
      roleStack: source("Role", "earth_capcom"),
      roleDefault: source("Role default", "earth_capcom"),
      manualOverride: source("Manual", "ship_comm")
    });

    expect(resolved.label).toBe("Narrative");
    expect(resolved.controls.channelProfile).toBe("deep_space_degraded");
  });

  it("uses role stack for role_stack decisions and falls back to role default when missing", () => {
    const resolved = resolveRenderDecisionSource({
      decision: { targetId: "u002", role: "SHIP", mode: "role_stack", label: "SHIP stack", status: "needs_render", note: "" },
      fallbackMode: "narrative_draft",
      narrativeDraft: source("Narrative", "deep_space_degraded"),
      roleDefault: source("SHIP default", "ship_comm"),
      manualOverride: source("Manual", "earth_capcom")
    });

    expect(resolved.label).toBe("SHIP default");
    expect(resolved.fallbackUsed).toBe(true);
    expect(resolved.controls.channelProfile).toBe("ship_comm");
  });

  it("tracks render source changes in the signature without status noise", () => {
    expect(renderDecisionSignature({
      targetId: "u003",
      role: "SHIP",
      mode: "preset_override",
      label: "Apollo Clean",
      status: "stale",
      note: "changed",
      presetId: "apollo_heritage_clean"
    }, "narrative_draft")).toEqual({
      mode: "preset_override",
      presetId: "apollo_heritage_clean",
      label: "Apollo Clean"
    });
  });
});
