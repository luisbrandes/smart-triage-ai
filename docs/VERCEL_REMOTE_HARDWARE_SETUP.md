# Homologação remota na Vercel

## Objetivo

Permitir que um ESP32 em uma rede residencial acesse `https://smart-triage-ai-teal.vercel.app` por HTTPS. É uma demonstração experimental, sem autorização para uso clínico ou com dados reais.

## Variáveis privadas na Vercel

Configure para o ambiente desejado (`Preview` ou `Production`):

- `DATABASE_URL`: conexão PostgreSQL de runtime, preferencialmente com pool compatível com serverless.
- `DIRECT_DATABASE_URL`: conexão direta usada por migrations.

As duas variáveis devem apontar ao mesmo banco e schema, mas podem exigir URLs diferentes. Em Prisma Postgres, use a URL pooled (`pooled.db.prisma.io`) em `DATABASE_URL` e a URL direta (`db.prisma.io`) em `DIRECT_DATABASE_URL`; obtenha ambas no Prisma Console para o mesmo banco. Não copie a URL pooled para `DIRECT_DATABASE_URL`: migrations precisam de conexão direta para locks e continuidade de sessão. Se estiver usando outro provedor PostgreSQL, siga a distinção equivalente entre endpoint pooled de runtime e endpoint direto para migrations.
- `SESSION_SECRET`: aleatório, mínimo 32 caracteres.
- `ACCESS_CREDENTIAL`: acesso demonstrativo aos painéis.
- `NURSE_ACTOR_REFERENCE`: referência genérica, sem nome real.
- `APP_MODE=demo`: habilita exclusivamente o motor demonstrativo.
- `TRIAGE_DEVICE_ID=ESP32-001`: dispositivo usado pela página de coleta.
- `DEVICE_TOKEN_PEPPER`: aleatório, mínimo 32 caracteres, diferente de `SESSION_SECRET`.

Nenhuma dessas variáveis deve usar prefixo `NEXT_PUBLIC_`. Depois de alterar variáveis ou migrations, faça novo deploy.

## Banco e deploy

O script `vercel-build` gera o Prisma Client, aplica migrations e executa o build. Para Next.js, a Vercel usa por padrão o script `build` do package.json; neste projeto, `build` executa somente `next build`. Portanto, migrations não são aplicadas automaticamente, a menos que o Build Command do projeto seja configurado explicitamente como `pnpm vercel-build`. Esse comando altera o banco configurado em `DIRECT_DATABASE_URL`; use-o somente quando a aplicação de migrations estiver autorizada.

O provisionamento abaixo cria o `MedicalDevice` caso ele ainda não exista ou rotaciona sua credencial caso já exista. O seed é somente demonstrativo; não execute reset em ambiente publicado com dados que precisem ser preservados.

## Provisionar ou rotacionar o token

Com as variáveis do ambiente correto carregadas localmente:

```bash
pnpm device:provision -- ESP32-001
```

O comando imprime `DEVICE_TOKEN` uma única vez e grava apenas o HMAC no banco. Copie o token diretamente para a configuração segura do firmware. Executar novamente rotaciona o token e invalida imediatamente o anterior.

## Verificações após deploy

```bash
curl -i https://smart-triage-ai-teal.vercel.app/api/device/session/current
```

Deve retornar `401`. Com token válido, deve retornar `200` e `IDLE` ou `ACTIVE`. Nunca cole o token em capturas, issues ou logs compartilhados.

## Limites conhecidos

- Não há uso clínico autorizado, certificação ou alegação de conformidade.
- A ingestão ainda não possui identificador idempotente fornecido pelo firmware.
- Rate limiting distribuído depende da proteção da plataforma/provedor e deve ser configurado antes de ampliar os testadores.
- O MVP usa um dispositivo configurado em `TRIAGE_DEVICE_ID`; pareamento de múltiplos dispositivos não está implementado.
- Use somente pessoas e dados fictícios durante a homologação.
