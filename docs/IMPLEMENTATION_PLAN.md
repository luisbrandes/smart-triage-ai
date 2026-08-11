# Plano incremental de implementação

Regras comuns: cada marco só começa após aceite do anterior; preservar histórico/auditoria; usar dados fictícios; não inventar regra clínica. Quando a aplicação existir, os comandos esperados são os scripts documentados de formatação, lint, tipos, testes e build — nomes concretos serão definidos no Marco 1, nunca presumidos antes.

## Marco 0 — Harness

- **Objetivo:** fixar contratos de produto, domínio, arquitetura, segurança e entrega.
- **Entregáveis:** somente arquivos desta árvore documental.
- **Dependências:** briefing aprovado.
- **Aceite:** documentos completos, coerentes e sem código/aplicação.
- **Proibido:** inicializar stack, instalar pacote, criar esquema, banco, teste ou script.
- **Validação:** revisão de árvore, links, escopo e contradições; nenhum comando de aplicação.

## Marco 1 — Bootstrap Next.js e ferramentas — concluído

- **Objetivo:** base executável mínima e qualidade automatizada.
- **Entregáveis:** Next.js App Router em `src/app`, TypeScript estrito, Tailwind CSS v4, pnpm, ESLint, Turbopack, alias `@/*`, página estática e instruções.
- **Dependências:** Marco 0.
- **Aceite:** página mínima, scripts definidos e `lint`, `typecheck`, `build` e `check` passam.
- **Proibido:** domínio, Prisma, fluxo clínico ou biblioteca sem justificativa.
- **Validação:** `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build` e `pnpm check`.

## Marco 2 — Design foundation e shell dos painéis — concluído

- **Objetivo:** navegação e linguagem visual responsivas.
- **Entregáveis:** tokens CSS-first, componentes compartilhados mínimos, página institucional, layouts/shells paciente e enfermagem, navegação, estados vazios e aviso experimental.
- **Dependências:** M1.
- **Aceite:** três rotas estáticas e navegáveis, responsividade para desktop/tablet/totem/mobile pertinente, teclado, contraste, sem dados clínicos fictícios ou funcionalidade real.
- **Proibido:** regras, persistência ou falsa funcionalidade clínica.
- **Validação:** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm check` e revisão semântica/responsiva dos shells.

## Marco 3 — Domínio, Prisma e PostgreSQL — concluído

- **Objetivo:** persistir modelo e máquina de estados.
- **Entregáveis:** schema relacional, Prisma 7/client gerado, adapter PostgreSQL, Compose, migration inicial, seed fictício determinístico, máquina de estados pura e testes Vitest. Repositories/casos de uso aguardam necessidade concreta.
- **Dependências:** M1; modelo revisado.
- **Aceite:** schema válido, migration aplicável em banco limpo, seed idempotente, transições/histórico estruturados e testes passando; painéis desconectados.
- **Proibido:** schema genérico, flags contraditórias, produção clínica.
- **Validação:** geração/validação Prisma, migrate deploy em banco limpo, seed repetido, testes de domínio, lint, tipos, build e `pnpm check`.

## Marco 4 — Identificação, consentimento e anamnese — concluído

- **Objetivo:** concluir coleta estruturada até análise pendente.
- **Entregáveis:** intake manual, plano, termo e catálogo demonstrativos versionados, Zod server-side, Server Actions, casos de uso, repository orientado ao agregado, cookie opaco, retomada e auditoria.
- **Dependências:** M2–M3.
- **Aceite:** dados mínimos e cinco eventos persistem; validações/consentimento obrigatório funcionam; conclusão alcança `PRELIMINARY_ANALYSIS_PENDING` sem recomendação.
- **Proibido:** operadora, QR real, regras em UI ou dados reais.
- **Validação:** testes unitários, fluxo HTTP manual completo, atualização/retomada, consulta estrutural ao PostgreSQL e checks.

## Marco 5 — Motor determinístico — concluído

- **Objetivo:** análise preliminar explicável e versionada.
- **Entregáveis:** motor puro, ruleset demo versionado, explicações, fingerprint/idempotência, caso de uso transacional, repository do agregado, auditoria, interface e testes.
- **Dependências:** definição das regras demonstrativas por responsáveis clínico/produto; M4.
- **Aceite:** verde/amarelo/vermelho previsíveis, transições corretas, persistência explicável, repetição sem duplicidade, bloqueio em produção e nenhuma decisão humana.
- **Proibido:** NEWS/Manchester, IA, limiar inventado ou linguagem de diagnóstico.
- **Validação:** 36 testes, fluxo HTTP integrado, repetição, consulta estrutural ao PostgreSQL e checks completos.

## Marco 6 — Fronteira e sinais vitais manuais/simulados — concluído

- **Objetivo:** definir o contrato implementável do `HardwareGateway`, coletar/repetir FC e SpO₂ e reavaliar.
- **Entregáveis:** contrato e capacidades opcionais; `ManualVitalSignsAdapter`; `SimulatedHardwareAdapter` determinístico; interface de preparação/progresso; normalização/origem/status/três tempos; timeout, falha, cancelamento, repetição e fallback; testes contratuais dos dois adaptadores.
- **Dependências:** M5.
- **Aceite:** caminhos sucesso/falha/timeout/repetição/fallback preservam sessões e origem; motor recebe apenas medições aceitas; testes contratuais passam.
- **Proibido:** ESP32, Bluetooth/serial, calibração alegada.
- **Validação:** checks, contratos de adaptador e E2E dos cenários 2/5.

### Evolução posterior à V0 — prova de conceito ESP32

Somente após ADR específico de protocolo e decisões pendentes de `HARDWARE_BOUNDARY.md`, executar prova de conceito isolada do `Esp32HardwareAdapter`: autenticação, mensagens, idempotência, tempo, desconexão, segurança e observabilidade. Ela não integra produção clínica nem altera casos de uso. Integração real depende de validação técnica, clínica, de segurança e operação; não pertence a nenhum marco da V0.

## Marco 7 — Conclusão do paciente e senha — concluído

- **Objetivo:** finalizar coleta e enfileirar.
- **Entregáveis:** geração atômica/idempotente com data UTC e sequência diária, tela de conclusão, resumo seguro, aviso de revisão e nova demonstração preservando histórico.
- **Dependências:** M4–M6.
- **Aceite:** unicidade, idempotência e entrada na fila.
- **Proibido:** previsão de espera ou garantia clínica sem base.
- **Validação:** testes de formato/estado/idempotência/ordenação diária, constraints e transação serializável, fluxo integrado e checks completos.

## Marco 8 — Fila e detalhes da enfermagem — concluído

- **Objetivo:** oferecer visão profissional completa.
- **Entregáveis:** fila PostgreSQL ordenada server-side, indicadores reais simples, atualização manual, detalhe sanitizado e estados vazio/404.
- **Dependências:** M7; segregação de acesso definida para demo.
- **Aceite:** todos os campos do contrato, ordenação/desempate testados.
- **Proibido:** realtime complexo ou prontuário.
- **Validação:** testes de filtro, ordem/desempate, DTOs, vazio e detalhes com/sem coleta; consulta manual e checks completos.

## Marco 9 — Revisão, reclassificação, nova coleta e encaminhamento — concluído

- **Objetivo:** fechar o ciclo humano.
- **Entregáveis:** confirmar, reclassificar com justificativa, solicitar/reavaliar nova coleta, exibir decisão separada e encaminhar após classificação.
- **Dependências:** M6–M8.
- **Aceite:** decisão separada, transições autorizadas e histórico integral.
- **Proibido:** decisão automática final, prescrição ou gestão médica.
- **Validação:** testes de validação/casos de uso/estado, transações serializáveis, idempotência, fluxo persistido e checks completos.

## Marco 10 — Auditoria, segurança e robustez — implementação concluída; evidência PostgreSQL pendente quando Docker estiver disponível

- **Objetivo:** completar controles e recuperação V0.
- **Entregáveis:** sessões assinadas separadas, autorização profissional, recoleta contextual, senha transacional, auditoria append-only, log sanitizado e harness PostgreSQL protegido.
- **Dependências:** M3–M9; revisão de ameaça.
- **Aceite:** matriz de auditoria e testes negativos aprovados.
- **Proibido:** alegar conformidade/certificação ou resolver retenção sem responsável.
- **Validação:** checks, testes de segurança/integração e inspeção de logs.

## Marco 11 — Seed, cenários e acabamento

- **Objetivo:** demonstração previsível e polida.
- **Entregáveis:** fixtures fictícios, modo/reset seguro, cinco cenários e instruções.
- **Dependências:** M9–M10.
- **Aceite:** cenários repetíveis offline, responsivos e sem PII real.
- **Proibido:** dependência externa, conteúdo real ou recursos fora da V0.
- **Validação:** checks, reset repetido, E2E e QA visual/acessível.

## Marco 12 — Validação integral do MVP

- **Objetivo:** provar todos os critérios antes da apresentação.
- **Entregáveis:** evidências, relatório de gaps, documentação final e roteiro demo.
- **Dependências:** M1–M11.
- **Aceite:** checklist integral, build e suítes passam; riscos/limites visíveis.
- **Proibido:** contornar falha, expandir escopo ou chamar o produto de clínico validado.
- **Validação:** ambiente limpo, formato/lint/tipos/unitários/integração/E2E/build, acessibilidade e cinco cenários.
