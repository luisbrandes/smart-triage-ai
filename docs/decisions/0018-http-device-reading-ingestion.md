# ADR 0018 — Ingestão HTTP inicial de leituras de dispositivo

- **Status:** Substituída pelo ADR 0020

> Registro histórico da primeira entrada HTTP. O contrato vigente está no ADR 0020 e em `docs/ESP32_API_CONTRACT.md`.

## Contexto

Uma prova de conceito precisa receber leituras de um ESP32 por HTTP e persistir a entrada técnica. `MedicalDevice` já representa o catálogo de dispositivos, mas `VitalSignMeasurement` exige sessão de triagem e suporta somente FC e SpO₂ aceitas no fluxo. O payload inicial também inclui temperatura, peso e altura e não identifica paciente ou triagem.

## Decisão

Expor `POST /api/readings` como entrada Node.js server-side. A rota aceita somente JSON estrito com `deviceId`, temperatura, FC, SpO₂, peso e altura; valida tipos, identificador e limites técnicos básicos antes de qualquer acesso ao banco. Não aplica regra clínica, classificação ou análise.

O dispositivo é resolvido por `MedicalDevice.externalIdentifier` e precisa estar ativo e previamente cadastrado. Dispositivo ausente ou inativo recebe `404`; JSON ou payload inválido recebe `400`. A leitura é gravada em `Reading`, ligada ao dispositivo, com horário de recebimento do servidor, e é auditada sem registrar valores clínicos ou payload bruto nos metadados de auditoria.

`Reading` é deliberadamente separada de `VitalSignMeasurement`: ela é uma recepção técnica independente de triagem e não alimenta o motor nem altera qualquer estado clínico. A autenticação ainda não existe; a rota concentra a resolução do dispositivo para que uma verificação de credencial possa ser inserida nessa fronteira antes da persistência.

## Consequências

A integração inicial não altera sessões, medições aceitas ou o fluxo do paciente. O dispositivo precisa ser provisionado no banco antes de enviar leituras; o seed contém apenas `ESP32-001` fictício para desenvolvimento local. Não há garantia de autenticidade, calibração, uso clínico ou idempotência nesta primeira entrada. Antes de uso além da prova de conceito, devem ser definidos autenticação, proteção contra replay, idempotência, rate limit, sincronização de relógio e vinculação explícita a uma sessão de triagem.
