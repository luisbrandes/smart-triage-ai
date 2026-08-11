# ADR 0010 — Motor determinístico demonstrativo

- **Status:** Aceita

## Contexto

Após o intake, a V0 precisa demonstrar recomendação explicável sem protocolo clínico, IA ou decisão automática final. Execuções repetidas não podem duplicar histórico.

## Decisão

Implementar motor puro e determinístico em `src/domain/analysis`, com entrada/saída normalizadas. Regras fictícias vivem exclusivamente em `src/demo/analysis-rules.ts`, são pequenas, explícitas e versionadas como `V0-DEMO-RULESET-001`. O motor não importa Prisma, Next.js ou React.

O caso de uso server-side calcula fingerprint das respostas relevantes e versão, injeta regras/instante e delega a persistência transacional ao repository. Uma constraint única garante idempotência; repetição retorna a execução existente, enquanto fingerprints distintos preservam novas execuções. A persistência de `AnalysisRun`, recomendação, razões, prioridade, transição e auditoria é separada da execução pura.

Recomendação continua provisória e separada de `NurseReview`. Nenhuma classificação humana é criada. `APP_MODE=production` bloqueia as regras demonstrativas.

## Alternativas consideradas

- Regras em componentes, actions ou repository: rejeitadas por acoplamento e baixa testabilidade.
- IA/ML ou protocolo real: rejeitados por ausência de validação e escopo.
- Sobrescrever recomendação anterior: rejeitado por perda de auditoria.
- Idempotência somente na aplicação: rejeitada por não proteger concorrência.

## Consequências

Resultados são previsíveis, explicáveis, testáveis e auditáveis. Em contrapartida, regras/limiares não têm significado clínico, a UI precisa comunicar esse limite e futuras regras validadas exigirão novo ruleset e governança.

## Condições de revisão

Revisar ao adotar protocolo validado, mecanismo externo ou nova fase de análise. Preservar versionamento, explicabilidade, idempotência, histórico e revisão humana obrigatória.
