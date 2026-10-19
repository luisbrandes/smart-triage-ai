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

  it("renderiza como alerta a mensagem de erro retornada pela Server Action", () => {
    stateMock.value = { message: "Não foi possível salvar a identificação. Tente novamente.", errors: undefined };

    const html = renderToStaticMarkup(createElement(IdentificationForm));

    expect(html).toContain('role="alert"');
    expect(html).toContain("Não foi possível salvar a identificação. Tente novamente.");
  });

  it("exibe a validação no campo informado pela Server Action", () => {
    stateMock.value.errors = { cpf: ["Este CPF já está associado a um cadastro."] };

    const html = renderToStaticMarkup(createElement(IdentificationForm));

    expect(html).toContain('id="cpf-error"');
    expect(html).toContain("Este CPF já está associado a um cadastro.");
    expect(html).not.toContain("Não foi possível salvar a identificação.");
  });

  it("desabilita o envio e informa o carregamento enquanto a ação está pendente", () => {
    stateMock.pending = true;

    const html = renderToStaticMarkup(createElement(IdentificationForm));

    const button = html.match(/<button\b[^>]*>/)?.[0];
    expect(button).toContain('disabled=""');
    expect(html).toContain(">Salvando…</button>");
  });

  it("não mantém mensagem de erro quando o estado atual não contém erro", () => {
    const html = renderToStaticMarkup(createElement(IdentificationForm));

    expect(html).not.toContain('role="alert"');
    expect(html).toContain("Salvar e continuar");
    const button = html.match(/<button\b[^>]*>/)?.[0];
    expect(button).not.toContain('disabled=""');
  });
});
