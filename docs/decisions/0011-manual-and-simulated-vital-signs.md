# ADR 0011 — Sinais vitais manuais e simulados

- **Status:** Aceita

## Decisão

Implementar `HardwareGateway` com adapters manual e simulado determinístico. Cada tentativa cria sessão imutável; falha/timeout/invalidade criam erro seguro; sucesso cria FC e SpO₂ normalizadas com origem explícita. Repetição e fallback manual preservam histórico.

A sessão completa mais recente alimenta `V0-DEMO-RULESET-002`, criando análise final separada da preliminar e avançando para revisão humana.

## Consequências, alternativas e revisão

O fluxo é testável e substituível, mas valores e faixas são fictícios. Rejeitamos lógica na UI, aleatoriedade e sobrescrita. Revisar antes de hardware físico, mantendo gateway, origem, normalização, segurança e histórico. Não há ESP32, rede ou protocolo real.
