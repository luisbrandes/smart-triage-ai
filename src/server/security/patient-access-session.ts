import "server-only";

import { cookies } from "next/headers";

import { createSignedSession, secureCredentialMatch, verifySignedSession } from "@/server/security/signed-session";

const COOKIE_NAME = "smart_triage_patient_access";
const MAX_AGE_SECONDS = 60 * 60 * 4;

export async function authenticatePatientAccess(credential: string): Promise<boolean> {
  const expected = process.env.ACCESS_CREDENTIAL;
  if (!secureCredentialMatch(credential, expected)) return false;
  (await cookies()).set(COOKIE_NAME, createSignedSession({ subject: "PATIENT_PREVIEW_ACCESS", kind: "PATIENT", expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/paciente",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function hasPatientAccess(): Promise<boolean> {
  return Boolean(verifySignedSession((await cookies()).get(COOKIE_NAME)?.value, "PATIENT"));
}
