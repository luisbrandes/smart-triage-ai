# Acessibilidade da interface

## Objetivo

O Smart Triage oferece preferências opcionais e combináveis para visão, leitura, áudio e conforto cognitivo. O painel é aberto pelo botão **Acessibilidade** nos headers ou por `Alt+A`; as escolhas são salvas somente no `localStorage` do navegador.

Isso melhora a experiência, mas não constitui certificação WCAG, avaliação com tecnologia assistiva ou garantia de compatibilidade total. Testes manuais com pessoas usuárias, leitores de tela e diferentes navegadores continuam necessários.

## Recursos implementados

- HTML semântico existente, idioma `pt-BR`, foco visível e link “Pular para o conteúdo principal”.
- Botão nativo acessível por Tab/Enter, com `aria-label`, `aria-expanded` e `aria-controls`.
- Modal nativo `dialog`, fechamento por Esc, restauração de foco e controles nativos.
- Alto contraste, escala de cinza e paletas alternativas para protanopia, deuteranopia e tritanopia.
- Texto em 100%, 115%, 130% ou 150% e dois níveis de espaçamento.
- Redução de movimentos, também respeitando `prefers-reduced-motion`.
- Modo de leitura simples, que melhora largura de linha e destaque de títulos.
- Leitura da página e leitura opt-in ao focar/apontar usando Web Speech API em `pt-BR`.
- Atalhos: `Alt+A` abre o painel, `Alt+L` lê o conteúdo e `Esc` fecha.
- Restauração integral das preferências padrão.

## Limites e segurança

- Paletas de daltonismo melhoram diferenciação, mas não substituem testes; informação essencial continua precisando de texto/ícone, nunca apenas cor.
- A Web Speech API depende do navegador e das vozes instaladas. Algumas plataformas podem usar serviços do sistema operacional; não se deve alegar processamento exclusivamente local sem validar o ambiente.
- Narração pode expor informações em voz alta. Ela é desativada por padrão e deve ser usada com privacidade adequada.
- “Leitura simples” não reescreve automaticamente conteúdo clínico. Textos alternativos simplificados devem ser escritos e revisados por produto/conteúdo antes de uso amplo.
- Leitores de tela nativos continuam sendo a opção principal para pessoas cegas; a narração embutida é complementar.

## Arquitetura

- `AccessibilityProvider`: estado, persistência, atributos no elemento `html`, atalhos e narração.
- `AccessibilityButton`: gatilho reutilizado pelos headers.
- `accessibility-preferences.ts`: contrato versionado e parser tolerante a dados inválidos.
- `globals.css`: tokens e transformações de apresentação ativadas por atributos `data-a11y-*`.

As preferências não são enviadas ao servidor, não entram no domínio clínico e não são registradas em auditoria ou logs.
