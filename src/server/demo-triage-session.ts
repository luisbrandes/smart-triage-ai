import "server-only";

import { cookies } from "next/headers";
import { createSignedSession, verifySignedSession } from "@/server/security/signed-session";

const COOKIE_NAME = "smart_triage_demo_id";

export async function getDemoTriageId(): Promise<string | null> {
  return verifySignedSession((await cookies()).get(COOKIE_NAME)?.value, "PATIENT")?.subject ?? null;
}

export async function setDemoTriageId(triageId: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, createSignedSession({ subject: triageId, kind: "PATIENT", expiresAt: Date.now() + 60 * 60 * 8 * 1000 }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}
