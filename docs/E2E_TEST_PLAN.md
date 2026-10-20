# Plano mínimo de testes E2E

O projeto não contém Playwright, Cypress ou outra infraestrutura E2E instalada. A proposta mínima é adotar `@playwright/test` em desenvolvimento e executar um único projeto Chromium em execução local.

## Configuração

- `playwright.config.ts`: `testDir: "./tests/e2e"`, `baseURL: http://127.0.0.1:3000`, `fullyParallel: false`, timeout de 30 s e traces somente em falha.
- `webServer`: iniciar Next local com `DATABASE_URL` e `DIRECT_DATABASE_URL` definidos a partir de `TEST_DATABASE_URL`; exigir loopback no `globalSetup` pela mesma proteção usada na suíte PostgreSQL. Nunca carregar uma URL padrão desconhecida.
- `globalSetup`: executar `prisma migrate deploy` no banco de teste e preparar fixtures sintéticas com identificador único por execução. Não limpar dados de produção; preferir namespace por run e limpeza limitada à fixture.
- Credenciais E2E vêm de variáveis locais exclusivas de demonstração; não devem ser colocadas em código, screenshots ou logs.
- Groq permanece desabilitado para a suíte E2E: validar indisponibilidade por configuração local sem chave ou por mock/injeção no servidor, e deixar chamada real no smoke test manual documentado em `TECHNICAL_AUDIT_2026-10-19.md`.

## Jornadas a automatizar

1. Iniciar triagem e percorrer identificação, consentimento, anamnese e sinais vitais com dados inventados.
2. Concluir a análise e conferir o estado de revisão no painel de enfermagem.
3. Acionar geração de IA mockada ou sem chave, conferir estado indisponível sem bloquear revisão, e validar recuperação do estado após recarga.
4. Cancelar uma triagem em andamento e confirmar que ela não aparece como concluída/fila profissional.
5. Tentar navegação direta e actions sem sessão, com sessão inválida e com estado incompatível; verificar redirecionamento/rejeição e ausência de mutation.

Antes de instalar a dependência, restaurar acesso normal ao registry e executar a verificação de assinatura padrão do pnpm. A instalação não foi feita nesta etapa porque o pnpm fixado recusou a verificação de assinatura enquanto o registry falhava.
