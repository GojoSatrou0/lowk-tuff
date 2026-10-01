import { WEAPONS, DEFAULT_LOADOUT } from './shared.js';
export const STARTING_COINS=100;
export const REWARDS={roundWin:35,roundLoss:10,matchWin:120,matchLoss:40};
export function freshProfile(){return {coins:STARTING_COINS,owned:[...DEFAULT_LOADOUT],loadout:[...DEFAULT_LOADOUT],earned:0,revision:0};}
export function buyWeapon(profile,id){
  if(!Number.isInteger(id)||!WEAPONS[id])throw new Error('Unknown weapon.');
  if(profile.owned.includes(id))return false;
  const cost=WEAPONS[id].price||0;if(profile.coins<cost)throw new Error(`You need ${cost-profile.coins} more coins.`);
  profile.coins-=cost;profile.owned.push(id);profile.revision++;return true;
}
export function equipLoadout(profile,loadout){
  if(!Array.isArray(loadout)||loadout.length!==5||new Set(loadout).size!==5||loadout.some(id=>!Number.isInteger(id)||!profile.owned.includes(id)))throw new Error('Equip five different weapons that you own.');
  profile.loadout=[...loadout];profile.revision++;
}
export function rewardFor(event,playerId){if(!event.winner||!['roundEnd','matchEnd'].includes(event.type))return 0;const won=event.winner===playerId;return (won?REWARDS.roundWin:REWARDS.roundLoss)+(event.type==='matchEnd'?(won?REWARDS.matchWin:REWARDS.matchLoss):0);}
