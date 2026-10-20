import { describe, expect, it } from "vitest";

import { assertSafeDemoDatabaseTarget } from "./local-database-safety.mjs";

const safeEnvironment = {
  databaseUrl: "postgresql://demo:demo@localhost:5432/smart_triage",
  appMode: "demo",
  nodeEnv: "development",
};

describe("safety guard for demo database writers", () => {
  it("accepts local PostgreSQL in demo mode", () => {
    expect(() => assertSafeDemoDatabaseTarget(safeEnvironment)).not.toThrow();
  });

  it("rejects production environments even when the database URL is local", () => {
    expect(() => assertSafeDemoDatabaseTarget({ ...safeEnvironment, nodeEnv: "production" })).toThrow("production");
    expect(() => assertSafeDemoDatabaseTarget({ ...safeEnvironment, vercelEnv: "production" })).toThrow("production");
  });

  it("rejects non-demo mode and remote database destinations", () => {
    expect(() => assertSafeDemoDatabaseTarget({ ...safeEnvironment, appMode: "production" })).toThrow("APP_MODE=demo");
    expect(() => assertSafeDemoDatabaseTarget({ ...safeEnvironment, databaseUrl: "postgresql://demo:demo@db.example.test:5432/smart_triage" })).toThrow("loopback");
  });

  it("checks the direct migration URL instead of trusting a local pooled URL", () => {
    expect(() => assertSafeDemoDatabaseTarget({
      ...safeEnvironment,
      directDatabaseUrl: "postgresql://demo:demo@remote.example.test:5432/smart_triage",
    })).toThrow("loopback");
  });

  it("rejects missing and non-PostgreSQL destinations", () => {
    expect(() => assertSafeDemoDatabaseTarget({ appMode: "demo", nodeEnv: "development" })).toThrow("required");
    expect(() => assertSafeDemoDatabaseTarget({ ...safeEnvironment, databaseUrl: "file:./local.db" })).toThrow("PostgreSQL");
  });
});
