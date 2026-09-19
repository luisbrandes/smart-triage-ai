# ADR 0020 — Sessão técnica HTTP e consulta de coleta

- **Status:** Aceita
- **Substitui:** ADR 0018
- **Relacionada:** ADR 0019

## Contexto

A primeira versão de ingestão HTTP recebia uma leitura solta com campos que o ESP32 não fornece. A prova de conceito real opera com `deviceId`, BPM, SpO₂ e temperatura e precisa preservar uma sessão técnica por dispositivo. O frontend também precisa acompanhar uma sessão sem acessar Prisma.

## Decisão

O contrato vigente usa `POST /api/triage/session/start`, `POST /api/readings`, `POST /api/triage/session/cancel` e `POST /api/triage/session/release`. O payload da leitura é estrito e contém `deviceId`, `sessionId` opcional por compatibilidade, `bpm`, `spo2` e `temperatura`. No fluxo ESP32, `sessionId` deve ser enviado; a API só aceita a leitura quando a sessão pertence ao dispositivo e está `ACTIVE`.

`GET /api/triage/session/[sessionId]` é a única projeção de consulta necessária nesta etapa. Retorna o identificador externo do dispositivo, estado, timestamps e leituras normalizadas em ordem de recebimento. Não expõe entidades Prisma, payload bruto, metadados de auditoria, paciente, triagem clínica ou decisão de prioridade.

`release` conclui a sessão `ACTIVE`, se houver, e cria uma sessão `WAITING`; `cancel` preserva a sessão com estado `CANCELLED`. Uma constraint parcial no PostgreSQL impede mais de uma sessão `ACTIVE` por dispositivo.

## Consequências

O frontend pode acompanhar BPM, SpO₂, temperatura e o término da sessão por HTTP. Não são necessários endpoint separado para listar leituras, disponibilidade do dispositivo ou finalizar sessão: a consulta da sessão, `start` e `release` cobrem esses casos. Autenticação, idempotência de leitura, limitação de frequência, retry/replay e integração da sessão técnica à triagem clínica continuam fora deste marco.
