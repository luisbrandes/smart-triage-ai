import { describe, expect, it } from "vitest";

import { collectReadOnlyDiagnostics, resolveDiagnosticTarget } from "./diagnose-patient-schema.mjs";

const runtimeUrl = "postgresql://user:password@db.example:5432/app_db?schema=public";
const isolatedTestUrl = "postgresql://user:password@db.example:5432/app_db_test?schema=public";
const productionDiagnosticUrl = "postgresql://user:password@prod.example:5432/app_prod?schema=public";

describe("seleção segura do destino do diagnóstico somente leitura", () => {
  it("exige ambiente, variável e conexão PostgreSQL explícitos", () => {
    expect(() => resolveDiagnosticTarget({ env: {} })).toThrow("Informe explicitamente");
    expect(() => resolveDiagnosticTarget({
      environment: "development",
      urlEnvironment: "DATABASE_URL",
      env: {},
    })).toThrow("não está disponível");
    expect(() => resolveDiagnosticTarget({
      environment: "development",
      urlEnvironment: "DATABASE_URL",
      env: { DATABASE_URL: "not-a-url" },
    })).toThrow("URL PostgreSQL válida");
    expect(() => resolveDiagnosticTarget({
      environment: "development",
      urlEnvironment: "DATABASE_URL",
      env: { DATABASE_URL: "postgresql:///app_db" },
    })).toThrow("banco e schema PostgreSQL");
  });

  it("recusa produção sem autorização e exige uma variável de diagnóstico dedicada", () => {
    expect(() => resolveDiagnosticTarget({
      environment: "production",
      urlEnvironment: "TRIAGE_DIAGNOSTIC_DATABASE_URL",
      env: { TRIAGE_DIAGNOSTIC_DATABASE_URL: productionDiagnosticUrl },
    })).toThrow("--allow-production");
    expect(() => resolveDiagnosticTarget({
      environment: "production",
      urlEnvironment: "DATABASE_URL",
      allowProduction: true,
      env: { DATABASE_URL: productionDiagnosticUrl },
    })).toThrow("não é permitida");
  });

  it("aceita destino de produção apenas com flag e variável dedicada", () => {
    const target = resolveDiagnosticTarget({
      environment: "production",
      urlEnvironment: "TRIAGE_DIAGNOSTIC_DATABASE_URL",
      allowProduction: true,
      env: { TRIAGE_DIAGNOSTIC_DATABASE_URL: productionDiagnosticUrl },
    });
    expect(target).toMatchObject({ environment: "production", host: "prod.example", database: "app_prod", schema: "public" });
    const sanitized = { host: target.host, port: target.port, database: target.database, schema: target.schema };
    expect(JSON.stringify(sanitized)).not.toContain("password");
  });

  it("aceita teste somente quando o nome é marcado e o banco difere de runtime e migrations", () => {
    const target = resolveDiagnosticTarget({
      environment: "test",
      urlEnvironment: "TEST_DATABASE_URL",
      env: { TEST_DATABASE_URL: isolatedTestUrl, DATABASE_URL: runtimeUrl },
    });
    expect(target.database).toBe("app_db_test");

    expect(() => resolveDiagnosticTarget({
      environment: "test",
      urlEnvironment: "TEST_DATABASE_URL",
      env: {
        TEST_DATABASE_URL: "postgresql://other:secret@db.example:5432/app_db_test",
        DATABASE_URL: "postgresql://user:password@db.example:5432/app_db_test",
      },
    })).toThrow("mesmo banco lógico");
  });

  it("não inclui credenciais no resumo sanitizado do destino", () => {
    const target = resolveDiagnosticTarget({
      environment: "development",
      urlEnvironment: "DATABASE_URL",
      env: { DATABASE_URL: runtimeUrl },
    });
    const sanitized = { host: target.host, port: target.port, database: target.database, schema: target.schema };
    expect(JSON.stringify(sanitized)).not.toMatch(/user|password|postgresql:\/\//i);
  });

  it("usa transação somente leitura, consulta schema/ledger e faz rollback", async () => {
    const queries = [];
    const client = {
      async query(text) {
        queries.push(text);
        if (text === "SHOW transaction_read_only") return { rows: [{ transaction_read_only: "on" }] };
        if (text.includes("pg_catalog.pg_attribute")) {
          return { rows: [{ column_name: "cpf", is_nullable: "YES" }] };
        }
        if (text.includes("to_regclass")) return { rows: [{ exists: true }] };
        if (text.includes("_prisma_migrations")) {
          return { rows: [
            { migration_name: "20261018010000_ai_suggestion", finished_at: new Date(), rolled_back_at: null },
          ] };
        }
        return { rows: [] };
      },
      release() { queries.push("RELEASE"); },
    };
    const pool = {
      async connect() { return client; },
      async end() { queries.push("POOL_END"); },
    };
    const target = resolveDiagnosticTarget({
      environment: "development",
      urlEnvironment: "DATABASE_URL",
      env: { DATABASE_URL: runtimeUrl },
    });

    const result = await collectReadOnlyDiagnostics(target, () => pool);

    expect(queries[0]).toBe("BEGIN READ ONLY");
    expect(queries.find((query) => query.includes("to_regclass"))).toContain("$1::text, $2::text");
    expect(queries).toContain("ROLLBACK");
    expect(queries).toContain("RELEASE");
    expect(queries).toContain("POOL_END");
    expect(result.patientColumns.find((column) => column.name === "cpf")).toMatchObject({ present: true, nullable: "YES" });
    expect(result.patientColumns.filter((column) => !column.present)).toHaveLength(5);
    expect(result.migrations).toEqual([
      { name: "20261018010000_ai_suggestion", status: "applied" },
      { name: "20261018020000_patient_identification_fields", status: "not_recorded" },
    ]);
  });
});
