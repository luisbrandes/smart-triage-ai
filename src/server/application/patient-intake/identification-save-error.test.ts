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

  it("reconhece o nome exato do índice de CPF", () => {
    expect(classifyIdentificationSaveError({ code: "P2002", meta: { target: "Patient_cpf_key" } }).category)
      .toBe("duplicate_cpf");
  });

  it("reconhece CPF duplicado no formato do Prisma com adapter-pg", () => {
    expect(classifyIdentificationSaveError({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["cpf"] } } } },
    })).toEqual({ category: "duplicate_cpf", code: "P2002", name: "PrismaClientKnownRequestError" });
  });

  it.each([
    { target: ["other_cpf_reference"] },
    { target: ["cpf", "id"] },
    { target: "Other_cpf_key" },
    { driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["id"] } } } },
    { driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["cpf", "id"] } } } },
    { driverAdapterError: { cause: { kind: "ForeignKeyConstraintViolation", constraint: { fields: ["cpf"] } } } },
    { driverAdapterError: { cause: null } },
  ])("não atribui outra restrição ou metadado incompleto a CPF: %j", (meta) => {
    expect(classifyIdentificationSaveError({ code: "P2002", meta }).category).toBe("database_constraint");
  });

  it.each([
    ["P1001", "database_connection"],
    ["P1010", "database_connection"],
    ["P1011", "database_connection"],
    ["P2037", "database_connection"],
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

  it("não repassa códigos arbitrários que possam conter dados sensíveis", () => {
    expect(classifyIdentificationSaveError({ code: "conteúdo externo não confiável", name: "Error" }))
      .toEqual({ category: "unexpected", name: "UnknownError" });
  });
});
