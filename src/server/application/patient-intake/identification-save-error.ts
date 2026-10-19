type ErrorLike = {
  code?: unknown;
  name?: unknown;
};

export type IdentificationSaveErrorCategory =
  | "database_constraint"
  | "database_connection"
  | "schema_migration"
  | "invalid_state"
  | "unexpected";

export type IdentificationSaveErrorDetails = {
  category: IdentificationSaveErrorCategory;
  code?: string;
  name: string;
};

function isErrorLike(error: unknown): error is ErrorLike {
  return typeof error === "object" && error !== null;
}

function safeErrorName(name: unknown): string {
  const knownNames = new Set([
    "PrismaClientKnownRequestError",
    "PrismaClientInitializationError",
    "PatientIntakeNotFoundError",
    "PatientIntakeStateError",
  ]);
  return typeof name === "string" && knownNames.has(name) ? name : "UnknownError";
}

export function classifyIdentificationSaveError(error: unknown): IdentificationSaveErrorDetails {
  const value = isErrorLike(error) ? error : {};
  const code = typeof value.code === "string" && /^P\d{4}$/.test(value.code) ? value.code : undefined;
  const name = safeErrorName(value.name);

  if (code === "P2002") {
    return { category: "database_constraint", code, name };
  }

  if (code && (/^P10(?:00|01|02|03|08|10|11|17)$/.test(code) || code === "P2037")) {
    return { category: "database_connection", code, name };
  }

  if (code === "P2021" || code === "P2022") {
    return { category: "schema_migration", code, name };
  }

  if (name === "PatientIntakeNotFoundError" || name === "PatientIntakeStateError") {
    return { category: "invalid_state", name };
  }

  if (name === "PrismaClientInitializationError") {
    return { category: "database_connection", name };
  }

  return { category: "unexpected", ...(code ? { code } : {}), name };
}
