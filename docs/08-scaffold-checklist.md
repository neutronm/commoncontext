# 08 — Scaffold Checklist (Fred, solo, before dispatch)

Do this yourself. Every minute here saves an hour of agents inventing incompatible conventions.

---

## 1 — Next.js app (web Worker)

Run inside your existing repo:

```bash
npx create-next-app@latest . \
  --typescript --tailwind --app --src-dir \
  --no-eslint --import-alias "@/*"

npm i postgres@^3.4.5
npm i -D @opennextjs/cloudflare wrangler vitest dotenv-cli
npx shadcn@latest init
npx shadcn@latest add button textarea badge
```

`--no-eslint` is deliberate: agents will otherwise spend real time chasing lint errors that have no effect on a recorded demo.

## 2 — OpenNext wiring

`open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig();
```

`next.config.ts` — **this is the one that breaks everything if you skip it:**

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

Without that call, every `getCloudflareContext()` throws in `next dev` and both Agent A and Agent C are blocked on an error whose cause is in a file neither of them owns.

Root `wrangler.jsonc`:

```jsonc
{
  "name": "shared-context-web",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-07-25",
  "compatibility_flags": ["nodejs_compat"],
  "assets": { "directory": ".open-next/assets", "binding": "ASSETS" },
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<config id>" }]
}
```

## 3 — Supabase + Hyperdrive

`psql` must be on your PATH — `brew install libpq` (and link it) on macOS, `apt install postgresql-client` on Linux. Every migration, seed, and between-take reset goes through it. Check now, not when the first migration fails.


Create a Supabase project (provisioning runs in the background while you continue).

From project settings, copy the **Direct connection** string — *not* the pooled/Supavisor one. Hyperdrive does its own pooling, and pointing it at another pooler is the documented wrong answer.

```bash
npx wrangler hyperdrive create shared-context-db \
  --connection-string="postgres://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
  --caching-disabled
```

`--caching-disabled` at creation time, so the config itself can never serve a stale read — this doesn't depend on any binding-level setting being right.

Paste the returned config id into **both** `wrangler.jsonc` files:

```jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<config id>" }]
```

Caching off is not optional here. The database changes mid-recording — Beat 3 creates a proposal, Beat 4 responds to it — and a cached read would show Sara's assistant a world where her dispute never happened. It would look exactly like a permissions bug.

### Your machine needs a different string than Hyperdrive does

Hyperdrive takes the direct string, above. Everything that runs **on your laptop** — `psql`, migrations, seed, tests, `wrangler dev` — should use Supabase's **session-mode pooler** instead:

```
postgres://postgres.<project-ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Port **5432** on the pooler host is session mode, not the 6543 transaction-mode port. Session mode keeps prepared statements working, which postgres.js relies on.

The reason to switch: Supabase direct connections resolve to IPv6, and Cloudflare's network handles that fine while a home or office connection often doesn't. Using the direct string locally produces a network-unreachable error that reads like a credentials problem.

Then in `.env.local`:

```
DATABASE_URL=<session-mode pooler string>
WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=<session-mode pooler string>
```

Confirm `.env.local` is gitignored, and commit a `.env.example` with the key names and empty values.

**Three roles, two strings — worth writing on a sticky note:** Hyperdrive config → direct. Local tooling → session pooler. Deployed Workers → neither, they get the binding.

## 4 — Folder skeleton

```bash
mkdir -p src/domain/__tests__ src/app/workspace src/app/review/\[id\] \
         src/components supabase/migrations mcp-worker/src/tools docs
find src/domain src/app/workspace src/app/review src/components \
     supabase mcp-worker -type d -empty -exec touch {}/.gitkeep \;
```

Move the spec files into `docs/` so agents read them from inside the repo rather than from pasted text — pasted specs get truncated and half-remembered.

## 5 — Scripts in `package.json`

You own this file; agents must not edit it.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts",
    "db:reset": "dotenv -e .env.local -- sh -c 'psql $DATABASE_URL -f ./supabase/migrations/0001_init.sql'",
    "db:seed": "dotenv -e .env.local -- sh -c 'psql $DATABASE_URL -v fred_token=\"$DEMO_TOKEN_FRED\" -v sara_token=\"$DEMO_TOKEN_SARA\" -f ./supabase/migrations/0002_seed.sql'",
    "test": "dotenv -e .env.local -- vitest run"
  }
}
```

The `-v` flags are how the tokens reach the seed: a plain SQL file cannot read `.env.local`, so `psql` passes them in as variables and the seed references them as `:'fred_token'` / `:'sara_token'`. This is also why the tokens must be in `.env.local` as well as in the Worker vars.

`db:seed` is your reset between recording takes. Beats 3 and 4 create live objects, and Beat 1's answer depends on the August 15 proposal being pending — a state that exists only between them. Without a one-command reset you'll be hand-editing rows in the Supabase table editor mid-shoot.

## 6 — Tokens

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"   # run twice
```

Put them in `mcp-worker/wrangler.jsonc` under `vars` as `DEMO_TOKEN_FRED` / `DEMO_TOKEN_SARA`, and in `.env.local` so the seed file can reference the same values. They're demo-lifetime tokens for a throwaway database — vars are fine, and secrets would only make them harder for agents to test against.

## 7 — Deploy both Workers empty, now

Not at the end.

```bash
npm run deploy                          # web
cd mcp-worker && npx wrangler deploy    # after Agent B creates it — placeholder for now
```

You need the web Worker's URL as `PUBLIC_APP_URL` for the MCP Worker, and you'd rather discover an OpenNext build failure on a blank page than after three branches are merged.

## 8 — `vitest.config.ts`

Yours, not Agent A's. Plain Node — the tests connect straight to Supabase, no Workers pool:

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", fileParallelism: false } });
```

`fileParallelism: false` because every test file shares one database and one seed.

## 9 — Branches

```bash
git add -A && git commit -m "scaffold" && git push
git branch track/domain && git branch track/mcp && git branch track/ui
git push -u origin track/domain track/mcp track/ui
```

## 10 — Paste `src/domain/types.ts` yourself

Copy it from doc 04 onto `main` and push before dispatching. It's the contract all three tracks import, and having it on `main` from minute zero removes the only real ordering dependency in the day.

---

## Pre-dispatch check

- [ ] `npm run dev` serves the default page locally
- [ ] `npm run deploy` succeeds; web Worker URL live
- [ ] `psql $DATABASE_URL -c "select 1"` succeeds
- [ ] Hyperdrive config created from the **direct** connection string, caching disabled
- [ ] `.env.local` uses the **session-mode pooler** string, not the direct one
- [ ] `next.config.ts` calls `initOpenNextCloudflareForDev()`
- [ ] Same Hyperdrive `id` in both `wrangler.jsonc` files
- [ ] Three branches pushed, all pointing at the scaffold commit
- [ ] `src/domain/types.ts` on `main`
- [ ] Spec docs in `docs/`

Then paste docs 05, 06, 07 into three sessions. Next stop is Checkpoint 1 in doc 09.
