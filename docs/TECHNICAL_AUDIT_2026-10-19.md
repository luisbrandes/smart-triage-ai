# Auditoria técnica incremental — 2026-10-19

> Historical snapshot: sections A-J record the initial audit state. The consolidated follow-up below supersedes their outdated pending/status statements.

## A. Resultado geral

**Funcional com pendências.** A implementação passou lint, typecheck, testes unitários, validação Prisma, integração PostgreSQL local e build de produção. Isso confirma os caminhos cobertos pelos testes, mas não certifica segurança operacional nem prontidão para produção. Rate limiting, identidade profissional real, auditoria integral de transições, revisão clínica/jurídica e validações em hardware e serviços externos continuam pendentes.

## B. Arquitetura e fluxos revisados

O repositório usa Next.js App Router, TypeScript, Prisma/PostgreSQL e monólito modular. A inspeção abrangeu `src/app`, `src/server`, `src/domain`, `src/demo`, schema/migrations, scripts e documentação de arquitetura, engenharia, segurança, hardware e IA.

- Paciente: intake, consentimento, identificação, anamnese, sinais vitais, análise e retomada usam camadas de aplicação e persistência server-side. Os testes automatizados existentes cobrem partes desses fluxos, não uma jornada E2E em navegador.
- Hardware: as rotas de sessão e ingestão foram revisadas; payloads agora têm limite de 16 KiB antes de parse. Autenticação, validação de dispositivo e consistência são cobertas em código/testes existentes, mas não houve teste com ESP32 físico. Origem e protocolo precisam de validação no firmware.
- Enfermagem: sessão profissional, fila, detalhe e ações foram revisadas. A recomendação automática permanece separada da revisão humana. Concorrência de geração da sugestão recebeu teste de integração.
- Banco: schema e migration foram validados e aplicados somente no banco PostgreSQL de teste local, isolado em loopback. Não houve conexão ou escrita em banco remoto.
- Deploy: configuração de build e headers foi inspecionada; não houve acesso à Vercel nem deploy.

## C. Problemas encontrados e correções

| Gravidade | Problema e causa | Correção | Evidência |
|---|---|---|---|
| Alta | Requisições JSON sem limite permitiam alocação/parse desproporcional nos endpoints de leitura e sessão do dispositivo. | Leitor de stream com limite de 16 KiB e respostas 413/400. | Testes unitários de limite declarado, stream, JSON inválido; lint, typecheck, integração e build. |
| Alta | Chamadas concorrentes para gerar sugestão podiam executar chamadas externas duplicadas antes da restrição de persistência. | Claim persistente `PENDING`, token de claim, recuperação após expiração e rejeição de gravação por worker antigo; migration aditiva. | Teste PostgreSQL concorrente: uma chamada mockada e um registro. |
| Alta | Falhas ao consultar contexto/persistir sugestão podiam sair do fluxo sem resultado controlado. | Erros são convertidos em estados persistentes/resultado seguro e log sanitizado; a revisão profissional continua independente. | Testes unitários de falha do repositório/provedor; integração AI. |
| Alta | Scripts de limpeza/simulação aceitavam confirmação sem proteger contra banco de produção ou destino remoto. | Verificação obrigatória de `APP_MODE=demo`, bloqueio de ambiente de produção e destino PostgreSQL loopback. | 5 testes do helper; os scripts destrutivos não foram executados. |
| Média | Sessão de hardware expirada podia ser cancelada durante uma leitura sem conferir ownership e sem evento de auditoria. | Atualização restrita por triagem e evento `DEVICE_COLLECTION_EXPIRED` na mesma transação. | Typecheck/build e suíte de integração PostgreSQL passaram; não existe teste direcionado novo para essa expiração. |
| Baixa | Dois imports sem uso no fluxo de coleta. | Imports removidos. | ESLint sem avisos. |
| Alta (dependências) | Next 16.2.10 e React 19.2.7 estavam em intervalos vulneráveis a avisos críticos publicados em 2026. | Next fixado em 16.4.1; React e React DOM em 19.2.9; lockfile atualizado. | Build local bem-sucedido. O advisory de `use cache` declara Next <=16.4.0 vulnerável e 16.4.1 corrigido: [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr). |

Também foi encontrado advisory de execução remota no otimizador de imagens corrigido a partir de Next 16.4.1: [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw). Um patch 16.4.2 foi tentado, mas o pnpm interrompeu o comando porque não conseguiu verificar a assinatura/obter metadados do registry; a dependência permaneceu em 16.4.1.

## D. Segurança

Foram examinadas sessões assinadas, autorização das actions de enfermagem, tokens de dispositivo, limites de entrada, headers, logging sanitizado, scripts de banco e uso de Prisma parametrizado. O build aplica `nosniff`, `DENY`, `no-referrer` e `Permissions-Policy`.

A identidade corporativa de enfermagem permanece pendente (DEMO_NURSE e demonstracao); rate limiting distribuido foi implementado, enquanto confianca de proxy/headers e auditoria integral de transicoes precisam de verificacao operacional.

Audit online do pnpm inicialmente falhou por egress/registry do sandbox. Reexecutado com rede liberada e assinatura ativa: 44 advisories iniciais; apos correcoes focadas restou 1 advisory high sem versao corrigida, documentado no acompanhamento abaixo.

## E. IA e hardware

Groq é chamado apenas server-side com chave não pública, timeout, parsing/validação e persistência separada da classificação oficial. O claim persistente cobre concorrência e recuperação. Falhas externas retornam indisponibilidade sem bloquear a revisão humana.

Foi executada chamada real ao Groq com fixture sintetica e PostgreSQL local isolado. O sandbox falhava com EACCES; com egress liberado, o smoke retornou SAVED/COMPLETED e a sugestao foi recuperada no painel. A chave nao foi impressa. O logger distingue causas de rede seguras. Prompt injection, minimizacao de conteudo e governanca do fornecedor ainda exigem revisao antes de quaisquer dados reais.

O contrato HTTP foi revisado e as rotas foram protegidas contra corpos JSON ilimitados. Nenhum ESP32 físico foi conectado; calibração, autenticidade real do dispositivo, perda de rede e contrato do firmware não foram validados no equipamento.

## F. Performance e qualidade

Não foi executado teste de carga. O timeout do Groq e a proteção contra chamadas concorrentes evitam repetição externa na mesma análise. Fila e detalhes históricos sem paginação/limites são riscos de crescimento descritos no plano do Marco 10, não gargalos medidos nesta auditoria.

## G. Testes e verificações

- `node_modules\\.bin\\eslint.cmd .` — passou, sem avisos.
- `node_modules\\.bin\\tsc.cmd --noEmit` — passou.
- Unit tests: 33 files, 166 passed.
- `node_modules\\.bin\\prisma.cmd validate` — schema válido.
- Local migrations: 13 applied; schema up to date.
- `vitest run --config vitest.integration.config.ts` com PostgreSQL local isolado ? 5 arquivos, 15 testes passaram.
- `node_modules\\.bin\\next.cmd build` — build de produção passou.
- `git diff --check` — passou; Git mostrou somente avisos de conversão LF/CRLF.
- `pnpm audit --json` ? concluido com assinatura ativa; apos atualizacoes direcionadas, 1 advisory high restante em braces@3.0.3, sem versao corrigida publicada.
- `pnpm check` — não concluído porque o pnpm tentou reinstalar a versão fixada e falhou na verificação de assinatura/registry. As etapas equivalentes foram executadas diretamente nos binários locais, incluindo build.
- Browser E2E, physical device, and remote deployment were not tested. Real Groq smoke passed with synthetic local data.

## H. Arquivos alterados nesta auditoria

As mudanças de código/documentação cobrem: configuração e lockfile de dependências; Docker Compose e instruções do banco de teste; migration/schema/generated Prisma da claim AI; tratamento AI e sua tela/action; limites JSON nas quatro rotas de dispositivo; proteção e testes dos scripts de limpeza/simulação; repository de sessões de hardware; remoção de imports não usados; testes unitários e de integração; e este relatório.

O estado Git também contém alterações preexistentes, preservadas, em README, ADRs, helper de deploy de teste e seus testes. Os arquivos de cache `.pnpm-store/v11/index.db-shm` e `index.db-wal` já estavam removidos antes das mudanças desta auditoria e foram deixados como encontrados. O build gerou uma linha de referência em `next-env.d.ts`; ela é gerada pelo Next e não altera a aplicação.

## I. Pendências por dependência

- **Security:** distributed rate limiting is implemented; proxy/IP trust, broader concurrency coverage, and transition audit coverage remain operational follow-ups.
- **Dependencies:** monitor the single braces advisory with no published patch; rerun audit after upstream updates.
- **Banco:** somente `TEST_DATABASE_URL` local foi exercitada; configurar e provar segregação, backup, retenção e permissões do banco do ambiente-alvo fora desta auditoria.
- **Hardware físico:** testar firmware/ESP32, calibração, autenticação, relógio, retentativas e desconexões em bancada controlada.
- **Credenciais externas:** chamada real ao Groq depende de chave de teste válida, limites e autorização/consentimento apropriados.
- **Vercel/produção:** headers/proxy, variáveis, migrations e políticas do ambiente devem ser revisadas separadamente; não houve acesso nem mudança.
- **Clínica/jurídica/organizacional:** validar regras demo antes de qualquer uso além da demonstração; revisar consentimento, retenção, fornecedor externo e obrigações organizacionais/jurídicas. Esta revisão não declara conformidade LGPD.

## J. Parecer final

1. Os caminhos cobertos estão consistentes segundo código e testes executados; nem todos os fluxos foram exercitados de ponta a ponta.
2. Distributed rate limiting is implemented. Real institutional identity, proxy verification, one unpatched advisory, browser E2E, hardware validation, and clinical/legal review remain pending.
3. Foram implementados limites de corpo, claim concorrente de sugestão AI, proteção local de scripts de dados, auditoria/ownership em expiração de sessão e ajustes de dependências.
4. Real Groq smoke passed locally. Physical ESP32, browser E2E, Vercel/production, load, and complete transitive advisory review were not verified; one unpatched advisory remains.
5. É razoável avançar com testes controlados locais/de bancada usando apenas dados fictícios, monitorando os riscos acima. Isso não equivale a liberação clínica.
6. Before production, complete institutional identity, proxy verification, monitor/fix the residual advisory, run E2E, validate hardware, and complete clinical/legal/organizational review.


## Acompanhamento consolidado: auditoria e continuidade da identificacao (2026-10-19)

### Identidade e autorizacao profissional

As rotas e Server Actions de enfermagem validam sessao HMAC; o ator de auditoria vem da sessao assinada. A credencial e compartilhada e demonstrativa, sem IdP, contas individuais, SSO ou RBAC de producao. A emissao e validacao da sessao demo agora falha fechada fora de APP_MODE=demo. Isso nao e identidade profissional real e bloqueia uso de producao.

### Rate limiting distribuido

Implementado com upsert atomico no PostgreSQL, janelas fixas, identificador opaco por hash SHA-256, limpeza oportunista de buckets antigos e falha fechada quando o banco esta indisponivel. Cobre login paciente/enfermagem, endpoints de dispositivo e leituras, sessoes de triagem, mutacoes da enfermagem e geracao Groq. APIs retornam 429 e Retry-After. Todas as instancias precisam compartilhar PostgreSQL. A confianca nos headers encaminhados depende de validacao do proxy da plataforma.

Evidencia local: 20 requisicoes concorrentes permitem exatamente 5 na politica testada; janela e hash opaco tambem sao verificados. A migration 20261019000100_distributed_rate_limits foi aplicada somente no banco isolado local.

### Auditoria de dependencias

As primeiras tentativas online falharam porque o sandbox nao alcan?ava o registry/metadata de assinatura. O audit foi concluido depois com verificacao normal de assinatura ativa. Resultado inicial: 44 advisories (1 low, 18 moderate, 25 high, 0 critical) em 610 dependencias.

Correcoes seletivas: eslint-config-next alinhado ao Next 16.4.1; Vitest 4.1.11; Prisma, @prisma/client e @prisma/adapter-pg 7.10.1; e versoes transitivas corrigidas dentro das linhas compativeis, configuradas em pnpm-workspace.yaml. O audit final reporta 1 advisory high em braces@3.0.3, trazido por @next/eslint-plugin-next 16.4.1, sem versao corrigida publicada. Nenhuma verificacao de assinatura foi desativada nem houve override de major. Repetir audit quando upstream publicar correcao.

### Testes E2E

O repositorio nao tinha Playwright/Cypress. docs/E2E_TEST_PLAN.md propoe configuracao minima e matriz de jornada com dados sinteticos. Nenhum E2E de navegador foi instalado ou executado; essa validacao continua pendente.

### Groq e causa de UNAVAILABLE

scripts/groq-local-smoke.ts exige flag explicita, APP_MODE=demo e TEST_DATABASE_URL loopback. Usa fixture sintetica, chama Groq no servidor, persiste e recupera o resultado, sem imprimir a chave. O smoke real autorizado concluiu SAVED/COMPLETED, modelo openai/gpt-oss-120b, e recuperacao no detalhe local da enfermagem. A chave nao foi exibida. O UNAVAILABLE original foi causado pelo bloqueio de egress do sandbox (EACCES); com saida de rede permitida, api.groq.com foi alcancado. O logger agora registra codigos de causa seguros, sem URL, mensagem bruta ou segredo.

### Salvamento de identificacao: evidencia e limites

O runtime Prisma usa DATABASE_URL; prisma.config.ts usa DIRECT_DATABASE_URL para migrations. O salvamento executa transaction.patient.create com criacao aninhada do plano, atualiza patientId da triagem e grava IDENTIFICATION_SAVED na mesma transacao. A Server Action redireciona para consentimento somente apos o caso de uso confirmar persistencia; validacao ou falha de banco retorna erro seguro sem redirecionar.

O P2022 informado significa que uma consulta Prisma esperava coluna ausente/incompativel no schema conectado. O evento original preservava categoria/nome/codigo, nao meta.column; portanto a coluna exata nao e conhecida. Pelo codigo atual, transaction.patient.create e a operacao mais provavel, pois retorna o registro e pode referenciar colunas escalares de Patient. A migration 20261018020000_patient_identification_fields adiciona cpf, phone, email, motherName, legalRepresentativeName e legalRepresentativePhone. A coluna faltante em producao nao foi comprovada. O relato de auditoria fornecido pelo usuario indicava ausencia das colunas e migrations no banco que foi consultado via DATABASE_URL; nesta execucao nao conectei a essa URL compartilhada nem a Vercel.

Como melhoria de diagnostico, P2022 agora registra schemaField somente para esses seis nomes allowlisted de Patient; metadata desconhecida, valores e mensagens brutas continuam omitidos. Testes cobrem allowlist e ausencia de redirecionamento falso.

No PostgreSQL isolado local em 127.0.0.1:5434/smart_triage_test, as seis colunas existem e as duas migrations citadas estao aplicadas. As 13 migrations do repositorio estao aplicadas nesse banco. Testes de integracao verificaram criacao/releitura do paciente, vinculo a triagem, plano sim/nao, evento de auditoria, retry concorrente sem duplicacao e rota seguinte. A releitura retorna consentimento; depois do aceite, retorna anamnese. Isso nao prova que o banco remoto de producao esta migrado nem que houve commit de registro em producao.

A TEST_DATABASE_URL remota configurada nao foi usada. Migration e integracao nesta continuacao usaram somente PostgreSQL em loopback; nenhum banco compartilhado/producao foi modificado. Nao inspecionei nem alterei variaveis Vercel e nao executei migration remota. Continua desconhecido se a migration de producao falhou, nao rodou ou foi aplicada a outro banco logico.

Para validar producao, operador autorizado deve comparar as identidades sanitizadas de banco/schema de DATABASE_URL e DIRECT_DATABASE_URL da Vercel, executar o diagnostico somente leitura contra o destino correto via TRIAGE_DIAGNOSTIC_DATABASE_URL e conferir o ledger. Somente depois de confirmar o destino, seguir o processo aprovado de migration; depois testar fixture ficticia, evento de sucesso, etapa seguinte e continuidade apos refresh. Ate haver essa evidencia, a correcao de producao nao esta estabelecida.

### Evidencia de validacao final

- ESLint passou.
- TypeScript typecheck passou.
- Prisma 7.10.1 generate e validate passaram; status local: 13 migrations aplicadas, nenhuma pendente.
- Testes unitarios: 33 arquivos, 166 testes passaram.
- Integracao PostgreSQL isolada local: 5 arquivos, 15 testes passaram.
- Build de producao local com Next 16.4.1 passou.
- Smoke real Groq passou com dados sinteticos e banco local isolado.
- git diff --check passou.
- Sem commit, push, deploy, alteracao de variaveis Vercel ou migration remota.

### Prontidao para producao

Nao esta pronta para producao. Pendencias: identidade/RBAC institucional real; verificar confianca do proxy/IP; acompanhar o advisory de braces sem patch; executar E2E de navegador; validar ESP32 fisico; concluir revisao clinica/juridica/organizacional; e obter verificacao autorizada/correcao de destino e migrations do banco de producao. O fluxo de identificacao e Groq tem evidencia somente no ambiente local isolado.
