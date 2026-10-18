# Especificação para gerar/configurar o firmware ESP32

Copie todo este documento para outro chat e acrescente ao final o modelo exato da placa, sensores, framework e código atual.

## Papel esperado do assistente

Você deve adaptar um firmware ESP32 para integrar sensores de frequência cardíaca, SpO₂ e temperatura à API HTTPS do SmartTriageIA. Preserve drivers e calibrações já existentes. Não invente valores de sensores, não envie dados de paciente e não coloque segredos diretamente em arquivos versionados.

## Configuração fornecida fora do código

```text
WIFI_SSID=<wifi da pessoa>
WIFI_PASSWORD=<senha do wifi>
API_BASE_URL=https://smart-triage-ai-teal.vercel.app
DEVICE_ID=ESP32-001
DEVICE_TOKEN=<token stdev_ fornecido pelo responsável>
```

Preferir arquivo local ignorado pelo Git, NVS/Preferences ou mecanismo equivalente. Nunca imprimir `WIFI_PASSWORD` ou `DEVICE_TOKEN` no Serial.

## Requisitos obrigatórios

1. Conectar ao Wi-Fi com timeout e reconexão limitada.
2. Usar HTTPS na porta 443 e validar a cadeia TLS. Não usar cliente inseguro que aceite qualquer certificado na versão entregue.
3. Enviar `Authorization: Bearer <DEVICE_TOKEN>` em todas as chamadas do dispositivo.
4. Consultar `GET /api/device/session/current` a cada 2–5 segundos também durante a coleta, para perceber cancelamento ou troca de sessão.
5. Somente iniciar sensores quando a resposta for `ACTIVE` com UUID válido.
6. Guardar `sessionId` somente pelo ciclo da coleta; não inventar nem reutilizar sessão terminal.
6a. Se `GET /api/device/session/current` retornar `IDLE` ou um UUID diferente, interromper a coleta anterior, limpar valores antigos do display e descartar o UUID anterior. A mudança de triagem não deve exibir dados antigos como coleta atual.
7. Obter BPM inteiro, SpO₂ inteiro e temperatura numérica dos sensores reais.
8. Antes do POST, rejeitar localmente valores não finitos ou fora dos limites técnicos documentados.
9. Enviar `POST /api/readings` com JSON estrito e sem campos adicionais.
10. Após as leituras desejadas receberem `201`, chamar `POST /api/triage/session/release` com o `sessionId` atual.
11. Em `400/401/403/404/409`, parar o fluxo conforme o contrato; em `500–504`, usar no máximo três retries com backoff 1/2/4 segundos.
12. Não usar WebSocket, MQTT ou acesso direto ao PostgreSQL.
13. Logs seriais podem conter estado e código HTTP, mas nunca token, senha, payload completo ou identificadores de paciente.

## Chamadas HTTP

### Consultar trabalho

```http
GET https://smart-triage-ai-teal.vercel.app/api/device/session/current
Authorization: Bearer <DEVICE_TOKEN>
Accept: application/json
```

### Enviar leitura

```json
{
  "deviceId": "ESP32-001",
  "sessionId": "UUID_RECEBIDO",
  "bpm": 78,
  "spo2": 98,
  "temperatura": 36.7
}
```

### Liberar dispositivo

```json
{ "deviceId": "ESP32-001", "sessionId": "UUID_RECEBIDO" }
```

Consulte `docs/ESP32_API_CONTRACT.md` para respostas e códigos completos.

## Máquina de estados sugerida

```text
BOOT
→ WIFI_CONNECTING
→ IDLE_POLLING
→ SESSION_ACTIVE
→ MEASURING
→ SENDING
→ RELEASING
→ IDLE_POLLING
```

Estados de erro mínimos: `WIFI_ERROR`, `TLS_ERROR`, `UNAUTHORIZED`, `INVALID_READING`, `API_TRANSIENT_ERROR`. O loop principal não deve bloquear indefinidamente; watchdog e reconexão precisam continuar funcionando.

## Entrega esperada do outro assistente

- código completo ou patch sobre o firmware fornecido;
- lista de bibliotecas e versões;
- localização segura das configurações;
- instruções de compilação e upload;
- explicação do certificado TLS usado;
- roteiro de teste com Serial Monitor;
- confirmação de que nenhum valor foi simulado e nenhum segredo foi versionado.

Antes de gerar o código, o assistente deve perguntar: modelo da placa ESP32, framework (Arduino/PlatformIO/ESP-IDF), modelos dos sensores, bibliotecas atuais e se existe código funcional de leitura.
