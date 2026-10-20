import { describe, expect, it } from "vitest";

import { classifyIdentificationSaveError } from "@/server/application/patient-intake/identification-save-error";

describe("safe identification save failure classification", () => {
  it("classifies Prisma unique constraints generically", () => {
    expect(classifyIdentificationSaveError({
      code: "P2002",
      name: "PrismaClientKnownRequestError",
      meta: { target: ["field"] },
    })).toEqual({ category: "database_constraint", code: "P2002", name: "PrismaClientKnownRequestError" });
  });

  it("does not return raw messages or metadata", () => {
    const result = classifyIdentificationSaveError({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      message: "sensitive data must not be exposed",
      meta: { target: ["field"], value: "sensitive value" },
    });

    expect(result).toEqual({ category: "database_constraint", code: "P2002", name: "PrismaClientKnownRequestError" });
    expect(JSON.stringify(result)).not.toContain("sensitive");
  });

  it.each([
    ["P1001", "database_connection"],
    ["P1010", "database_connection"],
    ["P1011", "database_connection"],
    ["P2037", "database_connection"],
    ["P2021", "schema_migration"],
    ["P2022", "schema_migration"],
  ] as const)("classifies Prisma code %s as %s", (code, category) => {
    expect(classifyIdentificationSaveError({ code, name: "PrismaClientKnownRequestError" }).category).toBe(category);
  });

  it("classifies invalid intake state separately", () => {
    expect(classifyIdentificationSaveError({ name: "PatientIntakeStateError" }).category).toBe("invalid_state");
  });

  it("exposes only allowlisted Patient columns for P2022 diagnostics", () => {
    expect(classifyIdentificationSaveError({
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      meta: { column: '"Patient"."cpf"', value: "sensitive patient value" },
      message: "private database message",
    })).toEqual({
      category: "schema_migration",
      code: "P2022",
      name: "PrismaClientKnownRequestError",
      schemaField: "Patient.cpf",
    });
    expect(classifyIdentificationSaveError({
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      meta: { column: "SecretTable.secretColumn" },
    })).toEqual({
      category: "schema_migration",
      code: "P2022",
      name: "PrismaClientKnownRequestError",
    });
  });

  it("replaces unexpected error names and codes with safe values", () => {
    expect(classifyIdentificationSaveError({ name: "untrusted/CPF input", code: "untrusted value" }))
      .toEqual({ category: "unexpected", name: "UnknownError" });
  });
});
