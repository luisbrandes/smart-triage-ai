# ADR 0007 — Fundação visual e shells da aplicação

- **Status:** Aceita

## Contexto

O Marco 2 precisa tornar a aplicação apresentável e navegável sem antecipar fluxos, domínio, banco ou dados clínicos. Paciente e enfermagem têm contextos e densidades distintas, mas precisam compartilhar uma linguagem visual coerente e acessível.

## Decisão

Usar tokens CSS em `globals.css`, mapeados pelo Tailwind CSS v4 em abordagem CSS-first. A paleta prioriza superfícies claras e azul-petróleo institucional; estados info/sucesso/atenção/erro são genéricos e não classificações clínicas.

Manter componentes próprios e mínimos (`Card`, `ButtonLink`, `Badge`, `EmptyState`, `SectionHeading`, `StatusIndicator` e `Icon`) em `src/shared`, sem biblioteca completa de UI. Ícones usam `lucide-react` somente por wrapper central. Estruturas reutilizáveis ficam em `shared`; composições específicas em `features`.

Criar shells distintos: paciente com leitura focada para mobile/tablet/totem e enfermagem com sidebar desktop, navegação compacta e maior densidade para tablet/desktop. Ambos são Server Components estáticos, sem dados clínicos fictícios ou funcionalidade real.

## Alternativas consideradas

- Biblioteca completa de componentes: rejeitada por custo, dependências e abstração prematura.
- Um único shell para ambos os públicos: rejeitado por contextos de uso e densidade incompatíveis.
- Valores visuais diretamente nos componentes: rejeitados por inconsistência e manutenção difícil.
- Client Components para navegação responsiva: rejeitados porque CSS e links nativos atendem ao marco.
- Tabela preenchida com pacientes fictícios: rejeitada para não simular persistência ou funcionalidade inexistente.

## Consequências positivas

Identidade consistente, responsividade sem JavaScript, acessibilidade previsível, componentes pequenos e evolução gradual sem aprisionamento a biblioteca de UI.

## Consequências negativas

Componentes próprios exigem manutenção; os tokens ainda são provisórios; a navegação compacta não oferece menu interativo e os shells não validam fluxos reais.

## Condições de revisão

Revisar quando pesquisa de uso, acessibilidade ou necessidades funcionais demonstrarem limites concretos nos tokens, componentes ou shells. Adoção de biblioteca de UI, alteração estrutural relevante ou novo tema exige justificativa e avaliação de migração.
