# ADR 0005 — HardwareGateway e fronteira de adaptadores

- **Status:** Aceita

## Contexto

A V0 coleta FC e SpO₂ manualmente ou por simulação, mas uma futura integração física não pode introduzir ESP32, protocolo, payload ou biblioteca nos casos de uso, domínio, UI ou motor. Simulação acoplada à tela também impediria testes contratuais e substituição segura.

## Decisão

Adotar `HardwareGateway` como única dependência conceitual dos casos de uso de coleta. O gateway expõe capacidades opcionais, disponibilidade, sessões, leitura/progresso, repetição, cancelamento, finalização e falha. Adaptadores convertem dados específicos em medições normalizadas; dados brutos permanecem na infraestrutura.

A V0 usa `ManualVitalSignsAdapter` e `SimulatedHardwareAdapter`, este determinístico e claramente identificado. Um futuro `Esp32HardwareAdapter` implementará o mesmo contrato após ADR de comunicação. Origens são `MANUAL`, `SIMULATED_DEVICE` e `PHYSICAL_DEVICE`; simulação nunca se apresenta como física. Sessões e tentativas são append-only e fallback manual cria nova sessão.

## Alternativas consideradas

- Lógica manual/simulada diretamente na UI: rejeitada por acoplamento e inconsistência.
- Casos de uso dependentes de ESP32/protocolo: rejeitada por inversão de dependência e baixa substituibilidade.
- Contratos diferentes para manual, simulado e físico: rejeitada por divergência de semântica/testes.
- Escolher agora HTTP, WebSocket, MQTT ou transporte local: rejeitada por ausência de requisitos técnicos e operacionais.

## Consequências positivas

Casos de uso e motor permanecem estáveis; normalização e segurança têm fronteira clara; simulação exercita o caminho arquitetural real; capacidades heterogêneas e testes contratuais são possíveis; falhas e origem ficam rastreáveis.

## Consequências negativas

Exige modelar sessões, estados, erros e adaptadores mesmo na V0; contrato precisa acomodar operações opcionais; nenhum teste da simulação prova comunicação ou precisão física.

## Riscos

Gateway virar abstração genérica excessiva; payload bruto vazar; origem ser rotulada incorretamente; retry duplicar medições; estado de dispositivo se misturar ao da triagem; adaptador futuro contornar validação, autenticação ou auditoria.

## Condições de revisão

Revisar se uma prova de conceito demonstrar incapacidade concreta do contrato, se requisitos de dispositivo exigirem capacidades incompatíveis ou se houver mudança validada do fluxo. Antes do ESP32 real, criar ADR para topologia/protocolo e resolver identidade, segurança, mensagens, idempotência, sincronização, offline, firmware e retenção bruta. A revisão não pode remover normalização, rastreabilidade ou independência do domínio.
