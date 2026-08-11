# ADR 0004 — Integração de hardware simulada na V0

- **Status:** Aceita

## Contexto

O fluxo precisa demonstrar FC e SpO₂, mas hardware real adiciona disponibilidade, calibração, transporte, qualidade e suporte incompatíveis com a primeira entrega.

## Decisão

Oferecer entrada manual e adaptador simulado previsível, com origem claramente exibida. Preservar contrato para dispositivo futuro com valor, unidade, timestamp, origem, status/qualidade e falha.

## Alternativas

Exigir ESP32; omitir sinais vitais; simular sem rotulagem. Rejeitadas por dependência externa, quebra do fluxo ou indução ao erro.

## Consequências positivas

Demonstração offline repetível, testes de sucesso/falha e fronteira preparada sem acoplamento ao transporte.

## Consequências negativas

Não prova integração, precisão, calibração ou operação real; exige UI inequívoca para simulação.

## Riscos

Valores simulados parecerem reais, origem ser perdida, histórico sobrescrito ou contrato futuro não cobrir qualidade/segurança.

## Condições de revisão

Antes de hardware real, validar dispositivo e uso clínico, calibração, segurança, protocolo de comunicação, unidades, qualidade, consentimento/base legal, operação, observabilidade e tratamento de falhas.

