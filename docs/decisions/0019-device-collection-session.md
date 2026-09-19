# ADR 0019 — Sessão técnica de coleta por dispositivo

- **Status:** Aceita

## Decisão

`DeviceCollectionSession` representa apenas o ciclo técnico de uma coleta iniciada pelo totem, sem paciente, triagem clínica ou análise. Ela pertence a `MedicalDevice` e pode receber várias `Reading`s. Os estados são `WAITING`, `ACTIVE`, `CANCELLED` e `COMPLETED`.

O início cria ou ativa a sessão em espera. O banco impõe uma única sessão `ACTIVE` por dispositivo. Cancelamento preserva a sessão; liberação conclui uma sessão ativa, quando houver, e cria uma sessão `WAITING` para a próxima coleta. `Reading` aceita `sessionId` opcional e só o grava quando a sessão pertence ao dispositivo e está `ACTIVE`.

`HardwareCollectionSession` não foi reutilizada porque exige uma `Triage` e representa o fluxo clínico existente. Nenhuma leitura dessa nova sessão segue para o motor, altera a prioridade ou identifica paciente.
