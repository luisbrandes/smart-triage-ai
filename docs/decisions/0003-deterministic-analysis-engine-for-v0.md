# ADR 0003 — Motor determinístico na V0

- **Status:** Aceita

## Contexto

A demonstração exige resultados previsíveis, explicáveis e testáveis, mas não existe protocolo clínico formalmente adotado nem base para IA decisória.

## Decisão

Implementar futuramente um motor local por regras explícitas versionadas, atrás de contrato interno substituível. Cada saída referencia entradas, razões e versão. Regras são demonstrativas e não representam NEWS, Manchester ou protocolo validado.

## Alternativas

IA generativa, modelo de ML, regras na UI e adoção informal de protocolo. Rejeitadas por imprevisibilidade, falta de evidência, acoplamento e risco clínico.

## Consequências positivas

Repetibilidade, testes isolados, explicação legível, operação offline e auditoria.

## Consequências negativas

Capacidade limitada, manutenção explícita de versões e necessidade de definição clínica antes de condições concretas.

## Riscos

Regras demo serem interpretadas como médicas, limiares inventados, textos divergirem da lógica ou versão histórica ser recalculada.

## Condições de revisão

Revisar após seleção e validação formal de protocolo ou mecanismo externo, com responsáveis clínicos, evidência, segurança, privacidade, testes e plano de migração histórica.

