import { WEAPONS, DEFAULT_LOADOUT, STARTER_WEAPONS, validLoadout, normalizeLoadout } from './shared.js';
export const STARTING_COINS=100;
export const REWARDS={roundWin:35,roundLoss:10,matchWin:120,matchLoss:40};
export function freshProfile(){return {coins:STARTING_COINS,owned:[...STARTER_WEAPONS],loadout:[...DEFAULT_LOADOUT],earned:0,revision:0};}
export function migrateLoadout(profile){
  const before=JSON.stringify([profile.owned,profile.loadout]);
  profile.owned=[...new Set([...profile.owned,...STARTER_WEAPONS])];
  profile.loadout=normalizeLoadout(profile.loadout,profile.owned);
  if(before===JSON.stringify([profile.owned,profile.loadout]))return false;
  profile.revision++;return true;
}
export function buyWeapon(profile,id){
  if(!Number.isInteger(id)||!WEAPONS[id])throw new Error('Unknown weapon.');
  if(profile.owned.includes(id))return false;
  const cost=WEAPONS[id].price||0;if(profile.coins<cost)throw new Error(`You need ${cost-profile.coins} more coins.`);
  profile.coins-=cost;profile.owned.push(id);profile.revision++;return true;
}
export function equipLoadout(profile,loadout){
  if(!validLoadout(loadout)||loadout.some(id=>!profile.owned.includes(id)))throw new Error('Equip an owned primary, secondary, melee, and utility in slots 1–4.');
  profile.loadout=[...loadout];profile.revision++;
}
export function rewardFor(event,playerId){if(!event.winner||!['roundEnd','matchEnd'].includes(event.type))return 0;const won=event.winner===playerId;return (won?REWARDS.roundWin:REWARDS.roundLoss)+(event.type==='matchEnd'?(won?REWARDS.matchWin:REWARDS.matchLoss):0);}
