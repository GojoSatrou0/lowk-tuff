# Hosting and restricted networks

For an existing Netlify frontend, follow [the Netlify setup guide](NETLIFY.md). It explains deploying the Node backend and generating proxy rules for the frontend; a static Netlify upload alone cannot run this backend.

## The connection model

One Node process serves both the game and multiplayer on the same origin. All clients send **inputs**, not claimed positions, damage, or scores. The server simulates at 60 Hz and broadcasts snapshots over WebSocket at 20 Hz. The browser predicts local movement and corrects toward server positions; remote avatars are interpolated.

The normal internet connection is:

```text
Player A ─┐                  ┌─ game HTML / JS / assets
          ├── HTTPS :443 ─────┤
Player B ─┘                  └─ same Node service / shared room
                               WSS /socket OR HTTPS POST /api
```

No WebRTC, PeerJS, STUN, TURN, or peer-to-peer UDP is required by this version. The old Python relay under `starter/` is not compatible with the new arena protocol; launch `server.js`.

## Deploy on Render

1. Put the **contents of Velocity-Arena** in a Git repository. Exclude `data`, `node_modules`, `.npm-cache`, logs, and test output. Keeping `starter/` is optional for deployment; the server never serves it.
2. On Render create a **Web Service** connected to that repository. Alternatively use the supplied `render.yaml` Blueprint.
3. Select the **Free** plan, runtime **Node**, build command **npm ci --omit=dev --ignore-scripts && npm run db:migrate**, start command **node server.js**, and health check **/health**. Configure Neon credentials as described in [Netlify setup](NETLIFY.md). If Velocity-Arena is nested inside a larger repository, set its root directory to that folder.
4. Keep **one running instance** for this in-memory room implementation. Multiple independent instances would have different rooms; multi-instance scaling needs shared room storage and routing.
5. Deploy, then open the generated **HTTPS URL** on both devices. Create a room and send its invite/code to your friend.

The server binds `0.0.0.0` and reads Render's `PORT` environment variable. Render terminates HTTPS and routes it to the app. Its web services support WebSocket connections. A static site deployment cannot run the server. See [Render web services](https://render.com/docs/web-services) and [Render WebSockets](https://render.com/docs/websocket).

Choose hosting that keeps the process available during play. Sleeping/restarting hosts end in-memory sessions. Read the provider's current resource limits and pricing before enabling a plan; this project does not create a hosting account or purchase a plan.

## Docker / another provider

```sh
docker build -t velocity-arena .
docker run --rm -p 3000:3000 -e DATA_DIR=/app/data -v velocity-wallets:/app/data velocity-arena
```

For public internet play, put a trusted HTTPS reverse proxy or the host's managed TLS in front of it. Route `/`, `/api`, `/api/auth`, `/api/status`, `/health`, and WebSocket upgrades on `/socket` to the same instance. Disable caching for API responses. Use a valid TLS certificate. An HTTPS page must use secure WebSockets (`wss://`); the client chooses the correct scheme automatically.

The origin check requires the proxy to preserve the public `Host` header. If API calls get a 403 behind a custom proxy, check this forwarding configuration instead of removing origin validation.

## Keep coins after redeploying

Cloud wallets use Neon Free Postgres with `DATABASE_URL`. The supplied `render.yaml` uses a free service and requires the database; it provisions no paid disk. Local wallets use `data/profiles.json` or `DATA_DIR`. The Docker command above mounts a local persistence volume.

Run one instance. Cloud data is a versioned Postgres snapshot with stale-writer protection; local data uses JSON. Rooms and simulation are still single-process. Server restart ends rooms but preserves balances, ownership, and loadouts when the disk persists. If the saved file cannot be parsed, startup fails instead of silently replacing it.

Guest players keep an anonymous bearer token in site storage. The server stores only its hash. This grants access to that guest wallet, so do not share it. Creating an account transfers the current guest wallet to that account and invalidates its old guest token. Account users can sign in on another browser/device to retrieve the same progress, provided they use the same server. If the server's data is lost, accounts and wallets must be restored from backup.

The server calculates purchases and rewards. Sending a claimed coin balance, price, hit, or reward does not grant coins. Solo also runs on the server to award trusted coins, pausing when its menu is open. Local offline practice can use the cached loadout but cannot purchase or earn. Both players in a duel need separate browser profiles/devices; two tabs sharing the same wallet cannot enter separate rooms at once.

## When multiplayer is blocked

There are different kinds of blocks:

| What works / fails | What to do |
| --- | --- |
| The HTTPS site opens, but WebSockets are blocked | Enable **Use HTTPS compatibility mode** before creating/joining. The client also falls back automatically when its WebSocket fails. |
| WebRTC / UDP is blocked | This arena does not require either. Both players connect to the shared HTTPS service. |
| The game domain itself is filtered | Ask the network administrator to approve the domain. A transport change cannot unblock a denied website. |
| The site loads but `/api` POST requests are filtered | Ask for the app's HTTPS API to be allowed; compatibility mode still needs these requests. |
| School/guest Wi-Fi isolates devices from one another | Use an approved publicly hosted HTTPS service, or ask for an approved LAN configuration. LAN discovery cannot overcome client isolation. |
| Room code works for one friend but not another | Both players must use the same server/domain and the same single backend instance. |
| Session expired | Rejoin. A long disconnect, sleeping browser tab, or server restart can expire the session. |

Compatibility mode uses ordinary **HTTPS POST requests on port 443** when the service is deployed with HTTPS. Locally it is plain HTTP on port 3000. Polling has higher latency and more overhead than WebSockets; it is a compatibility option, not a way to make every blocked network work. Use an approved alternate network if the network owner cannot allow the game. This project does not hide traffic or bypass access policies.

An administrator can approve the one game hostname on TCP 443, `GET` for assets and status, `POST /api` and `POST /api/auth`, and optionally WebSocket upgrades on `/socket`. If WebSockets remain prohibited, HTTPS-only players can still share a match with WebSocket players.

## Accounts on a hosted server

- Use a single public HTTPS address for all players. Accounts live on that backend; separate copies of the game have separate accounts.
- Set **NODE_ENV=production** when using HTTPS. The included Docker image and Render configuration do this. This adds `Secure` to the HttpOnly, SameSite=Strict session cookie. Do not turn it off to fix a public HTTP deployment; enable HTTPS instead.
- The normal `npm start` local development launch uses HTTP cookies so localhost works. For a local-only HTTP Docker test, explicitly add `-e NODE_ENV=development`; keep production mode for an internet deployment. Use HTTPS for account sign-in over shared networks.
- For free hosting, configure **DATABASE_URL** and **DATABASE_URL_UNPOOLED** with private Neon credentials and set **REQUIRE_DATABASE=true**. For local disk storage, set **DATA_DIR** to a persistent directory and back it up. It contains password hashes, hashed sessions, and account progress; keep the whole directory private, including the migration backup. The game never serves this directory, and release ZIPs exclude it.
- Allow JSON `POST /api` and preserve cookies and the public Host header through the proxy. Account operations use this same endpoint as gameplay; `/api/auth` remains as a compatibility alias. Accounts work with both WebSocket and HTTPS compatibility gameplay. `/health` reports `emailAccounts: true` on the updated server.
- Login attempts are limited by username and connection IP, and expensive password hashing has a concurrency limit. A reverse proxy makes clients share its IP limit; this conservative setup suits small private servers. Larger deployments need a deliberately configured trusted proxy / edge rate limiter and a shared transactional database.

Email/password sign-in and registration work without a mail provider. No mailbox verification, email delivery, recovery, or password reset is implemented: emails are unverified identifiers, and must not authorize later recovery or external account linking without a verification flow. Private email addresses remain in the server data and the owner's authenticated account response, never public game snapshots. Usernames remain public. The server uses native asynchronous scrypt with unique salts (N=32768, r=8, p=3), constant-time hash comparison, 30-day random sessions stored as hashes, same-origin JSON checks, and logout revocation. The settings use one of [OWASP's recommended scrypt configurations](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt) with [Node's scrypt API](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

## Verify an internet deployment

1. Open `/health`: it should return `ok: true`.
2. On **two different networks**, open the HTTPS game URL.
3. Create/join a room and ready both players.
4. Check the in-game room/transport labels and matching round numbers/scores.
5. Test movement, aiming, cover, a full match, rematch, and leaving.
6. Repeat with one player using compatibility mode.

Local HTTP and WebSocket behavior has been tested. Public HTTPS hosting and behavior on your actual restricted network still require deployment and this real-network check.
