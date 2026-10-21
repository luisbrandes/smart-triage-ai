# Conexões PostgreSQL

`src/server/db/prisma.ts` mantém um Prisma Client por processo Node.js, inclusive em produção e após reavaliação do módulo. O adapter PostgreSQL gerencia um pool; uma conexão física única serializaria requisições concorrentes.

O pool abre conexões conforme necessário, até 2 por instância. A espera por conexão é limitada a 30 segundos para hosts remotos e 5 segundos para localhost/loopback; `DATABASE_CONNECTION_TIMEOUT_MS` permite override de 1 a 120000 milissegundos. Conexões ociosas são encerradas após 30 segundos. TCP keepalive ajuda a detectar conexões interrompidas.

Os limites server-side de consultas e locks são opcionais: `DATABASE_STATEMENT_TIMEOUT_MS` e `DATABASE_LOCK_TIMEOUT_MS`, inteiros de 1 a 120000 milissegundos. Sem essas variáveis, o driver não envia esses parâmetros de startup e prevalecem as políticas do servidor/provedor. Para conexão direta local, 15000 e 5000 foram testados. Antes de habilitá-los em um endpoint pooled, confirme o suporte do provedor: PgBouncer pode rejeitar parâmetros de startup e não preserva estado de sessão em modo transacional. Não habilitar automaticamente essas opções na Vercel.

Timeout retorna falha ao caso de uso; não representa sucesso. Não há retry automático genérico de gravações. Os retries existentes, específicos para conflitos e operações idempotentes, permanecem nos repositories.

Falhas de conexão geram somente evento, correlação e código allowlisted no logger. URLs, credenciais, SQL, payloads e mensagens brutas de erro não são registrados. O driver descarta conexões defeituosas e pode abrir novas nas próximas requisições; falhas não são convertidas em autorização ou sucesso.

Na Vercel, cada instância tem seu próprio pool. O limite total cresce com a quantidade de instâncias; use a conexão pooled do provedor e dimensione o limite conforme a capacidade do banco e medições de carga. Duas conexões por instância são uma configuração inicial, não um dimensionamento comprovado por teste de carga.

Não executar `$disconnect()` após cada requisição. Desconexão explícita fica restrita ao encerramento de scripts e testes. A URL `prisma+postgres://` mantém o caminho existente de Accelerate; os parâmetros acima pertencem exclusivamente ao adapter TCP `PrismaPg`.

O teste `prisma-connection.test.ts` abre um servidor TCP fictício que nunca responde ao protocolo PostgreSQL, verifica o timeout e confirma a reutilização do mesmo client após reimportação em produção. Não conecta a banco real nem executa migrations.
