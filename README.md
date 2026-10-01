# Velocity Arena

A standalone arena expansion built from the supplied **Open World Physics Lab – Central HTTPS Relay Start** archive. The original project is preserved in `starter/` in the full local package; it is excluded from deployment source. Its vector/matrix code and WebGL primitive generation form the foundation of the new renderer. The arena game, maps, interface, shared simulation, and server are new. Original archive documents are retained as reference, not treated as instructions or as proof that this version passes tests.

## Play on this computer

**Using Netlify?** See [Netlify setup](docs/NETLIFY.md). A static upload does not run the account/multiplayer backend. Deploy the Node server, then use `BUILD_NETLIFY.bat` or the Netlify build configuration to connect your existing site to it.

**No-card hosting:** [Northflank Sandbox setup](docs/NORTHFLANK.md) keeps the Node server separate from the free Neon account database. Render requested a card for this account, so its service was not created. Hosting and the live Netlify connection still need to be completed.

1. Install **Node.js 22 or newer** if necessary.
2. Double-click **START_GAME.bat**.
3. Open **http://localhost:3000** in Chrome or Edge. Keep the launcher running.
4. Choose a map, then **Free Play** to practice alone, **Enter the Arena** to face the bot, or **Play with a Friend** for a private 1v1.

The launcher installs the server dependencies on first use and updates them when their pinned versions change. Once installed, solo and LAN matches need no external CDN, font, signaling service, or asset download. Do not open `index.html` directly with `file://`.

Command-line equivalent:

```sh
npm ci
npm start
```

## What is included

- A redesigned live 3D lobby, armory, scoreboard, health/ammo HUD, and round/match screens.
- **The Foundry:** balanced industrial lanes and four ramps to elevated side routes.
- **Sunbreak:** canyon cover and raised flanking routes.
- **Afterlight:** a neon rooftop, raised platforms, ramps, and a central bridge.
- Material lighting, baked directional shadows, fog, detailed surfaces, distant scenery, muzzle flashes, tracers, hit markers, and generated sound effects.
- Batched static geometry; Performance/Balanced/High quality settings.
- Sprint, crouch, slide, momentum-carrying slide-jumps, coyote time, and one double jump.
- **15 original weapons:** five free starters plus an unlockable burst rifle, revolver, dual pistols, bow, rocket launcher, katana, minigun, flamethrower, Shorty, and scythe.
- A coin wallet, round/match rewards, permanent weapon unlocks, and five customizable weapon slots. Coins are earned through play; there are no real-money purchases.
- Email/password accounts with public usernames, registration, sign-in, sign-out, and saved progress across devices on the same game server. Existing username accounts continue to work and can add an email. Guests can still play without an account.
- Traveling arrows with gravity and aim-to-charge, three-shot bursts, rockets with cover-aware splash/self-damage and blast-jumping, and katana sprinting.
- Katana parries, scythe dashes, minigun spin-up, and a cover-aware flame cone.
- Weapon-specific firing animations: recoil/recovery, moving rifle bolts and pistol slides, cycling shotgun grip, rotating revolver cylinder and minigun barrels, bowstring release, melee swings, muzzle flashes, and ejected shells. Other players' guns also kick and flash when firing. Reduce Weapon Motion suppresses local recoil, gun cycling, katana/scythe motion, and shell ejection; the blade retains a smaller slash so attacks remain readable.
- Center-camera shot rays, headshots, solid-cover occlusion, ADS FOV changes, FOV-scaled sensitivity, optional raw mouse input, and separate look/ADS settings.
- Crosshair Studio with four shapes, live previews, color/size/gap/outline controls, and custom image import by file picker or drag-and-drop.
- Magazine limits, cooldowns, weapon-switch delay, reloads, automatic fire, and reliable quick clicks between network updates.
- First to **5 round wins**, 3-second countdowns, 90-second rounds, intermissions, and mutual-ready rematches. Higher remaining health wins a timed-out round; equal health is a draw.
- **Free Play:** explore any map alone with no bots, timer, rounds, or scoring.
- Solo opponent with pathfinding, strafing, cover checks, and three difficulty levels.
- Dedicated-server 1v1 rooms with authenticated sessions. Server computes movement, collision, hits, ammo, health, round outcomes, and scores.
- WebSockets with automatic HTTP/HTTPS polling fallback; compatibility mode can also be selected before joining. Both transports share the same rooms.

This is an original movement arena inspired by fast duel games. It does not include Roblox assets or connect to Roblox.

## Controls

| Action | Control |
| --- | --- |
| Move | WASD |
| Sprint | Shift |
| Jump / double jump | Space, then Space again |
| Slide while moving / crouch | C or Ctrl |
| Fire / melee | Left mouse |
| Aim | Hold right mouse |
| Draw bow | Hold right mouse to charge, then left-click to release |
| Katana parry / scythe dash | Right mouse or F |
| Reload | R |
| Switch loadout slot | 1–5 or mouse wheel |
| Pause / release mouse | Esc |

Solo pauses in its menu. **Online matches continue while menus are open.** If a browser or embedded preview refuses mouse capture, a fallback button appears: use arrow keys or right-drag to look. A normal desktop browser with mouse capture is the intended FPS experience. Touch controls and gamepad controls are not implemented.

## Free Play

Select any map in the lobby and click **Free Play**. You spawn immediately with your saved five-weapon loadout. Practice movement, ramps, aiming, firing, reloads, melee, and equipped abilities without opponents or a time limit. Health stays full, including after rocket jumps. Magazine sizes and reload timings work normally.

Press **Esc** to pause, open settings, leave, or choose **Reset Position & Ammo**. Reset returns you to spawn, restores all ammo, clears active projectiles and ability cooldowns, and keeps your selected weapon. Leave and select another map to change arenas.

Free Play runs locally in your browser. It creates no multiplayer room and earns no coins or match progress. It uses your existing loadout rather than permanently unlocking weapons.

## Blade attacks

The Momentum Blade is a close-range melee weapon: select its loadout slot (5 in the starter kit) and left-click for a slash. Each click performs one attack with a 0.45-second cooldown and 2.8-unit reach. It consumes no ammo and cannot shoot projectiles or damage a distant player. Solid cover blocks its hit check.

The blade uses alternating diagonal cuts and a soft whoosh, with no gunshot, bullet tracer, muzzle flash, or gun recoil. Its new model has a tapered, beveled steel blade, finger guard, ribbed grip, fasteners, and pommel; other players see the model and swing too. Katana and scythe attacks also no longer use gunfire effects.

## Custom crosshairs

Open **Settings → Crosshair Studio** from the lobby, or **Esc → Aim & Settings → Crosshair Studio** during a match.

- Choose Cross, Dot, Circle, or T-shape. Adjust the color or hex code, line length, thickness, center gap, outline, center dot, and opacity.
- Turn movement/firing expansion off for a static crosshair. Optionally hide it while aiming; the sniper always retains its own scope.
- Drag one existing image onto the drop area, or click **Choose Image**. PNG, SVG, WebP, and JPG are supported, up to 2 MB and 2048 × 2048 pixels. Transparent PNG/SVG images work best; JPG keeps its background.
- **Background Cleanup** defaults to Auto: real transparency is preserved, while recognizable gray checkerboard pixels are converted to transparency. Some downloaded “transparent” images have a checkerboard baked into their pixels. This cleanup also applies to previously saved images after refreshing the game. Use **Keep original image** to undo it, or choose checkerboard, dark-background, or light-background cleanup manually. The Cleanup Amount slider removes residual background noise; reduce it if faint details disappear. Detection is intended for regular gray grids; irregular/textured backgrounds may need external editing.
- Uploaded images have size, rotation, horizontal offset, and vertical offset controls. Center guides show the actual aim point; the three map backgrounds help check visibility. Shape color/outline controls apply only to built-in shapes.
- Switch between a built-in shape and **Use Uploaded Image** without losing the image. **Remove** deletes the saved image; **Reset to Default** restores the stock crosshair and retains the image for reuse.

Changes save automatically in this browser for this server address and work in solo and online games. Clearing browser site data removes them. Imports are processed locally, normalized to PNG (maximum 512 pixels), and never sent to the multiplayer server. SVG imports retain drawing elements and strip scripts/external content; SVGs requiring unsupported effects should be exported to PNG first. Invalid images leave the current crosshair unchanged. If browser storage is unavailable, changes work for the current session and the editor reports that they could not be saved.

## Coins and the armory

New wallets start with **100 coins**. Untouched wallets from the 300-coin version are adjusted to 100; wallets with earned coins, purchases, or equipment changes retain their progress. Open **Armory** or the gold coin counter, unlock a weapon, select one of the five slots, and click **Equip in slot**. Equipping a weapon already in another slot swaps the two. Leave your room before changing equipment. Each profile can occupy one room at a time.

| Reward | Coins |
| --- | ---: |
| Round win | 35 |
| Round loss | 10 |
| Match win bonus | 120 |
| Match loss bonus | 40 |

The final round awards both its round reward and the match bonus once. Draws give no coins. A 5–0 winner earns 295; the losing player earns 90. Leaving early gives no completion bonus, but keeps rewards already received. Server-hosted solo and online duels both earn coins; static/offline practice cannot award them.

| Unlock | Price | Play style |
| --- | ---: | --- |
| Triad Burst | 275 | Three shots per trigger press |
| Ironclad Revolver | 150 | Accurate, heavy semi-auto sidearm |
| Twin Sparks | 225 | Fast alternating dual pistols |
| Arc Bow | 350 | Charged arrows that travel and drop |
| Comet Launcher | 450 | Rockets, cover-aware splash, and blast jumps |
| Gale Katana | 300 | Faster sprint and timed parry |
| Cyclone Minigun | 425 | 0.55-second spin-up, 90 rounds, reduced movement speed |
| Ember Flamethrower | 375 | Short-range cone of fire, 60 fuel |
| Pocket Shorty | 100 | Two fast blasts of ten pellets each |
| Rift Scythe | 325 | Long melee reach and a directional dash |

**Katana parry:** press right mouse or **F** with the katana equipped. The 0.75-second guard blocks bullets, sniper shots, shotgun pellets, arrows, and flames from any direction. RPG/rocket direct hits and explosions, the blade, another katana, and the scythe still deal damage. You cannot slash during the guard. Its cooldown is 2.2 seconds from activation; holding the button does not repeat it. Switching weapons cancels the guard without clearing the cooldown. It blocks damage rather than reflecting it back.

**Scythe dash:** press right mouse or **F** while holding a movement direction, or dash forward if stationary. It lasts 0.18 seconds with a 2.8-second cooldown, respects map collision, and grants no invulnerability. Switching between katana and scythe retains the current ability cooldown.

The new weapon types are inspired by the [Rivals weapon roster](https://robloxrivals.fandom.com/wiki/Weapons); names, models, prices, and balance are original to this project.

Locally, the server saves coins, unlocks, loadouts, and accounts in **`data/profiles.json`**. Cloud hosting uses **Neon Free Postgres** when `DATABASE_URL` is configured. Guest wallets use a private browser token; create an account to recover your progress on another device. Never share wallet tokens or include the data folder in a public repository/ZIP.

For hosting without a card, follow [Northflank Sandbox + Neon Free setup](docs/NORTHFLANK.md), then [connect Netlify](docs/NETLIFY.md#update-netlify). Database commits preserve accounts across server sleep and replacement. Local disk hosting can use `DATA_DIR`; never rely on a temporary filesystem. See [hosting persistence](docs/MULTIPLAYER.md#keep-coins-after-redeploying). Prices and rewards live in `src/shared.js` and `src/economy.js`.

## Multiplayer

**Same network:** run the server on one computer. Both players open `http://HOST-LAN-IP:3000`, e.g. `http://192.168.1.20:3000`. Use `ipconfig` to find that computer's active IPv4 address. If Windows asks, allow Node on your trusted private network. Create a room, share its six-character code, join, and both click **I'm ready**. Do not send another computer a `localhost` link: localhost always refers to that player's own computer.

**Over the internet:** deploy this entire folder as one Node **web service**, then both use its HTTPS address. A static host alone cannot run this server. Ready-to-use `render.yaml` and `Dockerfile` are included. See [the deployment and restricted-network guide](docs/MULTIPLAYER.md).

Rooms are in memory, limited to two players, and expire when empty. Restarting the server ends current rooms; saved accounts and wallets remain in Neon, or on a retained local data disk. Leaving or timing out returns the remaining player to the lobby and resets the match. There is no ranked matchmaking, teams, career stats, or host migration between servers.

## Development

```sh
npm run check
npm test
```

| File | Role |
| --- | --- |
| `src/shared.js` | Maps, physics, weapon rules, raycasts, match simulation shared with Node |
| `src/renderer.js` | Starter-derived WebGL meshes plus the new batched renderer, shadows, scene, and weapons |
| `src/math.js` | Math retained from the supplied starter |
| `src/game.js` | Input, menus, settings, HUD, solo loop, network reconciliation, audio |
| `src/network.js` | Session setup, WebSockets, polling fallback, connection errors |
| `src/shop.js` | Armory UI, wallet connection, purchases, and loadout selection |
| `src/economy.js` | Prices validation, starter wallet, equipment rules, reward amounts |
| `profile-store.js` | Server-only account, session, and wallet persistence |
| `src/accounts.js` | Registration, sign-in, sign-out, and account UI |
| `src/bot.js` | Solo pathfinding and opponent behavior |
| `server.js` | HTTP/static server, sessions, rooms, 60 Hz simulation, 20 Hz WS snapshots |
| `tests/` | Rules and real HTTP/WebSocket integration checks |
| `starter/` | Original files and supplied GLB, preserved unchanged |

`tests/make-previews.js` regenerates the map-card SVGs after layout changes.

See [verification notes](docs/VERIFICATION.md) for tested behavior and known limits. This is a playable foundation for private duels, not a production ranked shooter. The server owns gameplay state, but there is no lag compensation, matchmaking service, replay system, or commercial anti-cheat.

## Accounts and signing in

1. Click **SIGN IN** at the top right, then **CREATE ACCOUNT**.
2. Choose a public username (3–20 letters, numbers, or underscores), enter your email, and create a game password of 15–128 characters. A memorable phrase works well. Confirm the password and create the account. Your email is private and is not included in multiplayer snapshots.
3. Your current guest coins, unlocks, and loadout become that account's progress. This does not award another 100 coins. Brand-new players start with 100.
4. On another device, open the **same game server's address** and sign in with your email or username and game password. Email and username matching ignore case. Signing into an existing account loads that account's wallet; it does not merge guest coins.
5. Click your username to see your account or **SIGN OUT**. Sign-out returns to a fresh guest wallet and retains the account's saved progress. It also leaves any room associated with that sign-in. Other devices remain signed in.

Sign-in lasts up to 30 days, including server restarts when the database or local data directory persists. Crosshairs and control settings remain browser preferences. Accounts are specific to this server; they do not connect to Roblox. There is currently no email verification, password reset, or password-change screen, so keep your password somewhere safe.

**Already have a username-only account?** Sign in with that username, click your account button, and use **ADD EMAIL SIGN-IN**. Confirm your current game password to save the email without losing coins or weapons. An email can belong to only one account. This version allows adding a first email, not replacing an existing one.

Email is a sign-in identifier here, not proof of mailbox ownership. No email is sent. Verification links and password-reset emails need an email delivery service and an additional verified ownership workflow; do not use the unverified email field for automatic recovery or linking other services. Email validation uses [validator.js](https://github.com/validatorjs/validator.js/); case is folded for comparison, internationalized domains use ASCII form, and dots/plus tags are retained, following a documented comparison policy as recommended in the [OWASP email guidance](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html).

Passwords are stored as salted scrypt hashes, following an [OWASP scrypt configuration](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt). Account session tokens use HttpOnly, SameSite cookies; the browser never stores the password or account session token in localStorage. Guest tokens stop working once their wallet is claimed by an account. The upgrade preserves old guest wallets/accounts and makes a `profiles.json.v1.bak` or `profiles.json.v2.bak` before migrating the database.

Use HTTPS and persistent storage for a shared internet server. See [account hosting](docs/MULTIPLAYER.md#accounts-on-a-hosted-server) for the required configuration.

If an older signup screen says **Unexpected token '<' / DOCTYPE / not valid JSON**, it received an HTML page in place of API data. Restart the updated project's `START_GAME.bat`, then refresh the game. Version 1.6 sends account operations through the main `/api` endpoint, checks server capabilities before submitting credentials, and handles HTML/incomplete responses with a readable message. A static file server cannot handle accounts or multiplayer.
