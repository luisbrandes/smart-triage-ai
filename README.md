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

## Fronteira de hardware

Sinais vitais serão obtidos por um `HardwareGateway` comum. Na V0, ele terá conceitualmente um adaptador de entrada manual e outro de dispositivo simulado, ambos produzindo medições normalizadas com origem explícita. Um adaptador físico poderá ser acrescentado no futuro sem alterar os casos de uso ou o motor. Neste estágio não existe comunicação com ESP32, firmware, protocolo de rede nem integração real; timeout, falha e fallback manual são apenas contratos documentados.

## Documentação

- Produto, escopo e demonstração: `docs/PRODUCT.md`, `docs/MVP_SCOPE.md`, `docs/DEMO_SCENARIOS.md`.
- Fluxos, estados e domínio: `docs/USER_FLOWS.md`, `docs/TRIAGE_STATE_MACHINE.md`, `docs/DOMAIN_MODEL.md`.
- Fronteiras técnicas: `docs/ANALYSIS_ENGINE.md`, `docs/HARDWARE_BOUNDARY.md`, `docs/ARCHITECTURE.md`.
- Governança: `docs/SECURITY_AND_PRIVACY.md`, `docs/ENGINEERING_RULES.md`, `docs/ACCEPTANCE_CRITERIA.md`.
- Execução futura: `docs/IMPLEMENTATION_PLAN.md`, `docs/GLOSSARY.md` e `docs/decisions/`.

## Próximos marcos

Os próximos marcos tratam auditoria/segurança/robustez, dados demonstrativos e validação integral. A ordem e os gates estão em `docs/IMPLEMENTATION_PLAN.md`.

> Produto experimental, sem validação clínica, conformidade certificada ou autorização para uso clínico real. Use exclusivamente dados fictícios em desenvolvimento e demonstrações.
