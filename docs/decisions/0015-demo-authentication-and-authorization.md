# ADR 0015 — Autenticação e autorização demonstrativas

- **Status:** Aceita

## Decisão

Separar sessões de paciente e enfermagem em cookies `httpOnly`, `sameSite=strict`, seguros em produção, assinados por HMAC e com expiração. A sessão do paciente carrega somente o UUID opaco da triagem. A enfermagem autentica com credencial configurada exclusivamente no servidor e recebe sessão assinada com referência estável do ator; layout e Server Actions profissionais exigem essa sessão. A sessão de demonstração da enfermagem só é emitida/aceita em `APP_MODE=demo`. Login, APIs sensíveis e mutations usam rate limits distribuídos persistidos no PostgreSQL compartilhado.

## Limites

É proteção provisória para demonstração controlada, não identidade corporativa, RBAC, SSO ou autorização para uso clínico. O ator pode ser uma referência compartilhada configurada, não uma pessoa autenticada. Segredos não usam `NEXT_PUBLIC_` e devem ser substituídos por ambiente. O rate limit falha fechado quando o PostgreSQL está indisponível e requer que todas as instâncias usem o mesmo banco.
