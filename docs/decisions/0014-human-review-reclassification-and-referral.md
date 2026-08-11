# ADR 0014 — Revisão humana, reclassificação, nova coleta e encaminhamento

- **Status:** Aceita

## Contexto

A recomendação demonstrativa precisa ser submetida a decisão profissional explícita. A decisão não pode sobrescrever evidências automáticas, e ações repetidas ou concorrentes não podem criar histórico contraditório.

## Decisão

Confirmar e reclassificar criam `NurseReview` separado da `AnalysisRecommendation`, salvam `finalHumanPriority` e movem `AWAITING_NURSE_REVIEW` para `CLASSIFIED`. Confirmação copia a recomendação atual; reclassificação exige justificativa validada e preserva integralmente a recomendação consultada.

Nova coleta exige motivo, move somente `AWAITING_NURSE_REVIEW` para `RECOLLECTION_REQUESTED` e não cria sessão imediatamente. A sessão nasce quando o paciente usa o `HardwareGateway`; uma nova análise é anexada e retorna a triagem à revisão, sem apagar análise, medição ou revisão anterior.

Encaminhamento exige `CLASSIFIED`, classificação humana e revisão existente. Cria `CareReferral`, move para `REFERRED_TO_CARE` e não avança para `CLOSED`.

Todas as mudanças usam transação serializável, validação de estado dentro da transação, retentativa limitada de conflitos e idempotência pelo estado/registro equivalente. Auditoria armazena apenas prioridades, tipo, estados, flags de justificativa/motivo e presença resumida de destino; textos clínicos e pessoais não entram nos metadados.

## Consequências e limites

Recomendação, decisões, coletas e análises permanecem historicamente separadas. A V0 usa referência profissional fixa e explicitamente demonstrativa porque ainda não existe autenticação real. Não há atendimento médico, prontuário, leito, fechamento ou revisão de uma classificação já concluída sem novo ciclo documentado.

## Condições de revisão

Revisar com autenticação/autorização profissional, política de correção de decisões ou workflow assistencial aprovado. Preservar histórico, justificativa, atomicidade e autoridade humana.
