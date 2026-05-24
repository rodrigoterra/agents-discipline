import { getProcessedAudioStatusDetail, type ProcessedAudioStatus, type StaleReasonCode } from "./audioStatus";

export type StitchReadinessRole = "CAPCOM" | "SHIP";

export type StitchReadinessInput = {
  id: string;
  role: StitchReadinessRole;
  rawUrl?: string;
  processedUrl?: string;
  processedSignature?: string;
  currentSignature: string;
};

export type StitchReadinessRow = {
  id: string;
  role: StitchReadinessRole;
  status: ProcessedAudioStatus;
  staleReasons: StaleReasonCode[];
};

export function evaluateStitchReadiness(utterances: StitchReadinessInput[]) {
  const rows = utterances.map((utterance): StitchReadinessRow => {
    const detail = getProcessedAudioStatusDetail({
      rawUrl: utterance.rawUrl,
      processedUrl: utterance.processedUrl,
      processedSignature: utterance.processedSignature,
      currentSignature: utterance.currentSignature,
      role: utterance.role
    });
    return {
      id: utterance.id,
      role: utterance.role,
      status: detail.status,
      staleReasons: detail.staleReasons
    };
  });

  const blocked = rows.filter((row) => row.status !== "current");
  return {
    ready: blocked.length === 0,
    rows,
    blocked
  };
}

export function formatStitchBlockers(blocked: StitchReadinessRow[]) {
  return blocked
    .map((row) => `${row.id}:${row.status}${row.staleReasons.length ? `[${row.staleReasons.join("")}]` : ""}`)
    .join(", ");
}
