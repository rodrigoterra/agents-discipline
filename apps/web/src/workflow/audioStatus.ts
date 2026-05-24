export type ProcessedAudioStatus = "missing_raw" | "needs_processing" | "current" | "stale";
export type StaleReasonCode = "V" | "E" | "C" | "S";

export type ProcessedAudioStatusInput = {
  rawUrl?: string;
  processedUrl?: string;
  currentSignature: string;
  processedSignature?: string;
  role?: "CAPCOM" | "SHIP";
};

export function getProcessedAudioStatus(input: ProcessedAudioStatusInput): ProcessedAudioStatus {
  if (!input.rawUrl) return "missing_raw";
  if (!input.processedUrl) return "needs_processing";
  return input.processedSignature === input.currentSignature ? "current" : "stale";
}

function safeParseSignature(signature?: string) {
  if (!signature) return undefined;
  try {
    const parsed = JSON.parse(signature);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function stableCompare(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addReason(reasons: Set<StaleReasonCode>, reason: StaleReasonCode) {
  reasons.add(reason);
}

export function getProcessedAudioStatusDetail(input: ProcessedAudioStatusInput) {
  const status = getProcessedAudioStatus(input);
  const reasons = new Set<StaleReasonCode>();
  if (status !== "stale") return { status, staleReasons: [] as StaleReasonCode[] };

  const processed = safeParseSignature(input.processedSignature);
  const current = safeParseSignature(input.currentSignature);
  const roleReason: StaleReasonCode = input.role === "SHIP" ? "S" : "C";

  if (!processed || !current) return { status, staleReasons: [roleReason] };

  if (!stableCompare(processed.rawSource, current.rawSource) || !stableCompare(processed.utteranceText, current.utteranceText) || !stableCompare(processed.voice, current.voice)) {
    addReason(reasons, "V");
  }

  if (!stableCompare(processed.utteranceEnvironment, current.utteranceEnvironment) || !stableCompare(processed.narrativeContext, current.narrativeContext)) {
    addReason(reasons, "E");
  }

  if (!stableCompare(processed.clipControls, current.clipControls) || !stableCompare(processed.renderDecision, current.renderDecision)) {
    addReason(reasons, roleReason);
  }

  if (!reasons.size) addReason(reasons, roleReason);
  return { status, staleReasons: Array.from(reasons) };
}

export function isProcessedAudioCurrent(input: ProcessedAudioStatusInput) {
  return getProcessedAudioStatus(input) === "current";
}
