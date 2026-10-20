const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export function assertSafeDemoDatabaseTarget({
  databaseUrl,
  directDatabaseUrl,
  appMode,
  nodeEnv,
  vercelEnv,
}) {
  if (appMode !== "demo") throw new Error("The operation requires APP_MODE=demo.");
  if (nodeEnv === "production" || vercelEnv === "production") {
    throw new Error("The operation is blocked in a production environment.");
  }
  const target = directDatabaseUrl || databaseUrl;
  if (typeof target !== "string" || target.length === 0) {
    throw new Error("A local database URL is required.");
  }
  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error("The local database URL is invalid.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("The operation requires a direct local PostgreSQL connection.");
  }
  if (!loopbackHosts.has(parsed.hostname)) {
    throw new Error("The operation can only access a PostgreSQL server on local loopback.");
  }
}
