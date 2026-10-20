import { describe, expect, it } from "vitest";

import { getDirectTestDatabaseUrl, getTestDatabaseUrl } from "./db-test-deploy.mjs";

const localTestUrl = "postgresql://test-user:test-password@localhost:5433/smart_triage_test";
const localRuntimeUrl = "postgresql://app-user:app-password@localhost:5432/smart_triage";
const localDirectUrl = "postgresql://app-user:other-password@localhost:5432/smart_triage";
const prismaRuntimeUrl = "postgres://runtime-project-user:runtime-pass@pooled.db.prisma.io:5432/postgres?sslmode=require";
const prismaDirectUrl = "postgres://runtime-project-user:direct-pass@db.prisma.io:5432/postgres?sslmode=require";
const prismaTestUrl = "postgres://test-project-user:test-pass@pooled.db.prisma.io:5432/postgres?sslmode=require";

describe("safe test migration destination", () => {
  it("accepts a named local PostgreSQL test database distinct from runtime and direct URLs", () => {
    expect(getTestDatabaseUrl({
      testDatabaseUrl: localTestUrl,
      databaseUrl: localRuntimeUrl,
      directDatabaseUrl: localDirectUrl,
    })).toBe(localTestUrl);
  });

  it("accepts a separate Prisma Postgres project even though all projects use the postgres database name", () => {
    expect(getTestDatabaseUrl({
      testDatabaseUrl: prismaTestUrl,
      databaseUrl: prismaRuntimeUrl,
      directDatabaseUrl: prismaDirectUrl,
    })).toBe(prismaTestUrl);
  });

  it("converts the pooled Prisma test URL to its direct migration endpoint", () => {
    expect(new URL(getDirectTestDatabaseUrl(prismaTestUrl)).hostname).toBe("db.prisma.io");
    expect(getDirectTestDatabaseUrl(localTestUrl)).toBe(localTestUrl);
  });

  it("rejects missing, malformed and non-PostgreSQL test URLs", () => {
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: undefined })).toThrow("required");
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: "not a URL" })).toThrow("invalid");
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: "prisma+postgres://host/test" })).toThrow("PostgreSQL");
  });

  it("rejects a destination without a test database name or a distinct Prisma project identity", () => {
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: "postgresql://test-user:pass@localhost:5433/smart_triage_other",
      databaseUrl: localRuntimeUrl,
      directDatabaseUrl: localDirectUrl,
    })).toThrow("dedicated test database");
  });

  it("rejects the runtime database despite different credentials", () => {
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: "postgresql://other-user:other-password@localhost:5432/smart_triage_test",
      databaseUrl: "postgresql://app-user:app-password@localhost:5432/smart_triage_test",
      directDatabaseUrl: "postgresql://app-user:other-password@localhost:5432/smart_triage",
    })).toThrow("runtime database");
  });

  it("recognizes the same Prisma database across pooled and direct hosts", () => {
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: "postgres://runtime-project-user:test-pass@pooled.db.prisma.io:5432/postgres?sslmode=require",
      databaseUrl: prismaRuntimeUrl,
      directDatabaseUrl: prismaDirectUrl,
    })).toThrow("runtime database");
  });

  it("requires both runtime URLs to verify isolation", () => {
    expect(() => getTestDatabaseUrl({ testDatabaseUrl: localTestUrl })).toThrow("DATABASE_URL");
    expect(() => getTestDatabaseUrl({
      testDatabaseUrl: localTestUrl,
      databaseUrl: localRuntimeUrl,
    })).toThrow("DIRECT_DATABASE_URL");
  });
});
