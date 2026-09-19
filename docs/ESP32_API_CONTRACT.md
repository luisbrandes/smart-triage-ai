# Contrato HTTP autenticado — ESP32

## Ambiente de homologação

- Base URL: `https://smart-triage-ai-teal.vercel.app`
- Transporte obrigatório: HTTPS, porta 443.
- Formato: JSON UTF-8.
- Identidade: `deviceId` cadastrado no servidor.
- Autenticação: `Authorization: Bearer <DEVICE_TOKEN>` em toda rota chamada pelo ESP32.
- O token é secreto, individual, revogável e nunca deve aparecer em logs, repositório ou interface.

O navegador autenticado inicia e acompanha a sessão. O ESP32 descobre a sessão ativa, envia leituras e a encerra. O dispositivo nunca recebe dados do paciente ou `triageId`.

## Headers do dispositivo

```http
Authorization: Bearer stdev_TOKEN_FORNECIDO_FORA_DO_CODIGO
Accept: application/json
Content-Type: application/json
User-Agent: SmartTriageESP32/1.0
```

`Content-Type` é necessário somente nas requisições com JSON. Nunca imprimir o header `Authorization` no monitor serial.

## 1. Descobrir sessão ativa

```http
GET /api/device/session/current
Authorization: Bearer <DEVICE_TOKEN>
```

Sem coleta solicitada (`200`):

```json
{ "status": "IDLE", "sessionId": null }
```

Com coleta solicitada (`200`):

```json
{ "status": "ACTIVE", "sessionId": "550e8400-e29b-41d4-a716-446655440000" }
```

O firmware pode consultar a cada 2–5 segundos enquanto estiver ocioso. Resposta `401` significa token ausente, inválido, revogado ou dispositivo inativo.

## 2. Enviar leitura

```http
POST /api/readings
Authorization: Bearer <DEVICE_TOKEN>
Content-Type: application/json
```

```json
{
  "deviceId": "ESP32-001",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "bpm": 78,
  "spo2": 98,
  "temperatura": 36.7
}
```

Limites técnicos, sem significado clínico: `bpm` inteiro entre 20 e 240; `spo2` inteiro entre 50 e 100; `temperatura` finita entre 20 e 45. O `deviceId` deve corresponder ao token. `sessionId` é obrigatório no firmware remoto, apesar de continuar opcional no schema legado.

Sucesso (`201`):

```json
{ "success": true, "readingId": "550e8400-e29b-41d4-a716-446655440001" }
```

## 3. Encerrar e liberar

Após enviar todas as leituras válidas:

```http
POST /api/triage/session/release
Authorization: Bearer <DEVICE_TOKEN>
Content-Type: application/json
```

```json
{ "deviceId": "ESP32-001" }
```

Sucesso (`200`):

```json
{ "sessionId": "uuid-da-proxima-espera", "status": "WAITING" }
```

A sessão usada passa a `COMPLETED`; o frontend para o polling e permite que o paciente selecione e confirme uma `Reading`.

## Códigos e política de retry

| HTTP | Significado | Firmware |
|---|---|---|
| `200/201` | Operação concluída | Prosseguir. |
| `400` | JSON, tipo, faixa ou campo inválido | Não repetir sem corrigir. |
| `401` | Token ausente/inválido/revogado | Parar chamadas e sinalizar configuração. |
| `403` | `deviceId` não corresponde ao token | Parar; configuração incorreta. |
| `404` | Dispositivo ou sessão não encontrado | Descartar sessão local e voltar a consultar. |
| `409` | Sessão não ativa ou de outro dispositivo | Parar envio dessa coleta. |
| `429` | Limite da infraestrutura | Respeitar `Retry-After`, se presente. |
| `500–504` | Falha transitória | Repetir no máximo 3 vezes com 1 s, 2 s e 4 s. |

Não repetir indefinidamente. Como a ingestão ainda não possui chave idempotente própria, um timeout após o envio pode significar que a leitura foi persistida; aguarde nova sessão ou orientação do frontend antes de produzir múltiplas leituras equivalentes.

## Sequência completa

```text
site cria sessão ACTIVE
→ ESP32 consulta /api/device/session/current
→ ESP32 mede
→ ESP32 envia uma ou mais /api/readings
→ ESP32 chama /release
→ site mostra COMPLETED
→ paciente seleciona reading e confirma
→ servidor cria VitalSignMeasurement de FC e SpO₂
```

As rotas `/api/triage/session/start`, `/cancel` e `GET /api/triage/session/[sessionId]` pertencem ao navegador com sessão assinada; o firmware não deve chamá-las.
