# Connect Netlify to the game server

**Live as of October 1, 2026:** https://velocity-arena.netlify.app/ connects to the [Alwaysdata Free backend](https://mikudayo.alwaysdata.net/) and Neon Free database. Netlify production deploy: `6abe584b44b3fa36a92cac68`. Email accounts and two-player gameplay were verified through the public Netlify API. No card or paid service was used. See [Alwaysdata configuration](ALWAYSDATA.md).

Netlify serves game files and proxies `/api` to one Node service. Neon Free stores accounts, password hashes, hashed sessions, coins and loadouts across server restarts. No paid disk is required. A production restart test confirmed that email login, purchased weapons, coins and loadout persist. Netlify uses HTTPS polling; the backend's direct address also supports secure WebSockets.

## Optional Render backend reference

Render and Northflank requested card verification for this account and were not used. The following is an optional reference for a different account; the deployed configuration is documented in [ALWAYSDATA.md](ALWAYSDATA.md).

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
2. Run `BUILD_NETLIFY.bat` and enter `https://mikudayo.alwaysdata.net`, or set `ARENA_SERVER_URL` to that address and run `npm run build:netlify`.
3. Upload the generated **dist** folder to the existing Netlify site's deployment area. This contains public frontend files and proxy rules only.
4. Verify `https://velocity-arena.netlify.app/api/status` returns JSON. Check email signup, logout/login, saved coins, and a two-player room.

For Git-connected Netlify, use build command `npm run build:netlify`, publish directory `dist`, and environment variable `ARENA_SERVER_URL`. No database credentials belong on Netlify.

Netlify uses [HTTPS proxy rules](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) and polling gameplay. Opening the backend game URL directly enables WebSockets. Cookies remain HttpOnly, Secure and SameSite=Strict on each game origin. Both addresses reach the same backend; use the Netlify link consistently for a shared browser session.

## Free-plan limits

Alwaysdata's verified Free account has 1 GB disk, 256 MB RAM and 0.25 CPU; it is configured with idle time 0 for WebSockets. The game retries only read-only startup checks, up to two minutes, if the backend is temporarily unavailable. It never automatically replays purchases or registration. Free Play stays available while waiting. Active rooms end on server restart; committed accounts survive in Neon.

Free quotas can suspend the game or database until reset. Keep all services on free plans and do not enable automatic paid upgrades or paid overages. This setup does not promise unlimited traffic or continuous availability. Neon Free has storage and compute quotas; inspect usage in its dashboard. Do not use Render's expiring free Postgres or a paid persistent disk for this configuration.

An HTML `/api/status` response means proxy setup is missing or the backend is waking. Persistent 502/504 responses require checking the backend host's deploy logs. A 403 account response requires `PUBLIC_ORIGIN` to match the Netlify origin exactly.

Email is a login identifier. Email verification, password-reset emails, and OAuth are not implemented. Local PC accounts are separate from the newly hosted database. Browser crosshairs and controls remain local preferences.
