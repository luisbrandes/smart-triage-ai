# ADR 0017 — Estratégia de testes de integração PostgreSQL

- **Status:** Aceita

## Decisão

Usar suíte Vitest separada por `pnpm test:integration`, obrigatoriamente conectada por `TEST_DATABASE_URL`. O setup rejeita URL ausente, igual ao banco de desenvolvimento ou sem identificação de teste. Migrations devem ser aplicadas antes da suíte; limpeza usa somente o banco exclusivo.

O primeiro teste cobre emissão concorrente de senha e auditoria. Os demais fluxos críticos serão acrescentados incrementalmente sem substituir testes puros rápidos.
