# Open World Physics Lab — Multiplayer Rooms Update

## New
- The top-left info card and top-right Live Data card each have an X button.
- A small SHOW HUD button restores both cards.
- Multiplayer is now browser-to-browser instead of a placeholder screen.
- Public Server 1, 2 and 3: the first browser in a room becomes the host; later browsers automatically join it.
- Private rooms: create a short code and share it, or join someone else's code.
- Connected players can see each other's position, facing and movement in the same world.
- The in-game room bar shows the room code and player count.

## How multiplayer works
This static website uses PeerJS/WebRTC. PeerJS Cloud handles the connection handshake; after the connection is made, game state is sent directly between browsers. The first player's browser is the room host. If that host closes the tab, that room ends.

Because this is browser-to-browser multiplayer, you can keep the same Netlify static-site deployment; no custom server account is required for this version.

## Deploy
Replace your existing Netlify deploy with the files in this folder, exactly as with the previous version.


## Grenade shockwave interaction
- A grenade explosion now pushes other live grenades inside its blast radius.
- The push direction is directly away from the explosion center.
- Nearby grenades receive a stronger impulse; grenades near the edge receive a weaker one.
- Pushed grenades tumble and continue their existing fuse/bounce behavior.


## Destructible trees + improved weapon visuals
- Trees have hit points and break into trunk/leaf debris.
- Fictional blast forces can destroy nearby trees.
- Grenades can bounce from tree trunks.
- RPG projectiles and ray tools can hit trees.
- Display names: RPG, Shotgun, Sniper Rifle.
- First-person models are more detailed/proportional while remaining fictionalized game assets.


## Visual weapon realism + casing update
- All held game-tool models received more external visual detail and better proportions.
- Carbine and Shotgun visibly eject spent casings/shells from the side when fired.
- The Carbine has an arbitrary game-only 12-shot cycle: after 12 shots it pauses briefly, then can fire again.
- This 12-shot behavior is a fictional gameplay setting, not a real weapon specification.


## Recoil + model realism pass
- Added weapon-specific visual camera recoil with a spring-back response.
- Carbine recoil is lighter; shotgun/sniper are heavier; RPG has its own visual kick.
- Added slight side-to-side and roll variation for less robotic firing.
- Viewmodels physically move back/up during firing.
- Added another external/cosmetic model-detail pass for the Carbine, RPG, Shotgun, and Sniper.
- All geometry and recoil values are fictional game tuning and are not real-world weapon measurements/specifications.


## First-person view + model V3
- Fixed the first-person camera being too low. It now sits at the rendered character's eye/head level instead of around torso height.
- Third-person camera target and third-person firing origin were raised to match the upper body.
- First-person weapons are held slightly higher and closer to the center so the visual aim matches the crosshair better.
- Added another cosmetic exterior-detail pass to the Carbine, RPG, Shotgun, Sniper, and grenade.
- Recoil, casings, destructible trees, grenade blast-push, multiplayer, health, and respawns remain.
- Weapon geometry remains fictionalized game art; no real-world measurements or internal mechanisms are used.


## PvP + SMG + AK-47 + mouse wheel
- Multiplayer rooms now support PvP hits and health damage between connected players.
- PvP messages are relayed by the player acting as the room host, then health is synchronized through room snapshots.
- Remote players have multiplayer hitboxes and health bars.
- Grenade/RPG blast effects can damage other players in multiplayer rooms.
- Slot 3 is now a Submachine Gun and keeps the SEMI/AUTO toggle plus the arbitrary 12-shot game pause.
- Slot 5 is now an AK-47 game weapon, replacing the Physics Cannon.
- Mouse wheel cycles through all six weapons while pointer-lock is active.
- Weapon damage/range/recoil/model proportions are fictional game tuning, not real-world specifications.


## Smaller first-person weapons
- First-person weapons are now scaled independently from third-person models.
- They are moved farther forward, lower, and farther right so stocks/receivers do not cover the center of the screen.
- Long weapons such as the Sniper, Shotgun, and RPG use smaller first-person scales.
- Recoil translation, muzzle flashes, and casing positions were adjusted for the new layout.
- Third-person player and weapon sizes are unchanged.


## Network compatibility / offline update (2026.08.13-compat1)
- Solo no longer loads the multiplayer CDN library during initial page startup.
- Multiplayer networking is loaded only when a player actually creates/joins a room.
- Added a service worker and web-app manifest.
- Core same-origin files are cached after a successful visit, allowing Solo to load from cache if the network is later unavailable.
- Online requests use a network-first strategy so new Netlify deploys are picked up while cached files remain a fallback.
- Added CONNECTION CHECK in the Multiplayer menu for online state, secure context, WebGL, WebRTC, cache state, multiplayer-library loading, and room-service status.
- The PeerJS script is runtime-cached if it successfully loads during Multiplayer.
- This improves normal network compatibility and does not attempt to bypass network access controls.

## Fast focus-aim update
- Hold right mouse button with the SMG, Shotgun, AK-47, or Sniper to enter a smooth focus-aim mode.
- FOV transitions smoothly instead of snapping.
- The first-person model slides toward the center while aiming.
- Mouse sensitivity and viewmodel sway are reduced while aiming.
- The crosshair tightens during aim; the Sniper transitions into its stronger scope overlay.
- There is no target snapping or automatic aim assistance.
- All tuning is fictional game behavior.

## Clearer-screen aim layout
- Reduced first-person weapon scale again so the gun body stays out of the middle of the screen.
- Moved hip-fire placement farther right, lower, and farther from the camera.
- Changed the aim pose so it stays off-center instead of sliding too far into the middle.
- Reduced first-person recoil travel while aiming.
- Adjusted muzzle flash and casing positions to match the smaller layout.

## Fast arena movement update
- Shift sprint remains available with sharper acceleration and braking.
- Ctrl or C starts a slide when moving fast enough.
- Jump during a slide preserves momentum and performs a slide-jump / slide-cancel style transition.
- Added coyote time and jump buffering for responsive jumps.
- Added air strafing and momentum preservation.
- Terrain slopes can add a small downhill slide boost, making ramps and hills interact with momentum.
- First-person camera lowers smoothly during crouch/slide and has a small landing dip.
- Third-person and remote multiplayer players show lowered slide/crouch posture.
- Live Data now shows the current movement state.
- Values are original game tuning chosen to approximate the public RIVALS movement feel; they are not hidden/internal RIVALS values.

## Third-person + crouch/slide animation update
- Added actual crouch body posing: lowered torso/head, bent knees, repositioned feet and arms.
- Added an asymmetric sliding pose with one leg extended, one leg tucked, lowered torso, and forward body lean.
- Remote multiplayer players use matching crouch/slide poses and lowered PvP hitboxes.
- Third-person camera is now over-the-shoulder so the player model stays left of the center crosshair instead of blocking it.
- Right-click aiming now works in third person for SMG, Shotgun, AK-47, and Sniper.
- Third-person aim uses a moderate zoom instead of the first-person sniper scope overlay.
- Third-person weapon direction is derived from the center-screen aim point; the held weapon and arm pose follow that direction.
- Rays/projectiles in third person originate from the character weapon position and converge on the center crosshair target.

## Imported KSR-29 sniper model
- Replaced the procedural Sniper Rifle visual with the supplied KSR-29 GLB when the asset is available.
- The custom WebGL renderer now supports UV-textured imported meshes while retaining the original solid-color renderer for the rest of the game.
- The KSR-29 is used in both first-person and third-person.
- First-person positioning remains compact so the imported model does not dominate the screen.
- Third-person uses the existing shoulder aim direction and aligns the imported mesh with the gun/arm pose.
- The old procedural sniper remains as an automatic fallback if the GLB fails to load.
- The GLB is included in the PWA cache so it can remain available in cached Solo mode after the first successful load.

## KSR-29 runtime cleanup update
- The sniper loader now post-processes the imported KSR-29 mesh on load.
- Scope cluster is lowered back onto the rifle body.
- Stand/bipod pieces are removed.
- The protruding ammo/mag-style piece is removed.
- Third-person shoulder camera is swapped so the player appears on the right side of the screen.
- First-person and third-person sniper anchors are nudged for the cleaned model.


## Run locally without uploading

1. Extract the ZIP.
2. Double-click `START_GAME.bat`.
3. The game opens automatically in your browser.
4. Keep the launcher window open while playing.
5. Press `Ctrl+C` in the launcher window to stop the local server.

This uses a local HTTP server because browser features such as the GLB asset loader and service worker should not be run directly from a `file://` page.

## Video-reported sniper correction
- Rebuilt the imported KSR-29 from its named source objects instead of guessing connected pieces.
- Kept only the main rifle + scope. Removed the separate stand/bipod object and the separate ammo/mag-style object.
- Lowered the scope object onto the rifle body.
- Restored the unscoped first-person rifle to the normal lower/right viewmodel anchor.
- Hides the 3D rifle while the first-person sniper scope overlay is fully active, so the model cannot block the scope view.
- Third-person player remains on the left side of the screen.


## Multiplayer compatibility update (2026.08.19-school-mp-compat1)

- Two normal PeerJS CDN sources are tried instead of relying on one source.
- Connection Check now tests the actual room/signaling service.
- Connection timeout is longer for slow networks.
- The service worker caches whichever PeerJS runtime source loads successfully.
- `multiplayer-config.js` is an empty hook for administrator-approved ICE/TURN settings if a managed network requires a relay.
- This build does not bypass network restrictions; a firewall can still block browser-to-browser WebRTC.


## Built-in LAN multiplayer (2026.08.20-lan-relay-mp1)

START_GAME.bat now starts a local relay. Friends on the same Wi-Fi open the LAN address shown in the launcher, then everyone chooses Multiplayer and the same room code. LAN is used automatically when available; WebRTC remains the fallback on normal hosting. This cannot override a school firewall or Wi-Fi client isolation.

### How to use LAN multiplayer at school

- One computer extracts the ZIP and runs `START_GAME.bat`.
- The launcher opens the game for the host and prints a LAN address such as `http://192.168.1.24:8765/`.
- Other players on the same Wi-Fi open that address in Chrome/Edge.
- Everyone chooses Multiplayer and uses the same room code.
- The game automatically chooses the LAN relay when it can reach it; otherwise it keeps the existing online WebRTC method.
- Keep the launcher window open while playing.

If Windows Firewall asks whether Python may accept network connections, only allow it if that is permitted on the network. Some managed Wi-Fi systems use client isolation, which prevents one student device from reaching another; software in the ZIP cannot override that network setting.


## Central HTTPS relay
Multiplayer now tries: Central HTTPS relay -> LAN relay -> PeerJS/WebRTC. The central relay uses ordinary HTTPS requests, not direct browser-to-browser connections. Host `central-relay-server/`, then run `SET_CENTRAL_RELAY_URL.bat` and paste its HTTPS URL. This does not override network restrictions.
