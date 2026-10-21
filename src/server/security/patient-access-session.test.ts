import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieMock = vi.hoisted(() => {
  const jar = new Map<string, { value: string; options: Record<string, unknown> }>();
  return {
    jar,
    cookies: vi.fn(async () => ({
      get: (name: string) => jar.get(name),
      set: (name: string, value: string, options: Record<string, unknown>) => jar.set(name, { value, options }),
    })),
  };
});
vi.mock("next/headers", () => ({ cookies: cookieMock.cookies }));

import { authenticatePatientAccess, clearPatientAccess, hasPatientAccess } from "@/server/security/patient-access-session";

describe("patient access session", () => {
  beforeEach(() => {
    cookieMock.jar.clear();
    vi.stubEnv("ACCESS_CREDENTIAL", "fake-shared-credential");
    vi.stubEnv("SESSION_SECRET", "fake-session-secret-with-at-least-32-characters");
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sets a signed httpOnly cookie and keeps the session valid across reads", async () => {
    await expect(authenticatePatientAccess("fake-shared-credential")).resolves.toBe(true);
    const cookie = cookieMock.jar.get("smart_triage_patient_access");
    expect(cookie?.options).toMatchObject({ httpOnly: true, sameSite: "strict", secure: true, path: "/paciente", maxAge: 14_400 });
    await expect(hasPatientAccess()).resolves.toBe(true);
  });

  it("rejects wrong credentials and expires the session on logout", async () => {
    await expect(authenticatePatientAccess("wrong-fake-credential")).resolves.toBe(false);
    await expect(hasPatientAccess()).resolves.toBe(false);
    await authenticatePatientAccess("fake-shared-credential");
    await clearPatientAccess();
    expect(cookieMock.jar.get("smart_triage_patient_access")?.options).toMatchObject({ path: "/paciente", maxAge: 0 });
    await expect(hasPatientAccess()).resolves.toBe(false);
  });
});
