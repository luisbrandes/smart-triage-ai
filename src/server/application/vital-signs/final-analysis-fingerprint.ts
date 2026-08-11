import { createHash } from "node:crypto";

export function finalAnalysisFingerprint(inputFingerprint: string, collectionSessionId: string, attemptNumber: number): string {
  return createHash("sha256").update(`${inputFingerprint}:${collectionSessionId}:${attemptNumber}`).digest("hex");
}
