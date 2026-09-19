# Contrato HTTP mínimo — ESP32

## Escopo

Este contrato cobre somente a prova de conceito `ESP32 → HTTP → API → PostgreSQL`. Não contém autenticação, IA, MQTT, WebSocket, paciente, triagem clínica ou decisão de prioridade.

Substitua `{BASE_URL}` pelo endereço HTTP alcançável pelo ESP32, por exemplo `http://192.168.1.10:3000`. Todos os endpoints abaixo usam JSON UTF-8.

## Regras comuns

- Métodos: `POST` para iniciar, registrar, cancelar ou liberar; `GET` somente para a consulta do frontend.
- Header obrigatório: `Content-Type: application/json`.
- Header recomendado: `Accept: application/json`.
- O dispositivo deve usar seu identificador cadastrado em `MedicalDevice.externalIdentifier`; no ambiente demonstrativo é `ESP32-001`.
- `deviceId` aceita 1 a 64 caracteres: letras, números, `.`, `_` e `-`.
- Respostas de erro têm `{ "error": "..." }`. O firmware não deve depender do texto para decidir fluxo; deve usar o código HTTP.
- Não envie chaves, tokens, dados de paciente, peso, altura ou campos não documentados. Payloads são estritos e campos extras recebem `400`.

## 1. Iniciar sessão

`POST {BASE_URL}/api/triage/session/start`

Request:

```json
{ "deviceId": "ESP32-001" }
```

Resposta de sucesso (`201`):

```json
{ "sessionId": "550e8400-e29b-41d4-a716-446655440000", "status": "ACTIVE" }
```

Guarde `sessionId` em memória durante a coleta e use-o em todas as leituras da sessão.

| Código | Significado | Ação do firmware |
|---|---|---|
| `201` | Sessão iniciada | Iniciar sensores e enviar leituras. |
| `400` | JSON/payload inválido | Corrigir o firmware; não repetir o mesmo payload. |
| `404` | Dispositivo inexistente ou inativo | Permanecer parado e sinalizar erro operacional. |
| `409` | Já existe sessão ativa para o dispositivo | Não iniciar outra coleta; recuperar o fluxo no servidor. |
| `500` | Falha interna transitória | Tentar novamente com limite; não criar outro `sessionId` local. |

## 2. Enviar leitura

`POST {BASE_URL}/api/readings`

Request recomendado para o ESP32:

```json
{
  "deviceId": "ESP32-001",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "bpm": 78,
  "spo2": 98,
  "temperatura": 36.7
}
```

Limites técnicos atuais: `bpm` inteiro de 20 a 240; `spo2` inteiro de 50 a 100; `temperatura` numérica de 20 a 45. Estes limites não são validação clínica.

Resposta de sucesso (`201`):

```json
{ "success": true, "readingId": "550e8400-e29b-41d4-a716-446655440001" }
```

`sessionId` é opcional tecnicamente para manter compatibilidade com a primeira versão da API. Para o fluxo real do ESP32 ele deve ser enviado: assim a leitura fica vinculada à sessão e a API confirma que ela está `ACTIVE` e pertence ao mesmo dispositivo.

| Código | Significado | Ação do firmware |
|---|---|---|
| `201` | Leitura salva | Prosseguir com a próxima leitura ou encerramento. |
| `400` | JSON, tipo, limite ou campo inválido | Não reenviar o mesmo payload. |
| `404` | Dispositivo ou sessão não existe | Parar a coleta e solicitar novo fluxo ao servidor. |
| `409` | Sessão não está ativa ou pertence a outro dispositivo | Parar a coleta; não enviar mais leituras para esse `sessionId`. |
| `500` | Falha interna transitória | Repetir de forma limitada; não há idempotência nesta etapa. |

## 3. Cancelar sessão

`POST {BASE_URL}/api/triage/session/cancel`

Request:

```json
{ "sessionId": "550e8400-e29b-41d4-a716-446655440000" }
```

Resposta de sucesso (`200`):

```json
{ "sessionId": "550e8400-e29b-41d4-a716-446655440000", "status": "CANCELLED" }
```

| Código | Significado |
|---|---|
| `200` | Sessão cancelada, ou já estava terminal. |
| `400` | JSON/payload inválido. |
| `404` | Sessão inexistente. |
| `500` | Falha interna transitória. |

Após `CANCELLED`, não envie leituras com esse `sessionId`.

## 4. Liberar nova coleta

`POST {BASE_URL}/api/triage/session/release`

Request:

```json
{ "deviceId": "ESP32-001" }
```

Resposta de sucesso (`200`):

```json
{ "sessionId": "550e8400-e29b-41d4-a716-446655440002", "status": "WAITING" }
```

A liberação conclui uma sessão `ACTIVE`, se ela existir, e cria uma sessão `WAITING` para a próxima coleta. Para começar essa próxima coleta, chame novamente `/api/triage/session/start`; o novo `sessionId` retornado será o único aceito para leituras.

| Código | Significado |
|---|---|
| `200` | Dispositivo liberado e sessão em espera criada. |
| `400` | JSON/payload inválido. |
| `404` | Dispositivo inexistente ou inativo. |
| `500` | Falha interna transitória. |

## Sequência completa

1. Enviar `POST /api/triage/session/start` com `deviceId` e guardar `sessionId` retornado (`ACTIVE`).
2. Enviar uma ou mais vezes `POST /api/readings`, sempre com o mesmo `deviceId` e `sessionId`.
3. Para abortar: enviar `POST /api/triage/session/cancel` com `sessionId`; depois usar `/release` quando o totem puder receber uma nova coleta.
4. Para encerrar normalmente: enviar `POST /api/triage/session/release` com `deviceId`. A sessão ativa passa a `COMPLETED` e é criada uma nova sessão `WAITING`.
5. Para a próxima pessoa, repetir a partir de `/start`.

## Consulta para o frontend

O frontend acompanha uma sessão pelo endpoint de leitura abaixo. O ESP32 não precisa chamá-lo.

`GET {BASE_URL}/api/triage/session/{sessionId}`

Resposta de sucesso (`200`):

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "ESP32-001",
  "status": "ACTIVE",
  "startedAt": "2026-09-19T12:00:00.000Z",
  "completedAt": null,
  "cancelledAt": null,
  "readings": [
    {
      "readingId": "550e8400-e29b-41d4-a716-446655440001",
      "bpm": 78,
      "spo2": 98,
      "temperatura": 36.7,
      "receivedAt": "2026-09-19T12:00:05.000Z"
    }
  ]
}
```

As leituras são ordenadas da mais antiga para a mais recente. `ACTIVE` indica coleta em andamento; `COMPLETED` indica encerramento por `/release`; `CANCELLED` indica cancelamento. Retorna `400` para UUID inválido e `404` para sessão inexistente.
