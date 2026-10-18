# Contrato operacional para agentes

## Contexto e limites

Smart Triage apoia a triagem inicial por dois painéis: paciente e enfermagem. A stack planejada é Next.js App Router, TypeScript estrito, Prisma e PostgreSQL, em monólito modular. A V0 cobre o fluxo demonstrável descrito em `docs/MVP_SCOPE.md`; não cobre prontuário, diagnóstico, prescrição, protocolo validado, hardware real ou uso clínico.

O motor apenas recomenda prioridade preliminar explicável. A classificação final é decisão de enfermagem. Nunca apresente automação como IA clínica validada ou substituta profissional, nunca invente NEWS, Manchester ou regra clínica e nunca apague recomendações, medições ou decisões anteriores.

Dados clínicos são sensíveis: minimize coleta, use somente pessoas fictícias em seed/teste/captura, não registre dados identificáveis em logs e preserve consentimento, versão do termo e auditoria. Não alegue conformidade LGPD, certificação ou autorização inexistente.

## Antes de alterar arquivos

1. Leia este arquivo, `README.md` e os documentos relacionados à tarefa.
2. Confira escopo, critérios de aceite, máquina de estados e ADRs aplicáveis.
3. Inspecione a árvore e mudanças existentes; preserve trabalho alheio.
4. Declare a menor mudança que atende ao marco atual e identifique impactos em histórico, auditoria, privacidade e limites clínicos.
5. Não implemente marco posterior nem adicione biblioteca sem função concreta documentada.

## Arquitetura e engenharia

Respeite as fronteiras `patient-intake`, `consent`, `anamnesis`, `vital-signs`, `triage-analysis`, `nursing-queue`, `nurse-review`, `queue-ticket`, `audit` e `demo-support`. Separe apresentação, casos de uso, domínio, persistência e integrações. Não coloque domínio em React nem classificação em páginas. Valide entradas nas fronteiras, use transações nas mudanças críticas, datas consistentes e contratos internos versionados. Consulte `docs/ARCHITECTURE.md` e `docs/ENGINEERING_RULES.md`.

A fundação usa Next.js App Router em `src/app`, Tailwind CSS v4, pnpm e alias `@/*` para `src/*`. Todo código de aplicação fica em `src/`; React Server Components são o padrão. Não adicione `"use client"`, estado, efeito ou biblioteca sem necessidade concreta.

A fundação visual usa tokens em `src/app/globals.css`, componentes mínimos em `src/shared` e componentes específicos em `src/features`. Preserve os shells distintos de paciente e enfermagem, sem inserir dados clínicos fictícios para preencher a interface. Reutilize os componentes existentes antes de criar variações e não introduza biblioteca completa de UI.

Código dependente de servidor fica em `src/server` e seus pontos de entrada usam `import "server-only"`. Prisma é detalhe de infraestrutura restrito a `prisma/`, `src/generated/prisma`, `src/server/db` e futuras implementações em `src/server/repositories`. `src/domain` contém somente tipos, erros e regras puras; não importa Prisma, Next.js, React ou ambiente. Não crie repository genérico ou por tabela, nem exponha modelos Prisma à UI. Mutações relacionadas usarão transações em casos de uso/infraestrutura, nunca em componentes.

O intake funcional usa Server Actions sem Prisma direto, casos de uso em `src/server/application`, repository do agregado em `src/server/repositories` e cookie `httpOnly` contendo somente o UUID opaco da triagem. Conteúdo provisório fica exclusivamente em `src/demo` e deve manter aviso/versionamento demonstrativo. Nunca grave respostas clínicas em cookie, URL ou metadados de auditoria.

A senha operacional é emitida server-side apenas em `AWAITING_NURSE_REVIEW`. A formatação `T-AAAAMMDD-NNN` fica em `src/domain/queue-ticket`, usa data UTC provisória e não carrega significado clínico. Preserve uma senha por triagem, sequência única por data, transação serializável e retorno idempotente. Nova demonstração substitui o cookie, mas nunca apaga a triagem ou senha anterior.

A fila da enfermagem é uma projeção server-side somente para leitura em `src/server/application/nursing`, com DTOs explícitos e repository Prisma dedicado. Liste apenas `AWAITING_NURSE_REVIEW`; ordene `RED`, `YELLOW`, `GREEN` e depois entrada mais antiga, sempre como regra demonstrativa. O detalhe usa allowlist para linha do tempo, não expõe snapshots, fingerprints, IDs técnicos ou metadados brutos e não oferece mutações antes do Marco 9.

As ações profissionais do Marco 9 usam Server Actions, validação Zod e transações serializáveis. Confirmação/reclassificação criam `NurseReview` sem alterar recomendação; reclassificação exige justificativa. Nova coleta só parte de `AWAITING_NURSE_REVIEW`, não cria sessão até o paciente acionar o `HardwareGateway` e preserva histórico. Encaminhamento exige `CLASSIFIED` e nunca avança para `CLOSED`. A referência `DEMO_NURSE` não representa autenticação real.

No Marco 10, cookies de paciente e enfermagem são sessões HMAC separadas; toda rota/action profissional exige sessão e deriva dela o ator. `DEMO_SESSION_SECRET` e `DEMO_NURSE_CREDENTIAL` são server-only. Entrada em revisão e senha são atômicas; análise final inclui sessão/tentativa no fingerprint. `AuditEvent` é append-only por trigger. Integração usa somente `TEST_DATABASE_URL`, nunca o banco de desenvolvimento.

O motor demonstrativo é uma função pura em `src/domain/analysis`; recebe somente entrada normalizada e regras injetadas de `src/demo/analysis-rules.ts`. Condições demo não podem aparecer em UI, Server Actions ou repositories. Toda execução referencia versão e fingerprint, preserva histórico e mantém recomendação automática separada da decisão humana. `APP_MODE=production` bloqueia a execução das regras V0.

A coleta V0 implementa `HardwareGateway` com adapters manual e simulado sob `src/server/services/hardware`. Cada chamada cria sessão histórica; somente medições `ACCEPTED` entram na reanálise. Valores simulados ficam em `src/demo/vital-signs.ts`, nunca são apresentados como físicos e são bloqueados em produção.

Toda aquisição manual, simulada ou física passa pelo contrato conceitual `HardwareGateway`. Componentes, casos de uso e domínio não podem depender de ESP32, fabricante, firmware ou protocolo. Adaptadores normalizam dados brutos antes da fronteira de domínio; somente medições tecnicamente validadas e aceitas chegam ao motor. `ManualVitalSignsAdapter`, `SimulatedHardwareAdapter` e futuro `Esp32HardwareAdapter` obedecem ao mesmo contrato e declaram capacidades opcionais. Origem `SIMULATED_DEVICE` nunca pode ser exibida como `PHYSICAL_DEVICE`. Preserve sessões, tentativas, falhas e mudanças para fallback `MANUAL`; escolha de protocolo exige ADR próprio.

## Depois de alterar arquivos

1. Revise o diff e confirme ausência de dados reais, regra clínica inventada e extrapolação de escopo.
2. Execute os comandos pertinentes já existentes: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:validate`, `pnpm build` e, para validação integral, `pnpm check`.
3. Verifique critérios afetados e cenários demonstrativos.
4. Atualize documentação, critérios e ADR quando uma decisão relevante mudar.
5. Relate arquivos, validações, riscos e pendências sem alegar garantias não verificadas.

## Definição de pronto

Uma mudança está pronta quando é pequena e verificável, cumpre critérios do marco, mantém recomendação e decisão humana separadas, preserva histórico imutável, audita ações relevantes, trata erros e estados vazios, respeita privacidade e acessibilidade e não amplia a V0.

## Checklist de revisão

- [ ] Documentos e ADRs aplicáveis foram consultados e continuam coerentes.
- [ ] Entradas, transições, autorização e falhas estão explícitas.
- [ ] Recomendação é explicável, versionada e não apresentada como diagnóstico.
- [ ] Histórico e `AuditEvent` são preservados; mudanças críticas são atômicas.
- [ ] Nenhum dado pessoal real aparece em código, testes, seed, logs ou imagens.
- [ ] Critérios, testes futuros e demonstração cobrem a alteração.
- [ ] Não há dependência, abstração ou funcionalidade fora do marco.
- [ ] Hardware passa pelo `HardwareGateway`; payload bruto não alcança domínio ou motor.
- [ ] Origem, normalização, tentativa e fallback são rastreáveis sem sobrescrita.
- [ ] Prisma permanece na infraestrutura; domínio e apresentação não importam o client ou tipos gerados.
- [ ] Código server-side está protegido e dados de seed são explicitamente fictícios.

## Instruções de Persistência

- Caso ocorra um erro de limite de tokens (Rate Limit / Token Exhaustion) ou a execução do `/goal` seja interrompida, salve o estado atual do progresso, os arquivos modificados e os próximos passos pendentes em um arquivo temporário chamado `.codex_state.json`.
- Assim que uma nova sessão ou mensagem agendada interagir com este chat, leia o `.codex_state.json` e execute novamente o comando `/goal` para retomar o trabalho exatamente de onde parou.
