# Admin toys

An admin can use toys only in a private room they created or in their own hosted solo practice. Sign in, create a room or start solo, then select **ADMIN TOYS** in the lobby or the Escape menu.

- **Moon gravity:** lower gravity for all players.
- **Turbo movement:** 60% higher running speed, within the existing movement cap.
- **Big heads:** visual effect; normal hitboxes.
- **Popcorn launch:** throw the selected player into the air.
- **Freeze tag:** disable the selected player's controls for 1.5 seconds.
- **Confetti burst:** shared celebratory particles.
- **Reset all toys:** clear modifiers, freezes, momentum and grapples.

Select Rival / bot, Myself, or Everyone for targeted toys. Launch and freeze require a live round. Toy requests have a short server cooldown. Everyone sees the admin-playground notice, and using any toy disables coin rewards for the rest of that room, including rematches. Resetting toys does not restore rewards; create a new room for normal rewarded play. Host departure removes the movement/visual toggles.

## Enable an existing account from the server console

Stop the game process first; the account store permits one writer. With the same private database environment (or local DATA_DIR), run:

```sh
node scripts/grant-admin.mjs EXISTING_USERNAME
```

Then restart the server. This grants that existing account admin toys and every current weapon/utility. It preserves coins, earned coins, equipped loadout, password and sessions. It is idempotent. It refuses to create a missing account and prints no credentials. Refresh the game after the grant.

The command is a server-console operation, with no public API equivalent. Registered usernames, guest display names, local browser flags and request fields never grant admin rights. Requests require an active account cookie matching the room session and its host profile. This role provides room toys only; it cannot inspect passwords, change accounts, grant roles, ban players or run server commands.
