# Acesso ao PostgreSQL

Este diretório é exclusivamente server-side. `prisma.ts` instancia um único Prisma Client com o adapter PostgreSQL e proteção `server-only`; páginas, componentes e módulos compartilhados não podem importá-lo.

O schema, as migrations e o seed ficam em `prisma/`. Para desenvolvimento local:

```bash
pnpm db:up
pnpm db:deploy
pnpm db:seed
```

Use `pnpm db:migrate --name <nome>` ao criar uma migration e `pnpm db:generate` após alterações no schema. Credenciais locais vêm de `.env`; nunca exponha `DATABASE_URL` ao navegador.
