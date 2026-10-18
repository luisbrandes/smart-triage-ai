# Contrato ESP32/API (versao vigente)

Base URL: `https://smart-triage-ai-teal.vercel.app`.

Todas as chamadas do dispositivo usam `Authorization: Bearer <DEVICE_TOKEN>`, `Accept: application/json` e HTTPS. O token nunca deve aparecer em logs.

## Fluxo

1. `GET /api/device/session/current` retorna `IDLE` ou `ACTIVE` com `sessionId`.
2. Para cada medicao, `POST /api/readings` envia:

```json
{"deviceId":"ESP32-001","sessionId":"uuid","readingId":"ESP32-001-000001","bpm":78,"spo2":98,"temperatura":36.7}
```

`readingId` e unico por medicao. Em timeout, repita exatamente o mesmo `readingId`; o backend responde sucesso sem duplicar. Uma medicao diferente usa outro identificador.

3. `POST /api/triage/session/release` envia `{"deviceId":"ESP32-001","sessionId":"uuid"}`. Repetir a chamada e seguro e nao cria varias esperas.

## Erros

- `400`: payload ou faixa invalida; corrigir antes de repetir.
- `401`: token ausente, invalido ou revogado; interromper e sinalizar configuracao.
- `403`: `deviceId` nao corresponde ao token; interromper.
- `404`: dispositivo/sessao inexistente; descartar sessao local.
- `409`: sessao inativa, dispositivo divergente ou identificador usado por outro dispositivo.
- `5xx`: falha transitoria; repetir no maximo tres vezes com backoff, mantendo o mesmo `readingId`.

Sessoes `ACTIVE` expiram apos 15 minutos. Sessao expirada nao aceita leitura nem release; o firmware deve voltar a consultar uma nova sessao.

As faixas sao tecnicas: BPM inteiro 20-240, SpO2 inteiro 50-100 e temperatura finita 20-45. Elas nao possuem significado clinico.
