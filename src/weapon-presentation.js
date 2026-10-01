import {WEAPONS,isMelee,clamp} from './shared.js';

const smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
function envelope(age,keys){
  if(!Number.isFinite(age)||age<0||age>=keys.at(-1)[0])return 0;
  let i=1;while(age>keys[i][0])i++;const [a,x]=keys[i-1],[b,y]=keys[i];return x+(y-x)*smooth((age-a)/(b-a));
}
export function weaponMotion(id,age,{ads=0,reload=0,equipAge=10,reduced=false,shots=1}={}){
  const w=WEAPONS[id]||WEAPONS[0],melee=isMelee(id),motion=reduced?0:1;
  const strength=w.recoil??([.8,.45,1.7,1.45,0,.9,1.1,.5,.25,1.65,0,.28,.15,1.35,0][id]||0);
  const duration=w.recoilDuration??([.24,.13,.78,.55,.42,.24,.4,.18,.25,.58,.35,.1,.17,.43,.55][id]||.3);
  const pulse=envelope(age,[[0,0],[duration*.055,1],[duration*.3,.32],[duration*.64,-.075],[duration,0]]);
  const kick=melee?0:pulse*strength*(1-clamp(finite(ads),0,1)*.45)*motion;
  const progress=reload>0&&w.reload?clamp(1-finite(reload)/w.reload,0,1):0;
  const reloadPose=envelope(progress,[[0,0],[.16,1],[.73,1],[1,0]])*motion;
  const magazine=envelope(progress,[[0,0],[.18,0],[.33,1],[.6,1],[.83,0],[1,0]])*motion;
  return {kick,side:(shots%2?1:-1)*kick*.014,
    bolt:id===2?envelope(age,[[0,0],[.12,0],[.26,1],[.43,1],[.69,0],[.82,0]])*motion:0,
    boltLift:id===2?envelope(age,[[0,0],[.09,0],[.17,1],[.6,1],[.76,0],[.82,0]])*motion:0,
    cycle:envelope(age,[[0,0],[.035,1],[.14,0],[.2,0]])*motion,
    pump:id===3?envelope(age,[[0,0],[.12,0],[.27,1],[.38,1],[.55,0]])*motion:0,
    reload:reloadPose,magazine,progress,
    equip:(1-smooth(finite(equipAge,10)/.26))*motion};
}

// This is optical feedback only: yaw, pitch and the center reticle never move.
export function sniperScope({weapon=2,ads=1,age=10,cooldown=0,reload=0,ammo=1,reduced=false}={}){
  const visible=weapon===2&&finite(ads)>.55,shot=weapon===2&&Number.isFinite(age)&&age>=0&&age<1.05;
  const pose=weaponMotion(2,shot?age:10,{ads:1,reduced});
  const eject=shot&&age>=.23&&age<.55?(age-.23)/.32:-1;
  const status=reload>0?'RELOADING':cooldown>0?(shot?'CYCLING BOLT':'SETTLING'):ammo<=0?'RELOAD · R':'READY';
  return {visible,opacity:smooth((finite(ads)-.55)/.35),kick:Math.max(0,pose.kick),bolt:pose.bolt,lift:pose.boltLift,
    flash:!reduced&&shot?envelope(age,[[0,0],[.018,.2],[.11,0]]):0,
    casing:reduced||eject<0?0:Math.sin(eject*Math.PI),casingX:Math.max(0,eject)*55,casingY:-Math.sin(Math.max(0,eject)*Math.PI)*20,casingTurn:Math.max(0,eject)*150,
    status,ready:status==='READY',progress:reload>0?0:clamp(1-finite(cooldown)/WEAPONS[2].rate,0,1)};
}

export function paintSniperScope(element,presentation){
  const s=presentation;element.hidden=!s.visible;element.dataset.state=s.ready?'ready':'cycling';
  for(const [key,value]of Object.entries({'opacity':s.opacity,'kick':s.kick,'flash':s.flash,'bolt':s.bolt,'lift':s.lift,'casing':s.casing,'case-x':s.casingX+'px','case-y':s.casingY+'px','case-turn':s.casingTurn+'deg'}))element.style.setProperty('--scope-'+key,String(value));
  element.querySelector('[data-scope-status]').textContent=s.status;element.querySelector('[data-scope-progress]').style.width=s.progress*100+'%';
}

// A shared attack event does not imply gunfire: melee only gets a swing and whoosh.
export function attackEffects(id){
  const w=WEAPONS[id],melee=isMelee(id);
  return {sound:melee?'swing':'shot',recoil:melee?0:1,muzzle:melee||w.projectile?0:w.suppressed?.025:.065,
    tracer:!melee&&!w.projectile&&!w.flame,casings:!melee&&!w.projectile&&!w.flame,flame:!!w.flame};
}

// Wind up, cut across the camera, then settle. Alternate the diagonal per attack.
export function bladeSwing(age,shots=1,reduced=false){
  const rest={position:[0,0,0],rotation:[-.16,-.25,-.3]};
  if(age<0||age>=.42||!Number.isFinite(age))return rest;
  const side=shots%2?1:-1,amount=reduced?.42:1;
  const keys=[
    [0,[0,0,0],[-.16,-.25,-.3]],
    [.075,[.075,-.025,.025],[-.3,-.45,-.75*side]],
    [.19,[-.34,.23,-.12],[.35,.55,1.35*side]],
    [.26,[-.22,.10,-.05],[.25,.3,1.05*side]],
    [.42,rest.position,rest.rotation]
  ];
  let n=1;while(age>keys[n][0])n++;
  const a=keys[n-1],b=keys[n],t=(age-a[0])/(b[0]-a[0]),s=t*t*(3-2*t);
  return {position:a[1].map((v,i)=>(v+(b[1][i]-v)*s)*amount),rotation:a[2].map((v,i)=>rest.rotation[i]+(v+(b[2][i]-v)*s-rest.rotation[i])*amount)};
}
