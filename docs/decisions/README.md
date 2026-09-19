# Registros de decisões arquiteturais

ADRs documentam decisões duráveis, alternativas e condições de revisão. Estados usados: `Proposta`, `Aceita`, `Substituída` e `Rejeitada`. Não edite silenciosamente uma decisão aceita: crie ADR substituta ou registre revisão com contexto.

- `0001-modular-nextjs-monolith.md`: forma arquitetural.
- `0002-human-in-the-loop-classification.md`: autoridade profissional.
- `0003-deterministic-analysis-engine-for-v0.md`: mecanismo de recomendação.
- `0004-simulated-hardware-integration-for-v0.md`: aquisição de sinais vitais.
- `0005-hardware-gateway-and-adapter-boundary.md`: fronteira única e adaptadores de hardware.
- `0006-nextjs-src-app-and-tailwind-foundation.md`: fundação técnica da aplicação web.
- `0007-design-foundation-and-application-shells.md`: fundação visual e shells navegáveis.
- `0008-prisma-postgresql-and-persistent-domain-model.md`: persistência PostgreSQL e modelo inicial.
- `0009-patient-intake-and-demo-content.md`: intake funcional e conteúdo demonstrativo isolado.
- `0010-deterministic-demo-analysis-engine.md`: motor determinístico demonstrativo e idempotente.
- `0011-manual-and-simulated-vital-signs.md`: gateway, coleta manual/simulada e reanálise.
- `0012-queue-ticket-and-patient-flow-completion.md`: senha operacional idempotente e conclusão do paciente.
- `0013-nursing-queue-and-triage-details.md`: fila server-side e detalhe seguro somente para leitura.
- `0014-human-review-reclassification-and-referral.md`: decisão humana, nova coleta e encaminhamento transacionais.
- `0015-demo-authentication-and-authorization.md`: sessões demonstrativas separadas e autorização server-side.
- `0016-audit-integrity-and-operation-correlation.md`: ator autenticado, auditoria append-only e logging sanitizado.
- `0017-postgresql-integration-test-strategy.md`: banco exclusivo e suíte de integração PostgreSQL.
- `0018-http-device-reading-ingestion.md`: entrada HTTP inicial de leituras de dispositivo físico.
- `0019-device-collection-session.md`: sessão técnica de coleta por dispositivo.
- `0020-http-device-session-and-frontend-query.md`: contrato HTTP vigente e projeção de consulta da coleta.
- `0021-physical-reading-acceptance.md`: aceite explícito de leitura física na triagem.
