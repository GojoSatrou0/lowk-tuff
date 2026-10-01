# Northflank deployment reference

**Not used for this deployment.** On October 1, 2026, the team was switched to **Developer Sandbox (Free)** and an empty free project was created in London. The service creation page still required a payment card for account verification. No service was created and no payment details were entered. Render also required a card. The game was successfully deployed on [Alwaysdata Free](ALWAYSDATA.md), without a card.

The game source and passing tests are published on [codex/velocity-arena](https://github.com/GojoSatrou0/lowk-tuff/tree/codex/velocity-arena). The Neon Free database is ready. Local account files and private settings were excluded from publication.

## Service configuration

First open team billing and select **Developer Sandbox**, confirming that the active plan is Free. The dashboard may require removing empty projects created under pay-as-you-go before it permits this switch. Then create a project on Northflank Cloud and a **combined service** from `GojoSatrou0/lowk-tuff`, branch `codex/velocity-arena`. Use the root `Dockerfile` and repository root build context. Choose one free instance; do not enable paid resources, autoscaling or paid volumes. Stop if a card is required even after the free plan is active.

Set private runtime variables:

| Variable | Value |
| --- | --- |
| NODE_ENV | production |
| REQUIRE_DATABASE | true |
| DATABASE_URL | Production Neon pooled connection string |
| DATABASE_URL_UNPOOLED | Production Neon direct connection string |
| PUBLIC_ORIGIN | https://velocity-arena.netlify.app |
| PORT | 3000 |

The Docker image already uses Node 22. Keep secrets in runtime settings, not build arguments, source files or the frontend. Run migrations before startup using custom entrypoint `sh -c` and command `"node scripts/migrate.mjs && exec node server.js"`. Set the HTTP health check to `/health`. Expose HTTP port 3000 publicly; Northflank supplies an HTTPS hostname. Disable automatic build/deploy after the initial deployment so later code uploads do not interrupt matches.

See the official [combined service guide](https://northflank.com/docs/v1/application/getting-started/build-and-deploy-your-code) and [command override reference](https://northflank.com/docs/v1/application/run/override-command-entrypoint).

## Connect the existing game

Open the new backend's `/health`. It must report `ok: true`, `emailAccounts: true`, and `storage: "database"`. Run `BUILD_NETLIFY.bat` with that HTTPS hostname, then upload the generated **dist** folder to the existing Netlify project. The builder is host-independent and installs the same-origin API proxy. See [Netlify build instructions](NETLIFY.md#update-netlify).

Verify live signup, email login, logout, and two-player create/join/ready/movement through the Netlify URL. Rooms end on server replacement; committed progress stays in Neon. Free-plan quotas can pause service. Keep every provider on its free plan and never add a card or enable automatic paid upgrades for this deployment.
