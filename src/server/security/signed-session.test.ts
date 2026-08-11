import { beforeEach, describe, expect, it } from "vitest";
import { createSignedSession, secureCredentialMatch, verifySignedSession } from "@/server/security/signed-session";

describe("sessões demonstrativas assinadas", () => {
  beforeEach(() => { process.env.DEMO_SESSION_SECRET = "segredo-exclusivo-de-teste-com-mais-de-32-caracteres"; });
  it("valida tipo, assinatura e expiração", () => { const value = createSignedSession({ subject: "opaque-id", kind: "PATIENT", expiresAt: Date.now() + 1000 }); expect(verifySignedSession(value, "PATIENT")?.subject).toBe("opaque-id"); expect(verifySignedSession(value, "NURSE")).toBeNull(); });
  it("rejeita adulteração", () => { const value = createSignedSession({ subject: "opaque-id", kind: "NURSE", expiresAt: Date.now() + 1000 }); expect(verifySignedSession(`${value}x`, "NURSE")).toBeNull(); });
  it("rejeita sessão expirada", () => { const value = createSignedSession({ subject: "opaque-id", kind: "PATIENT", expiresAt: Date.now() - 1 }); expect(verifySignedSession(value, "PATIENT")).toBeNull(); });
  it("compara credenciais sem aceitar segredo ausente ou curto", () => {
    expect(secureCredentialMatch("credencial-segura", "credencial-segura")).toBe(true);
    expect(secureCredentialMatch("credencial-incorreta", "credencial-segura")).toBe(false);
    expect(secureCredentialMatch("qualquer-credencial", undefined)).toBe(false);
    expect(secureCredentialMatch("curta", "curta")).toBe(false);
    expect(secureCredentialMatch("Sm@rt_", "Sm@rt_")).toBe(true);
  });
});
