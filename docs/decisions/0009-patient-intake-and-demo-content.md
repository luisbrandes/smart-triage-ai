# ADR 0009 — Intake do paciente e conteúdo demonstrativo

- **Status:** Aceita

## Contexto

O Marco 4 precisa persistir identificação, consentimento e anamnese sem confundir conteúdo provisório com regra clínica e sem permitir que UI ou Server Actions acessem Prisma diretamente.

## Decisão

Implementar o intake como páginas Server Components e formulários Client Components pequenos. Server Actions recebem os formulários e chamam casos de uso em `src/server/application`; um repository Prisma orientado ao agregado executa transações e auditoria. Server Actions não importam Prisma.

Texto do termo, versão, catálogo de perguntas, opções e exemplos ficam em `src/demo`, todos identificados como conteúdo V0 não validado. Zod valida entradas no servidor. Um cookie `httpOnly`, `sameSite=strict` e com duração limitada guarda somente o UUID opaco da triagem para retomada; nome, documento e respostas não entram em cookie ou URL.

Uma triagem pode existir sem paciente apenas durante o início da identificação. Consentimento exige paciente vinculado e avança para anamnese. A conclusão persiste respostas e move para `PRELIMINARY_ANALYSIS_PENDING`, sem executar análise ou criar recomendação.

## Consequências

O fluxo é funcional, retomável, transacional e mantém conteúdo demo substituível. Em contrapartida, não existe autenticação, expiração de negócio, edição de etapas concluídas ou proteção contra múltiplas sessões além do cookie local de demonstração.

## Alternativas consideradas

- Conteúdo provisório nos componentes: rejeitado por espalhar material não validado.
- Prisma nas Server Actions: rejeitado por misturar transporte e infraestrutura.
- `localStorage` ou dados no cookie: rejeitados por segurança e por tornar o navegador fonte autoritativa.
- Paciente-placeholder ao iniciar: rejeitado; `patientId` fica opcional somente até a identificação.

## Condições de revisão

Revisar ao substituir conteúdo demo por conteúdo aprovado, introduzir autenticação/identidade de sessão, permitir edição/expiração ou adicionar consumidores externos. A revisão deve preservar minimização, versionamento, transações e separação entre UI, aplicação e infraestrutura.
