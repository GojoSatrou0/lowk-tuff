import {WEAPONS} from './shared.js';
import {freshProfile,REWARDS,STARTING_COINS} from './economy.js';
import {readApiResponse,ensureServerReady} from './api.js';
const $=id=>document.getElementById(id);
export function createShop({gunSVG,onChange,notify}){
  let profile=freshProfile(),token=null,user=null,online=false,slot=0,busy=false,acceptedRevision=-1;
  try{token=localStorage.getItem('velocity-profile-token');const cached=JSON.parse(localStorage.getItem('velocity-profile-cache'));if(cached&&Array.isArray(cached.loadout)&&cached.loadout.length===5&&cached.loadout.every(id=>WEAPONS[id])&&Array.isArray(cached.owned)&&Number.isFinite(cached.coins))profile=cached;}catch{}
  const descriptions=['Reliable bursts and precise ADS. Your all-round starting point.','Fast fire rate. Close the distance, then keep moving.','A clean sightline. A steady hand. Devastating headshots.','Eight pellets. Best used up close, around cover.','Travel faster with the blade. Two clean swings finish a duel.'];
  function wallet(){for(const node of document.querySelectorAll('[data-wallet]'))node.textContent=profile.coins.toLocaleString();for(const node of document.querySelectorAll('[data-weapon-count]'))node.textContent=WEAPONS.length;$('starting-coins').textContent=`${STARTING_COINS} COINS TO START`;$('wallet-state').textContent=online?'SAVED WALLET':'OFFLINE PREVIEW';$('reward-rules').textContent=`ROUND WIN +${REWARDS.roundWin} · ROUND LOSS +${REWARDS.roundLoss} · MATCH BONUS +${REWARDS.matchWin} WIN / +${REWARDS.matchLoss} LOSS`;}
  function accept(next,force=false){if(!next||(!force&&(next.revision<profile.revision||next.revision===acceptedRevision)))return;acceptedRevision=next.revision;profile=structuredClone(next);try{localStorage.setItem('velocity-profile-cache',JSON.stringify(profile));}catch{}wallet();onChange(profile);if(!$('armory-view').hidden)render();}
  async function api(data){await ensureServerReady(()=>notify('Waking the free game server. This can take about a minute.'));const r=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileToken:token,...data}),signal:AbortSignal.timeout(20000)});return readApiResponse(r);}
  function setSession(s){
    user=s.user||null;token=user?null:(s.profileToken||token);online=true;
    try{if(token)localStorage.setItem('velocity-profile-token',token);else localStorage.removeItem('velocity-profile-token');}catch{notify('Browser storage is unavailable. Guest progress may not reconnect after closing the page.');}
    accept(s.profile,true);render();document.dispatchEvent(new Event('velocity-account-change'));
  }
  function announce(){try{localStorage.setItem('velocity-account-update',`${Date.now()}-${Math.random()}`);}catch{}}
  async function init(){try{const s=await api({action:'profile'});setSession(s);}catch(e){online=false;if(e.status===401){user=null;accept(freshProfile(),true);document.dispatchEvent(new Event('velocity-account-change'));}wallet();render();if(e.status===410||e.status===401)notify(e.message);}return online;}
  async function authenticate(operation,credentials){
    const status=await ensureServerReady(()=>notify('Waking the free game server. This can take about a minute.'));
    if(!status.emailAccounts)throw new Error('The server needs the email account update. Restart START_GAME.bat from the updated project folder, then refresh the game.');
    const s=await api({action:'account',operation,expectedUser:user?.username||null,...credentials});setSession(s);announce();
  }
  async function signOut(){await api({action:'account',operation:'logout'});user=null;token=null;online=false;try{localStorage.removeItem('velocity-profile-token');localStorage.removeItem('velocity-profile-cache');}catch{}accept(freshProfile(),true);document.dispatchEvent(new Event('velocity-account-change'));await init();announce();}
  async function refreshIdentity(){try{token=localStorage.getItem('velocity-profile-token');}catch{}return init();}
  async function action(id){if(busy)return;if(!online){notify('Start the updated Node server to earn coins and use the shop.');return;}busy=true;render();
    try{if(!profile.owned.includes(id)){const s=await api({action:'purchase',weapon:id,expectedUser:user?.username||null});accept(s.profile);notify(`${WEAPONS[id].name} unlocked. Choose a slot to equip it.`);}else{const loadout=[...profile.loadout],other=loadout.indexOf(id);if(other>=0)loadout[other]=loadout[slot];loadout[slot]=id;const s=await api({action:'loadout',loadout,expectedUser:user?.username||null});accept(s.profile);notify(`${WEAPONS[id].name} equipped in slot ${slot+1}.`);}}
    catch(e){notify(e.message);}finally{busy=false;render();}
  }
  function render(){wallet();
    $('loadout-slots').innerHTML=profile.loadout.map((id,i)=>`<button class="loadout-choice ${slot===i?'selected':''}" data-loadout-slot="${i}" aria-pressed="${slot===i}"><span>SLOT ${i+1}</span>${gunSVG(id)}<strong>${WEAPONS[id].short}</strong></button>`).join('');
    document.querySelectorAll('[data-loadout-slot]').forEach(b=>b.onclick=()=>{slot=+b.dataset.loadoutSlot;render();});
    $('weapon-grid').innerHTML=WEAPONS.map((w,i)=>{const owned=profile.owned.includes(i),equipped=profile.loadout.indexOf(i),cost=w.price||0,selected=profile.loadout[slot]===i;
      const label=owned?(selected?'EQUIPPED':`EQUIP IN SLOT ${slot+1}`):`UNLOCK · ◈ ${cost}`;
      return `<article class="weapon-card ${owned?'owned':'locked'}" style="--weapon-accent:${w.color}"><div class="weapon-heading"><span class="num">${String(i+1).padStart(2,'0')} / ${w.projectile?w.projectile.toUpperCase():w.ammo<0?'MELEE':w.type.toUpperCase()}</span><span class="ownership">${equipped>=0?`SLOT ${equipped+1}`:owned?'OWNED':'LOCKED'}</span></div><div class="gun-art">${gunSVG(i)}</div><h3>${w.name}</h3><p>${w.description||descriptions[i]}</p><div class="weapon-stat">DAMAGE <strong>${w.charge?'44–80':w.damage}${w.pellets?' ×'+w.pellets:''}</strong></div><div class="weapon-stat">MAGAZINE <strong>${w.ammo<0?'—':w.ammo}</strong></div><div class="weapon-stat">RELOAD <strong>${w.reload?w.reload+'s':'—'}</strong></div><button class="shop-action ${owned?'':'buy'}" data-shop-weapon="${i}" ${busy||selected||(!owned&&profile.coins<cost)?'disabled':''}>${label}</button>${!owned&&profile.coins<cost?`<small class="price-note">${cost-profile.coins} more coins needed</small>`:''}</article>`;}).join('');
    document.querySelectorAll('[data-shop-weapon]').forEach(b=>b.onclick=()=>action(+b.dataset.shopWeapon));
  }
  return {get profile(){return profile;},get token(){return token;},get user(){return user;},get online(){return online;},init,render,accept,authenticate,signOut,refreshIdentity};
}
