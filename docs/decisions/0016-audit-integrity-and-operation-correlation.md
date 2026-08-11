# ADR 0016 — Integridade da auditoria e identidade operacional

- **Status:** Aceita

## Decisão

Manter auditoria síncrona dentro das transações existentes, sem barramento de eventos. Ações profissionais derivam `actorReference` da sessão autorizada; serviços automáticos usam referências estáveis. `AuditEvent` permanece acessível somente por criação nos repositories e recebe trigger PostgreSQL que rejeita `UPDATE` e `DELETE`.

Correlação distribuída foi rejeitada neste marco por não haver serviços distribuídos. O logger estruturado aceita apenas operação, identificador de correlação local, ator categórico, entidade, estado, duração, resultado e código sanitizado.
