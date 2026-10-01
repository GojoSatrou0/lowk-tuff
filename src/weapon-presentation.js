import {WEAPONS,isMelee} from './shared.js';

// A shared attack event does not imply gunfire: melee only gets a swing and whoosh.
export function attackEffects(id){
  const w=WEAPONS[id],melee=isMelee(id);
  return {sound:melee?'swing':'shot',recoil:melee?0:1,muzzle:melee?0:.065,
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
