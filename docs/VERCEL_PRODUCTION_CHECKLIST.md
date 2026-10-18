# Checklist de produção — primeiro ESP32-001

## Antes do deploy

- [ ] `DATABASE_URL` configurada na Vercel.
- [ ] `DIRECT_DATABASE_URL` configurada na Vercel.
- [ ] `APP_MODE=demo`.
- [ ] `SESSION_SECRET`, `ACCESS_CREDENTIAL` e `DEVICE_TOKEN_PEPPER` configurados como secrets server-only.
- [ ] `TRIAGE_DEVICE_ID=ESP32-001`.
- [ ] `.env` não está versionado.

O build de produção executa `prisma generate`, `prisma migrate deploy` e `next build`. Não use `migrate reset`.

## Verificação segura após o deploy

```powershell
Invoke-WebRequest https://smart-triage-ai-teal.vercel.app/ -UseBasicParsing
Invoke-WebRequest https://smart-triage-ai-teal.vercel.app/api/device/session/current -UseBasicParsing
```

Resultados esperados:

- home: `200`;
- endpoint sem `Authorization`: `401`;
- token inválido: `401`;
- token real do dispositivo: `200` com `IDLE` ou `ACTIVE`.

Não registre nem cole tokens em terminal compartilhado, issues ou documentação.

## Configuração do firmware

```text
BASE_URL=https://smart-triage-ai-teal.vercel.app
DEVICE_ID=ESP32-001
DEVICE_TOKEN=token provisionado para ESP32-001
```

## Diagnóstico dos acessos

Os dois painéis usam `ACCESS_CREDENTIAL` para autenticar e `SESSION_SECRET` (ou o segredo legado `DEMO_SESSION_SECRET`) para assinar o cookie de sessão. `SESSION_SECRET` deve ter pelo menos 32 caracteres e estar configurado no ambiente **Production** da Vercel. Se a credencial correta retornar erro de servidor nos dois painéis, revise essa variável e faça um novo deploy. O código não usa fallback inseguro para criar sessões.

O firmware deve consultar a sessão, enviar `deviceId`, `sessionId`, `readingId`, `bpm`, `spo2` e `temperatura`, repetir o mesmo `readingId` em timeout e executar `release` com o `sessionId` da coleta.

## Limites da validação

Os checks HTTP acima não confirmam que a migration foi aplicada no banco de produção nem que as variáveis da Vercel possuem valores corretos. Essas verificações devem ser feitas no painel da Vercel e no provedor PostgreSQL sem expor credenciais.
