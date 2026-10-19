import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const stateMock = vi.hoisted(() => ({
  value: { message: "", errors: undefined as Record<string, string[]> | undefined },
  pending: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [stateMock.value, vi.fn(), stateMock.pending],
  };
});
vi.mock("@/app/paciente/triagem/actions", () => ({ saveIdentificationAction: vi.fn() }));

import { IdentificationForm } from "@/features/patient-intake/components/identification-form";

describe("IdentificationForm", () => {
  beforeEach(() => {
    stateMock.value = { message: "", errors: undefined };
    stateMock.pending = false;
  });

  it("renders the server action error as an alert", () => {
    stateMock.value = { message: "Não foi possível salvar a identificação. Tente novamente.", errors: undefined };

    const html = renderToStaticMarkup(createElement(IdentificationForm));

    expect(html).toContain('role="alert"');
    expect(html).toContain("Não foi possível salvar a identificação. Tente novamente.");
  });

  it("displays validation on the field returned by the server action", () => {
    stateMock.value.errors = { displayName: ["Informe um nome fictício."] };

    const html = renderToStaticMarkup(createElement(IdentificationForm));

    expect(html).toContain('id="displayName-error"');
    expect(html).toContain("Informe um nome fictício.");
  });

  it("keeps the original identification form fields", () => {
    const html = renderToStaticMarkup(createElement(IdentificationForm));

    for (const field of ["displayName", "birthDate", "sex", "documentReference", "hasHealthPlan", "planName"]) {
      expect(html).toContain(`name="${field}"`);
    }
    for (const field of ["cpf", "phone", "email", "motherName", "legalRepresentativeName", "legalRepresentativePhone"]) {
      expect(html).not.toContain(`name="${field}"`);
    }
  });

  it("disables submission while the action is pending", () => {
    stateMock.pending = true;

    const html = renderToStaticMarkup(createElement(IdentificationForm));

    const button = html.match(/<button\b[^>]*>/)?.[0];
    expect(button).toContain('disabled=""');
    expect(html).toContain(">Salvando…</button>");
  });

  it("does not show an error when there is no current error state", () => {
    const html = renderToStaticMarkup(createElement(IdentificationForm));

    expect(html).not.toContain('role="alert"');
    expect(html).toContain("Salvar e continuar");
    const button = html.match(/<button\b[^>]*>/)?.[0];
    expect(button).not.toContain('disabled=""');
  });
});
