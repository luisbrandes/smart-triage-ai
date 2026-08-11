# ADR 0006 — Fundação Next.js em src/app e Tailwind CSS

- **Status:** Aceita

## Contexto

O Marco 1 precisa de uma aplicação mínima, atual e validável sem antecipar domínio, persistência ou componentes de produto. O repositório já contém documentação que deve permanecer na raiz.

## Decisão

Usar Next.js com App Router e todo código de aplicação em `src/`, com rotas em `src/app`. Imports internos podem usar `@/*`, apontando para `src/*`. React Server Components são o padrão; fronteiras cliente exigem necessidade concreta.

Adotar Tailwind CSS v4 com integração PostCSS e configuração CSS-first, sem `tailwind.config.js` enquanto não houver requisito. pnpm é o único gerenciador, com lockfile versionado e versão declarada em `packageManager`. O desenvolvimento usa Turbopack.

## Alternativas consideradas

- Pages Router: rejeitado por não ser a fundação escolhida para o produto.
- Diretório `app/` na raiz: rejeitado para manter todo código de aplicação em `src/`.
- Tailwind CSS v3/configuração JavaScript: rejeitado por ser uma base anterior e desnecessária.
- npm, Yarn ou Bun: rejeitados para manter um único fluxo reprodutível com pnpm.
- Client Components por padrão: rejeitado por ampliar JavaScript e estado sem necessidade.

## Consequências positivas

Estrutura previsível, separação entre harness e aplicação, renderização estática por padrão, imports claros, CSS pequeno e toolchain reproduzível.

## Consequências negativas

Recursos dependentes do navegador exigirão fronteiras cliente explícitas. Mudanças futuras de tokens podem demandar revisão da fundação CSS. `next/font` pode precisar de acesso à fonte durante builds sem cache.

## Condições de revisão

Revisar somente diante de requisito comprovado incompatível com App Router, `src/`, Server Components, pnpm ou Tailwind CSS v4. Mudanças de gerenciador, roteamento ou estratégia CSS exigem ADR substituta e plano de migração.
