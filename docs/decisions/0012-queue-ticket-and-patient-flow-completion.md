# ADR 0012 — Senha operacional e conclusão do fluxo do paciente

- **Status:** Aceita

## Contexto

Ao terminar a coleta, o paciente precisa de um identificador público sem expor dados pessoais, clínicos, prioridade ou IDs internos. Repetições e requisições concorrentes não podem criar senhas distintas para a mesma triagem ou repetir uma sequência diária.

## Decisão

Emitir a senha somente para triagens em `AWAITING_NURSE_REVIEW`, por caso de uso server-side e repository Prisma transacional. O código é formatado centralmente como `T-AAAAMMDD-NNN`: prefixo estável, data operacional UTC e sequência diária. `QueueTicket.status = ACTIVE` representa a senha emitida na terminologia existente; não significa chamada ou atendimento.

Uma constraint limita cada triagem a um ticket e outra torna `(operationalDate, sequenceNumber)` único. A emissão usa isolamento serializável, consulta o ticket existente antes de criar e repete conflitos serializáveis/únicos de forma limitada. Registra `QUEUE_TICKET_ISSUED` e `PATIENT_FLOW_COMPLETED`, sem mudar a triagem para `CLASSIFIED` ou criar `NurseReview`.

Nova demonstração cria outra triagem, registra `NEW_DEMO_STARTED` e substitui somente o cookie opaco. A triagem e senha anteriores permanecem.

## Alternativas consideradas

- Sequência no cliente: rejeitada por concorrência.
- UUID/ID como senha: rejeitado por baixa legibilidade e exposição interna.
- Prioridade ou dados do paciente na senha: rejeitados por privacidade e significado clínico indevido.
- Timezone configurável: adiado; UTC é a convenção provisória simples da V0.

## Consequências e limites

A emissão é idempotente, legível e protegida no banco. A data embutida mantém o código público único entre dias. Ainda não existem fila funcional, chamada, rechamada, guichê, previsão de espera, revisão humana ou atendimento.

## Condições de revisão

Revisar a data operacional quando houver timezone e virada de plantão definidos. Preservar unicidade, privacidade, idempotência e separação da decisão clínica.
