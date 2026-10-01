# Alwaysdata Free deployment

Deployed and verified on October 1, 2026. The Node backend runs at **https://mikudayo.alwaysdata.net/** and the existing frontend at **https://velocity-arena.netlify.app/** proxies its API. Alwaysdata's account dashboard confirms **Free: 1 GB disk, 256 MB RAM, 0.25 CPU**. No card or paid service was used. Render and Northflank required a card, so neither runs a game service.

Alwaysdata's [homepage](https://www.alwaysdata.com/en/) explicitly advertises free registration without a credit card. Its [Free offer](https://www.alwaysdata.com/en/offers/) currently lists 1 GB SSD, 256 MB RAM and a quarter CPU for personal use. Its [WebSocket guide](https://help.alwaysdata.com/en/blog/2023-03-14-hold-on-to-your-socks-high-speed-data-stream-hosting-with-websockets/) documents Node.js WebSocket hosting. Verify the actual account remains on Free before deployment. Do not select a paid trial or provide payment details.

## Install the published game

Use the public `codex/velocity-arena` branch in `GojoSatrou0/lowk-tuff`. Run these commands in the hosting account's authenticated SSH terminal, replacing the installation location only if necessary:

```sh
git clone --depth 1 --single-branch --branch codex/velocity-arena https://github.com/GojoSatrou0/lowk-tuff.git velocity-arena
cd velocity-arena
npm ci --omit=dev --ignore-scripts
```

Select Node.js 22 or newer. The current dependencies use about 11.4 MiB locally, well within the advertised disk allowance. Leave local account files, private environment files and logs off public GitHub and Netlify.

## Configure the website

The deployed site is `mikudayo.alwaysdata.net`, site ID `1082506`, using Node.js major version `22`, working directory `/home/mikudayo/velocity-arena`, and the following command:

```sh
sh -c 'node scripts/migrate.mjs && exec node server.js'
```

Set these variables privately in the site's environment:

| Variable | Value |
| --- | --- |
| NODE_ENV | production |
| REQUIRE_DATABASE | true |
| DATABASE_URL | Production Neon pooled URL |
| DATABASE_URL_UNPOOLED | Production Neon direct URL |
| PUBLIC_ORIGIN | https://velocity-arena.netlify.app |
| HOST | `::` (Alwaysdata requires IPv6) |
| PORT | Provided by Alwaysdata; this site receives `8100` |

The site has **Force HTTPS enabled** and **Idle time set to 0**, following the host's WebSocket guidance. The existing server supports `HOST` and `PORT`; do not hardcode the external HTTPS port. Keep credentials out of command history, public source, screenshots, and frontend files. Use only one server instance because room simulation lives in memory.

The initial installation used a one-time site command to clone the public branch and run `npm ci --omit=dev --ignore-scripts`, followed by migration and startup. It was replaced with the permanent command above after success. Automatic source updates are not configured: later GitHub uploads do not restart the game. For updates, pull the intended reviewed revision in the installation folder, install dependencies if needed, and restart the site. Restarting ends active matches.

Both the backend `/health` and Netlify `/api/status` returned `ok: true`, `emailAccounts: true` and `storage: "database"`. Live checks passed for email signup/login/logout, 100 starting coins, purchase/loadout persistence, two-player create/join/ready/movement, full-room rejection and secure WebSocket access. Coins, weapons and email login survived an actual site restart. See [Update Netlify](NETLIFY.md#update-netlify) for subsequent frontend releases.

The small free instance is intended for private duels; public load capacity is not measured. Free hosting and database quotas still apply. Keep all services on free plans. The user's restricted network has not been tested.
