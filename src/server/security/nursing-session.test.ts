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

import { authenticateDemoNurse, clearNursingSession, getNursingSession } from "@/server/security/nursing-session";

describe("nursing access session", () => {
  beforeEach(() => {
    cookieMock.jar.clear();
    vi.stubEnv("ACCESS_CREDENTIAL", "fake-shared-credential");
    vi.stubEnv("SESSION_SECRET", "fake-session-secret-with-at-least-32-characters");
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NURSE_ACTOR_REFERENCE", "FAKE_NURSE_ACTOR");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sets a signed nurse cookie and restores the actor from it", async () => {
    await expect(authenticateDemoNurse("fake-shared-credential")).resolves.toBe(true);
    expect(cookieMock.jar.get("smart_triage_nurse_demo")?.options).toMatchObject({ httpOnly: true, sameSite: "strict", secure: true, path: "/enfermagem", maxAge: 14_400 });
    await expect(getNursingSession()).resolves.toEqual({ actorReference: "FAKE_NURSE_ACTOR" });
  });

  it("rejects invalid credentials and expires the session on logout", async () => {
    await expect(authenticateDemoNurse("wrong-fake-credential")).resolves.toBe(false);
    await expect(getNursingSession()).resolves.toBeNull();
    await authenticateDemoNurse("fake-shared-credential");
    await clearNursingSession();
    expect(cookieMock.jar.get("smart_triage_nurse_demo")?.options).toMatchObject({ path: "/enfermagem", maxAge: 0 });
    await expect(getNursingSession()).resolves.toBeNull();
  });

  it("fails closed outside demo mode", async () => {
    vi.stubEnv("APP_MODE", "production");
    await expect(authenticateDemoNurse("fake-shared-credential")).resolves.toBe(false);
    await expect(getNursingSession()).resolves.toBeNull();
  });
});
