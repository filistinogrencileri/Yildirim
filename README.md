# Yıldırım — يلدرم

منصة خدمات تعليمية للطلاب الراغبين بالدراسة في تركيا: مفاضلات جامعية، ملف شخصي وخزنة مستندات، ومتابعة الطلبات من التقديم حتى القبول.

## Stack

- **Web:** Next.js (App Router) + TypeScript + Tailwind — Arabic-first, full RTL
- **API:** NestJS + Prisma
- **DB:** PostgreSQL 16

## Local development (Windows, portable toolchain)

The toolchain is project-local under `.tools/` (git-ignored): Node 22, pnpm via corepack, PostgreSQL 16 binaries. No system installs required.

```powershell
. .\scripts\dev-env.ps1     # puts node/pnpm/psql on PATH for this shell
pnpm db:start               # starts local Postgres (port 5432, data in .tools/pgdata)
pnpm install
pnpm dev                    # web on :3000, api on :4000
```

DB connection (dev): `postgresql://postgres:postgres@localhost:5432/yildirim`

## Layout

```
apps/web        Next.js frontend
apps/api        NestJS backend + Prisma schema
packages/shared enums, request state machine, zod schemas (shared web+api)
packages/config shared tsconfigs
docker/         production Dockerfiles + Caddyfile (VPS deploy)
```

The full architecture plan (schema, state machine, phases) lives with the project owner; see `docs/` as it grows.
