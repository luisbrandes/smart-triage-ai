# ADR 0022 — Dispositivo remoto autenticado por polling HTTPS

- **Status:** Aceita

## Decisão

Para homologação remota, cada `MedicalDevice` possui um token opaco individual. O servidor persiste somente HMAC-SHA-256 derivado com `DEVICE_TOKEN_PEPPER`; rotação substitui o hash e revoga o token anterior. O ESP32 usa HTTPS e Bearer token.

O navegador autenticado cria a sessão técnica vinculada à triagem solicitante. O dispositivo descobre trabalho em `GET /api/device/session/current`, envia leituras e libera a sessão. Rotas de acompanhamento/cancelamento exigem a sessão assinada do paciente; ingestão, descoberta e liberação exigem credencial do dispositivo.

Polling foi escolhido por simplicidade e compatibilidade com o firmware atual. MQTT, WebSocket, provisionamento remoto, múltiplos dispositivos por paciente e uso clínico permanecem fora deste marco.
