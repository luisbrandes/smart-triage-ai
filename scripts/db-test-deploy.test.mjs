import { describe, expect, it } from "vitest";

import { getTestDatabaseUrl } from "./db-test-deploy.mjs";

describe("validação segura do destino de migrations de teste", () => {
  const testUrl = "postgresql://test-user:test-password@localhost:5433/smart_triage_test";

  it("aceita um banco PostgreSQL identificado como teste e distinto do runtime", () => {
    expect(getTestDatabaseUrl({
      testDatabaseUrl: testUrl,
      databaseUrl: "postgresql://app-user:app-password@localhost:5433/smart_triage",
    })).toBe(testUrl);
  });

  it("rejeita variável ausente, URL inválida e provedor não PostgreSQL", () => {
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: undefined })).toThrow("obrigatória");
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: "não é URL" })).toThrow("URL PostgreSQL");
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: "prisma+postgres://host/test" })).toThrow("diretamente para PostgreSQL");
  });

  it("rejeita destino sem identificador de teste", () => {
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: "postgresql://localhost/smart_triage" })).toThrow("banco de teste");
  });

  it("rejeita o mesmo host, porta e banco da aplicação mesmo com credenciais diferentes", () => {
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: "postgresql://other-user:other-password@localhost:5432/smart_triage_test",
      databaseUrl: "postgresql://app-user:app-password@localhost:5432/smart_triage_test",
    })).toThrow("mesmo banco usado pela aplicação");
  });

  it("falha fechado quando o destino do banco da aplicação está ausente ou não pode ser comparado", () => {
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: testUrl })).toThrow("DATABASE_URL é obrigatória");
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: testUrl,
      databaseUrl: "URL inválida",
    })).toThrow("não foi possível confirmar");
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: testUrl,
      databaseUrl: "prisma+postgres://host/db",
    })).toThrow("diretamente para PostgreSQL");
  });
});
