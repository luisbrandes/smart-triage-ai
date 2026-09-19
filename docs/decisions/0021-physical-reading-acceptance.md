# ADR 0021 — Aceite explícito de leitura física na triagem

- **Status:** Aceita
- **Relacionada:** ADR 0019 e ADR 0020

## Decisão

Uma `Reading` técnica só entra na triagem por `acceptPhysicalDeviceCollectionForTriage`. A Server Action deriva a `triageId` da sessão assinada do paciente e recebe do navegador apenas `deviceCollectionSessionId` e `readingId`.

O caso de uso valida a sessão técnica concluída, dispositivo ativo, vínculo da leitura e valores técnicos de FC e SpO₂. Em uma transação serializável, cria uma `HardwareCollectionSession` com origem `PHYSICAL_DEVICE`, vinculada por `sourceDeviceCollectionSessionId`, e duas `VitalSignMeasurement` aceitas. A temperatura continua apenas em `Reading`.

O índice único de `sourceDeviceCollectionSessionId` torna o aceite idempotente: a repetição na mesma triagem retorna a tentativa clínica já criada, sem duplicar medições; uma tentativa de reutilizar a sessão técnica em outra triagem é recusada. A leitura bruta não é alterada e o fluxo de análise existente continua consumindo somente medições aceitas.
