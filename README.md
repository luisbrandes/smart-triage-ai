# Smart Triage

Smart Triage é uma aplicação web experimental de apoio à coleta inicial em pronto atendimento, UPA ou hospital. Organiza identificação, consentimento, anamnese e sinais vitais; gera uma recomendação preliminar explicável; e entrega a triagem à revisão da enfermagem.

O problema abordado é a coleta inicial fragmentada e a pouca rastreabilidade entre dados, recomendação automática e decisão profissional. O produto terá dois painéis integrados: um fluxo responsivo para paciente em tablet ou totem e uma fila de trabalho para enfermagem.

## Fluxo resumido

O paciente se identifica, informa plano de saúde, aceita o termo vigente, responde à anamnese e recebe uma análise demonstrativa. Conforme regras explícitas, informa ou simula frequência cardíaca e SpO₂; o sistema reavalia, gera uma senha e envia a triagem à fila. A enfermagem consulta dados e histórico, confirma ou reclassifica a prioridade, pode solicitar nova coleta e encaminha o paciente ao atendimento.

A recomendação não é diagnóstico, prescrição, protocolo clínico validado nem decisão autônoma. A classificação final pertence ao profissional autorizado e permanece separada da recomendação do sistema.

## Stack planejada e status

Os Marcos 1 a 10 estão concluídos para demonstração controlada. Sessões assinadas separam paciente e enfermagem; ações profissionais usam ator autenticado; senha é emitida na transação de conclusão; recoleta idêntica gera nova análise por sessão; auditoria é append-only no PostgreSQL. Não existe identidade corporativa, hardware físico, prontuário ou autorização para uso clínico.

### Execução local

Requer Node.js compatível com a versão instalada do Next.js e pnpm indicado em `package.json`.

```bash
pnpm install
pnpm dev
```

Validação dos marcos concluídos:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm check
pnpm test:integration
```

Para integração, configure `TEST_DATABASE_URL`, execute `pnpm db:test:up`, `pnpm db:test:deploy` e então `pnpm test:integration`. A trava da suíte rejeita banco ausente, não identificado como teste ou igual ao desenvolvimento.

### Banco local

Copie a configuração local de `.env.example` para um `.env` não versionado e execute:

```bash
pnpm db:up
pnpm db:deploy
pnpm db:seed
```

Use `pnpm db:down` para encerrar o serviço. As credenciais documentadas são exclusivas para desenvolvimento local.

## Entrada HTTP de leituras de dispositivo

A prova de conceito expõe `POST /api/readings` para receber JSON de um dispositivo previamente cadastrado. O payload atual contém `deviceId`, `bpm`, `spo2` e `temperatura`, com `sessionId` opcional. As rotas `POST /api/triage/session/start`, `/cancel` e `/release` controlam a sessão técnica do totem; `GET /api/triage/session/[sessionId]` fornece ao frontend uma projeção sanitizada da sessão e das leituras. Nenhuma delas cria triagem, executa análise ou toma decisão clínica. O contrato HTTP completo para o firmware está em `docs/ESP32_API_CONTRACT.md`. Em desenvolvimento, após `pnpm db:seed`, o dispositivo fictício `ESP32-001` está disponível. As decisões vigentes estão nos ADRs 0019 e 0020.

O painel do paciente usa `/paciente/coleta` para iniciar e acompanhar a coleta física por polling simples. Após confirmação explícita, a leitura técnica selecionada pode ser aceita na triagem como FC e SpO₂ com origem física; temperatura permanece técnica. O fluxo está em `docs/FRONTEND_HARDWARE_COLLECTION.md` e a decisão no ADR 0021.

Para homologação remota, o ESP32 usa HTTPS com token individual e consulta `GET /api/device/session/current` para descobrir a sessão criada pelo site. Configuração da Vercel, provisionamento e contrato do firmware estão em `docs/VERCEL_REMOTE_HARDWARE_SETUP.md`, `docs/ESP32_API_CONTRACT.md` e `docs/ESP32_FIRMWARE_IMPLEMENTATION_PROMPT.md`.

## Fronteira de hardware

Sinais vitais vinculados à triagem são obtidos por um `HardwareGateway` comum. Na V0, ele terá conceitualmente um adaptador de entrada manual e outro de dispositivo simulado, ambos produzindo medições normalizadas com origem explícita. Fora da prova de conceito HTTP de recepção técnica, não existe comunicação de coleta vinculada à triagem, firmware, pareamento ou integração real; timeout, falha e fallback manual são apenas contratos documentados.

## Documentação

- Produto, escopo e demonstração: `docs/PRODUCT.md`, `docs/MVP_SCOPE.md`, `docs/DEMO_SCENARIOS.md`.
- Fluxos, estados e domínio: `docs/USER_FLOWS.md`, `docs/TRIAGE_STATE_MACHINE.md`, `docs/DOMAIN_MODEL.md`.
- Preferências e limites de acessibilidade: `docs/ACCESSIBILITY.md`.
- Fronteiras técnicas: `docs/ANALYSIS_ENGINE.md`, `docs/HARDWARE_BOUNDARY.md`, `docs/ARCHITECTURE.md`.
- Governança: `docs/SECURITY_AND_PRIVACY.md`, `docs/ENGINEERING_RULES.md`, `docs/ACCEPTANCE_CRITERIA.md`.
- Execução futura: `docs/IMPLEMENTATION_PLAN.md`, `docs/GLOSSARY.md` e `docs/decisions/`.
- Experimento controlado com 10 pacientes fictícios e 50 triagens: `docs/SIMULATION_EXPERIMENT.md`.

## Próximos marcos

Os próximos marcos tratam auditoria/segurança/robustez, dados demonstrativos e validação integral. A ordem e os gates estão em `docs/IMPLEMENTATION_PLAN.md`.

> Produto experimental, sem validação clínica, conformidade certificada ou autorização para uso clínico real. Use exclusivamente dados fictícios em desenvolvimento e demonstrações.
