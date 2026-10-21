export function resolveConnectionTimeoutMillis(connectionString: string, override?: string): number {
  if (override !== undefined && override !== "") {
    const value = Number(override);
    if (!Number.isSafeInteger(value) || value < 1 || value > 120_000) {
      throw new Error("DATABASE_CONNECTION_TIMEOUT_MS deve ser um inteiro entre 1 e 120000.");
    }
    return value;
  }
  if (!URL.canParse(connectionString)) throw new Error("DATABASE_URL inválida.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectionString).hostname);
  return local ? 5_000 : 30_000;
}
