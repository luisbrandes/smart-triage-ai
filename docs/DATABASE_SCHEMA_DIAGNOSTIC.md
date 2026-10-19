# Diagnóstico somente leitura do schema PostgreSQL

O script `scripts/diagnose-patient-schema.mjs` consulta apenas as seis colunas de identificação de `Patient` e o estado de duas migrations. Ele não lê linhas de pacientes, não aplica migrations e executa as consultas dentro de uma transação PostgreSQL `READ ONLY`.

O diagnóstico exige seleção explícita do ambiente, da variável que contém a URL e confirmação interativa do destino sanitizado. Credenciais, URL completa e parâmetros não são impressos. Produção exige também `--allow-production` e a confirmação digitada `READ ONLY PRODUCTION <host>:<porta>/<banco> schema=<schema>`.

## Testar a seleção antes de conectar

Os testes unitários não fazem conexões:

```powershell
node .\node_modules\vitest\vitest.mjs run scripts/diagnose-patient-schema.test.mjs
```

## Diagnóstico local/desenvolvimento

O script carrega `.env` por `dotenv/config`; ele nunca escolhe uma URL por conta própria. Selecione explicitamente a fonte:

```powershell
node .\scripts\diagnose-patient-schema.mjs --environment=development --url-env=DATABASE_URL
```

Confira host, porta, banco e schema sanitizados na tela. Digite exatamente `READ ONLY development <host>:<porta>/<banco> schema=<schema>` somente se esse for o destino esperado.

## Diagnóstico do banco de teste

O projeto já prevê PostgreSQL isolado pelo serviço Compose `postgres_test`, porta padrão `5433`, banco `smart_triage_test`; `.env.example` traz o formato esperado. Se a porta estiver ocupada, `POSTGRES_TEST_PORT` pode sobrescrever a porta local publicada. Não use `DATABASE_URL` como teste. A URL de teste precisa ter nome que contenha `test` e identificar banco diferente de `DATABASE_URL` e `DIRECT_DATABASE_URL`.

Se Docker Compose estiver configurado e disponível, o fluxo existente é:

```powershell
pnpm db:test:up
pnpm db:test:deploy
pnpm test:integration
```

O comando de diagnóstico, depois que o banco isolado estiver configurado, é:

```powershell
node .\scripts\diagnose-patient-schema.mjs --environment=test --url-env=TEST_DATABASE_URL
```

Confirme o destino digitando `READ ONLY test <host>:<porta>/<banco> schema=<schema>`.

O script não cria serviço nem banco e não aplica migrations. A preparação do container e a aplicação de migrations são etapas separadas e explícitas.

## Produção

Não há vínculo/CLI da Vercel neste workspace. Não copie secrets para chat, terminal compartilhado ou arquivo versionado. Para usar o script localmente seria necessário disponibilizar, por canal seguro, `TRIAGE_DIAGNOSTIC_DATABASE_URL` como variável de processo e executar:

```powershell
node .\scripts\diagnose-patient-schema.mjs --environment=production --url-env=TRIAGE_DIAGNOSTIC_DATABASE_URL --allow-production
```

O script mostra o destino sem credenciais e exige a confirmação `READ ONLY PRODUCTION <host>:<porta>/<banco> schema=<schema>`. Prefira uma credencial PostgreSQL restrita a leitura. A ferramenta não consegue provar que uma URL fornecida manualmente é o banco usado pela Vercel; confirme essa associação no painel antes de autorizar a consulta.

Sem disponibilizar a conexão de forma segura, a alternativa é executar, no console SQL do provedor do banco identificado no painel da Vercel, somente as consultas abaixo. Não cole valores secretos:

```sql
SELECT attribute.attname AS column_name,
       CASE WHEN attribute.attnotnull THEN 'NO' ELSE 'YES' END AS is_nullable
FROM pg_catalog.pg_attribute AS attribute
JOIN pg_catalog.pg_class AS relation ON relation.oid = attribute.attrelid
JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
WHERE namespace.nspname = 'public'
  AND relation.relname = 'Patient'
  AND attribute.attname IN (
    'cpf', 'phone', 'email', 'motherName',
    'legalRepresentativeName', 'legalRepresentativePhone'
  )
  AND attribute.attnum > 0
  AND NOT attribute.attisdropped
ORDER BY column_name;
```

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM public."_prisma_migrations"
WHERE migration_name IN (
  '20261018010000_ai_suggestion',
  '20261018020000_patient_identification_fields'
)
ORDER BY migration_name, finished_at;
```

## O que conferir na Vercel

Em Project → Settings → Environment Variables, selecione Production e confirme que `DATABASE_URL` (runtime) e `DIRECT_DATABASE_URL` (migrations) apontam para o mesmo banco lógico e schema. As URLs não precisam — e em provedores com pooler não devem — ser literalmente iguais. Para Prisma Postgres, use o endpoint pooled (`pooled.db.prisma.io`) no runtime e o endpoint direto (`db.prisma.io`) para migrations, com credenciais/projeto/banco correspondentes. Não envie os valores. Em Deployments, abra o deployment associado ao domínio de produção e procure no Build Log a aplicação das migrations acima. Sem CLI ou integração, essas informações continuam dependendo do painel da Vercel e do provedor PostgreSQL.

## Evidência do P2022

A causa de schema fica confirmada em produção se, no banco usado pelo runtime da Vercel, faltar uma ou mais colunas selecionadas pelo fluxo e o ledger mostrar `20261018020000_patient_identification_fields` sem conclusão. O ledger sozinho não basta: o migration pode ter sido aplicado em outro banco via `DIRECT_DATABASE_URL`. Para considerar a identificação validada, além de reconciliar banco/runtime/migration, uma tentativa controlada com dados fictícios deve gerar evento sanitizado de sucesso, avançar para consentimento e continuar reconhecida após recarregar. Não apague os registros/auditoria de teste em produção.
