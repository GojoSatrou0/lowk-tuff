# Free Netlify, Render and Neon hosting

**Current deployment choice:** use [Northflank Sandbox](NORTHFLANK.md) for a host without a card. Render required card verification on this account, so no Render service was created. The Netlify build steps below work with either backend host. The Render section remains an optional configuration reference.

The frontend is https://velocity-arena.netlify.app/. Netlify serves game files and proxies `/api` to one Render Free Node service. Neon Free stores accounts, password hashes, hashed sessions, coins and loadouts across Render restarts. No paid disk is required.

## Backend

Use the `codex/velocity-arena` branch in https://github.com/GojoSatrou0/lowk-tuff. The original game remains on `main`. Exclude `.env*`, `data/`, logs, `.npm-cache/`, `node_modules/`, `test-output/`, `dist/` and the preserved starter archive from source uploads.

Create one Render **Free Web Service**, Node runtime, Singapore, with automatic deploys off. Build with `npm ci --omit=dev --ignore-scripts && npm run db:migrate`; start with `node server.js`; health check `/health`. Set these private server environment variables:

| Variable | Value |
| --- | --- |
| NODE_ENV | production |
| NODE_VERSION | 22.22.0 |
| REQUIRE_DATABASE | true |
| DATABASE_URL | Neon pooled connection string |
| DATABASE_URL_UNPOOLED | Neon direct connection string for migrations |
| PUBLIC_ORIGIN | https://velocity-arena.netlify.app |

Create a Neon **Free** project in Singapore. Keep connection strings in Render's environment settings only. Never put them into frontend code, Netlify Drop, GitHub or screenshots. `npm run db:migrate` uses the direct connection and versioned Drizzle migrations. Validate schema changes on a Neon branch before production. The optional `scripts/verify-neon.mjs` must run only against a validation branch with `ARENA_VALIDATION_DATABASE=true`; it creates disposable fixture accounts.

The server refuses to start if the required database is missing. It waits for database commits before acknowledging account changes. Revision checks prevent an older overlapping server from overwriting newer progress. Run only one instance: rooms and simulation remain in memory, and accounts are stored as a versioned database snapshot suitable for a small private arena.

## Update Netlify

1. Open the backend `/health` and check JSON with `name: "Velocity Arena"`, `emailAccounts: true`, and `storage: "database"`.
2. Run `BUILD_NETLIFY.bat` and enter the backend HTTPS URL, or set `ARENA_SERVER_URL` and run `npm run build:netlify`.
3. Upload the generated **dist** folder to the existing Netlify site's deployment area. This contains public frontend files and proxy rules only.
4. Verify `https://velocity-arena.netlify.app/api/status` returns JSON. Check email signup, logout/login, saved coins, and a two-player room.

For Git-connected Netlify, use build command `npm run build:netlify`, publish directory `dist`, and environment variable `ARENA_SERVER_URL`. No database credentials belong on Netlify.

Netlify uses [HTTPS proxy rules](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) and polling gameplay. Opening the Render game URL directly enables WebSockets. Cookies remain HttpOnly, Secure and SameSite=Strict on each game origin. Both addresses reach the same backend; use the Netlify link consistently for a shared browser session.

## Free-plan limits

[Render Free](https://render.com/docs/free) sleeps after 15 minutes without traffic and may take about a minute to wake. The game retries only read-only startup checks, up to two minutes. It never automatically replays purchases or registration. Free Play stays available while waiting. Active rooms end on server restart; committed accounts survive in Neon.

Free quotas can suspend the game or database until reset. Keep all services on free plans and do not enable automatic paid upgrades or paid overages. This setup does not promise unlimited traffic or continuous availability. Neon Free has storage and compute quotas; inspect usage in its dashboard. Do not use Render's expiring free Postgres or a paid persistent disk for this configuration.

An HTML `/api/status` response means proxy setup is missing or the backend is waking. Persistent 502/504 responses require checking Render's deploy logs. A 403 account response requires `PUBLIC_ORIGIN` to match the Netlify origin exactly.

Email is a login identifier. Email verification, password-reset emails, and OAuth are not implemented. Local PC accounts are separate from the newly hosted database. Browser crosshairs and controls remain local preferences.
