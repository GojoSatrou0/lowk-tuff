import { MAPS,WEAPONS,LOADOUT_SLOTS,TICK,MOVEMENT,GRAPPLE,clamp,mix,mapById,eyeHeight,createPlayer,createMatch,createFreePlay,resetFreePlay,resetPlayer,readyPlayer,stepMatch,movePlayer,cleanInput,isMelee } from './shared.js';
import {createTraining,stepTraining,resetTraining,toggleTrainingPace} from './training.js';
import { createRenderer } from './renderer.js';
import { ArenaNetwork } from './network.js';
import { createBot,botInput } from './bot.js';
import {createAdminPanel} from './admin-panel.js';
import { createShop } from './shop.js';
import { createAccounts } from './accounts.js';
import { createCrosshair } from './crosshair.js';
import { attackEffects,sniperScope,paintSniperScope } from './weapon-presentation.js';

const $=id=>document.getElementById(id),canvas=$('world');
const defaults={sensitivity:.85,ads:.55,fov:86,volume:.35,quality:1,difficulty:'normal',raw:true,reduced:false,name:'Runner'};
let saved={};try{saved=JSON.parse(localStorage.getItem('velocity-settings')||'{}');}catch{}
const settings={...defaults,...saved};
for(const [key,min,max]of [['sensitivity',.2,2],['ads',.2,1],['fov',70,110],['volume',0,1],['quality',0,2]])settings[key]=Number.isFinite(+settings[key])?clamp(+settings[key],min,max):defaults[key];
const save=()=>{try{localStorage.setItem('velocity-settings',JSON.stringify(settings));}catch{}};
const state={mode:'menu',map:MAPS[0],match:null,you:'you',local:null,paused:false,hosted:false,matchCoins:0,bot:createBot(),event:0,phase:'',round:0,remote:new Map(),seq:0};
const input={x:0,z:0,yaw:0,pitch:0,jump:0,slide:0,weapon:0,fire:false,fireId:0,altId:0,grapple:false,grappleId:0,ads:false,reload:false,sprint:false,crouch:false,seq:0};
const keys=new Set(),fx={ads:0,recoil:0,muzzle:0,hit:0,damage:0,sway:0,shotAge:10,shotWeapon:-1,clash:0,equipAge:10,heldWeapon:-1,sprint:0,guard:0,scopeKick:0},tracers=[],explosions=[],flames=[],casings=[],confetti=[];
let renderer,audio=null,toastTimer,feedTimer,lastHP=100,fps=60,frameCount=0,fpsTime=performance.now(),last=performance.now(),accumulator=0,time=0,menuView='play',freeLook=false,connecting=false;
try{renderer=createRenderer(canvas);}catch(e){$('fatal').hidden=false;$('fatal-message').textContent=e.message;throw e;}

function gunSVG(index){
  const art={
    19:'<path d="M68 17h24l14 20-2 30-16 9H69L54 63V36z"/><path d="M66 32h31M60 45h42M59 58h42M75 26v44M88 26v46" stroke="#506431" stroke-width="4"/><path d="M78 15V6h22v31" fill="none" stroke="#bed68c" stroke-width="5"/>',
    20:'<path d="M74 20h17v19l13 9v27H60V48l14-9z"/><path d="M66 52h31v17H66z" fill="#e9bb82"/><path d="m82 20-4-10 12-6-4 9 11 3-8 8z" fill="#ff984d"/>',
    21:'<path d="M30 24h91v20H77L66 69H43l11-25H30z"/><path d="M39 28h67v6H39z" fill="#9bd3e3"/>',
    5:'<path d="M12 27h88v23H64l-4 18H44V47H24L5 40zM94 32h64v8H94zM40 18h43v8H40z"/><path d="M52 32h35v6H52z" fill="#a8c9ff"/>',
    6:'<path d="M28 26h100v14H77l-5 12-15-2-6 19H29l10-28H28z"/><circle cx="65" cy="36" r="14"/><circle cx="65" cy="36" r="8" fill="#283944"/>',
    7:'<path d="M10 18h76v15H53L42 54H25l10-24H10zM75 40h76v15h-33l-10 20H90l11-23H75z"/>',
    8:'<path d="M84 7 62 22l-9 18 9 18 22 15-14-33z"/><path d="m84 7 10 33-10 33M30 40h103" fill="none" stroke="currentColor" stroke-width="2"/><path d="m133 36 11 4-11 4z"/>',
    9:'<path d="M18 21h108v29H18zM8 16h16v39H8zM127 25l25 10-25 11zM50 49h14v20H50zM81 16h23v6H81z"/><path d="M29 21h9v29h-9zM112 21h8v29h-8z" fill="#ffc16d"/>',
    10:'<path d="m21 65 17-14 75-42 36-6-29 20-76 40-18 10z"/><path d="m37 43 13 26M19 62l13 11" stroke="#b4f3f1" stroke-width="5"/>',
    11:'<path d="M15 23h58v33H15zM70 28h77v8H70zM70 40h77v8H70zM32 54h17v18H32zM28 15h42v9H28z"/><path d="M135 25h10v27h-10z" fill="#aeb8ff"/>',
    12:'<path d="M14 22h29v39H14zM39 30h61v20H39zM96 34h46v12H96zM66 49h14v18H66z"/><path d="m146 40 10-15-1 11 9 4-10 11z" fill="#ff9b58"/>',
    13:'<path d="M29 25h104v11H29zM29 38h104v11H29zM24 25h22v26L32 69H12l17-26H9V25z"/><path d="M65 27h13v20H65z" fill="#e7c08d"/>',
    14:'<path d="M88 15h8v60h-8zM32 8h77l33 17 9 17-31-19H52L22 43z"/><path d="M91 38h12v8H84v-8z" fill="#d5acff"/>',
    15:'<path d="M17 36h119v9H17zM30 44h29L48 68H29zM65 33l26-23 35-6-17 16-28 20 28 20 17 16-35-6-26-23z"/><path d="M126 5 94 40l32 35M48 40h103" fill="none" stroke="#a6e5bd" stroke-width="2"/>',
    16:'<path d="M9 31h103v18H73l-8 19H50l5-22H9zM107 35h49v8h-49zM59 18h28v12H59zM86 30h23v4H86z"/><path d="M91 37h35v6H91z" fill="#8cc9ee"/>',
    17:'<path d="M17 24h88v19H63L52 68H31l10-25H17zM99 28h52v13H99z"/><path d="M27 28h51v5H27z" fill="#d7a7cd"/>',
    18:'<path d="M76 26h12v50H76zM30 8h104v29H30z"/><path d="M28 6h15v33H28zM121 6h15v33h-15zM74 56h16v8H74z" fill="#ffc676"/>',
  };
  if(art[index])return `<svg viewBox="0 0 165 80" fill="currentColor" aria-hidden="true">${art[index]}</svg>`;
  const base=index===4?'<path d="M25 38h34l73-23-11 25-62 9H25z"/><path d="M53 30v27h8V28z" fill="#ff9d77"/>':`<path d="M${index===2?8:20} 29h${index===2?90:70}v20H68l-8 21H47l4-23H25l-15-8z"/><path d="M90 32h${index===2?67:42}v8H90zM88 26h25v6H88z"/><path d="M58 24h24v6H58zM18 35H6v17h18z"/><path d="M53 34h30v4H53z" fill="${WEAPONS[index].color}"/>${index===2?'<path d="M55 14h42v9H55zM64 22h7v8h-7zM88 22h7v8h-7z"/>':''}`;
  return `<svg viewBox="0 0 165 80" fill="currentColor" aria-hidden="true">${base}</svg>`;
}
function setupMenu(){
  $('map-grid').innerHTML=MAPS.map((m,i)=>`<button class="map-card ${i===0?'selected':''}" data-map="${m.id}" aria-pressed="${i===0}" aria-label="Select ${m.name}"><img class="map-art" src="assets/map-${m.id}.svg" alt=""><span class="map-num">0${i+1}</span><span class="selected-check">✓ SELECTED</span><span class="map-copy"><span><strong>${m.name}</strong><small>${m.tag}</small></span><b>↗</b></span></button>`).join('');
  document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>selectMap(b.dataset.map));
  updateBelt(shop.profile);shop.render();
  $('your-dots').innerHTML=$('their-dots').innerHTML='<i></i>'.repeat(5);
  $('player-name').value=settings.name;
  const url=new URL(location.href);if(url.searchParams.has('room')){$('room-code').value=url.searchParams.get('room').slice(0,6).toUpperCase();$('lobby').hidden=false;}
}
function updateBelt(profile){const kit=state.mode==='training'&&state.local?state.local:profile;$('weapon-belt').innerHTML=kit.loadout.map((id,slot)=>`<div title="${LOADOUT_SLOTS[slot]||'PRACTICE'}" class="belt-slot ${slot===0?'active':''}" data-weapon="${id}"><span>${slot+1}</span>${gunSVG(id)}<small>${WEAPONS[id].short}</small></div>`).join('');}
const shop=createShop({gunSVG,onChange:updateBelt,notify:toast});
const crosshair=createCrosshair({notify:toast});
function selectMap(id){state.map=mapById(id);document.querySelectorAll('[data-map]').forEach(b=>{b.classList.toggle('selected',b.dataset.map===id);b.setAttribute('aria-pressed',String(b.dataset.map===id));});$('preview-name').textContent=state.map.name.toUpperCase();$('preview-subtitle').textContent=state.map.subtitle.toUpperCase();$('preview-index').textContent=`0${MAPS.indexOf(state.map)+1} / 03`;}
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function feed(message){$('combat-feed').textContent=message;$('combat-feed').style.opacity='1';clearTimeout(feedTimer);feedTimer=setTimeout(()=>$('combat-feed').style.opacity='0',2300);}
function combatNotice(label,detail,note,result='won',duration=1.2){fx.clash=duration;$('clash-label').textContent=label;$('clash-speeds').textContent=detail;$('clash-note').textContent=note;$('clash-notice').dataset.result=result;}
function sound(kind,weapon=0){
  if(!audio||settings.volume<=0)return;
  if(kind==='swing'||kind==='throw'){
    const now=audio.currentTime,duration=.22,buffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*duration),audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const noise=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();noise.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(600,now);filter.frequency.exponentialRampToValueAtTime(2400,now+.08);filter.frequency.exponentialRampToValueAtTime(350,now+duration);
    gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(settings.volume*.22,now+.065);gain.gain.exponentialRampToValueAtTime(.001,now+duration);noise.connect(filter);filter.connect(gain);gain.connect(audio.destination);noise.start(now);noise.stop(now+duration);return;
  }
  const now=audio.currentTime,gain=audio.createGain();gain.connect(audio.destination);gain.gain.setValueAtTime(settings.volume*(kind==='shot'?.15:.08)*(kind==='shot'&&WEAPONS[weapon]?.suppressed?.35:1),now);gain.gain.exponentialRampToValueAtTime(.001,now+(kind==='shot'?.13:.1));
  const osc=audio.createOscillator();osc.type=kind==='shot'?'sawtooth':'sine';osc.frequency.setValueAtTime(kind==='hit'?1100:kind==='go'?650:kind==='reload'?270:kind==='coins'?1300:kind==='explosion'?45:kind==='parry'?1800:kind==='guard'?900:WEAPONS[weapon]?.soundPitch??[130,180,65,75,320,150,95,230,430,55,550,85,55,110,380][weapon]??180,now);osc.frequency.exponentialRampToValueAtTime(kind==='shot'||kind==='explosion'?35:450,now+.1);osc.connect(gain);osc.start(now);osc.stop(now+.14);
  if(kind==='shot'){const buffer=audio.createBuffer(1,audio.sampleRate*.1,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const src=audio.createBufferSource();src.buffer=buffer;src.connect(gain);src.start();}
}
function unlockAudio(){try{audio??=new AudioContext();audio.resume().catch(()=>{});}catch{}}
function clearInput(){keys.clear();input.x=input.z=0;input.fire=input.ads=input.reload=input.sprint=input.crouch=input.grapple=false;}
function controlsActive(){return active()&&!state.paused&&!$('settings').open&&!$('crosshair-settings').open&&!$('admin-dialog').open&&(document.pointerLockElement===canvas||freeLook);}
async function lock(){unlockAudio();$('pause').hidden=true;state.paused=false;if(freeLook){$('capture-fallback').hidden=true;canvas.focus();return;}try{await canvas.requestPointerLock(settings.raw?{unadjustedMovement:true}:undefined);}catch{try{await canvas.requestPointerLock();}catch{state.paused=true;$('pause').hidden=false;$('capture-fallback').hidden=false;toast('Mouse capture is unavailable here. Use the fallback button or open in Chrome / Edge.');}}}
function active(){return state.mode!=='menu'&&state.match&&state.match.phase!=='waiting'&&state.match.phase!=='finished';}
function setView(view){menuView=view;$('play-view').hidden=view!=='play';$('armory-view').hidden=view!=='armory';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='armory')shop.render();$('menu').scrollTop=0;}
function pauseNote(){return state.mode==='training'?'Drill paused. Retry resets your position and keeps your session score. The training kit is borrowed.':state.mode==='online'?'The online match continues while this menu is open.':state.mode==='freeplay'?'Free Play is paused. Reset to return to spawn and refill your ammo.':'Solo practice is paused. Click resume to capture your mouse.';}
function setGameUI(){const playing=active(),free=state.mode==='freeplay',training=state.mode==='training';$('menu').hidden=playing||state.match?.phase==='finished';$('hud').hidden=!playing;$('hud-map').textContent=state.map.name.toUpperCase();$('match-score').hidden=free||training;$('freeplay-status').hidden=!free;$('training-status').hidden=!training;$('hud').classList.toggle('in-training',training);$('freeplay-reset').hidden=!(free||training);$('freeplay-reset').textContent=training?'RETRY DRILL ↻':'RESET POSITION & AMMO ↻';$('leave').textContent=training?'LEAVE PRACTICE':free?'LEAVE FREE PLAY':'LEAVE MATCH';$('pause-note').textContent=pauseNote();document.querySelector('.hud-wallet').hidden=free||training;}
function syncFreePlayPlayer(){
  const p=state.local;clearInput();input.yaw=p.yaw;input.pitch=p.pitch;input.weapon=p.weapon;input.jump=p.lastJump;input.slide=p.lastSlide;input.fireId=p.lastFire;input.altId=p.lastAlt;input.grappleId=p.lastGrapple||0;
  lastHP=100;tracers.length=flames.length=explosions.length=casings.length=confetti.length=0;Object.assign(fx,{ads:0,recoil:0,muzzle:0,hit:0,damage:0,sway:0,shotAge:10,shotWeapon:-1,clash:0,equipAge:0,heldWeapon:p.weapon,sprint:0,guard:0,scopeKick:0});$('coin-gain').textContent='';$('combat-feed').textContent='';
}
async function startTraining(kind){
  if(connecting)return;connecting=true;unlockAudio();
  try{
    await net.close();state.hosted=false;state.mode='training';state.you='you';state.event=0;state.phase='live';state.round=0;state.seq=0;state.matchCoins=0;state.paused=false;state.remote.clear();
    state.match=createTraining(kind,settings.name);selectMap(state.match.map);state.local=state.match.players[0];syncFreePlayPlayer();updateBelt(state.local);
    $('results').hidden=$('lobby').hidden=$('round-banner').hidden=true;setGameUI();await lock();toast(kind==='parry'?'Borrowed katana · F or RMB to parry on the cue.':'Sprint + swing to stun. Press T to switch to a charging trainer.');
  }finally{connecting=false;}
}
async function startFreePlay(){
  if(connecting)return;connecting=true;unlockAudio();
  try{
    await profileReady;state.hosted=false;await net.close();state.mode='freeplay';state.you='you';state.event=0;state.phase='live';state.round=0;state.seq=0;state.matchCoins=0;state.paused=false;state.remote.clear();
    state.match=createFreePlay(state.map.id,settings.name,shop.profile.loadout);state.local=state.match.players[0];syncFreePlayPlayer();updateBelt(shop.profile);
    $('results').hidden=$('lobby').hidden=$('round-banner').hidden=true;setGameUI();await lock();toast('Free Play · No bots or time limit. Esc opens reset and settings.');
  }finally{connecting=false;}
}
async function startSolo(){
  if(connecting)return;connecting=true;
  try{await beginSolo();}finally{connecting=false;}
}
async function beginSolo(){
  unlockAudio();await profileReady;state.matchCoins=0;$('result-coins').textContent='◈ +0 COINS EARNED';
  if(shop.online){state.mode='solo';state.hosted=true;state.local=null;state.event=0;state.phase='';state.match=null;state.seq=0;input.altId=input.fireId=input.jump=input.slide=0;input.weapon=shop.profile.loadout[0];state.paused=true;
    try{const s=await net.connect('practice',{name:settings.name,map:state.map.id,difficulty:settings.difficulty,profileToken:shop.token,expectedUser:shop.user?.username||null},packedInput);if(s){setGameUI();lock();}}catch(e){leave();toast(e.message);}return;
  }
  state.hosted=false;toast('Offline practice: saved loadout available, coin rewards require the Node server.');
  input.altId=input.fireId=0;$('capture-fallback').hidden=true;
  net.close();state.mode='solo';state.you='you';state.event=0;state.phase='';state.round=0;state.bot=createBot();state.match=createMatch(state.map.id);
  const p=createPlayer('you',settings.name,0),bot=createPlayer('bot','ECHO',1);p.loadout=[...shop.profile.loadout];p.weapon=p.loadout[0];state.match.players=[p,bot];readyPlayer(state.match,p);readyPlayer(state.match,bot);state.local=p;state.paused=false;state.remote.clear();input.yaw=p.yaw;input.pitch=p.pitch;input.jump=input.slide=0;input.weapon=p.weapon;lastHP=100;
  $('results').hidden=$('lobby').hidden=true;setGameUI();phaseUI();lock();
}
function leave(){const leaving=net.close();clearInput();state.mode='menu';state.match=null;state.local=null;state.event=0;state.phase='';state.remote.clear();$('results').hidden=$('pause').hidden=$('lobby').hidden=$('capture-fallback').hidden=true;$('menu').hidden=false;$('hud').hidden=true;$('room-detail').hidden=true;document.querySelector('.lobby-actions').hidden=false;document.exitPointerLock?.();updateBelt(shop.profile);setView('play');adminPanel.render();return leaving;}
function phaseUI(){
  const m=state.match;if(!m)return;
  if(m.phase!==state.phase||m.round!==state.round){
    const old=state.phase;state.phase=m.phase;state.round=m.round;
    if(m.phase==='countdown'){
      if(m.round===1){state.matchCoins=0;$('result-coins').textContent='◈ +0 COINS EARNED';}
      const p=m.players.find(p=>p.id===state.you);if(p){input.yaw=p.yaw;input.pitch=p.pitch;input.weapon=p.weapon;input.jump=p.lastJump;input.slide=p.lastSlide;input.altId=p.lastAlt;input.grappleId=p.lastGrapple||0;lastHP=100;}
      clearInput();$('results').hidden=$('lobby').hidden=true;setGameUI();
      if(state.mode==='online'&&(old==='waiting'||old==='finished'||!old)){state.paused=true;$('pause').hidden=false;$('pause-note').textContent='Your rival is ready. Resume to capture your mouse; the live match keeps running.';}
    }
    if(m.phase==='live'){sound('go');feed('GO · Own your angle.');}
    if(m.phase==='finished'){
      $('result-coins').textContent=state.hosted?`◈ +${state.matchCoins} COINS EARNED`:'OFFLINE PRACTICE · NO COIN REWARDS';
      $('capture-fallback').hidden=true;
      clearInput();document.exitPointerLock?.();$('pause').hidden=true;$('results').hidden=false;setGameUI();
      const me=m.players.find(p=>p.id===state.you),them=m.players.find(p=>p.id!==state.you);$('result-kicker').textContent=m.winner===state.you?'MATCH VICTORY':'MATCH COMPLETE';$('result-title').textContent=m.winner===state.you?'TOO QUICK.':'NEXT ONE’S YOURS.';$('result-score').innerHTML=`${me?.score||0} <span>:</span> ${them?.score||0}`;$('result-note').textContent=state.mode==='online'?'Both players must ready up for a rematch.':'Five rounds. A hundred new angles.';$('rematch').disabled=false;$('rematch').innerHTML='RUN IT BACK <b>↻</b>';
    }
    if(m.phase==='waiting'&&state.mode==='online'){
      $('capture-fallback').hidden=true;
      clearInput();document.exitPointerLock?.();$('pause').hidden=$('results').hidden=true;$('menu').hidden=false;$('hud').hidden=true;$('lobby').hidden=false;
    }
  }
}
function events(m){
  for(const event of m.events||[]){if(event.id<=state.event)continue;state.event=event.id;
    if(event.type==='shot'){
      const effects=attackEffects(event.weapon);
      if(event.player===state.you){fx.recoil=effects.recoil;fx.muzzle=effects.muzzle;fx.shotAge=0;fx.shotWeapon=event.weapon;}
      sound(effects.sound,event.weapon);
      const fired=WEAPONS[event.weapon],shooter=m.players.find(p=>p.id===event.player),yaw=shooter?.yaw||0;
      if(!settings.reduced&&effects.casings){const shell=!!fired.pellets;casings.push({p:[event.origin[0]+Math.cos(yaw)*.2+Math.sin(yaw)*.5,event.origin[1]-.2,event.origin[2]+Math.sin(yaw)*.2-Math.cos(yaw)*.5],v:[Math.cos(yaw)*1.5,1.2+Math.random()*.5,Math.sin(yaw)*1.5],life:.75,shell,spin:Math.random()*6});}
      const start=event.player===state.you?[event.origin[0]+Math.cos(input.yaw)*.22,event.origin[1]-.15,event.origin[2]+Math.sin(input.yaw)*.22]:event.origin;
      if(effects.flame){for(const impact of event.impacts)flames.push({a:start,b:impact,life:.22});}
      else if(effects.tracer)for(const impact of event.impacts)tracers.push({a:start,b:impact,life:.065,color:event.player===state.you?'#fff0b9':'#ffa278'});
    }
    if(event.type==='hit'&&event.player===state.you){fx.hit=.16;$('hitmarker').classList.toggle('head',event.head);sound('hit');feed(`${event.head?'HEADSHOT':'HIT'} +${event.damage}`);}
    if(event.type==='hit'&&event.target===state.you)fx.damage=.6;
    if(event.type==='reload'&&event.player===state.you)sound('reload');
    if(event.type==='coins'&&event.player===state.you){state.matchCoins+=event.amount;$('coin-gain').textContent=`+${event.amount}`;$('coin-gain').classList.remove('coin-pop');void $('coin-gain').offsetWidth;$('coin-gain').classList.add('coin-pop');$('result-coins').textContent=`◈ +${state.matchCoins} COINS EARNED`;toast(`${event.reason} · +${event.amount} coins`);sound('coins');}
    if(event.type==='explosion'){explosions.push({p:event.position,radius:event.radius,life:.35});sound('explosion');}
    if(event.type==='ignite')sound('throw');
    if(event.type==='guard'&&event.player===state.you){sound('guard');feed('PARRY ACTIVE · 0.75 SECONDS');}
    if(event.type==='parry'){if(event.player===state.you){sound('parry');feed('PARRIED · '+WEAPONS[event.weapon].short);combatNotice('PARRIED',WEAPONS[event.weapon].short+' BLOCKED','ROCKETS & MELEE STILL BREAK THROUGH','won',.55);}else if(event.attacker===state.you)feed('BLOCKED BY KATANA');for(let n=0;n<4;n++)tracers.push({a:event.position,b:event.position.map((v,i)=>v+(i===1?.2:(n%2?1:-1)*.3)),life:.12,color:'#b4f3f1'});}
    if(event.type==='clash'){
      const own=event.players.indexOf(state.you),won=event.winner===state.you,tied=!event.winner;
      if(own>=0){sound('parry');combatNotice(tied?'CLASH / EVEN':won?'CLASH WON':'CLASH LOST',`${event.speeds[own].toFixed(1)} vs ${event.speeds[1-own].toFixed(1)} M/S`,tied?'CLOSE SPEEDS · BOTH REPELLED':won?'RIVAL STUNNED · FOLLOW UP':'STUNNED · CARRY MORE SPEED',tied?'tie':won?'won':'lost');}
      for(let n=0;n<10;n++){const angle=n*Math.PI/5;tracers.push({a:event.position,b:[event.position[0]+Math.cos(angle)*.8,event.position[1]+Math.sin(angle)*.8,event.position[2]+Math.sin(angle*2)*.3],life:settings.reduced?.06:.16,color:'#ffe6b4'});}
    }
    if(event.type==='dash'&&event.player===state.you){sound('guard');feed('RIFT DASH');}
    if(event.type==='adminToy'){
      feed('ADMIN · '+event.label+(event.enabled?'':' OFF'));
      for(const origin of event.positions||[])for(let n=0;n<32;n++){const angle=n*2.4;confetti.push({p:[...origin],v:[Math.cos(angle)*(2+n%3),2+n%5,Math.sin(angle)*(2+n%3)],life:2.3,color:['#ff9970','#b99eff','#8ff3d6','#ffe28a'][n%4],spin:n});}
      if(confetti.length>128)confetti.splice(0,confetti.length-128);
    }
    if(event.type==='disconnect')toast('Your rival left the room. Waiting for another player.');
  }
}
function onSnapshot(s){
  if(!state.hosted||state.mode==='menu')return;state.you=s.you;if(state.map.id!==s.map)selectMap(s.map);if(s.profile)shop.accept(s.profile);
  const auth=s.players.find(p=>p.id===s.you);if(!auth)return;
  if(!state.local||state.match?.round!==s.round||state.match?.phase!==s.phase){state.local=structuredClone(auth);}
  else{
    const predicted=state.local,predPos=[...predicted.p],predV=[...predicted.v],error=Math.hypot(...auth.p.map((v,i)=>v-predPos[i])),hadGrapple=!!predicted.grapple;
    Object.assign(predicted,structuredClone(auth));
    const blastImpulse=auth.stun>0||!!auth.grapple!==hadGrapple||s.events?.some(e=>e.id>state.event&&((e.type==='hit'&&e.target===s.you)||(e.type==='dash'&&e.player===s.you)||(e.type==='clash'&&e.players.includes(s.you))||(e.type==='adminToy'&&e.players.includes(s.you))));
    if(s.phase==='live'&&error<3){predicted.p=predPos.map((v,i)=>mix(v,auth.p[i],error>.12?.38:0));if(!blastImpulse)predicted.v=predV;}
  }
  state.match=s;events(s);phaseUI();adminPanel.render();
  if(s.phase==='waiting'){
    if(s.playground?.used)setLobbyStatus('ADMIN PLAYGROUND · Coin rewards are disabled in this room.');
    $('share-code').textContent=s.room;$('room-detail').hidden=false;document.querySelector('.lobby-actions').hidden=true;
    const list=$('lobby-players');list.replaceChildren();
    for(const p of s.players){const row=document.createElement('div');row.className='lobby-player';const name=document.createElement('strong');name.textContent=p.name+(p.id===s.you?' (YOU)':'');const status=document.createElement('span');status.textContent=p.ready?'READY':'GETTING READY';row.append(name,status);list.append(row);}
    if(s.players.length===1){const row=document.createElement('div');row.className='lobby-player';row.textContent='Waiting for your rival…';list.append(row);}
    $('ready').disabled=auth.ready;$('ready').innerHTML=auth.ready?'WAITING FOR RIVAL <b>…</b>':'I’M READY <b>✓</b>';
  }
}
const net=new ArenaNetwork(onSnapshot,(message,fatal=false)=>{toast(message);if(fatal){leave();$('lobby').hidden=false;setLobbyStatus(message,true);}});
const adminPanel=createAdminPanel({getUser:()=>shop.user,getMatch:()=>state.match,notify:toast,onOpen:()=>{clearInput();if(active()){state.paused=true;$('pause').hidden=false;}document.exitPointerLock?.();},send:async(command,target)=>{const s=await net.request({action:'admin',command,target});onSnapshot(s);}});
function setLobbyStatus(message,error=false){$('lobby-status').textContent=message;$('lobby-status').classList.toggle('error',error);}
function packedInput(){input.seq=++state.seq;return {...input,paused:state.mode==='solo'&&(state.paused||document.hidden)};}
async function connectRoom(action){
  await profileReady;if(!shop.online){setLobbyStatus('Start the updated server to connect your wallet and play online.',true);return;}state.hosted=true;state.matchCoins=0;
  input.altId=input.fireId=0;
  settings.name=$('player-name').value.trim()||'Runner';save();$('create-room').disabled=$('join-room').disabled=true;setLobbyStatus('Connecting to the arena…');state.mode='online';state.local=null;state.event=0;state.phase='';state.match=null;state.seq=0;
  try{const s=await net.connect(action,{name:settings.name,room:$('room-code').value.trim(),map:state.map.id,http:$('http-only').checked,profileToken:shop.token,expectedUser:shop.user?.username||null},packedInput);if(!s)return;setLobbyStatus('Connected. Share the invite and ready up.');input.yaw=state.local.yaw;input.pitch=state.local.pitch;input.jump=input.slide=0;input.weapon=state.local.weapon;}
  catch(e){state.mode='menu';setLobbyStatus(e.message,true);}finally{$('create-room').disabled=$('join-room').disabled=false;}
}
async function ready(){unlockAudio();try{await net.ready();}catch(e){setLobbyStatus(e.message,true);toast(e.message);}}
function switchWeapon(slot){const kit=state.local?.loadout||shop.profile.loadout;input.weapon=kit[(slot+kit.length)%kit.length];input.ads=false;input.reload=false;fx.recoil=.3;}
function updateInput(){
  if(!controlsActive()){input.x=input.z=0;input.fire=input.ads=input.reload=input.sprint=input.crouch=input.grapple=false;return;}
  if(freeLook){input.yaw+=((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*TICK*1.7;input.pitch=clamp(input.pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*TICK*1.3,-1.48,1.48);}
  input.x=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);input.z=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);input.sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');input.crouch=keys.has('KeyC')||keys.has('ControlLeft')||keys.has('ControlRight');input.reload=keys.has('KeyR');
  input.grapple=keys.has('KeyQ');
}
function tick(){
  if(!active())return;updateInput();
  if(state.mode==='training'){
    if(state.paused||document.hidden)return;const revision=state.match.training.revision;stepTraining(state.match,input);if(revision!==state.match.training.revision)syncFreePlayPlayer();events(state.match);
  }else if(state.mode==='freeplay'){
    if(state.paused||document.hidden)return;stepMatch(state.match,{you:cleanInput(input)});events(state.match);
  }else if(state.mode==='solo'&&!state.hosted){
    if(state.paused)return;const p=state.local,bot=state.match.players.find(p=>p.id==='bot');
    const botControl=botInput(state.bot,bot,p,state.match,TICK,settings.difficulty);stepMatch(state.match,{you:cleanInput(packedInput()),bot:botControl});events(state.match);phaseUI();
  }else if(state.match.phase==='live'&&!(state.mode==='solo'&&state.paused)&&performance.now()-net.lastReceive<1500){movePlayer(state.local,cleanInput(input),state.map,TICK,state.match.playground);}
}
function hud(dt){
  const m=state.match,p=state.local;if(!m||!p)return;const other=m.players.find(p=>p.id!==state.you),w=WEAPONS[p.weapon];
  $('your-name').textContent=p.name;$('their-name').textContent=other?.name||'RIVAL';$('your-score').textContent=p.score;$('their-score').textContent=other?.score||0;
  for(const [id,n]of [['your-dots',p.score],['their-dots',other?.score||0]])[...$(id).children].forEach((d,i)=>d.classList.toggle('filled',i<n));
  $('round-label').textContent=`ROUND ${String(m.round).padStart(2,'0')}`;const remaining=Math.max(0,Math.ceil(m.clock));$('clock').textContent=`${Math.floor(remaining/60).toString().padStart(2,'0')}:${(remaining%60).toString().padStart(2,'0')}`;
  $('health-value').textContent=p.hp;$('health-bar').style.width=p.hp+'%';if(p.hp<lastHP)fx.damage=.65;lastHP=p.hp;
  $('weapon-name').textContent=w.name.toUpperCase();$('ammo-value').textContent=p.ammo[p.weapon]<0?'∞':p.ammo[p.weapon];$('ammo-max').textContent=w.ammo<0?'':`/ ${w.ammo}`;
  $('reload-label').textContent=w.throwable?(p.ammo[p.weapon]>0?'LEFT CLICK TO THROW · PER ROUND':m.freePlay?'EMPTY · ESC → RESET AMMO':'EMPTY · REFILLS NEXT ROUND'):p.reload>0?'RELOADING…':w.spinup?`SPIN ${Math.round(p.spin*100)}% · HOLD FIRE`:w.flame?'FUEL · RELOAD [R]':w.charge?`DRAW ${Math.round(p.charge*100)}% · HOLD AIM`:w.ammo<0?'MOMENTUM BOOST':'RELOAD [R]';
  document.querySelectorAll('[data-weapon]').forEach(b=>b.classList.toggle('active',+b.dataset.weapon===p.weapon));
  $('ability').hidden=!(w.parry||w.dash);$('ability').classList.toggle('guarding',p.parry>0);$('ability-name').textContent=w.parry?'KATANA PARRY':'SCYTHE DASH';$('ability-state').textContent=p.parry>0?`PARRY ACTIVE · ${p.parry.toFixed(2)}s`:p.dash>0?'DASHING':p.abilityCD>0?`RECHARGING · ${p.abilityCD.toFixed(1)}s`:'READY · RMB / F';$('ability-fill').style.width=`${100*(p.parry>0?p.parry/w.parry:1-p.abilityCD/(w.abilityCooldown||1))}%`;$('ability-note').textContent=w.parry?'ROCKETS & ALL MELEE BYPASS':'DASH TOWARD YOUR MOVEMENT';
  const speed=Math.hypot(p.v[0],p.v[2]);$('speed').querySelector('strong').textContent=speed.toFixed(1);
  $('grapple-state').textContent=p.stun>0?'DISABLED WHILE STUNNED':p.grapple?'ATTACHED · RELEASE Q':p.grappleCD>0?`RECHARGING · ${p.grappleCD.toFixed(1)}s`:'READY · HOLD Q';$('grapple-fill').style.width=`${100*(p.grapple?p.grapple.remaining/GRAPPLE.duration:1-(p.grappleCD||0)/GRAPPLE.cooldown)}%`;$('grapple-status').classList.toggle('attached',!!p.grapple);
  if(m.training){const t=m.training;$('training-title').textContent=t.kind==='parry'?'PARRY PRACTICE':'STUN PRACTICE';$('training-cue').textContent=t.result?.label||t.cue;$('training-detail').textContent=t.result?.detail||(t.kind==='parry'?'F / RMB on the cue · borrowed katana':t.charging?'Charging trainer · beat its speed or practice recovery':'Stationary trainer · sprint, slide, then swing');$('training-score').textContent=`${t.successes} / ${t.attempts} SUCCESS · STREAK ${t.streak} · BEST ${t.best}`;$('training-hint').textContent=t.kind==='parry'?'INSTANT RETRIES · ESC TO PAUSE':'T: SWITCH TRAINER PACE · ESC TO PAUSE';$('training-status').dataset.feedback=t.result?(t.result.success?'success':'miss'):t.cue.includes('NOW')?'cue':'ready';}
  $('speed').classList.toggle('redline',speed>=MOVEMENT.redline);$('speed-tier').textContent=speed>=MOVEMENT.redline?'REDLINE / KEEP IT':speed>=10?'FAST / SLIDE + JUMP':'BUILD MOMENTUM';$('speed-fill').style.width=`${clamp(speed/MOVEMENT.maxSpeed*100,0,100)}%`;
  $('movement-state').textContent=p.stun>0?'STUNNED / RECOVERING':p.slide>0?'SLIDE / CHAIN A JUMP':!p.ground?(p.jumps<2?'AIRBORNE / KEEP MOMENTUM':'DOUBLE JUMP / AIR-STRAFE'):p.crouch?'LOW PROFILE':speed>9?'SPRINTING':speed>1?'ON THE MOVE':'READY TO MOVE';
  fx.clash=Math.max(0,fx.clash-dt);$('clash-notice').hidden=fx.clash<=0||m.phase!=='live';$('stun-status').hidden=$('stun-vignette').hidden=!(p.stun>0);$('stun-time').textContent=`${(p.stun||0).toFixed(2)}s`;$('stun-fill').style.width=`${clamp((p.stun||0)/MOVEMENT.clashStun*100,0,100)}%`;
  $('connection').textContent=state.mode==='freeplay'||state.mode==='training'?'LOCAL PRACTICE / NO COIN REWARDS':state.mode==='solo'?`${settings.difficulty.toUpperCase()} / VS. ECHO / ${net.transport}`:`ROOM ${net.code} / ${net.transport.toUpperCase()}`;$('ping').textContent=state.hosted?`${net.ping} MS`:state.mode==='freeplay'||state.mode==='training'?'LOCAL':'OFFLINE';$('fps').textContent=`${fps} FPS`;
  $('round-banner').hidden=m.phase==='live';if(m.phase==='countdown'){$('banner-kicker').textContent=`ROUND ${m.round} / GET READY`;$('banner-title').textContent=Math.max(1,Math.ceil(m.clock));$('banner-note').textContent='First to five. Make it count.';}
  if(m.phase==='intermission'){$('banner-kicker').textContent='ROUND COMPLETE';$('banner-title').textContent=!m.roundWinner?'DRAW':m.roundWinner===state.you?'ROUND WON':'ROUND LOST';$('banner-note').textContent=`Next round in ${Math.ceil(m.clock)} · Stay quick.`;}
  if(fx.heldWeapon!==p.weapon){fx.heldWeapon=p.weapon;fx.equipAge=0;fx.scopeKick=0;}
  fx.equipAge+=dt;fx.sprint=mix(fx.sprint,speed>10&&p.ground&&!input.ads?1:0,1-Math.exp(-10*dt));fx.guard=mix(fx.guard,p.parry>0?1:0,1-Math.exp(-22*dt));
  fx.shotAge+=dt;fx.ads=mix(fx.ads,input.ads&&!isMelee(p.weapon)&&!w.throwable?1:0,1-Math.exp(-16*dt));fx.recoil=Math.max(0,fx.recoil-dt*6);fx.muzzle=Math.max(0,fx.muzzle-dt);fx.hit=Math.max(0,fx.hit-dt);fx.damage=Math.max(0,fx.damage-dt*1.3);fx.sway*=Math.exp(-10*dt);
  const scope=sniperScope({weapon:p.weapon,ads:fx.ads,age:fx.shotWeapon===2?fx.shotAge:10,cooldown:p.cooldown,reload:p.reload,ammo:p.ammo[2],reduced:settings.reduced});paintSniperScope($('scope'),scope);fx.scopeKick=scope.visible?scope.kick:0;
  crosshair.update({speed,recoil:fx.recoil,ads:fx.ads,alive:p.hp>0,scoped:scope.visible});$('hitmarker').style.opacity=fx.hit>0?'1':'0';$('damage-vignette').style.opacity=fx.damage;
}
function frame(now){
  const dt=Math.min(.075,(now-last)/1000);last=now;time+=dt;accumulator+=dt;while(accumulator>=TICK){tick();accumulator-=TICK;}
  const playing=active(),p=state.local;let camera,players=[],fov=settings.fov;
  if(playing&&p){
    hud(dt);const bob=settings.reduced?0:Math.sin(time*12)*Math.min(Math.hypot(p.v[0],p.v[2])*.002,.024)*(p.ground?1:0)*(1-fx.ads);
    camera={pos:[p.p[0],p.p[1]+eyeHeight(p)+bob,p.p[2]],yaw:input.yaw,pitch:input.pitch};fov=mix(settings.fov,WEAPONS[p.weapon].ads,fx.ads);
    if(!settings.reduced)fov+=Math.min(9,Math.max(0,Math.hypot(p.v[0],p.v[2])-10)*.6)*(1-fx.ads)+fx.scopeKick*1.8;
    players=state.match.players.map(other=>{if(other.id===state.you)return p;if(!state.hosted)return other;let remote=state.remote.get(other.id);if(!remote){remote=structuredClone(other);state.remote.set(other.id,remote);}const old=[...remote.p];Object.assign(remote,other);remote.p=old.map((v,i)=>mix(v,other.p[i],1-Math.exp(-18*dt)));return remote;});
  }else{
    const a=.68+(settings.reduced?0:Math.sin(time*.055)*.1);camera={pos:[Math.sin(a)*43,23,Math.cos(a)*43],yaw:-a,pitch:-.47};fov=58;
    if(state.match?.phase==='finished')camera={pos:[30,21,30],yaw:-Math.PI*.25,pitch:-.48};
  }
  for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0)tracers.splice(i,1);}
  for(let i=casings.length-1;i>=0;i--){const c=casings[i];c.life-=dt;c.v[1]-=9*dt;for(let j=0;j<3;j++)c.p[j]+=c.v[j]*dt;c.spin+=dt*16;if(c.life<=0)casings.splice(i,1);}
  for(let i=confetti.length-1;i>=0;i--){const c=confetti[i];c.life-=dt;c.v[1]-=6*dt;for(let j=0;j<3;j++)c.p[j]+=c.v[j]*dt;c.spin+=dt*4;if(c.life<=0)confetti.splice(i,1);}
  for(let i=flames.length-1;i>=0;i--){flames[i].life-=dt;if(flames[i].life<=0)flames.splice(i,1);}
  for(let i=explosions.length-1;i>=0;i--){explosions[i].life-=dt;if(explosions[i].life<=0)explosions.splice(i,1);}
  renderer.render({map:state.map,camera,players,local:playing?p:null,fx:settings.reduced?{...fx,recoil:0,sway:0,shotAge:p?.weapon===4?fx.shotAge:10,reduced:true}:fx,time,tracers,flames,casings,confetti,playground:playing?state.match.playground:null,projectiles:playing?state.match.projectiles||[]:[],hazards:playing?state.match.hazards||[]:[],explosions,menu:!playing,fov,quality:settings.quality});
  frameCount++;if(now-fpsTime>=1000){fps=Math.round(frameCount*1000/(now-fpsTime));frameCount=0;fpsTime=now;}
  requestAnimationFrame(frame);
}

document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('armory-back').onclick=()=>setView('play');$('solo').onclick=startSolo;$('friends').onclick=()=>{$('lobby').hidden=false;};$('lobby-close').onclick=()=>{if(state.mode==='online')leave();else $('lobby').hidden=true;};$('create-room').onclick=()=>connectRoom('create');$('join-room').onclick=()=>connectRoom('join');$('room-code').onkeydown=e=>{if(e.key==='Enter')connectRoom('join');};$('ready').onclick=ready;
$('freeplay').onclick=startFreePlay;
$('parry-practice').onclick=()=>startTraining('parry');$('stun-practice').onclick=()=>startTraining('stun');
$('freeplay-reset').onclick=()=>{if(state.mode==='training')resetTraining(state.match);else if(state.mode==='freeplay')resetFreePlay(state.match);else return;syncFreePlayPlayer();lock();toast('Position, health, ammo and abilities reset.');};
$('copy-room').onclick=async()=>{const invite=`${location.origin}/?room=${net.code}`;try{await navigator.clipboard.writeText(invite);toast(['localhost','127.0.0.1','[::1]'].includes(location.hostname)?`Room ${net.code}: replace localhost in the invite with your LAN IP, or use a hosted HTTPS address.`:'Invite link copied. Your friend needs access to this server.');}catch{toast(`Room ${net.code} · share ${location.origin}`);}};
$('resume').onclick=lock;$('leave').onclick=leave;$('results-leave').onclick=leave;$('rematch').onclick=async()=>{if(state.mode==='solo')startSolo();else{$('rematch').disabled=true;$('rematch').textContent='WAITING FOR YOUR RIVAL…';try{await net.ready();}catch(e){$('rematch').disabled=false;toast(e.message);}}};
for(const id of ['settings-open','pause-settings'])$(id).onclick=()=>$('settings').showModal();
for(const id of ['settings-close','settings-done'])$(id).onclick=()=>$('settings').close();
const controls=[['sensitivity','sensitivity','sensitivity-value'],['ads-sensitivity','ads','ads-value'],['fov','fov','fov-value'],['volume','volume','volume-value']];
for(const [id,key,out]of controls){$(id).value=settings[key];const update=()=>{settings[key]=+$(id).value;$(out).textContent=key==='fov'?`${settings[key]}°`:key==='volume'?`${Math.round(settings[key]*100)}%`:`${settings[key].toFixed(2)}×`;save();};$(id).oninput=update;update();}
for(const [id,key]of [['quality','quality'],['difficulty','difficulty']]){$(id).value=settings[key];$(id).onchange=()=>{settings[key]=key==='quality'?+$(id).value:$(id).value;save();};}
for(const [id,key]of [['raw-input','raw'],['reduced-motion','reduced']]){$(id).checked=settings[key];$(id).onchange=()=>{settings[key]=$(id).checked;save();};}
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===canvas;if(active()){state.paused=!locked;$('pause').hidden=locked;$('pause-note').textContent=pauseNote();}if(!locked)clearInput();});
document.addEventListener('pointerlockerror',()=>{if(active()&&!freeLook){state.paused=true;$('pause').hidden=false;}});
canvas.onclick=()=>{if(active()&&document.pointerLockElement!==canvas)lock();};
document.addEventListener('mousemove',e=>{if(!controlsActive()||(freeLook&&!input.ads))return;const factor=.002*settings.sensitivity*mix(1,settings.ads*Math.tan(WEAPONS[state.local.weapon].ads*Math.PI/360)/Math.tan(settings.fov*Math.PI/360),fx.ads);input.yaw+=e.movementX*factor;input.pitch=clamp(input.pitch-e.movementY*factor,-1.48,1.48);fx.sway=clamp(fx.sway+e.movementX*.0003,-.1,.1);});
document.addEventListener('mousedown',e=>{if(!controlsActive())return;if(e.button===0){input.fire=true;input.fireId++;}if(e.button===2){input.ads=true;input.altId++;}});document.addEventListener('mouseup',e=>{if(e.button===0)input.fire=false;if(e.button===2)input.ads=false;});canvas.oncontextmenu=e=>e.preventDefault();
document.addEventListener('keydown',e=>{if(!controlsActive())return;if(e.code==='Escape'&&freeLook){clearInput();state.paused=true;$('pause').hidden=false;return;}if(['Space','Tab','ControlLeft','ControlRight','KeyW','KeyA','KeyS','KeyD','KeyQ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(e.code==='Space')input.jump++;if(e.code==='KeyF')input.altId++;if(e.code==='KeyQ'){input.grapple=true;input.grappleId++;}if(e.code==='KeyT'&&state.mode==='training'&&state.match.training.kind==='stun'){toggleTrainingPace(state.match);syncFreePlayPlayer();}if(['KeyC','ControlLeft','ControlRight'].includes(e.code))input.slide++;if(/^Digit[1-4]$/.test(e.code))switchWeapon(+e.code.at(-1)-1);}});
document.addEventListener('keyup',e=>keys.delete(e.code));canvas.addEventListener('wheel',e=>{if(!controlsActive())return;e.preventDefault();switchWeapon((state.local?.loadout||shop.profile.loadout).indexOf(input.weapon)+(e.deltaY>0?1:-1));},{passive:false});
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if((state.mode==='solo'||state.mode==='freeplay'||state.mode==='training')&&active()){state.paused=true;$('pause').hidden=false;document.exitPointerLock?.();}}});window.addEventListener('pagehide',()=>net.close());
window.addEventListener('error',e=>{if(e.message&&!e.message.includes('Script error'))console.error('Arena runtime:',e.message);});
// Read-only diagnostics for local verification, no server controls or gameplay cheats.
window.arenaDiagnostics=()=>({mode:state.mode,map:state.map.id,phase:state.match?.phase,round:state.match?.round,players:state.match?.players.map(p=>({id:p.id,hp:p.hp,score:p.score,position:[...p.p],weapon:p.weapon})),fps,drawObjects:renderer.objectCount,transport:net.transport,webglError:renderer.gl.getError()});
$('capture-fallback').onclick=()=>{freeLook=true;state.paused=false;$('pause').hidden=$('capture-fallback').hidden=true;canvas.focus();unlockAudio();toast('WASD to move. Arrow keys or right-drag to aim. ESC opens the menu.');};
setupMenu();
const profileReady=shop.init();
createAccounts({shop,beforeChange:leave,notify:toast});
$('wallet-open').onclick=()=>setView('armory');$('results-shop').onclick=async()=>{await leave();setView('armory');};
import {ensureServerReady} from './api.js';
ensureServerReady(()=>{$('server-label').textContent='SERVER WAKING';setLobbyStatus('Waking the free game server. You can use Free Play while it starts.');}).then(()=>{$('server-label').textContent='SERVER ONLINE';setLobbyStatus('Game server connected.');}).catch(e=>{$('server-label').textContent='FREE PLAY AVAILABLE';setLobbyStatus(e.message,true);});
requestAnimationFrame(frame);

