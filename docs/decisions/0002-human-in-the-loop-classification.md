# ADR 0002 — Classificação final humana obrigatória

- **Status:** Aceita

## Contexto

A recomendação V0 não tem validação clínica e dados incompletos ou falhas podem ocorrer. Confundir saída automática e decisão profissional cria risco clínico e de auditoria.

## Decisão

Manter recomendação do sistema e classificação da enfermagem como registros distintos. A triagem só é classificada por profissional autorizado; reclassificação exige justificativa e todo histórico é preservado.

## Alternativas

Classificação automática final; aprovação implícita por inação; sobrescrever recomendação com decisão humana. Rejeitadas por remover supervisão ou rastreabilidade.

## Consequências positivas

Responsabilidade clara, explicabilidade, auditoria e possibilidade segura de discordância.

## Consequências negativas

Exige etapa operacional, controle de acesso e tratamento de fila; pode aumentar tempo de conclusão.

## Riscos

Interface induzir confirmação automática, revisão superficial, justificativas pobres ou acesso profissional inadequado.

## Condições de revisão

Somente após governança clínica, evidência e validação formal, análise jurídica/regulatória e decisão explícita. Mesmo então, rastreabilidade não pode ser removida.

