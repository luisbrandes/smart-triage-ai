# ADR 0017 — Estratégia de testes de integração PostgreSQL

- **Status:** Aceita

## Decisão

Usar suíte Vitest separada por `pnpm test:integration`, obrigatoriamente conectada por `TEST_DATABASE_URL`. O setup rejeita URL ausente, igual ao banco de desenvolvimento ou sem identificação de teste. Migrations devem ser aplicadas antes da suíte; limpeza usa somente o banco exclusivo.

O primeiro teste cobre emissão concorrente de senha e auditoria. Os demais fluxos críticos serão acrescentados incrementalmente sem substituir testes puros rápidos.

### Prisma Postgres usado como banco de testes

Prisma Postgres usa o nome `/postgres` para bancos distintos. A validacao considera a identidade gerada do banco: pooled e direct do mesmo projeto compartilham usuario, enquanto um projeto de teste separado precisa ter usuario diferente de `DATABASE_URL` e `DIRECT_DATABASE_URL`. O script oficial converte somente o host `pooled.db.prisma.io` para `db.prisma.io` ao aplicar migrations; a suite usa a URL pooled de teste.
