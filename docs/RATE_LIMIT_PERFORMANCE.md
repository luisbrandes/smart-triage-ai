# Rate limiting: preparação e evidências locais

## Decisão

PostgreSQL compartilhado continua sendo o armazenamento distribuído. Uma chamada protegida executa um único upsert parametrizado. Contadores esgotados retornam bloqueio sem incrementar ou regravar a linha; a janela seguinte reinicia atomicamente. O contador agora representa admissões, não todas as tentativas. Não é uma métrica de auditoria. A disputa pela mesma chave ainda exige bloqueio de linha: isto não substitui proteção de borda contra DDoS.

O limite de tentativas e as janelas das rotas existentes não mudaram. A validação limita políticas a 24 horas e contadores ao intervalo de INTEGER. Datas inválidas são rejeitadas. Nenhum identificador do usuário é registrado: a chave continua SHA-256. Erros de armazenamento continuam bloqueando a operação e geram apenas códigos sanitizados.

## Índices e migrations

A migration existente `20261019000100_distributed_rate_limits` já contém os dois índices necessários:

- `RateLimitBucket_pkey`: B-tree único usado pelo `ON CONFLICT (key)`.
- `RateLimitBucket_updatedAt_idx`: B-tree para selecionar os registros expirados em ordem de data.

Não adicionar índice composto redundante, nem reescrever migrations já existentes. As otimizações do rate limiter são de SQL e aplicação. Em 2026-10-21, após autorização explícita, foram aplicadas ao banco remoto indicado por PRISMA_URL as migrations pendentes `20261019000000_ai_suggestion_generation_claim` e `20261019000100_distributed_rate_limits`, além dos dois ajustes de metadados descritos abaixo.

As diferenças de checksum das três primeiras migrations foram verificadas como LF/CRLF. A migration `20261021000000_normalize_device_session_index_name` alinha o nome do índice de DeviceCollectionSession sem reconstruí-lo. A migration `20261021000100_align_ai_updated_at_default` remove apenas o DEFAULT de AiSuggestion.updatedAt, usado anteriormente no backfill, alinhando a coluna ao @updatedAt do schema. Ambas usam lock_timeout de 5 segundos e foram testadas localmente antes de aplicadas ao remoto. Não houve reset, exclusão de dados clínicos ou edição manual do histórico.

## Limpeza fora das requisições

Foi removida a exclusão aleatória, ilimitada e aguardada pelo login. A manutenção explícita remove até 1000 buckets técnicos com mais de 48 horas por execução. O prazo é superior à maior janela permitida. Não remove dados clínicos ou auditoria.

```bash
pnpm rate-limit:cleanup --execute
```

Esse comando modifica exclusivamente `RateLimitBucket` no destino de **DATABASE_URL** carregado pelo processo; não usa PRISMA_URL. Conferir o ambiente antes de executá-lo. Sem `--execute`, não executa a limpeza. Não executar com um `.env` de outro ambiente. Não foi executado contra produção nesta tarefa.

A seleção usa o índice de data, `LIMIT 1000` e `FOR UPDATE SKIP LOCKED`. A exclusão usa os `ctid` selecionados, válidos apenas dentro da mesma instrução enquanto as linhas estão bloqueadas. Eles nunca são persistidos ou expostos. Isso evita a varredura completa observada com um join por chave no teste. Manutenções simultâneas não aguardam os registros já bloqueados na seleção.

É necessário agendar a manutenção operacional, por exemplo diariamente, em executor confiável com acesso ao banco. Se houver mais de 1000 expirados, executar lotes adicionais com pausa e orçamento de tempo. Nenhum cron ou serviço externo foi configurado automaticamente. Sem manutenção, a tabela continuará crescendo.

## EXPLAIN reproduzível, somente em teste local

```bash
pnpm db:test:up
pnpm db:test:deploy
pnpm rate-limit:explain
pnpm test:integration -- tests/integration/rate-limit.test.ts
```

O script exige TEST_DATABASE_URL isolada e loopback, insere 100 mil linhas fictícias, executa `ANALYZE` e `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` e desfaz os dados com rollback. Não aceita banco remoto. Os planos são salvos em `artifacts/performance/rate-limit-explain.json`, sem credenciais ou dados pessoais. ANALYZE pode atualizar estatísticas da tabela de teste; não execute durante outros testes.

Medição local em PostgreSQL 17, amostra de 2026-10-21:

| Operação | Plano observado | Execução no servidor |
|---|---|---|
| Novo bucket | Insert, arbiter `RateLimitBucket_pkey` | 0,188 ms |
| Incremento permitido | Conflict update pela chave primária | 0,062 ms |
| Bloqueio por limite atingido | Conflict filter, nenhuma linha retornada | 0,042 ms |
| Busca por chave | Index Scan na chave primária | 0,046 ms |
| Limpeza de 1000 expirados | Index Scan na data e Tid Scan | 1,537 ms |

Em 100 repetições do bloqueio esgotado: p50 0,044 ms, p95 0,065 ms, máximo 0,121 ms. A primeira variante da limpeza usou Hash Join com Seq Scan de cerca de 100 mil linhas e levou 19,961 ms; foi substituída após inspeção do plano. Estas execuções não constituem um benchmark comparativo controlado nem latência de rede, Vercel ou produção. Caches, hardware, cardinalidade e concorrência alteram os resultados. Não foi prometido throughput de produção.

Integração local comprova exatamente 5 admissões em 20 chamadas concorrentes, saturação do contador, manutenção de timestamp após bloqueio, reset na fronteira da janela e limpeza em lote preservando buckets recentes. O resultado não equivale a E2E ou teste de carga em produção.

Validações executadas neste ajuste: 203 testes unitários, 17 testes de integração PostgreSQL no banco local isolado, ESLint, TypeScript, Prisma validate e build de produção. A suíte completa revelou uma asserção anterior da integração de IA que usava um objeto parcial dentro de `arrayContaining` sem `objectContaining`; foi corrigida somente a expectativa, mantendo o comportamento e os dados da aplicação.

## Publicação

Em futuras alterações, confirmar o destino, backup recuperável e revisão das migrations. Usar `prisma migrate deploy`, nunca reset/db push. Monitorar códigos RATE_LIMIT_TABLE_MISSING, RATE_LIMIT_PERMISSION_DENIED, RATE_LIMIT_QUERY_TIMEOUT e RATE_LIMIT_STORAGE_UNAVAILABLE. A manutenção periódica dos buckets ainda precisa de agendamento operacional.

## Verificação após aplicação autorizada

As 15 migrations estão aplicadas. Prisma migrate status confirmou o histórico atualizado; migrate diff retornou código 0 e "No difference detected". Os dois logins da publicação ativa foram testados por POST real, usando credencial apenas em memória: HTTP 303 para /paciente e /enfermagem, com emissão de sessão e sem indisponibilidade. Não foram abertos registros de pacientes. Isso confirma o acesso nessa publicação, sem validar E2E, Groq real, hardware ou uso clínico. É necessário incluir as duas novas migrations no próximo commit para manter o histórico do repositório consistente com o banco. Não houve commit, push ou deploy por este agente.
