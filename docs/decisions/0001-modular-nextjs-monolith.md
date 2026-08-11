# ADR 0001 — Monólito modular em Next.js

- **Status:** Aceita

## Contexto

A V0 precisa demonstrar dois painéis e um fluxo transacional completo com equipe pequena, baixa complexidade operacional e fronteiras evolutivas.

## Decisão

Usar uma aplicação Next.js App Router em TypeScript, com Prisma/PostgreSQL, implantada como monólito modular. Módulos e camadas comunicam-se por contratos internos explícitos.

## Alternativas

Microsserviços; frontend e backend separados; monólito sem módulos. Foram rejeitados respectivamente por custo operacional, duplicação prematura de contratos e alto acoplamento.

## Consequências positivas

Entrega simples, transações locais, testes integrados e navegação unificada, mantendo limites conceituais.

## Consequências negativas

Disciplina de dependências é manual; build/deploy são compartilhados; escala independente não existe.

## Riscos

Virar “monólito emaranhado”, acesso direto entre persistências internas e acoplamento de domínio à UI/Prisma.

## Condições de revisão

Revisar somente diante de limites medidos de escala/equipe/isolamento, integração institucional mandatória ou requisitos de implantação incompatíveis — não por antecipação.

