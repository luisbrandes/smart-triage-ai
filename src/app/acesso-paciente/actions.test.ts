import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  authenticatePatientAccess: vi.fn(),
  clearPatientAccess: vi.fn(),
  consumeRequestRateLimit: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/security/patient-access-session", () => ({
  authenticatePatientAccess: mocks.authenticatePatientAccess,
  clearPatientAccess: mocks.clearPatientAccess,
}));
vi.mock("@/server/security/request-rate-limit", () => ({ consumeRequestRateLimit: mocks.consumeRequestRateLimit }));

import { patientAccessAction, patientLogoutAction } from "@/app/acesso-paciente/actions";

function form(credential: string): FormData {
  const data = new FormData();
  data.set("credential", credential);
  return data;
}

describe("patient panel access actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRequestRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });

  it("redirects after a valid credential and allowed rate limit", async () => {
    mocks.authenticatePatientAccess.mockResolvedValue(true);
    await expect(patientAccessAction({}, form("fake-valid-credential"))).rejects.toThrow("REDIRECT:/paciente");
    expect(mocks.consumeRequestRateLimit).toHaveBeenCalledWith("patient-login", { limit: 5, windowMs: 900_000 });
    expect(mocks.authenticatePatientAccess).toHaveBeenCalledWith("fake-valid-credential");
  });

  it("returns invalid credentials without creating a session", async () => {
    mocks.authenticatePatientAccess.mockResolvedValue(false);
    await expect(patientAccessAction({}, form("fake-invalid-credential"))).resolves.toEqual({ message: "Credencial inválida." });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("blocks limited and unavailable rate limit storage before authentication", async () => {
    mocks.consumeRequestRateLimit.mockResolvedValueOnce({ allowed: false, reason: "limited", retryAfterSeconds: 900 });
    await expect(patientAccessAction({}, form("fake-credential"))).resolves.toMatchObject({ message: "Muitas tentativas. Aguarde antes de tentar novamente." });
    mocks.consumeRequestRateLimit.mockResolvedValueOnce({ allowed: false, reason: "unavailable", retryAfterSeconds: 900 });
    await expect(patientAccessAction({}, form("fake-credential"))).resolves.toMatchObject({ message: "O acesso está temporariamente indisponível. Contate o administrador." });
    expect(mocks.authenticatePatientAccess).not.toHaveBeenCalled();
  });

  it("clears the session on logout", async () => {
    await expect(patientLogoutAction()).rejects.toThrow("REDIRECT:/acesso-paciente");
    expect(mocks.clearPatientAccess).toHaveBeenCalledOnce();
  });
});
