import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((path: string): never => { throw new Error(`REDIRECT:${path}`); }),
  getNursingSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/security/nursing-session", () => ({ getNursingSession: mocks.getNursingSession }));

import NursingLayout from "@/app/enfermagem/layout";

describe("nursing panel route protection", () => {
  it("redirects requests without a valid session to login", async () => {
    mocks.getNursingSession.mockResolvedValue(null);
    await expect(NursingLayout({ children: "protected" })).rejects.toThrow("REDIRECT:/acesso-enfermagem");
  });

  it("renders the protected shell after session validation", async () => {
    mocks.getNursingSession.mockResolvedValue({ actorReference: "FAKE_NURSE" });
    await expect(NursingLayout({ children: "protected" })).resolves.toMatchObject({ type: "div" });
  });
});
