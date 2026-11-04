# iflex0x.com

source of [iflex0x.com](https://iflex0x.com/), astro static plus cloudflare pages functions.

build: `pnpm install`, `pnpm check`, `pnpm test`, `pnpm build`, output in `dist/`.
preview: `pnpm preview`.
local with functions and d1: `pnpm db:migrate`, `pnpm build`, `pnpm dev:pages`.

invoices live on `invoice.iflex0x.com`:

- `/i/<token>` renders one invoice from the d1 database `INVOICES_DB`
- `/admin` sits behind cloudflare access

pages environment: `ENVIRONMENT`, `ADMIN_EMAIL`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`.
local dev also honours `DEV_BYPASS_ACCESS=1` on a localhost hostname.
bindings: KV `Z_LISTEN` for the listening widget, D1 `INVOICES_DB` for invoices.
optional: `GITHUB_TOKEN` raises the github rate limit for the projects list, which is fetched at build time and only updates on the next deploy.

migrations: `pnpm db:migrate` for local, `pnpm db:migrate:remote` for production.

license: all rights reserved.
