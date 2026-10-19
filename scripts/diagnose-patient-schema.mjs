import "dotenv/config";

import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

export const EXPECTED_MIGRATIONS = [
  "20261018010000_ai_suggestion",
  "20261018020000_patient_identification_fields",
];

export const EXPECTED_PATIENT_COLUMNS = [
  "cpf",
  "phone",
  "email",
  "motherName",
  "legalRepresentativeName",
  "legalRepresentativePhone",
];

const ALLOWED_URL_ENVIRONMENTS = {
  development: new Set(["DATABASE_URL", "DIRECT_DATABASE_URL", "TRIAGE_DIAGNOSTIC_DATABASE_URL"]),
  test: new Set(["TEST_DATABASE_URL"]),
  production: new Set(["TRIAGE_DIAGNOSTIC_DATABASE_URL"]),
};

function parseTarget(connectionString) {
  let target;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("A variável escolhida não contém uma URL PostgreSQL válida.");
  }

  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
    throw new Error("O diagnóstico aceita somente uma conexão PostgreSQL direta.");
  }

  const database = decodeURIComponent(target.pathname.slice(1));
  const schema = target.searchParams.get("schema") || "public";
  if (!target.hostname || !database || !/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)) {
    throw new Error("O destino não identifica de forma inequívoca um banco e schema PostgreSQL.");
  }

  return {
    connectionString,
    host: target.hostname.toLowerCase(),
    port: target.port || "5432",
    database,
    schema,
  };
}

function sameDatabase(left, right) {
  return left.host === right.host
    && left.port === right.port
    && left.database === right.database;
}

export function resolveDiagnosticTarget({ environment, urlEnvironment, allowProduction, env }) {
  if (!Object.hasOwn(ALLOWED_URL_ENVIRONMENTS, environment)) {
    throw new Error("Informe explicitamente --environment=development, test ou production.");
  }

  if (!ALLOWED_URL_ENVIRONMENTS[environment].has(urlEnvironment)) {
    throw new Error(`A variável selecionada não é permitida para o ambiente ${environment}.`);
  }

  if (environment === "production" && !allowProduction) {
    throw new Error("Diagnóstico de produção exige a opção explícita --allow-production.");
  }

  const connectionString = env[urlEnvironment];
  if (typeof connectionString !== "string" || connectionString.length === 0) {
    throw new Error(`A variável selecionada (${urlEnvironment}) não está disponível.`);
  }

  const target = parseTarget(connectionString);

  if (environment === "test") {
    if (!/test/i.test(target.database)) {
      throw new Error("A base de teste precisa ter nome identificável como teste.");
    }

    for (const runtimeEnvironment of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
      const runtimeConnection = env[runtimeEnvironment];
      if (runtimeConnection) {
        const runtimeTarget = parseTarget(runtimeConnection);
        if (sameDatabase(target, runtimeTarget)) {
          throw new Error("A URL de teste aponta ao mesmo banco lógico de runtime/migrations; diagnóstico recusado.");
        }
      }
    }
  }

  return {
    environment,
    urlEnvironment,
    ...target,
  };
}

function parseCli(args) {
  const { values } = parseArgs({
    args,
    options: {
      environment: { type: "string" },
      "url-env": { type: "string" },
      "allow-production": { type: "boolean", default: false },
    },
    strict: true,
  });

  return {
    environment: values.environment,
    urlEnvironment: values["url-env"],
    allowProduction: values["allow-production"],
  };
}

async function confirmTarget(target) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("A confirmação interativa do destino é obrigatória; execute em um terminal.");
  }

  console.log("Destino sanitizado (credenciais e parâmetros da URL omitidos):");
  console.log(JSON.stringify({
    environment: target.environment,
    host: target.host,
    port: target.port,
    database: target.database,
    schema: target.schema,
  }, null, 2));

  const identity = `${target.host}:${target.port}/${target.database} schema=${target.schema}`;
  const expected = target.environment === "production"
    ? `READ ONLY PRODUCTION ${identity}`
    : `READ ONLY ${target.environment} ${identity}`;
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question(`Confirme digitando exatamente "${expected}": `);
    if (answer !== expected) throw new Error("Confirmação não corresponde ao destino; diagnóstico cancelado.");
  } finally {
    prompt.close();
  }
}

export async function collectReadOnlyDiagnostics(target, poolFactory = (config) => new Pool(config)) {
  const pool = poolFactory({
    connectionString: target.connectionString,
    application_name: "smart-triage-schema-diagnostic-read-only",
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    query_timeout: 12000,
    max: 1,
  });

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN READ ONLY");
    const transactionMode = await client.query("SHOW transaction_read_only");
    if (transactionMode.rows[0]?.transaction_read_only !== "on") {
      throw new Error("A conexão não confirmou modo somente leitura; diagnóstico cancelado.");
    }

    const columns = await client.query(
      `SELECT column_name, is_nullable
       FROM (
         SELECT attribute.attname AS column_name,
                CASE WHEN attribute.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
         FROM pg_catalog.pg_attribute AS attribute
         JOIN pg_catalog.pg_class AS relation ON relation.oid = attribute.attrelid
         JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
         WHERE namespace.nspname = $1
           AND relation.relname = 'Patient'
           AND attribute.attname = ANY($2::text[])
           AND attribute.attnum > 0
           AND NOT attribute.attisdropped
       ) AS patient_columns
       ORDER BY column_name`,
      [target.schema, EXPECTED_PATIENT_COLUMNS],
    );

    const ledgerCheck = await client.query(
      "SELECT to_regclass(format('%I.%I', $1::text, $2::text)) IS NOT NULL AS exists",
      [target.schema, "_prisma_migrations"],
    );

    let migrations = null;
    if (ledgerCheck.rows[0]?.exists) {
      const ledgerTable = `"${target.schema}"."_prisma_migrations"`;
      migrations = await client.query(
        `SELECT migration_name, finished_at, rolled_back_at
         FROM ${ledgerTable}
         WHERE migration_name = ANY($1::text[])
         ORDER BY migration_name`,
        [EXPECTED_MIGRATIONS],
      );
    }

    const columnByName = new Map(columns.rows.map((row) => [row.column_name, row]));
    const migrationRows = migrations?.rows ?? [];

    return {
      patientColumns: EXPECTED_PATIENT_COLUMNS.map((name) => ({
        name,
        present: columnByName.has(name),
        nullable: columnByName.get(name)?.is_nullable ?? null,
      })),
      migrationLedgerPresent: Boolean(ledgerCheck.rows[0]?.exists),
      migrations: EXPECTED_MIGRATIONS.map((name) => {
        const entries = migrationRows.filter((row) => row.migration_name === name);
        let status = "not_recorded";
        if (entries.some((row) => row.finished_at && !row.rolled_back_at)) status = "applied";
        else if (entries.some((row) => !row.rolled_back_at)) status = "incomplete_or_failed";
        else if (entries.length > 0) status = "rolled_back";
        return { name, status };
      }),
    };
  } finally {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    }
    await pool.end();
  }
}

async function main() {
  let phase = "validation";
  let target;
  try {
    const options = parseCli(process.argv.slice(2));
    target = resolveDiagnosticTarget({ ...options, env: process.env });
    phase = "confirmation";
    await confirmTarget(target);
    phase = "database";
    const result = await collectReadOnlyDiagnostics(target);
    console.log(JSON.stringify({
      event: "patient_schema_read_only_diagnostic",
      environment: target.environment,
      target: {
        host: target.host,
        port: target.port,
        database: target.database,
        schema: target.schema,
      },
      ...result,
    }, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diagnóstico cancelado por erro inesperado.";
    const safeMessages = [
      "Informe explicitamente",
      "A variável selecionada",
      "não é permitida",
      "exige a opção explícita",
      "não contém uma URL PostgreSQL válida",
      "aceita somente uma conexão PostgreSQL direta",
      "não identifica de forma inequívoca",
      "não está disponível",
      "precisa ter nome identificável como teste",
      "mesmo banco lógico",
      "confirmação interativa",
      "Confirmação não corresponde",
      "não confirmou modo somente leitura",
    ];
    if (phase !== "database" && safeMessages.some((safeMessage) => message.includes(safeMessage))) {
      console.error(message);
    } else {
      const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
        ? error.code
        : undefined;
      console.error(JSON.stringify({
        event: "patient_schema_read_only_diagnostic_failed",
        category: "connection_or_query_failed",
        ...(code ? { errorCode: code } : {}),
        details: "Mensagem técnica omitida para evitar exposição de configuração.",
      }));
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
