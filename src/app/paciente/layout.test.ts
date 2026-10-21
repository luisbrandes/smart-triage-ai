import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  hasPatientAccess: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/security/patient-access-session", () => ({ hasPatientAccess: mocks.hasPatientAccess }));

import PatientLayout from "@/app/paciente/layout";

describe("patient panel route protection", () => {
  it("redirects requests without a valid session to login", async () => {
    mocks.hasPatientAccess.mockResolvedValue(false);
    await expect(PatientLayout({ children: "protected" })).rejects.toThrow("REDIRECT:/acesso-paciente");
  });

  it("renders the protected shell after session validation", async () => {
    mocks.hasPatientAccess.mockResolvedValue(true);
    await expect(PatientLayout({ children: "protected" })).resolves.toMatchObject({ type: "div" });
  });
});
