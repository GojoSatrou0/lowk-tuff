# Verification

## Version 1.9.1 animation update

- Syntax checks and all **100 tests passed** on October 1, 2026. Presentation checks cover all 15 weapons, bounded recoil and recovery, actual reload durations, equip timing, sniper bolt timing, scope cooldown/readiness, and reduced-motion behavior.
- A local browser fixture using the production renderer and scope helper displayed all 15 weapons, the sniper bolt/hand pose, and scoped shot and shell-ejection poses. The aiming reticle stayed at (640, 360) in the 1280 × 720 viewport during both the initial kick and bolt cycle.
- Reduced-motion mode set scope kick, flash, bolt movement and casing visibility to zero while retaining the cycling/ready indicator. No new browser errors appeared after the renderer correction found during this check.
- In the actual local game, Free Play rendered normally, switching to Longshot showed five rounds, and a left-click shot reduced ammo to four and triggered the bolt cycle. Application warning/error logs were empty.
- Scoped poses were verified with explicit fixture controls; a held-right-mouse scoped firing playthrough was not performed in the embedded browser. Camera yaw/pitch and shot directions are unchanged.
- This is a frontend presentation update compatible with the deployed 1.9.0 backend; no database migration or game-server restart is required.

## Version 1.9 training and grapple update

- Syntax checks and all **96 tests passed** on October 1, 2026.
- Grapple checks cover all 15 weapons, ray-selected anchors, actual pulling, momentum on release, cooldown, empty sky and range misses, forged fields, occlusion, thin-wall collision, speed limits, stun, death, reset and shooting while attached.
- A real WebSocket input attaches to server-selected geometry. An HTTP observer receives the same anchor; stale input releases the tether and starts its cooldown.
- Local drill tests produce real parry events, missed timing feedback, automatic retries, a speed-based clash win, a charging-trainer loss, and stun recovery. Practice stays non-scoring and does not issue coin events or account mutations.
- Browser verification landed a parry with F on the visible cue, observed the success count and streak, checked pause/retry/leave, and switched the stun trainer to charging with T. Both practice HUDs and the grapple status rendered without overlap at 1280×720; warning/error logs were empty. Holding a grapple and moving through a complete match were covered by simulation/network checks rather than a manual mouse-and-keyboard playthrough.

## Version 1.8 momentum and search update

- Syntax checks and all **86 tests passed** on October 1, 2026.
- New rules cover all nine blade/katana/scythe pairings in both player orders, staggered swings inside the clash window, speed-based wins, ties, cover/range/facing, action suppression and recovery, lone melee windup damage, air momentum retention, speed limits and thin-wall collision.
- A real HTTP/WebSocket integration check confirms both transports receive the same authoritative clash event and stun state. Client-supplied speed and stun values cannot control the outcome.
- The solo opponent chooses a melee approach when a melee-equipped player is close, and returns to gunplay at distance.
- The local browser rendered the updated lobby, readable Free Play speed meter, and gameplay guide. Application warning/error logs were empty. Automated tests validate transient clash/stun behavior; this browser check does not claim a manual live clash playthrough.
- Netlify build checks include public-only output with robots.txt and sitemap.xml. Server checks confirm both crawler files have the correct HTTP content types.
- Google Search Console verification/submission is **not performed**. Search-engine inclusion/ranking is not claimed. Follow [SEARCH.md](SEARCH.md).

## Automated checks

Run `npm run check` and `npm test` in the project folder. Syntax checks and all **69 tests passed** in the version 1.6.1 local verification run. All 25 entries from the supplied archive were checked in the base release; every original file has the same SHA-256 hash in `starter/`. These updates do not modify that folder.

The suite covers:

- Two-player ready gate, countdown, live round, timed draws and health tiebreakers.
- Camera-aligned forward/strafe movement, sprinting, slides, slide-jumps, and limited double jumps.
- Ramp traversal on all three maps, solid cover collision, and movement beneath the raised bridge.
- Ray/head hit detection and box/ramp obstruction.
- Magazine use, cooldowns, reload lockout, and refilling ammo.
- A full five-win match and mutual-ready rematch.
- Finite, clamped input validation; no client-authoritative damage, health, score, or position.
- Two actual HTTP clients creating, joining, readying, and moving in one server.
- Invalid session and third-player rejection, same-origin API enforcement, private source protection, and disconnect handling.
- A real WebSocket client sharing room state with an HTTP polling client.
- Starting wallet, exact purchase charges, repeat-purchase idempotency, insufficient-funds rejection, and five unique owned loadout slots.
- Wallet persistence across store restart; raw bearer tokens are not written to the database file.
- Account registration/login/logout, case-insensitive usernames, credential validation, unique salts, no plaintext password/session storage, and migration backup for v1 wallets.
- Guest purchases and equipment survive account creation; the old guest bearer loses access. Concurrent claims cannot claim one wallet twice.
- Separate devices restore account progress. Logout revokes its cookie and room/WebSocket session while another device's sign-in stays valid. Expired sessions and stale account identity are rejected.
- Account room loadouts/rewards, in-room changes rejected, cross-origin and non-JSON requests denied, private files inaccessible, production cookie attributes, and sign-in throttling.
- Email format validation and case/domain normalization, duplicate/racing registrations, preserved plus tags, email login after restart, and public snapshots excluding email addresses.
- Legacy username accounts and sessions survive v2 migration with a backup; adding a first email requires the account password and an active session. Existing or duplicate addresses cannot be replaced/claimed.
- The main `/api` endpoint handles account signup/login/logout. HTML, malformed JSON, and invalid response bodies produce readable client errors instead of a raw JSON parser exception.
- Netlify backend URL validation, health/version checks, clean public-only build output, generated proxy rules, automatic HTTPS polling, and exact public-origin authentication with secure cookies.
- Real HTTP profile/purchase/equipment requests; forged balances/prices/rewards and equipment changes inside rooms are rejected.
- Server-hosted solo pause/resume and one-time round/final-match reward processing.
- Unequipped weapon rejection, three-shot burst completion, magazine exhaustion without delayed firing after reload, semi-auto revolver, and automatic dual pistols.
- Bow charge scaling, arrow travel/gravity/hits, rocket splash obstruction/direct damage/self-boost, katana reach/sprint, and projectile reset between rounds.
- 100-coin starting wallets and an idempotent migration of untouched 300-coin wallets; existing gameplay/equipment progress is retained.
- Same-tick parries against every gun and flames, in both player orders; parried arrow removal, guard duration/cooldown, no attacks during guard, and no cooldown reset by switching.
- RPG direct/splash damage and all three melee weapons bypass the guard. Forged guard timers are ignored.
- A real HTTP defender parries a WebSocket shooter's shot; a later shot damages the defender after the guard expires.
- Minigun spin-up and movement penalty, flame cone/range/cover, two-shell Shorty reload/pellets, and directional scythe dash/collision/cooldown.

- Crosshair preference recovery/clamping, static and dynamic spacing, supported image type/size validation, and stored image data restrictions.

- Melee-only sound/visual effect routing; finite, alternating blade animation with a reduced-motion variant; close-range damage, held-click gating, unlimited melee ammo, no projectile creation, distant-target rejection, and cover obstruction.

- Checkerboard recognition on both axes, recovery of translucent colored pixels on both tile shades, preservation of existing alpha and original pixels, conservative rejection of unrelated backgrounds, dark/light matte removal, and protection against erasing the entire image.

- Free Play creates exactly one player on every map and remains live beyond a normal round duration, with no rewards or score changes. Movement, ammo consumption, reloads, resets, rocket-jump impulse, and health restoration work in this mode. Client input cannot set the Free Play flag.

## Browser checks

Verified in the Codex in-app Chromium browser:

- Lobby and live 3D preview render; map-card assets load.
- Solo starts; fallback controls can start a live round; weapon switching updates the model and HUD.
- The bot deals damage and wins rounds; rounds advance.
- Two independent browser tabs create/join the same room and both ready up.
- One tab uses WebSocket and the other HTTP polling; both see the same players and live round. The transport label says HTTPS polling on an HTTPS deployment.
- Leaving returns the remaining player to the waiting lobby.
- Browser console had no application errors during these checks.

Version 1.1 browser checks used a separate local QA server with a disposable funded wallet, leaving the normal player's starting coins untouched:

- All six purchases reduced the balance by their displayed prices; five custom slots and ownership survived reload.
- The equipped weapon names, HUD slots, and distinct first-person models rendered for revolver, bow, launcher, dual pistols, and katana.
- Server-hosted solo advanced through a full 0–5 match. Its result showed **90 coins earned**, matching five loss rewards plus the match completion bonus.
- Solo paused with Esc, and the result's Armory button returned to equipment selection.
- Corrected an SVG sizing issue found in the shop screenshot; weapon artwork now stays inside its allotted height.
- Browser error/warning logs were empty during the update checks.

Version 1.2 checks used another disposable QA server and the normal local server:

- The Armory contains 15 weapons and displays 100 starting coins.
- Pressing F with the katana raised its guard visibly across the screen and displayed the active duration and cooldown.
- All four new first-person models and the flamethrower's flame effect rendered. The scythe dash moved the player forward and displayed its cooldown.
- Firing the Shorty consumed a shell, animated its kick/recovery, and visibly ejected a rotating shell. Rifle bolts, pistol slides, shotgun cycling, bowstring release, and melee swings are implemented as render-time shot animations.
- Fixed cylinder end-cap indices after browser inspection found triangular gaps; the reloaded minigun model has a solid end cap.
- No browser application warnings/errors were recorded during these checks. A held-mouse minigun firing test is covered by the simulation suite rather than a browser automation hold gesture.

Version 1.3 crosshair checks used a disposable local server:

- All four built-in shapes, hex color entry, range controls, static spacing, and preview backgrounds responded in the editor.
- Transparent SVG and PNG uploads decoded and appeared in the preview. SVG was normalized to PNG locally without a content-security-policy error.
- Reload restored the selected image, size, rotation, alignment, and opacity. A corrupt PNG showed a readable error and preserved the existing image.
- Reset restored defaults; switching presets and removing the uploaded image updated the controls correctly.
- A saved custom image rendered in the game, centered at (640, 360) in a 1280 × 720 viewport. The local match completed normally.
- Browser application warning/error logs were empty. The native file picker path was exercised; operating-system file dragging was not automated. Both entry paths call the same import routine.

Version 1.3.1 blade checks used the production renderer in a local pose preview and a disposable solo server:

- Inspected the new tapered blade, bevel, grip, guard, and gloved hand in the idle pose.
- Inspected the slash and reduced-motion poses to confirm a visible lateral cut instead of a forward gun-like kick.
- Two actual left-click attacks in a server-backed solo match rendered alternating blade slashes with the infinite-ammo HUD. A disposable QA server kept its bot from attacking and held the timer to allow inspection; these overrides are excluded from the release package.
- The browser recorded no application warnings/errors. Automated presentation tests confirm the same attack handler used by local and remote melee events requests no tracers, shells, muzzle flash, or gunshot sound.

Version 1.3.2 transparency checks:

- Inspected the supplied 554 × 554 PNG: it is RGB with zero non-opaque pixels, so the checkerboard is image content.
- Uploaded that exact file using the normal file picker. Auto recognized its checkerboard after the importer resized it to 512 pixels. Compared original and cleaned previews at 160 px: the gray rectangle disappears, leaving the turquoise reticle and glow over the map. No application console warnings/errors occurred.
- Reload restored the saved Auto mode and recomputed the cleaned image. Importing a genuinely transparent PNG reported that its alpha was preserved.

Version 1.4 Free Play checks used a disposable local server:

- The new lobby button opened an empty Foundry with a Free Play HUD instead of a round clock and scoreboard. Server status reported zero rooms during play.
- Firing consumed ammo, jumping showed the airborne state, and Esc opened the pause menu. Reset restored the spawn state and a full 24-round magazine.
- Leaving, selecting Sunbreak, and reopening Free Play loaded the new map. Free Play left the disposable wallet at its starting 100 coins. Switching back to bot mode restored the normal scoreboard, opponent, round flow, and rewards.
- Browser application warning/error logs were empty during these checks.

Version 1.5 account browser checks used a separate loopback address and disposable server data:

- Opened and visually inspected sign-in, create-account, and signed-in screens.
- Signed in with a fixture account and restored its 155 coins, six unlocked weapons, and saved loadout. Reload retained its sign-in and balance.
- Opened a second tab and verified sign-out in the first tab updated the second to guest mode with 100 coins.
- Signed into a different fixture account with a lower profile revision and verified the UI replaced the previous progress with that account's 100 coins and five weapons.
- Browser application warning/error logs were empty. Registration and guest-wallet claiming were exercised by real HTTP integration tests.

Version 1.6 email checks used another isolated loopback server and disposable fixture account:

- Create Account displays a public username, email, password, and confirmation. The old email/Roblox footer is absent.
- Signing in with the fixture email restored 155 coins and six owned weapons. Reload preserved the session; sign-out and sign-in with uppercase email worked with the server-capability check enabled. Browser application warning/error logs were empty.
- Actual email signup, guest-progress claiming, and adding an email to an older account were tested through HTTP/store integration tests. No real user credentials were entered or changed during QA.
- Both `localhost:3000` and `127.0.0.1:3000` returned valid account API JSON when diagnosing the supplied screenshot. The exact original HTML response source was not reproduced. Account requests now use the main game endpoint, preflight the server version, and report clear errors when the response is HTML.
- Installed dependency versions match the launcher's checks. The compatible WebSocket update and email validator installation completed with zero npm audit vulnerabilities reported.

Mouse capture is refused by this embedded browser. The implemented fallback was tested there. Raw pointer-lock aiming should be checked in a normal Chrome/Edge window on the user's device; its exact feel depends on mouse DPI, sensitivity, and frame rate. Raw input uses the documented Pointer Lock option with a normal-input retry: [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API).

## Limits

- Version 1.7 is deployed publicly on Netlify, Alwaysdata Free and Neon Free. The user's blocked network has not been tested.
- Rooms hold exactly two players. No teams, matchmaking, or career stats. Accounts and guest wallets require Neon or a retained local server disk. Guest access also requires the browser token.
- Server owns game outcomes but uses current authoritative positions for hits; no historical lag compensation.
- Polling is more latent than WebSocket, particularly at high RTT. Local prediction is corrected to server state; it is not a full rollback/replay netcode implementation.
- Rooms live in one process and vanish on restart. Do not run multiple instances without shared state/routing.
- The account/wallet store uses a versioned Neon Postgres snapshot in cloud hosting, or a JSON file locally. Account login restores progress across devices on the same server, but there is no email recovery, password reset/change UI, cloud backup, or commercial economy. The downloadable package excludes account and wallet data.
- Desktop keyboard/mouse is the intended input. The layout adapts to smaller screens; touch gameplay is not implemented.
- Solo AI is a practice opponent, with ground pathfinding; it does not deliberately execute all advanced ramp/slide routes.
- Visuals are procedural. The supplied GLB remains in the preserved starter; the arena uses its own lightweight weapon models.

## Version 1.7 free hosting validation

- All 76 tests passed after the free-database and startup changes.
- Hosted Neon validation passed on an isolated branch: email login, purchases, loadout, coins, server-store replacement and logout persistence.
- October 1, 2026: Alwaysdata Free production deployment completed at `https://mikudayo.alwaysdata.net/`. Production schema migration succeeded. Netlify deploy `6abe584b44b3fa36a92cac68` is published at `https://velocity-arena.netlify.app/`.
- Both public health endpoints returned game JSON with durable database storage and email accounts enabled.
- Live Netlify HTTP checks passed using one generated fixture account: email signup, 100 starting coins, secure/HttpOnly/SameSite cookie, weapon purchase, loadout, logout/revocation and email login.
- Two independent live clients created/joined/readied a room and observed authoritative movement. A third player was rejected. A direct secure WebSocket client saw the same two-player room. The temporary room was closed after verification.
- After an actual Alwaysdata site restart, the fixture account's email login, remaining coins, purchased weapon and equipped loadout persisted.
- Backend private source, account files and `.env` paths returned 404. Credentials and test fixture files are excluded from source archives and Netlify uploads.
- The live browser rendered the game, `SERVER ONLINE`, and `Game server connected` in the multiplayer dialog. Full live multiplayer behavior was tested through independent HTTP/WebSocket clients; prior browser gameplay checks are documented above.

