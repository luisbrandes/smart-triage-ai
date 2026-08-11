# ADR 0008 — Prisma, PostgreSQL e modelo persistente inicial

- **Status:** Aceita

## Contexto

O Marco 3 precisa validar relações, histórico e workflow antes de conectar os painéis. A persistência deve ser localmente reproduzível, manter dados clínicos históricos sem cascatas destrutivas e não contaminar domínio ou apresentação com detalhes do ORM.

## Decisão

Usar PostgreSQL 17 local via Docker Compose e Prisma ORM 7.8. O gerador moderno `prisma-client` produz o client explicitamente em `src/generated/prisma`; `PrismaPg` conecta o client em um ponto server-only único sob `src/server/db`. IDs são UUID, datas persistidas como instantes UTC, migrations são versionadas e relações históricas usam `Restrict`.

O schema modela agregados e registros históricos principais. Recomendação e decisão humana são entidades separadas; cada tentativa de hardware é nova sessão; medições rejeitadas permanecem. O seed manual é determinístico, idempotente e exclusivamente fictício. Regras de transição ficam em `src/domain` sem importar Prisma. A UI não acessa o banco e não recebe modelos gerados.

Não são criados repositories ou casos de uso neste marco: serão introduzidos por necessidade de agregados, nunca como CRUD genérico por tabela.

## Alternativas consideradas

- SQLite ou banco em memória: rejeitados por divergirem do PostgreSQL planejado.
- Prisma Postgres gerenciado: rejeitado por introduzir serviço externo.
- `prisma-client-js`: rejeitado em favor do gerador moderno do Prisma 7.
- Client diretamente em páginas/componentes: rejeitado por violar fronteiras e server-only.
- Repository genérico por modelo: rejeitado por vazar persistência e criar abstração prematura.
- Seed aleatório/Faker: rejeitado por impedir repetibilidade e aumentar risco de dados plausivelmente reais.

## Consequências positivas

Ambiente reproduzível, schema verificável, histórico explícito, client isolado, testes puros rápidos e base pronta para casos de uso transacionais.

## Consequências negativas

Docker é requisito para validação local completa; o schema inicial é amplo; regras que dependem de múltiplos campos ainda exigirão casos de uso/transações; tipos de domínio e enums Prisma precisam permanecer sincronizados conscientemente.

## Riscos

Divergência entre schema e domínio puro; importação acidental do client pela UI; seed ser confundido com dado clínico; cascata destrutiva futura; JSON sanitizado acumular informação indevida; conexão local ser reutilizada fora de desenvolvimento.

## Condições de revisão

Revisar diante de requisito comprovado de outro banco/adapter, limitação real do Prisma, mudança no agregado ou necessidade operacional de isolamento. Qualquer revisão deve preservar migrations, histórico, separação humano/sistema, dados fictícios e independência do domínio.
