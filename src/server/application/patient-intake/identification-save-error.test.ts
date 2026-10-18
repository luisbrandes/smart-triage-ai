import { describe, expect, it } from "vitest";

import { classifyIdentificationSaveError } from "@/server/application/patient-intake/identification-save-error";

describe("classificação segura de falhas ao salvar identificação", () => {
  it("reconhece CPF duplicado somente quando o alvo da restrição é CPF", () => {
    expect(classifyIdentificationSaveError({ code: "P2002", name: "PrismaClientKnownRequestError", meta: { target: ["cpf"] } }).category)
      .toBe("duplicate_cpf");
    expect(classifyIdentificationSaveError({ code: "P2002", name: "PrismaClientKnownRequestError", meta: { target: ["id"] } }).category)
      .toBe("database_constraint");
    expect(classifyIdentificationSaveError({ code: "P2002", name: "PrismaClientKnownRequestError" }).category)
      .toBe("database_constraint");
  });

  it.each([
    ["P1001", "database_connection"],
    ["P2021", "schema_migration"],
    ["P2022", "schema_migration"],
  ] as const)("classifica o código %s como %s", (code, category) => {
    expect(classifyIdentificationSaveError({ code, name: "PrismaClientKnownRequestError" }).category).toBe(category);
  });

  it("não inclui mensagens ou metadados brutos no resultado", () => {
    const result = classifyIdentificationSaveError({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      message: "dados pessoais que não devem ser expostos",
      meta: { target: ["cpf"], value: "dado sensível" },
    });

    expect(result).toEqual({ category: "duplicate_cpf", code: "P2002", name: "PrismaClientKnownRequestError" });
    expect(JSON.stringify(result)).not.toContain("dado sensível");
  });

  it("substitui nomes de erro inesperados por um valor seguro", () => {
    expect(classifyIdentificationSaveError({ name: "nome/CPF fornecido pelo cliente" }).name).toBe("UnknownError");
  });
});
