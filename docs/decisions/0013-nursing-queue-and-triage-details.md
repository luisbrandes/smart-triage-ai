# ADR 0013 — Fila da enfermagem e detalhe da triagem

- **Status:** Aceita

## Contexto

O painel demonstrativo precisa consultar triagens concluídas sem expor modelos Prisma, campos técnicos ou permitir decisões profissionais antes do Marco 9.

## Decisão

Implementar fila e detalhe como consultas server-side somente para leitura. Páginas Server Components chamam casos de uso em `src/server/application/nursing`, que recebem DTOs específicos de um repository Prisma dedicado. Nenhum modelo gerado alcança apresentação ou domínio.

A fila inclui apenas `AWAITING_NURSE_REVIEW` com senha emitida. A regra operacional demonstrativa ordena `RED`, `YELLOW`, `GREEN` e, dentro da mesma recomendação, o instante mais antigo de emissão da senha. Essa ordem não é protocolo clínico validado. O detalhe preserva análises preliminar/final e tentativas, mas expõe somente campos necessários; a linha do tempo usa uma allowlist de ações convertidas em rótulos sem metadados brutos.

A atualização é uma nova renderização server-side acionada por link. Não há WebSocket, polling, estado global, mutation, autenticação real ou uso do cookie do paciente para autorizar o painel.

## Consequências e limites

A enfermagem obtém uma projeção consistente e segura do PostgreSQL, com estado vazio e indicadores simples. O `triageId` permanece na rota e é validado; registros inexistentes ou fora do estado permitido retornam 404 seguro. Confirmar, reclassificar, solicitar coleta e encaminhar continuam ausentes.

## Condições de revisão

Revisar quando autenticação e autorização profissional forem introduzidas, quando requisitos operacionais exigirem outra atualização ou quando a regra de ordenação for formalmente definida. Preservar DTOs mínimos, histórico e separação entre recomendação e decisão humana.
