import type { EnvironmentalAudioConfig, MacroControls } from "@voice-radio/audio-core";

export type Alpha2RenderMode = "narrative_draft" | "role_stack" | "preset_override" | "manual_override";
export type Alpha2RenderStatus = "current" | "needs_render" | "stale";
export type Alpha2RenderRole = "CAPCOM" | "SHIP";

export type Alpha2RenderDecision = {
  targetId: string;
  role: Alpha2RenderRole;
  mode: Alpha2RenderMode;
  label: string;
  status: Alpha2RenderStatus;
  note: string;
  presetId?: string;
};

export type RenderDecisionSource = {
  controls: MacroControls;
  label: string;
  environment?: EnvironmentalAudioConfig;
};

export type RenderDecisionResolution = RenderDecisionSource & {
  mode: Alpha2RenderMode;
  fallbackUsed: boolean;
};

export function renderDecisionSignature(decision: Alpha2RenderDecision | undefined, fallbackMode: Alpha2RenderMode) {
  return {
    mode: decision?.mode || fallbackMode,
    presetId: decision?.presetId || "",
    label: decision?.label || ""
  };
}

export function resolveRenderDecisionSource({
  decision,
  fallbackMode,
  narrativeDraft,
  roleStack,
  roleDefault,
  presetOverride,
  manualOverride
}: {
  decision?: Alpha2RenderDecision;
  fallbackMode: Alpha2RenderMode;
  narrativeDraft: RenderDecisionSource;
  roleStack?: RenderDecisionSource;
  roleDefault: RenderDecisionSource;
  presetOverride?: RenderDecisionSource;
  manualOverride: RenderDecisionSource;
}): RenderDecisionResolution {
  const mode = decision?.mode || fallbackMode;

  if (mode === "narrative_draft") {
    return { ...narrativeDraft, mode, fallbackUsed: false };
  }

  if (mode === "role_stack") {
    return { ...(roleStack || roleDefault), mode, fallbackUsed: !roleStack };
  }

  if (mode === "preset_override") {
    return { ...(presetOverride || narrativeDraft), mode, fallbackUsed: !presetOverride };
  }

  return { ...manualOverride, mode, fallbackUsed: false };
}
