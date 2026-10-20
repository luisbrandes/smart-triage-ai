type ErrorLike = {
  code?: unknown;
  meta?: unknown;
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
  schemaField?: string;
  name: string;
};

const knownPatientColumns = new Set([
  "Patient.cpf",
  "Patient.phone",
  "Patient.email",
  "Patient.motherName",
  "Patient.legalRepresentativeName",
  "Patient.legalRepresentativePhone",
]);

function safeSchemaField(meta: unknown): string | undefined {
  if (typeof meta !== "object" || meta === null || !("column" in meta)) return undefined;
  const column = meta.column;
  if (typeof column !== "string") return undefined;
  const normalized = column.replaceAll('"', "").replaceAll('`', "").replaceAll("public.", "");
  return knownPatientColumns.has(normalized) ? normalized : undefined;
}

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
    const schemaField = code === "P2022" ? safeSchemaField(value.meta) : undefined;
    return { category: "schema_migration", code, name, ...(schemaField ? { schemaField } : {}) };
  }

  if (name === "PatientIntakeNotFoundError" || name === "PatientIntakeStateError") {
    return { category: "invalid_state", name };
  }

  if (name === "PrismaClientInitializationError") {
    return { category: "database_connection", name };
  }

  return { category: "unexpected", ...(code ? { code } : {}), name };
}
