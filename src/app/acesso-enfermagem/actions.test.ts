import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  authenticateDemoNurse: vi.fn(),
  clearNursingSession: vi.fn(),
  consumeRequestRateLimit: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/security/nursing-session", () => ({
  authenticateDemoNurse: mocks.authenticateDemoNurse,
  clearNursingSession: mocks.clearNursingSession,
}));
vi.mock("@/server/security/request-rate-limit", () => ({ consumeRequestRateLimit: mocks.consumeRequestRateLimit }));

import { nursingLoginAction, nursingLogoutAction } from "@/app/acesso-enfermagem/actions";

function form(credential: string): FormData {
  const data = new FormData();
  data.set("credential", credential);
  return data;
}

describe("nursing panel access actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRequestRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("redirects after a valid credential and allowed rate limit", async () => {
    mocks.authenticateDemoNurse.mockResolvedValue(true);
    await expect(nursingLoginAction({}, form("fake-valid-credential"))).rejects.toThrow("REDIRECT:/enfermagem");
    expect(mocks.consumeRequestRateLimit).toHaveBeenCalledWith("nurse-login", { limit: 5, windowMs: 900_000 });
    expect(mocks.authenticateDemoNurse).toHaveBeenCalledWith("fake-valid-credential");
  });

  it("returns invalid credentials without creating a session", async () => {
    mocks.authenticateDemoNurse.mockResolvedValue(false);
    await expect(nursingLoginAction({}, form("fake-invalid-credential"))).resolves.toEqual({ message: "Credencial inválida." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("blocks limited and unavailable rate limit storage before authentication", async () => {
    mocks.consumeRequestRateLimit.mockResolvedValueOnce({ allowed: false, reason: "limited", retryAfterSeconds: 900 });
    await expect(nursingLoginAction({}, form("fake-credential"))).resolves.toMatchObject({ message: "Muitas tentativas. Aguarde antes de tentar novamente." });
    mocks.consumeRequestRateLimit.mockResolvedValueOnce({ allowed: false, reason: "unavailable", retryAfterSeconds: 900 });
    await expect(nursingLoginAction({}, form("fake-credential"))).resolves.toMatchObject({ message: "O acesso está temporariamente indisponível. Contate o administrador." });
    expect(mocks.authenticateDemoNurse).not.toHaveBeenCalled();
  });

  it("clears the session on logout", async () => {
    await expect(nursingLogoutAction()).rejects.toThrow("REDIRECT:/acesso-enfermagem");
    expect(mocks.clearNursingSession).toHaveBeenCalledOnce();
  });
});
