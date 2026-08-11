# Regras de engenharia

## Gates do Marco 10

- `APP_MODE` é fail-closed: somente `demo` habilita regras/hardware simulados.
- Renderizações são somente leitura; ingresso na fila e senha pertencem à transação de conclusão.
- Fingerprint pós-medição inclui sessão e tentativa; nova sessão nunca reutiliza análise anterior.
- Testes PostgreSQL exigem `TEST_DATABASE_URL` identificada como teste e distinta de `DATABASE_URL`.
- Auditoria permite apenas insert no fluxo comum e no banco; logs aceitam somente campos sanitizados.

## Código e domínio futuros

- Usar pnpm exclusivamente; não versionar lockfile de npm, Yarn ou Bun.
- Manter código da aplicação em `src/`, rotas em `src/app` e imports internos pelo alias `@/*` quando útil.
- Usar React Server Components por padrão e justificar qualquer fronteira cliente.
- Manter Tailwind CSS v4 em configuração CSS-first; não criar configuração extensa sem necessidade.
- Consumir cores, forma e sombras pelos tokens de `globals.css`; não espalhar valores visuais nos componentes.
- Manter componentes genéricos mínimos em `shared` e composições específicas de cada shell em `features`.
- Não preencher estados vazios com pacientes ou números clínicos inventados; comunicar indisponibilidade de forma explícita.
- Centralizar ícones no wrapper compartilhado e não importar a biblioteca diretamente no restante da aplicação.
- Manter código server-only em `src/server` com proteção `server-only` nos pontos de entrada que leem segredos ou conectam infraestrutura.
- Restringir Prisma a `prisma/`, `src/generated/prisma`, `src/server/db` e repositories concretos futuros; UI, `shared` e domínio não importam Prisma.
- Aplicar a direção apresentação → aplicação → domínio, com infraestrutura implementando contratos orientados a agregados.
- Não criar repository genérico, CRUD universal, repository por tabela, Unit of Work ou DTO sem consumidor concreto.
- Não deixar erros do banco vazarem para domínio ou interface; mensagens técnicas e metadados persistidos devem ser sanitizados.
- TypeScript estrito; `any` somente com justificativa explícita e contenção.
- Validar toda entrada em fronteiras e manter invariantes no domínio.
- Não colocar regras de domínio em React nem classificação em páginas.
- Centralizar perguntas e regras do motor; regras determinísticas, versionadas e testáveis.
- Separar textos de produto de condições de negócio.
- Não sobrescrever anamnese submetida, medição, análise, recomendação, revisão ou auditoria; correção cria histórico novo.
- Usar transação para estado + registros críticos + auditoria; tratar concorrência e idempotência.
- Representar instantes de forma inequívoca; relógio injetável onde previsibilidade de teste exigir.
- Preferir solução explícita; não criar abstração genérica antes da necessidade.
- Mudanças pequenas, verificáveis e acompanhadas de documentação/ADR quando alterarem decisão.
- Não adicionar biblioteca sem justificar função, alternativas, custo e risco.
- Não extrapolar V0, inventar regra clínica, usar dados reais ou alegar validação/conformidade.
- Manter `HardwareGateway` estável e independente de protocolo; manual, simulado e físico são adaptadores do mesmo contrato.
- Normalizar e validar dados na integração; payload bruto não alcança casos de uso, domínio ou motor.
- Preservar origem, sessão, tentativa e três referências temporais; simulado nunca se apresenta como físico.
- Projetar idempotência por sessão/medição/sequência, distinguindo duplicata de tentativa legítima.
- Aplicar timeout, cancelamento e retries limitados; fallback manual cria sessão e auditoria novas.
- Erros de adaptador são discriminados e seguros; logs não registram payload ou dado clínico identificável.
- Escolha de transporte/protocolo requer ADR; código não depende diretamente de ESP32/biblioteca de comunicação.

## Qualidade e experiência

Tratar carga, erro, vazio, repetição e retomada. Prioridade nunca depende só de cor; incluir rótulo e acessibilidade. Interfaces críticas funcionam em desktop/tablet/totem, com foco, teclado, mensagens compreensíveis e confirmação de ações. Campos livres são minimizados e não aparecem em logs.

## Testes futuros obrigatórios

Vitest em ambiente Node cobre atualmente a máquina de estados e transições inválidas sem PostgreSQL. Futuramente: unitários do motor; integração de auditoria, reclassificação, histórico, transações e validação; contratos dos adaptadores; E2E dos cinco cenários. Alterações de regra exigem casos previsíveis e versão nova.

## Controle de entrega

Antes de codificar, ligar a mudança a marco e critério. Depois, revisar o diff e executar `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:validate` e `pnpm build`; `pnpm check` consolida os gates. Mudança de schema exige migration real e aplicação em banco limpo. Falha não é ocultada; documentar risco e impedir avanço de marco se um gate obrigatório não passar.
