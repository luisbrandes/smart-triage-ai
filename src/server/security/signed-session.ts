import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type SessionPayload = { subject: string; kind: "PATIENT" | "NURSE"; expiresAt: number };

function secret(): string {
  const value = process.env.SESSION_SECRET ?? process.env.DEMO_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET deve possuir ao menos 32 caracteres.");
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function secureCredentialMatch(supplied: string, expected: string | undefined): boolean {
  if (!expected || expected.length < 6) return false;
  const left = createHash("sha256").update(supplied).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function createSignedSession(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifySignedSession(value: string | undefined, kind: SessionPayload["kind"]): SessionPayload | null {
  if (!value) return null;
  const [encoded, supplied] = value.split(".");
  if (!encoded || !supplied) return null;
  const expected = signature(encoded);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return payload.kind === kind && payload.expiresAt > Date.now() && payload.subject.length > 0 ? payload : null;
  } catch { return null; }
}
