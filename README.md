# iflex0x.com

source of [iflex0x.com](https://iflex0x.com/), astro static plus cloudflare pages functions.

build: `pnpm install`, `pnpm check`, `pnpm test`, `pnpm build`, output in `dist/`.
preview: `pnpm preview`.
local with functions and d1: `pnpm build` then `pnpm dev:pages`.

invoices live on `invoice.iflex0x.com`:

- `/i/<token>` renders one invoice from the d1 database `INVOICES_DB`
- `/admin` sits behind cloudflare access, one-time pin to `ad@iflex0x.com`

pages environment: `ENVIRONMENT`, `ADMIN_EMAIL`, `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`.

migrations: `pnpm db:migrate` for local, `pnpm db:migrate:remote` for production.

license: all rights reserved.
