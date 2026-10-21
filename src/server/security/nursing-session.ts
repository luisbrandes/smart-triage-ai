import "server-only";

import { cookies } from "next/headers";

import { createSignedSession, secureCredentialMatch, verifySignedSession } from "@/server/security/signed-session";
import { demoNurseAccessEnabled } from "@/server/security/nursing-session-policy";

const COOKIE_NAME = "smart_triage_nurse_demo";
const MAX_AGE_SECONDS = 60 * 60 * 4;

export type NursingSession = { actorReference: string };

export async function authenticateDemoNurse(credential: string): Promise<boolean> {
  if (!demoNurseAccessEnabled(process.env.APP_MODE)) return false;
  const expected = process.env.ACCESS_CREDENTIAL;
  if (!secureCredentialMatch(credential, expected)) return false;
  const actorReference = process.env.NURSE_ACTOR_REFERENCE ?? process.env.DEMO_NURSE_ACTOR_REFERENCE ?? "NURSE_SESSION";
  (await cookies()).set(COOKIE_NAME, createSignedSession({ subject: actorReference, kind: "NURSE", expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 }), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/enfermagem", maxAge: MAX_AGE_SECONDS });
  return true;
}

export async function getNursingSession(): Promise<NursingSession | null> {
  if (!demoNurseAccessEnabled(process.env.APP_MODE)) return null;
  const payload = verifySignedSession((await cookies()).get(COOKIE_NAME)?.value, "NURSE");
  return payload ? { actorReference: payload.subject } : null;
}

export async function clearNursingSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/enfermagem",
    maxAge: 0,
  });
}
