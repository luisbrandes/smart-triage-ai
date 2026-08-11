# Marco 10 — Architecture & Readiness Review e plano de implementação

## Finalidade e conclusão executiva

Este documento é a especificação técnica do Marco 10, baseada exclusivamente no estado do repositório após o Marco 9. A arquitetura-base é adequada para continuar: monólito modular, domínio puro, DTOs explícitos, Prisma isolado e separação conceitual entre recomendação automática e decisão humana. Entretanto, o sistema ainda é uma demonstração insegura para qualquer exposição fora de ambiente controlado.

**Nota arquitetural atual: 7,0/10.** O projeto está preparado para **iniciar** o Marco 10, mas não está preparado para uso clínico, produção, rede compartilhada ou tratamento de dados reais. Os gates obrigatórios são autorização profissional, correção do ciclo de emissão/recoleta, robustez concorrente, auditoria verificável e testes de integração PostgreSQL/Server Actions.

## 1. Estado atual

### Arquitetura

- Monólito modular Next.js App Router, TypeScript estrito, React Server Components por padrão, Tailwind CSS v4, Prisma 7 e PostgreSQL 17.
- Apresentação em `src/app`, componentes em `src/features`/`src/shared`, contratos e casos de uso em `src/server/application`, persistência em repositories server-only e regras puras em `src/domain`.
- Prisma permanece restrito a `src/server/db`, `src/server/repositories`, schema, seed e client gerado. Não há importação Prisma na apresentação ou no domínio.
- Mutações chegam por Server Actions; formulários interativos usam Client Components pequenos. Não há estado global, polling ou WebSocket.

### Domínio

- Máquina de estados pura cobre intake, análise, coleta, revisão, recolha, classificação, encaminhamento, fechamento e cancelamento.
- Recomendação (`AnalysisRecommendation`) e decisão humana (`NurseReview`/`finalHumanPriority`) são entidades distintas.
- Histórico de análises, razões, sessões, medições, revisões, encaminhamentos e auditoria é relacional e usa exclusões `Restrict`.
- Formatação de senha e motor demonstrativo são funções puras. Conteúdo e regras provisórios estão centralizados em `src/demo`.

### Persistência

- Schema Prisma amplo, migrations versionadas, UUIDs, índices básicos e constraints de idempotência para análises e senhas.
- `QueueTicket` garante uma senha por triagem, código público único e sequência única por data operacional.
- `AnalysisRun` usa fingerprint composto; sessões usam tentativa única por triagem; respostas e razões possuem constraints específicas.
- Seed determinístico e fictício existe, mas reflete principalmente a fundação inicial e não representa integralmente os fluxos funcionais dos Marcos 4–9.

### Fluxo do paciente

- Inicia/retoma triagem por cookie `httpOnly` com UUID opaco; registra identificação, plano, consentimento e anamnese.
- Executa análise preliminar demonstrativa; quando requerido, coleta FC/SpO₂ manualmente ou via adaptador simulado.
- Conclui com recomendação assistiva, senha operacional e estado `AWAITING_NURSE_REVIEW`.
- Nova demonstração substitui o cookie sem excluir histórico. Recolha solicitada redireciona o paciente ao fluxo de sinais vitais.

### Fluxo da enfermagem

- Fila server-side lista triagens aguardando revisão e com senha, ordenadas por prioridade demonstrativa e antiguidade.
- Detalhe expõe DTO sanitizado com identificação resumida, anamnese, alertas, análises, medições, tentativas e timeline permitida.
- Confirmação/reclassificação criam `NurseReview`; reclassificação exige justificativa; encaminhamento cria `CareReferral`; recolha altera o estado sem criar sessão antecipadamente.
- A referência profissional é fixa (`DEMO_NURSE`); não há autenticação nem autorização real.

### Motor demonstrativo

- Função determinística, explicável e testada, com rulesets `V0-DEMO-RULESET-001/002` e fingerprint de entrada.
- Regras e limiares são explicitamente fictícios. `APP_MODE=production` bloqueia execução, mas qualquer outro valor, inclusive ausente, permite o motor.
- Análises preliminar e pós-medição são persistidas com recomendação e razões versionadas.

### Hardware simulado

- `HardwareGateway` comum para entrada manual e simulação; adapters mantêm resultados temporariamente em memória.
- Sucesso, falha, timeout e leitura inválida são determinísticos; cada tentativa persistida recebe origem, status, medições/erros e auditoria.
- Não existe dispositivo físico, transporte, autenticação de dispositivo, calibração ou persistência do estado transitório do adapter.

### Auditoria

- `AuditEvent` registra eventos das etapas críticas com ator categórico e metadados sanitizados.
- A timeline profissional usa allowlist e não entrega metadados brutos.
- Não há serviço/política central de auditoria, identidade profissional real, correlação de requisição, detecção de lacunas, proteção append-only no banco ou teste integral da matriz de eventos.

### Testes

- Vitest/Node cobre motor, máquina de estados, validações, casos de uso com fakes, ordenação/DTOs, senha e adapters.
- Estado atual conhecido: 10 arquivos e 64 testes unitários; lint, typecheck, schema, testes e build passaram ao final do Marco 9.
- Não há testes de repository contra PostgreSQL, Server Actions, cookies, autorização, transações reais, concorrência real, renderização, acessibilidade ou fluxo HTTP automatizado.

## 2. Lacunas encontradas

### Críticas

| Lacuna | Evidência atual | Impacto |
|---|---|---|
| Ausência total de autenticação/autorização profissional | Rotas e Server Actions da enfermagem aceitam qualquer visitante; `DEMO_NURSE` é fixo | Leitura e mutação irrestritas de dados sensíveis; decisões podem ser falsamente atribuídas. |
| Sessão do paciente não é vinculada nem assinada | Cookie contém UUID opaco, sem assinatura/rotação e sem identidade de sessão no banco | UUID vazado permite retomada/mutação; não há revogação, expiração de negócio ou segregação entre dispositivos. |
| Reanálise de recolha pode reutilizar execução antiga | Fingerprint pós-sinais vitais não inclui sessão/tentativa; repository retorna análise existente antes de mover o estado | Repetir os mesmos valores pode deixar a triagem em `VITAL_SIGNS_IN_PROGRESS`, sem nova análise histórica e sem retorno à fila. |
| Emissão de senha depende da renderização da página final | `queueTicket.issue` é chamado por Server Component durante leitura | GET/render provoca mutação; triagem que não abre a tela final pode ficar em revisão sem senha e fora da fila. |
| Cobertura de persistência crítica inexistente | Repositories e transações são exercitados apenas indiretamente/manual; testes usam fakes | Constraints, isolamento, retries, auditoria e mapeamentos podem falhar sem detecção. |

### Altas

| Lacuna | Impacto |
|---|---|
| Idempotência de revisão/encaminhamento baseada apenas em estado e equivalência, sem chave explícita/constraint | Proteção depende do isolamento serializável e do comportamento do PostgreSQL; regressões podem duplicar registros. |
| Numeração de tentativa usa `max + 1` sem isolamento serializável/retry seguro | Coletas concorrentes podem colidir em `@@unique([triageId, attemptNumber])` e retornar erro bruto/irrecuperável. |
| `APP_MODE` falha aberto | Configuração ausente ou incorreta habilita regras demonstrativas em ambiente que não deveria executá-las. |
| Auditoria não é append-only tecnicamente | Qualquer código Prisma com acesso pode atualizar/excluir eventos; não há constraint/trigger/papel de banco que imponha imutabilidade. |
| Auditoria é descentralizada | Strings de ação, entidade e metadados são montadas em repositories; nomenclatura e cobertura podem divergir silenciosamente. |
| Motivo de recolha não é preservado | O texto é validado, mas somente `hasReason` entra na auditoria e não existe entidade de solicitação; a razão profissional não pode ser recuperada. |
| Erros operacionais não têm taxonomia comum | Actions capturam exceções amplamente; repositories lançam tipos diferentes; falhas de banco/hardware não possuem correlação ou política uniforme. |
| Dados profissionais permanecem acessíveis por UUID na rota | DTO é minimizado, mas contém anamnese, alergias, medicamentos e condições; sem autorização, o UUID é controle de acesso de fato. |
| Seed está defasado em relação ao fluxo atual | Cenários podem ter triagem sem anamnese, recomendação ou senha coerente; demonstrações e testes manuais geram falsos diagnósticos de erro. |

### Médias

- Validação de UUID nas Server Actions usa expressão permissiva (`[0-9a-f-]{36}`), não UUID canônico.
- Não há limite de taxa, proteção contra automação, limite de tentativas de formulário ou política antiabuso.
- `next.config.ts` não define headers de segurança; CSP, frame protection e políticas explícitas de conteúdo/referrer não foram avaliadas.
- Não há página/limite de recuperação para indisponibilidade de banco; Server Components podem produzir erro 500 genérico.
- Fila carrega todos os registros elegíveis e ordena em memória; não há paginação, limite ou estratégia para crescimento.
- Adapters guardam resultados em `Map` de processo sem limpeza após leitura; estado não é compartilhado entre instâncias e pode crescer durante processo longo.
- `CareReferral.notes`, justificativa e campos clínicos não possuem classificação/retention policy implementada.
- Não há registro auditável de visualização profissional, apesar de a documentação de segurança prever acesso relevante.
- Não há correlação entre uma solicitação de recolha e a sessão/análise gerada depois; usa-se somente ordem temporal.
- `completedAt` da triagem não é atualizado nos marcos concluídos; semântica do campo permanece indefinida.
- Estados e enums são duplicados entre Prisma, domínio e DTOs, mantidos manualmente.
- Alguns critérios antigos permanecem historicamente marcados com afirmações que já não descrevem o estado atual, reduzindo confiabilidade documental.

## 3. Escopo recomendado para o Marco 10

### Obrigatório

1. **Autorização demonstrativa segura:** definir sessão separada para enfermagem, papel explícito, proteção de todas as páginas/Server Actions e identidade de ator derivada do contexto autorizado, nunca de constante ou input do cliente.
2. **Segregação do paciente:** assinar/vincular a sessão opaca, validar posse em toda mutation, definir expiração/revogação e impedir uso do cookie do paciente como acesso profissional.
3. **Corrigir atomicidade do ingresso na fila:** emitir senha na mesma operação que leva a `AWAITING_NURSE_REVIEW`, ou em orquestração transacional equivalente; renderização deve ser somente leitura.
4. **Corrigir semântica de recolha:** cada solicitação deve ser persistida; cada sessão/análise deve referenciar o ciclo correto; uma recolha idêntica deve criar nova análise ou concluir idempotentemente o novo ciclo sem travar estado.
5. **Endurecer concorrência:** revisar `max + 1`, decisões, encaminhamentos, análises e senhas; adicionar constraints/chaves idempotentes e retries seguros onde a regra não estiver protegida pelo banco.
6. **Centralizar contrato de auditoria:** catálogo tipado de eventos/metadados, matriz ator/ação/estado, correlação, política de minimização e escrita atômica; impedir update/delete de `AuditEvent` no caminho de aplicação.
7. **Taxonomia e recuperação de erros:** erros seguros por categoria, boundary para indisponibilidade, mensagens previsíveis, correlação server-side e ausência de detalhes Prisma/PII em resposta/log.
8. **Testes de integração PostgreSQL:** repositories, constraints, rollback, idempotência, concorrência, auditoria e ciclos completos com banco isolado e determinístico.
9. **Testes de autorização e Server Actions:** acesso anônimo, papel incorreto, UUID alheio, payload inválido, reenvio, conflito e CSRF/origin conforme garantias do framework.
10. **Fail-closed de modo demo e configuração:** validar ambiente na inicialização; regras/simulação devem operar somente em modo explicitamente permitido.
11. **Atualizar seed/fixtures do Marco 9:** cenários coerentes, exclusivamente fictícios, reproduzíveis e cobrindo sem sensores, com sensores, reclassificação, recolha e encaminhamento.
12. **Definir limites de dados:** tamanho, retenção, classificação e exposição de justificativa, motivo, observação, documento demonstrativo e snapshots sanitizados.

### Desejável

- Paginação/limite server-side da fila e ordenação no PostgreSQL com regra determinística equivalente.
- Registro minimizado de visualizações profissionais relevantes.
- Headers de segurança e CSP compatíveis com Next.js, após inventário de recursos.
- Health/readiness check local e tratamento visual de banco indisponível.
- IDs/correlation IDs em logs técnicos sem PII; métricas de erro, latência e conflito sem conteúdo clínico.
- Limpeza determinística dos `Map` dos adapters e testes de ciclo de vida.
- Refatoração do repository de enfermagem em projeção e mutação separadas, sem introduzir repository genérico.
- Formatação dos arquivos de maior densidade e extração de mapeadores puros testáveis.
- Testes de acessibilidade/teclado e estados pending/error/success das ações críticas.

### Fora do escopo

- Protocolo clínico validado, IA/ML, diagnóstico, prescrição ou automação de decisão final.
- Autenticação institucional completa, SSO, diretório hospitalar ou certificação regulatória; o Marco 10 deve criar controle demonstrativo seguro e fronteiras evolutivas.
- Hardware físico, firmware, ESP32, Bluetooth, serial, MQTT ou calibração.
- Prontuário, atendimento médico, leitos, faturamento, operadoras ou encerramento clínico completo.
- WebSocket, filas distribuídas, microsserviços, event sourcing, data warehouse ou analytics avançados.
- Alegação de conformidade LGPD, certificação, disponibilidade ou segurança de produção.

## 4. Revisão arquitetural

### Excesso de abstração

Não há excesso sistêmico. Interfaces de repository e gateway são pequenas e motivadas por testes/fronteiras. Os arquivos de composição (`patientIntake`, `nursing`, `vitalSigns`) são úteis. A maior abstração questionável é a duplicação de contratos de query/mutation da enfermagem usando a mesma implementação concreta; é aceitável agora, mas o nome `PrismaNursingQueueRepository` deixou de representar suas responsabilidades após receber mutations.

### Acoplamento e responsabilidades

- Casos de uso de intake/análise/nursing são finos; regras de estado, idempotência, auditoria e transação vivem majoritariamente nos repositories. Isso torna persistência responsável por orquestração de aplicação e dificulta testar regras sem banco.
- `PrismaNursingQueueRepository` combina projeção pesada, quatro comandos, retry transacional, auditoria e mapeamento. Deve ser separado por capacidade (consulta e workflow), mantendo contratos específicos.
- `PrismaVitalSignsRepository` combina aquisição histórica e reanálise, incluindo montagem de input do motor. A correção do ciclo de recolha deve extrair uma unidade de orquestração clara, sem criar camadas genéricas.
- Emissão de senha no Server Component viola semântica de leitura e acopla conclusão operacional à navegação.

### Coerência dos repositories

São orientados a caso de uso, não CRUD genérico, o que é positivo. Porém há inconsistência: alguns repositories encapsulam toda a transação/regra, enquanto o caso de uso apenas valida; outros calculam fingerprint/evaluam fora e persistem dentro. O Marco 10 deve fixar um padrão: caso de uso orquestra e repository oferece operação atômica específica, ou repository transacional recebe uma decisão já validada — sem duplicar máquina de estados.

### Server Actions

Continuam pequenas e não importam Prisma. Pontos a corrigir: autorização deve ser a primeira operação; validação de ID deve ser canônica/central; tratamento de erro deve preservar categorias seguras; o helper de nursing não pode transformar falhas inesperadas em sucesso aparente nem depender somente de revalidação implícita.

### Pureza do domínio e localização

`src/domain` continua puro. Não há Prisma/React/Next nele. Entretanto, invariantes importantes (idempotência de revisão, vínculo recolha-sessão-análise, ingresso na fila) não estão representadas por conceitos de domínio e aparecem como condições ad hoc em repositories. Não há código evidentemente em diretório proibido, mas mapeadores de DTO/timeline e política de auditoria merecem módulos próprios server-side ou puros.

### Duplicação e manutenção

- Prioridades/status aparecem em domínio, Prisma, DTOs e apresentação; casts mascaram divergência.
- Formatação de datas/status/origens é distribuída.
- Auditoria repete objetos literais extensos em todos os repositories.
- Repositories e páginas de detalhe possuem linhas muito longas e múltiplas responsabilidades, reduzindo revisabilidade.
- Fakes de teste reproduzem comportamento ideal e não validam a implementação Prisma real.

## 5. Segurança

### Cookies

- Positivo: `httpOnly`, `sameSite=strict`, `secure` em produção, path global, somente UUID.
- Lacunas: sem assinatura/vínculo server-side, rotação, revogação, versão, contexto de demo, proteção contra fixação ou regra de expiração de negócio. `maxAge` de oito horas é apenas expiração técnica.

### Server Actions e autorização

- Inputs clínicos/profissionais passam por Zod; actions não acessam Prisma diretamente.
- Não existe autenticação/autorização em nenhuma action profissional. Conhecer um UUID permite operar a triagem.
- Não há rate limiting nem confirmação forte para ações irreversíveis. A proteção de origem nativa do Next.js não substitui autorização e deve ser verificada por teste/configuração.

### Exposição, DTOs e logs

- DTOs da fila são mínimos; detalhe seleciona campos explícitos e omite documento, fingerprints, snapshots e metadados brutos.
- O detalhe ainda contém dados sensíveis e está público. Justificativas/notas profissionais são exibidas sem política de acesso.
- Não há logger de aplicação; erros inesperados podem cair no logging padrão do Next/Prisma sem redaction/correlação comprovadas.

### Prisma, transações e concorrência

- Positivo: conexão server-only, relações `Restrict`, transações para mudanças críticas, serializable em senha e nursing, constraints relevantes.
- Lacunas: aquisição de sinais vitais não usa isolamento/retry; auditoria não é tecnicamente imutável; não há constraint explícita para uma decisão vigente ou encaminhamento ativo; retries não são testados em PostgreSQL; upsert de ruleset da análise final ocorre fora da transação principal.

### Tratamento de erros

- Mensagens de formulário são majoritariamente seguras.
- Ausência de error boundaries e taxonomia comum; banco indisponível gera 500; erros de repository podem ser engolidos em mensagem genérica sem observabilidade; erros de adapter usam `Error` genérico.

## 6. Performance

- Não foi encontrado N+1 clássico nas páginas: fila e detalhe usam consultas Prisma com relações selecionadas em uma chamada por projeção; página final realiza consultas adicionais sequenciais para sessão, análises e senha.
- Fila busca todos os elegíveis, inclui respostas/sessões e ordena em memória. O custo cresce linearmente e `collectionSessions`/`answers` podem ampliar payload. Prioridade + instante deveria ser projetável/ordenável no banco ou limitada por paginação.
- Detalhe faz uma consulta relacional ampla com todos os `AnalysisRun`, tentativas, medições e eventos permitidos. É aceitável para V0, mas sem paginação/limite histórico pode ficar pesado.
- Índices existentes ajudam estado/data, relações e históricos. Falta avaliar índice composto alinhado à fila (`status`, prioridade, entrada) e consultas de eventos/análises por tipo/status/tempo.
- Indicadores são calculados sobre a mesma lista completa, evitando queries extras, mas exigem carregar DTOs detalhados de toda a fila.
- Server Components reduzem JavaScript cliente. Client Components são limitados a formulários; o painel de decisão contém quatro `useActionState`, custo aceitável.
- `next/font` depende de fetch/cache de Google Fonts no build, já causando falha em ambiente de rede restrita; isso é risco de reprodutibilidade, não de runtime.

## 7. Qualidade do código

### Pontos fortes

- Nomes de módulos e casos de uso expressivos; fronteiras principais fáceis de localizar.
- TypeScript estrito, Zod nas entradas, funções puras para regras sensíveis e dependências pequenas.
- Separação clínica correta: recomendação, revisão e encaminhamento não são fundidos.
- Conteúdo demonstrativo rotulado e centralizado; ausência de abstrações genéricas prematuras.

### Pontos a melhorar

- Arquivos Prisma e páginas possuem alta densidade, linhas extensas e lógica de mapeamento embutida.
- Repositories acumulam política de aplicação, persistência, auditoria, idempotência e DTO mapping.
- Nomenclatura ficou defasada (`PrismaNursingQueueRepository` também executa workflow).
- Casts de enum/status substituem validação exaustiva em alguns mapeamentos.
- Tratamento de erro e resultado não segue um padrão comum entre módulos.
- Timeline depende de strings livres; ações de auditoria não têm união tipada central.
- Campos e modelos planejados mas ainda não usados aumentam superfície cognitiva (`RedFlagOccurrence`, estados de dispositivo, vários status futuros).
- Testes muito compactados em linhas únicas reduzem clareza e dificultam diagnóstico.

## 8. Cobertura de testes

### Coberto atualmente

- Transições puras e estados terminais.
- Cenários determinísticos do motor e regras com sinais vitais.
- Validação do intake e mutações da enfermagem com spies/fakes.
- Idempotência conceitual de análise/senha em memória.
- Ordenação e forma dos DTOs da enfermagem.
- Contratos básicos dos adapters manual/simulado.

### Ausente ou insuficiente

1. **P0:** repositories Prisma com banco real: transações, constraints, rollback e auditoria.
2. **P0:** concorrência real: duas classificações, duas senhas, duas tentativas, análise repetida e encaminhamento concorrente.
3. **P0:** ciclo de recolha com valores iguais e diferentes, garantindo nova análise e retorno à fila.
4. **P0:** autorização de páginas e Server Actions; cookie adulterado/expirado; acesso cruzado.
5. **P0:** matriz de auditoria e ausência de PII/texto clínico nos metadados/logs.
6. **P1:** Server Actions com FormData inválido, conflitos e indisponibilidade de banco.
7. **P1:** fluxos HTTP completos do paciente e enfermagem, incluindo idempotência por reload/reenvio.
8. **P1:** seed/reset idempotente após Marcos 4–9.
9. **P1:** componentes críticos: disabled/pending/error/success, teclado e acessibilidade.
10. **P2:** performance de fila/detalhe com volume e histórico longo; lifecycle/memória dos adapters.

Os testes existentes validam desenho e regras puras, mas não sustentam ainda as alegações de atomicidade, concorrência ou segurança do sistema integrado.

## 9. Checklist contratual do Marco 10

### Segurança e acesso

- [ ] Definir ameaça e matriz de atores/recursos/ações da V0 demonstrativa.
- [ ] Proteger todas as rotas e Server Actions da enfermagem com sessão/papel demonstrativo server-side.
- [ ] Derivar `actorReference` do contexto autorizado; remover identidade profissional fixa do workflow.
- [ ] Vincular, assinar e validar a sessão do paciente em toda leitura/mutação.
- [ ] Implementar expiração, revogação e rotação da sessão demonstrativa.
- [ ] Validar UUIDs canonicamente e rejeitar acesso cruzado com resposta segura.
- [ ] Verificar proteção de origem/CSRF das Server Actions e adicionar testes negativos.
- [ ] Definir rate limiting/antiabuso mínimo para início de triagem e mutations.
- [ ] Definir e testar headers de segurança adequados ao runtime.

### Workflow, transações e concorrência

- [ ] Remover mutação de emissão de senha do caminho de renderização/GET.
- [ ] Tornar ingresso em `AWAITING_NURSE_REVIEW`, emissão de senha e auditoria atomicamente coerentes.
- [ ] Persistir solicitação de recolha com motivo protegido e vínculo explícito ao novo ciclo.
- [ ] Garantir nova análise para cada recolha, inclusive com medições idênticas.
- [ ] Garantir que análise idempotente nunca deixe triagem em estado intermediário.
- [ ] Endurecer numeração concorrente de tentativas com constraint + retry/estratégia atômica.
- [ ] Revisar constraints para decisão e encaminhamento equivalentes/ativos.
- [ ] Padronizar retries serializáveis e tradução de conflitos para erro seguro.
- [ ] Garantir por teste que nenhum erro parcial cria estado sem auditoria ou histórico correspondente.

### Auditoria, privacidade e observabilidade

- [ ] Criar catálogo tipado de eventos, atores e schemas de metadados permitidos.
- [ ] Completar matriz de auditoria dos fluxos M4–M9, incluindo acessos profissionais definidos como relevantes.
- [ ] Impedir update/delete de auditoria no caminho normal e testar imutabilidade.
- [ ] Adicionar correlação técnica sem PII entre request, mutation e erro.
- [ ] Implementar logging estruturado/redaction com proibição testável de dados clínicos, documentos, cookies e FormData.
- [ ] Definir política para justificativa, motivo, observação, snapshots e referências demonstrativas.
- [ ] Tratar indisponibilidade de banco/hardware com estados recuperáveis e mensagens seguras.
- [ ] Validar configuração em startup e tornar `APP_MODE` fail-closed.

### Arquitetura e qualidade

- [ ] Separar projeção e workflow do repository da enfermagem mantendo contratos específicos.
- [ ] Extrair mapeadores/allowlists de DTO e auditoria para unidades testáveis.
- [ ] Definir padrão único de responsabilidade entre caso de uso e repository transacional.
- [ ] Reduzir casts de enums/status com mapeamentos exaustivos.
- [ ] Padronizar erros/resultados de aplicação e boundaries de apresentação.
- [ ] Atualizar seed/fixtures para os estados e invariantes dos Marcos 4–9.
- [ ] Preservar domínio puro e impedir imports Prisma fora da infraestrutura por verificação automatizada.

### Performance e operação

- [ ] Definir limite/paginação da fila e ordenar no servidor/banco sem divergência da regra V0.
- [ ] Avaliar índices com `EXPLAIN` para fila, detalhe, análises e timeline.
- [ ] Limitar ou paginar históricos extensos no detalhe sem perder acesso ao histórico.
- [ ] Eliminar dependência de rede não controlada do build ou documentar/cachear de forma reproduzível.
- [ ] Definir health/readiness e procedimento de recuperação local.

### Testes e evidências

- [ ] Criar harness PostgreSQL isolado e reproduzível para testes de integração.
- [ ] Testar todos os repositories críticos e rollback transacional.
- [ ] Testar concorrência real para senha, análise, tentativa, revisão e encaminhamento.
- [ ] Testar autorização, sessão, CSRF/origin, payloads inválidos e acesso cruzado.
- [ ] Testar matriz de auditoria e sanitização de logs/metadados.
- [ ] Testar fluxo completo sem sinais vitais, com sinais vitais, reclassificação, recolha e encaminhamento.
- [ ] Testar estado vazio, indisponibilidade, retry, retomada e conflito na UI.
- [ ] Executar lint, typecheck, testes, `db:validate`, migration em banco limpo, seed repetido, build e `check`.
- [ ] Registrar evidências reproduzíveis sem usar dados reais nem alegar segurança/conformidade não demonstrada.

## 10. Maiores riscos antes da continuidade

1. **Acesso profissional anônimo:** risco máximo de confidencialidade e integridade; bloqueia qualquer exposição do sistema.
2. **Ciclo de recolha/idempotência incorreto:** valores repetidos podem impedir nova análise e travar o workflow, comprometendo histórico e fila.
3. **Ingresso na fila dependente de UI:** a persistência operacional varia conforme o paciente abre uma página, produzindo triagens invisíveis.
4. **Confiança excessiva em testes unitários com fakes:** atomicidade, constraints e concorrência declaradas ainda não têm prova automatizada real.
5. **Auditoria sem identidade e imutabilidade fortes:** eventos não sustentam atribuição profissional nem garantia append-only.
6. **Concorrência heterogênea:** alguns fluxos são serializáveis, outros usam `max + 1` ou idempotência ad hoc; conflitos podem gerar estados incompletos ou erros 500.
7. **Modo demonstrativo fail-open:** configuração incorreta pode habilitar regras fictícias onde deveriam estar bloqueadas.
8. **Privacidade operacional indefinida:** retenção, logs, justificativas, notas, snapshots e acesso não possuem controles implementados.
9. **Seed/documentação divergentes do runtime atual:** reduz repetibilidade e pode ocultar regressões durante demonstração.
10. **Escalabilidade da projeção:** fila e detalhe não possuem limites; crescimento do histórico aumenta latência e exposição por resposta.

## Gate de início e definição de pronto

### Status de execução

- **Implementado:** sessões separadas e assinadas; autorização de rotas/actions profissionais; ator derivado da sessão; modo demo fail-closed; fingerprint contextual de sessão/tentativa; emissão de senha fora da renderização e dentro das transações de análise; auditoria append-only; logger sanitizado; harness `TEST_DATABASE_URL`; teste concorrente inicial de senha.
- **Parcialmente implementado:** matriz completa de auditoria, taxonomia uniforme de erros, cobertura PostgreSQL de todos os 15 fluxos e paginação da fila. O harness recusou execução sem `TEST_DATABASE_URL`; a evidência real permanece pendente porque o Docker local estava indisponível.
- **Adiado:** identidade corporativa, correlação persistida por operação, rate limiting, health endpoint e expansão integral do seed; devem preceder qualquer exposição além de demonstração controlada.
- **Rejeitado por excesso de complexidade:** barramento interno genérico, outbox, tracing distribuído, CQRS, views materializadas e workflow configurável.

O Marco 10 pode começar imediatamente usando a checklist acima. A ordem recomendada é: (1) harness de integração e ameaça/autorização; (2) correções críticas de fila/recolha; (3) concorrência/auditoria; (4) erro/log/privacidade; (5) performance, seed e QA.

O Marco 10 só estará concluído quando todos os itens obrigatórios estiverem implementados e demonstrados por testes com PostgreSQL real, acesso não autorizado estiver bloqueado, os ciclos de senha/recolha forem atomicamente corretos, auditoria estiver completa e sanitizada, e nenhuma alegação ultrapassar o caráter demonstrativo do produto.
