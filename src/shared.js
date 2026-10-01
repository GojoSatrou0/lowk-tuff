// Shared deterministic rules: the browser predicts movement; the server owns combat.
export const TICK = 1 / 60;
export const MOVEMENT = Object.freeze({maxSpeed:32,redline:16,clashWindow:.12,clashMargin:1,clashStun:.75});
export const GRAPPLE = Object.freeze({range:30,duration:1.8,cooldown:2.5,pull:48});
export const horizontalSpeed = p => Math.hypot(p.v[0],p.v[2]);
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const mix = (a, b, t) => a + (b - a) * t;
export const WEAPONS = [
  { name: 'V-24 Carbine', short: 'CARBINE', type: 'auto', ammo: 24, damage: 23, head: 1.65, rate: .135, reload: 1.65, range: 100, spread: .012, ads: 58, color: '#ff7847' },
  { name: 'Vector SMG', short: 'SMG', type: 'auto', ammo: 32, damage: 14, head: 1.5, rate: .075, reload: 1.45, range: 60, spread: .025, ads: 64, color: '#7ad9cb' },
  { name: 'Longshot', short: 'SNIPER', type: 'semi', ammo: 5, damage: 75, head: 2, rate: 1.05, reload: 2.2, range: 180, spread: .035, ads: 26, color: '#bb9cff' },
  { name: 'Breach-8', short: 'SHOTGUN', type: 'semi', ammo: 6, damage: 13, head: 1.25, pellets: 8, rate: .72, reload: 1.9, range: 27, spread: .062, ads: 66, color: '#ffcd70' },
  { name: 'Momentum Blade', short: 'BLADE', type: 'semi', ammo: -1, damage: 55, head: 1, rate: .45, reload: 0, range: 2.8, spread: 0, ads: 85, color: '#d9e6e8' },
  { name: 'Triad Burst', short: 'BURST', type: 'burst', ammo: 27, damage: 21, head: 1.6, rate: .38, burst: 3, burstRate: .075, reload: 1.8, range: 110, spread: .018, ads: 52, color: '#a8c9ff', price: 275, model: 'burst', description: 'Three-round bursts. Commit to a clean angle and control the rhythm.' },
  { name: 'Ironclad Revolver', short: 'REVOLVER', type: 'semi', ammo: 6, damage: 42, head: 2, rate: .34, reload: 1.85, range: 80, spread: .008, ads: 62, color: '#ffd29d', price: 150, model: 'revolver', description: 'Six heavy shots. Accurate ADS rewards patient headshots.' },
  { name: 'Twin Sparks', short: 'DUAL', type: 'auto', ammo: 20, damage: 18, head: 1.5, rate: .105, reload: 1.6, range: 48, spread: .028, ads: 68, color: '#f2a1d1', price: 225, model: 'dual', description: 'Alternating pistols for relentless pressure in close quarters.' },
  { name: 'Arc Bow', short: 'BOW', type: 'semi', ammo: 1, damage: 80, head: 1.6, rate: .65, reload: .8, range: 120, spread: 0, ads: 55, color: '#92e6b0', price: 350, model: 'bow', projectile: 'arrow', speed: 48, gravity: 7, charge: true, autoReload: true, description: 'Hold aim to draw. Arrows travel and drop; lead moving targets.' },
  { name: 'Comet Launcher', short: 'ROCKET', type: 'semi', ammo: 1, damage: 85, head: 1, rate: .9, reload: 2.3, range: 100, spread: 0, ads: 70, color: '#ffc16d', price: 450, model: 'rocket', projectile: 'rocket', speed: 24, gravity: 0, radius: 4.2, description: 'Traveling rockets with cover-aware splash. Blast-jump with care.' },
  { name: 'Gale Katana', short: 'KATANA', type: 'semi', ammo: -1, damage: 48, head: 1, rate: .32, reload: 0, range: 3.4, spread: 0, ads: 85, color: '#b4f3f1', price: 300, model: 'katana', sprint: 14, parry: .75, abilityCooldown: 2.2, description: 'RMB / F: parry bullets, arrows, and flames for 0.75s. Rockets and all melee break through.' },
  { name: 'Cyclone Minigun', short: 'MINIGUN', type: 'auto', ammo: 90, damage: 11, head: 1.4, rate: .05, reload: 3.1, range: 90, spread: .023, ads: 66, color: '#aeb8ff', price: 425, model: 'minigun', spinup: .55, moveScale: .72, description: 'Hold fire to spin up six barrels, then unleash a stream of rounds. Heavy but relentless.' },
  { name: 'Ember Flamethrower', short: 'FLAME', type: 'auto', ammo: 60, damage: 7, head: 1, rate: .09, reload: 2.4, range: 10, spread: 0, ads: 76, color: '#ff9b58', price: 375, model: 'flame', flame: true, cone: .2, description: 'A short-range cone of fire. Cover stops the flames; a timed katana parry blocks them.' },
  { name: 'Pocket Shorty', short: 'SHORTY', type: 'semi', ammo: 2, damage: 10, head: 1.15, pellets: 10, rate: .22, reload: 1.7, range: 18, spread: .105, ads: 72, color: '#e7c08d', price: 100, model: 'shorty', description: 'Two quick, wide pellet blasts. A compact finisher for close-range duels.' },
  { name: 'Rift Scythe', short: 'SCYTHE', type: 'semi', ammo: -1, damage: 60, head: 1, rate: .7, reload: 0, range: 4, spread: 0, ads: 85, color: '#d5acff', price: 325, model: 'scythe', sprint: 13, dash: .18, abilityCooldown: 2.8, description: 'Heavy, long-reaching swings. RMB / F dashes in your movement direction. Cuts through parries.' },
];
export const DEFAULT_LOADOUT = [0,1,2,3,4];
export const isMelee = id => WEAPONS[id]?.ammo === -1;
const box = (x, z, w, h, d, kind = 'cover', y = 0) => ({ x, z, w, h, d, y, kind });
const ramp = (x, z, w, h, d, dir = 1, y = 0) => ({ x, z, w, h, d, dir, y });
export const MAPS = [
  { id: 'foundry', name: 'The Foundry', subtitle: 'Industrial / balanced', description: 'Three lanes. Elevated flanks. No place to stand still.', tag: 'ALL-ROUNDER', sky: '#bbcace', floor: '#56636a', wall: '#cfcdc0', accent: '#ff7547', extent: 28,
    spawns: [[0, 0, 23], [0, 0, -23]],
    boxes: [box(-18,0,7,3.5,14,'platform'),box(18,0,7,3.5,14,'platform'),box(0,0,5,4,7,'reactor'),box(-8,-9,4,2.5,6),box(8,9,4,2.5,6),box(-8,12,4,2,3),box(8,-12,4,2,3),box(-23,-20,4,5,8,'tower'),box(23,20,4,5,8,'tower')],
    ramps: [ramp(-18,-11,7,3.5,8,1),ramp(-18,11,7,3.5,8,-1),ramp(18,-11,7,3.5,8,1),ramp(18,11,7,3.5,8,-1)] },
  { id: 'canyon', name: 'Sunbreak', subtitle: 'Canyon / close quarters', description: 'Sun-cut stone, fast corners, and high-ground routes.', tag: 'CLOSE QUARTERS', sky: '#e8c9a0', floor: '#b48b62', wall: '#c08b60', accent: '#72cbbb', extent: 28,
    spawns: [[-10,0,23],[10,0,-23]],
    boxes: [box(-17,0,8,4,14,'platform'),box(17,0,8,4,14,'platform'),box(-5,-8,5,5,8,'stone'),box(5,8,5,5,8,'stone'),box(-5,9,5,2.4,3,'stone'),box(5,-9,5,2.4,3,'stone'),box(0,0,4,2,4,'stone'),box(-22,21,5,7,5,'tower'),box(22,-21,5,7,5,'tower')],
    ramps: [ramp(-17,-12,8,4,10,1),ramp(-17,12,8,4,10,-1),ramp(17,-12,8,4,10,1),ramp(17,12,8,4,10,-1)] },
  { id: 'skyline', name: 'Afterlight', subtitle: 'Rooftop / long sightlines', description: 'A neon rooftop with stacked routes and open sightlines.', tag: 'VERTICAL PLAY', sky: '#172737', floor: '#24394b', wall: '#405666', accent: '#8be3e6', extent: 28,
    spawns: [[0,0,23],[0,0,-23]],
    boxes: [box(-17,0,8,5,16,'platform'),box(17,0,8,5,16,'platform'),box(0,0,12,.7,6,'bridge',5),box(-8,13,4,2.6,4),box(8,-13,4,2.6,4),box(7,13,3,1.4,3),box(-7,-13,3,1.4,3),box(0,0,3,2.4,3,'reactor')],
    ramps: [ramp(-17,-14,8,5,12,1),ramp(-17,14,8,5,12,-1),ramp(17,-14,8,5,12,1),ramp(17,14,8,5,12,-1),ramp(-9,0,6,5.7,6,1),ramp(9,0,6,5.7,6,-1)] },
];
export const mapById = id => MAPS.find(m => m.id === id) || MAPS[0];
export const eyeHeight = p => p.crouch || p.slide > 0 ? .92 : 1.58;
export const forward = (yaw, pitch = 0) => [Math.sin(yaw)*Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw)*Math.cos(pitch)];
const length = v => Math.hypot(...v);
const norm = v => { const l = length(v) || 1; return v.map(n => n / l); };
export function rampHeight(r, x, z) {
  if (Math.abs(x-r.x) > r.w/2 || Math.abs(z-r.z) > r.d/2) return -Infinity;
  return r.y+r.h*clamp(.5+(z-r.z)/r.d*r.dir,0,1);
}
export function floorAt(map, x, z, ceiling = Infinity) {
  let floor = 0;
  for (const b of map.boxes) if (Math.abs(x-b.x)<b.w/2+.12 && Math.abs(z-b.z)<b.d/2+.12 && b.y+b.h<=ceiling) floor=Math.max(floor,b.y+b.h);
  for (const r of map.ramps) { const h=rampHeight(r,x,z); if(h<=ceiling) floor=Math.max(floor,h); }
  return floor;
}
export function createPlayer(id, name, slot = 0) {
  return { id, name: String(name || 'Runner').slice(0,18), slot, p: [0,0,0], v:[0,0,0], yaw:0,pitch:0,hp:100,score:0,ready:false,weapon:0,loadout:[...DEFAULT_LOADOUT],ammo:WEAPONS.map(w=>w.ammo),reload:0,cooldown:0,burstLeft:0,charge:0,spin:0,parry:0,abilityCD:0,dash:0,stun:0,swing:null,grapple:null,grappleCD:0,lastGrapple:0,ground:true,coyote:.1,jumps:0,slide:0,slideCD:0,crouch:false,ads:false,lastJump:0,lastSlide:0,lastFire:0,lastAlt:0,altHeld:false,trigger:false,shots:0,ack:0 };
}
export function resetPlayer(p, map) {
  p.stun=0;p.swing=null;p.grapple=null;p.grappleCD=0;p.lastGrapple=0;
  p.p=[...map.spawns[p.slot]];p.v=[0,0,0];p.yaw=p.slot===0?0:Math.PI;p.pitch=0;p.hp=100;p.ammo=WEAPONS.map(w=>w.ammo);p.weapon=p.loadout.includes(p.weapon)?p.weapon:p.loadout[0];p.reload=0;p.cooldown=.25;p.burstLeft=0;p.charge=0;p.spin=0;p.parry=0;p.abilityCD=0;p.dash=0;p.altHeld=false;p.slide=0;p.slideCD=0;p.ground=true;p.jumps=0;p.coyote=.1;p.trigger=false;p.crouch=false;
}
export function cleanInput(v = {}) {
  const num=(n,a,b,def=0)=>typeof n==='number'&&Number.isFinite(n)?clamp(n,a,b):def;
  return { seq:Math.floor(num(v.seq,0,1e9)), x:num(v.x,-1,1),z:num(v.z,-1,1),yaw:num(v.yaw,-1e6,1e6),pitch:num(v.pitch,-1.48,1.48),jump:Math.floor(num(v.jump,0,1e9)),slide:Math.floor(num(v.slide,0,1e9)),fireId:Math.floor(num(v.fireId,0,1e9)),altId:Math.floor(num(v.altId,0,1e9)),grappleId:Math.floor(num(v.grappleId,0,1e9)),grapple:v.grapple===true,sprint:v.sprint===true,crouch:v.crouch===true,ads:v.ads===true,fire:v.fire===true,reload:v.reload===true,paused:v.paused===true,weapon:Math.floor(num(v.weapon,0,WEAPONS.length-1)) };
}
export function releaseGrapple(p){if(p.grapple){p.grapple=null;p.grappleCD=GRAPPLE.cooldown;}}
function updateGrapple(p,input,map,dt,stunned){
  p.grappleCD=Math.max(0,(p.grappleCD||0)-dt);
  const pressed=input.grappleId>(p.lastGrapple||0);p.lastGrapple=Math.max(p.lastGrapple||0,input.grappleId||0);
  if(!input.grapple||stunned||p.hp<=0){releaseGrapple(p);return;}
  const origin=[p.p[0],p.p[1]+eyeHeight(p),p.p[2]];
  if(pressed&&!p.grapple&&p.grappleCD<=0){
    const dir=forward(input.yaw,input.pitch),distance=rayWorld(origin,dir,map,GRAPPLE.range);
    // Anchors come only from a server ray against solid map geometry.
    if(distance>2&&distance<GRAPPLE.range-.001){
      p.grapple={anchor:origin.map((v,i)=>v+dir[i]*distance),remaining:GRAPPLE.duration};p.slide=0;p.dash=0;
      if(p.grapple.anchor[1]>p.p[1]+.7){p.v[1]=Math.max(p.v[1],3.5);p.ground=false;}
    }else p.grappleCD=.25;
  }
  if(p.grapple){const delta=p.grapple.anchor.map((v,i)=>v-origin[i]),distance=length(delta);
    p.grapple.remaining-=dt;
    if(distance<1.6||distance>GRAPPLE.range+8||p.grapple.remaining<=0||rayWorld(origin,norm(delta),map,distance)<distance-.15)releaseGrapple(p);
  }
}
export function movePlayer(p, input, map, dt) {
  const stunned=p.stun>0;p.stun=Math.max(0,(p.stun||0)-dt);
  if(stunned)input={...input,x:0,z:0,ads:false,sprint:false,crouch:false};
  p.yaw=input.yaw;p.pitch=input.pitch;p.ads=input.ads&&!isMelee(p.weapon);
  updateGrapple(p,input,map,dt,stunned);
  const jump=!stunned&&input.jump>p.lastJump, slide=!stunned&&input.slide>p.lastSlide;
  p.lastJump=Math.max(p.lastJump,input.jump);p.lastSlide=Math.max(p.lastSlide,input.slide);p.slideCD=Math.max(0,p.slideCD-dt);
  p.coyote=p.ground?.1:Math.max(0,p.coyote-dt);
  let ix=input.x, iz=input.z, il=Math.hypot(ix,iz);if(il>1){ix/=il;iz/=il;}
  const dx=Math.cos(p.yaw)*ix+Math.sin(p.yaw)*iz,dz=Math.sin(p.yaw)*ix-Math.cos(p.yaw)*iz;
  const speed=Math.hypot(p.v[0],p.v[2]);
  if(slide&&p.ground&&speed>6&&p.slideCD<=0){p.slide=.8;p.slideCD=1.05;const boost=Math.min(28,Math.max(16,speed+3));p.v[0]=p.v[0]/speed*boost;p.v[2]=p.v[2]/speed*boost;}
  if(jump&&(p.ground||p.coyote>0||p.jumps<2)){
    p.jumps=p.ground||p.coyote>0?1:2;p.v[1]=p.jumps===1?9:8;p.ground=false;p.coyote=0;
    if(p.slide>0){p.v[0]*=1.08;p.v[2]*=1.08;p.slide=0;}
  }
  p.crouch=(input.crouch&&p.ground)||p.slide>0;
  // Keep crouched beneath low ceilings until there is room to stand.
  if(!p.crouch)for(const b of map.boxes)if(Math.abs(p.p[0]-b.x)<b.w/2+.34&&Math.abs(p.p[2]-b.z)<b.d/2+.34&&p.p[1]<b.y&&p.p[1]+1.8>b.y)p.crouch=true;
  const height=p.crouch?1.15:1.8;
  if(stunned){p.slide=0;p.dash=0;const drag=Math.exp(-9*dt);p.v[0]*=drag;p.v[2]*=drag;}
  else if(p.dash>0){p.dash=Math.max(0,p.dash-dt);}
  else if(p.slide>0){p.slide=Math.max(0,p.slide-dt);const drag=Math.exp(-.45*dt);p.v[0]*=drag;p.v[2]*=drag;}
  else {
    const max=(p.ads?4.8:p.crouch?4:input.sprint?(WEAPONS[p.weapon].sprint||(isMelee(p.weapon)?13:11.3)):8)*(WEAPONS[p.weapon].moveScale||1);
    if((p.ground||p.ads)&&!p.grapple){
      const aligned=il>0&&(p.v[0]*dx+p.v[2]*dz)>speed*.8;
      const acc=p.ads?14:speed>max&&aligned?2.2:14,blend=1-Math.exp(-acc*dt);
      p.v[0]=mix(p.v[0],dx*max,blend);p.v[2]=mix(p.v[2],dz*max,blend);
    }else{
      // Air steering adds only missing velocity along the wish direction. It does
      // not pull an earned slide-jump back down to ordinary running speed.
      const wish=Math.hypot(dx,dz),dot=wish?(p.v[0]*dx+p.v[2]*dz)/wish:0;
      const add=wish?Math.min(18*dt,Math.max(0,max-dot))*Math.min(wish,1):0;
      p.v[0]=(p.v[0]+(wish?dx/wish*add:0))*Math.exp(-.08*dt);
      p.v[2]=(p.v[2]+(wish?dz/wish*add:0))*Math.exp(-.08*dt);
    }
  }
  if(p.grapple){const dir=norm(p.grapple.anchor.map((v,i)=>v-p.p[i]-(i===1?eyeHeight(p):0)));for(let i=0;i<3;i++)p.v[i]+=dir[i]*GRAPPLE.pull*dt;p.v[1]=clamp(p.v[1],-24,24);}
  const cap=horizontalSpeed(p);if(cap>MOVEMENT.maxSpeed){p.v[0]*=MOVEMENT.maxSpeed/cap;p.v[2]*=MOVEMENT.maxSpeed/cap;}
  const oldY=p.p[1];p.v[1]-=25*dt*(p.grapple?.35:1);
  // Substeps keep fast slides and knockbacks from tunneling through thin cover.
  const steps=Math.max(1,Math.ceil(horizontalSpeed(p)*dt/.25));
  for(let step=0;step<steps;step++){
  p.p[0]+=p.v[0]*dt/steps;p.p[2]+=p.v[2]*dt/steps;
  for(const b of map.boxes){
    if(p.p[1]>=b.y+b.h-.3||p.p[1]+height<=b.y+.02)continue;
    const rx=b.w/2+.36,rz=b.d/2+.36,ax=p.p[0]-b.x,az=p.p[2]-b.z;
    if(Math.abs(ax)<rx&&Math.abs(az)<rz){if(rx-Math.abs(ax)<rz-Math.abs(az)){p.p[0]=b.x+Math.sign(ax||1)*rx;p.v[0]=0;}else{p.p[2]=b.z+Math.sign(az||1)*rz;p.v[2]=0;}}
  }
  // Solid ramp sides; the low edge remains walkable.
  for(const r of map.ramps){const h=rampHeight(r,p.p[0],p.p[2]);if(h>oldY+.6&&oldY+height>r.y){const rx=r.w/2+.36,rz=r.d/2+.36,ax=p.p[0]-r.x,az=p.p[2]-r.z;if(rx-Math.abs(ax)<rz-Math.abs(az)){p.p[0]=r.x+Math.sign(ax||1)*rx;p.v[0]=0;}else{p.p[2]=r.z+Math.sign(az||1)*rz;p.v[2]=0;}}}
  for(const axis of [0,2]){const bounded=clamp(p.p[axis],-map.extent+.6,map.extent-.6);if(bounded!==p.p[axis])p.v[axis]=0;p.p[axis]=bounded;}
  }
  p.p[1]+=p.v[1]*dt;
  if(p.v[1]>0)for(const b of map.boxes)if(Math.abs(p.p[0]-b.x)<b.w/2+.32&&Math.abs(p.p[2]-b.z)<b.d/2+.32&&oldY+height<=b.y+.03&&p.p[1]+height>b.y){p.p[1]=b.y-height;p.v[1]=0;}
  const floor=floorAt(map,p.p[0],p.p[2],oldY+.6);
  p.ground=p.p[1]<=floor&&p.v[1]<=0;
  if(p.ground){p.p[1]=floor;p.v[1]=0;p.jumps=0;}p.ack=input.seq;
}
export function rayBox(o,d,b,max=200){
  const low=[b.x-b.w/2,b.y,b.z-b.d/2],high=[b.x+b.w/2,b.y+b.h,b.z+b.d/2];let near=0,far=max;
  for(let a=0;a<3;a++){if(Math.abs(d[a])<1e-7){if(o[a]<low[a]||o[a]>high[a])return null;}else{let t1=(low[a]-o[a])/d[a],t2=(high[a]-o[a])/d[a];if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return null;}}
  return near;
}
function raySphere(o,d,c,r,max){const a=o.map((v,i)=>v-c[i]),b=a.reduce((s,v,i)=>s+v*d[i],0),k=b*b-a.reduce((s,v)=>s+v*v,0)+r*r;if(k<0)return null;const t=-b-Math.sqrt(k);return t>=0&&t<max?t:null;}
function rayRamp(o,d,r,max){
  // Convex clipping against the exact wedge, not a tall invisible box.
  const slope=r.h/r.d*r.dir,intercept=r.y+r.h*.5-slope*r.z;
  const planes=[[1,0,0,r.x+r.w/2],[-1,0,0,-r.x+r.w/2],[0,0,1,r.z+r.d/2],[0,0,-1,-r.z+r.d/2],[0,-1,0,-r.y],[0,1,-slope,intercept]];
  let lo=0,hi=max;
  for(const [x,y,z,k]of planes){const dist=k-x*o[0]-y*o[1]-z*o[2],den=x*d[0]+y*d[1]+z*d[2];if(Math.abs(den)<1e-8){if(dist<0)return null;}else if(den>0)hi=Math.min(hi,dist/den);else lo=Math.max(lo,dist/den);if(lo>hi)return null;}
  return lo;
}
export function rayWorld(o,d,map,max){let t=max;for(const b of map.boxes){const hit=rayBox(o,d,b,t);if(hit!==null)t=Math.min(t,hit);}for(const r of map.ramps){const hit=rayRamp(o,d,r,t);if(hit!==null)t=Math.min(t,hit);}if(d[1]<-.001){const ground=-o[1]/d[1];if(ground>=0)t=Math.min(t,ground);}return t;}
export function castShot(o,d,map,players,shooter,range){
  let t=rayWorld(o,d,map,range),target=null,head=false;
  for(const p of players){if(p.id===shooter||p.hp<=0)continue;const h=eyeHeight(p);const ht=raySphere(o,d,[p.p[0],p.p[1]+h,p.p[2]],.25,t);if(ht!==null){t=ht;target=p;head=true;}
    const bt=rayBox(o,d,{x:p.p[0],z:p.p[2],y:p.p[1],w:.68,h:h-.22,d:.68},t);if(bt!==null){t=bt;target=p;head=false;}}
  return {target,head,p:o.map((v,i)=>v+d[i]*t)};
}
export function createMatch(map='foundry'){return {map,players:[],projectiles:[],projectileSeq:0,phase:'waiting',clock:0,round:1,winner:null,roundWinner:null,events:[],eventSeq:0,time:0};}
// Local-only practice uses the same movement and weapon rules, without a duel.
// The server never accepts this flag from client inputs or room creation.
export function createFreePlay(map='foundry',name='Runner',loadout=DEFAULT_LOADOUT){
  const arena=mapById(map),m=createMatch(arena.id),p=createPlayer('you',name);
  p.loadout=[...loadout];p.weapon=p.loadout[0];resetPlayer(p,arena);
  Object.assign(m,{freePlay:true,phase:'live',round:0,players:[p]});return m;
}
export function resetFreePlay(m){
  if(!m.freePlay)return;
  for(const p of m.players)resetPlayer(p,mapById(m.map));
  m.projectiles=[];m.events=[];
}
export function emit(m,type,data={}){m.events.push({id:++m.eventSeq,type,...data});if(m.events.length>96)m.events.shift();}
export function startRound(m){m.phase='countdown';m.clock=3;m.roundWinner=null;m.projectiles=[];for(const p of m.players)resetPlayer(p,mapById(m.map));emit(m,'round',{round:m.round});}
export function endRound(m,winner){if(m.phase!=='live')return;m.roundWinner=winner?.id||null;if(winner)winner.score++;m.phase=winner?.score>=5?'finished':'intermission';m.clock=m.phase==='finished'?0:3.5;m.winner=m.phase==='finished'?winner.id:null;emit(m,m.phase==='finished'?'matchEnd':'roundEnd',{winner:m.roundWinner});}
export function readyPlayer(m,p){p.ready=true;if(m.players.length===2&&m.players.every(p=>p.ready)&&(m.phase==='waiting'||m.phase==='finished')){for(const x of m.players){x.score=0;x.ready=false;}m.round=1;m.winner=null;startRound(m);}}
function randomShot(seed){let n=seed|0;return()=>{n=(Math.imul(n,1664525)+1013904223)|0;return(n>>>0)/4294967296;};}
function canClash(a,b,map){
  const origin=[a.p[0],a.p[1]+eyeHeight(a),a.p[2]],target=[b.p[0],b.p[1]+eyeHeight(b),b.p[2]];
  const delta=target.map((v,i)=>v-origin[i]),distance=length(delta),dir=norm(delta);
  if(distance>Math.min(WEAPONS[a.swing.weapon].range,WEAPONS[b.swing.weapon].range)+.3||distance<.01)return false;
  const facing=forward(a.yaw,a.pitch).reduce((s,v,i)=>s+v*dir[i],0);
  const opposing=forward(b.yaw,b.pitch).reduce((s,v,i)=>s-v*dir[i],0);
  return facing>.35&&opposing>.35&&rayWorld(origin,dir,map,distance)>=distance-.05;
}
export function resolveMelee(m,map,dt){
  const swingers=m.players.filter(p=>p.hp>0&&p.stun<=0&&p.swing);
  for(let i=0;i<swingers.length;i++)for(let j=i+1;j<swingers.length;j++){
    const a=swingers[i],b=swingers[j];if(!a.swing||!b.swing||!canClash(a,b,map))continue;
    const speeds=[horizontalSpeed(a),horizontalSpeed(b)],gap=speeds[0]-speeds[1];
    const winner=Math.abs(gap)<MOVEMENT.clashMargin?null:gap>0?a:b,loser=winner?(winner===a?b:a):null;
    const position=a.p.map((v,k)=>(v+b.p[k])/2+(k===1?1.25:0));
    for(const p of [a,b]){p.swing=null;p.parry=0;p.burstLeft=0;p.charge=0;p.spin=0;p.dash=0;p.slide=0;}
    const repel=(p,other,power)=>{const dx=p.p[0]-other.p[0],dz=p.p[2]-other.p[2],len=Math.hypot(dx,dz)||1;p.v[0]=dx/len*power;p.v[2]=dz/len*power;};
    if(winner){loser.stun=MOVEMENT.clashStun;releaseGrapple(loser);loser.cooldown=Math.max(loser.cooldown,loser.stun);repel(loser,winner,8);winner.cooldown=Math.min(winner.cooldown,.18);}
    else{for(const p of [a,b]){p.stun=.18;releaseGrapple(p);p.cooldown=Math.max(p.cooldown,.25);}repel(a,b,4);repel(b,a,4);}
    emit(m,'clash',{players:[a.id,b.id],speeds,winner:winner?.id||null,loser:loser?.id||null,position});
  }
  for(const p of m.players){if(!p.swing)continue;
    if(p.hp<=0||p.stun>0||p.weapon!==p.swing.weapon){p.swing=null;continue;}
    p.swing.remaining-=dt;if(p.swing.remaining>1e-7)continue;
    const w=WEAPONS[p.swing.weapon],origin=[p.p[0],p.p[1]+eyeHeight(p),p.p[2]],hit=castShot(origin,forward(p.yaw,p.pitch),map,m.players,p.id,w.range);
    p.swing=null;if(hit.target)damagePlayer(m,hit.target,p.id,p.weapon,w.damage,false,hit.p);
  }
}
// All damage paths use this gate: rockets and every melee weapon bypass the guard.
export function damagePlayer(m,target,attacker,weapon,amount,head,position){
  if(target.hp<=0)return false;
  const w=WEAPONS[weapon];
  if(target.parry>0&&WEAPONS[target.weapon].parry&&!isMelee(weapon)&&w.projectile!=='rocket'){
    emit(m,'parry',{player:target.id,attacker,weapon,position,blocked:amount});return false;
  }
  target.hp=Math.max(0,target.hp-amount);if(target.hp<=0)releaseGrapple(target);emit(m,'hit',{player:attacker,target:target.id,damage:amount,head,position});return true;
}
export function stepMatch(m,inputs,dt=TICK){
  m.time+=dt;if(m.phase==='waiting'||m.phase==='finished')return;
  if(!m.freePlay)m.clock-=dt;
  if(m.phase==='countdown'){if(m.clock<=0){m.phase='live';m.clock=90;emit(m,'go');}return;}
  if(m.phase==='intermission'){if(m.clock<=0){m.round++;startRound(m);}return;}
  const map=mapById(m.map),controls=new Map(m.players.map(p=>[p.id,cleanInput(inputs[p.id])]));
  // Resolve everyone's equipment, ability input, and movement before any shot.
  // A parry pressed on this tick must work regardless of player array order.
  for(const p of m.players){if(p.hp<=0)continue;const i=controls.get(p.id);
    if(p.stun<=0&&i.weapon!==p.weapon&&p.loadout.includes(i.weapon)){p.weapon=i.weapon;p.swing=null;p.reload=0;p.burstLeft=0;p.charge=0;p.spin=0;p.parry=0;p.cooldown=Math.max(p.cooldown,.22);}
    p.parry=Math.max(0,p.parry-dt);p.abilityCD=Math.max(0,p.abilityCD-dt);
    const w=WEAPONS[p.weapon],altPressed=i.altId>p.lastAlt||(i.ads&&!p.altHeld);p.lastAlt=Math.max(p.lastAlt,i.altId);p.altHeld=i.ads;
    if(altPressed&&p.stun<=0&&!p.swing&&p.abilityCD<=0&&(w.parry||w.dash)){
      p.abilityCD=w.abilityCooldown;
      if(w.parry){p.parry=w.parry;emit(m,'guard',{player:p.id});}
      if(w.dash){const x=i.x,z=i.z||(!i.x?1:0),l=Math.hypot(x,z)||1;p.v[0]=(Math.cos(i.yaw)*x+Math.sin(i.yaw)*z)/l*24;p.v[2]=(Math.sin(i.yaw)*x-Math.cos(i.yaw)*z)/l*24;p.dash=w.dash;p.slide=0;emit(m,'dash',{player:p.id});}
    }
    movePlayer(p,i,map,dt);p.cooldown=Math.max(0,p.cooldown-dt);if(p.cooldown<1e-7)p.cooldown=0;
    if(p.reload>0){p.reload-=dt;if(p.reload<=0){p.reload=0;p.ammo[p.weapon]=WEAPONS[p.weapon].ammo;}}
    p.spin=w.spinup&&i.fire&&p.reload<=0?Math.min(1,p.spin+dt/w.spinup):Math.max(0,p.spin-dt*3);
  }
  for(const p of m.players){if(p.hp<=0)continue;const i=controls.get(p.id),w=WEAPONS[p.weapon];
    if(p.stun>0){p.lastFire=Math.max(p.lastFire,i.fireId);p.trigger=i.fire;continue;}
    p.charge=w.charge&&i.ads&&p.reload<=0?Math.min(1,p.charge+dt/1.1):0;
    if(i.reload&&p.reload<=0&&w.ammo>0&&p.ammo[p.weapon]<w.ammo){p.reload=w.reload;p.burstLeft=0;emit(m,'reload',{player:p.id});}
    const firePressed=i.fireId>p.lastFire;p.lastFire=Math.max(p.lastFire,i.fireId);
    if((p.burstLeft>0||((i.fire||firePressed)&&(firePressed||!p.trigger||w.type==='auto')))&&p.cooldown<=0&&p.reload<=0&&p.parry<=0&&(!w.spinup||p.spin>=1)){
      if(p.ammo[p.weapon]===0){p.reload=w.reload;p.burstLeft=0;emit(m,'reload',{player:p.id});}
      else{
        if(w.burst&&p.burstLeft===0)p.burstLeft=w.burst;
        if(p.burstLeft>0)p.burstLeft--;p.cooldown=p.burstLeft>0?w.burstRate:w.rate;if(w.ammo>0)p.ammo[p.weapon]--;p.shots++;
        const origin=[p.p[0],p.p[1]+eyeHeight(p),p.p[2]],rng=randomShot(p.shots*127+p.slot*4099),impacts=[];
        if(isMelee(p.weapon)){
          p.swing={weapon:p.weapon,remaining:MOVEMENT.clashWindow};
        }else if(w.projectile){
          const direction=forward(p.yaw,p.pitch),power=w.charge?.55+.45*p.charge:1,speed=w.speed*(w.charge?.6+.4*p.charge:1);
          m.projectiles.push({id:++m.projectileSeq,owner:p.id,weapon:p.weapon,kind:w.projectile,p:[...origin],v:direction.map(x=>x*speed),damage:w.damage*power,life:w.range/speed});p.charge=0;
          if(w.autoReload){p.reload=w.reload;emit(m,'reload',{player:p.id});}
        }else if(w.flame){
          const direction=forward(p.yaw,p.pitch),reach=rayWorld(origin,direction,map,w.range);impacts.push(origin.map((v,i)=>v+direction[i]*reach));
          for(const target of m.players){if(target.id===p.id||target.hp<=0)continue;const point=[target.p[0],target.p[1]+eyeHeight(target)*.75,target.p[2]],delta=point.map((v,i)=>v-origin[i]),dist=length(delta),d=norm(delta);
            if(dist>w.range||d.reduce((sum,v,i)=>sum+v*direction[i],0)<Math.cos(w.cone)||rayWorld(origin,d,map,dist)<dist-.05)continue;
            damagePlayer(m,target,p.id,p.weapon,w.damage,false,point);
          }
        }else{
        const spread=w.spread*(p.ads?(p.weapon===2?0:w.pellets?.85:.12):1)*(p.ground?1:1.5);
        for(let n=0;n<(w.pellets||1);n++){
          const direction=forward(p.yaw+(rng()-.5)*spread*2,p.pitch+(rng()-.5)*spread*2);
          const hit=castShot(origin,direction,map,m.players,p.id,w.range);impacts.push(hit.p);
          if(hit.target){const amount=Math.round(w.damage*(hit.head?w.head:1));damagePlayer(m,hit.target,p.id,p.weapon,amount,hit.head,hit.p);}
        }
        }
        emit(m,'shot',{player:p.id,weapon:p.weapon,origin,impacts});
      }
    }p.trigger=i.fire;
  }
  resolveMelee(m,map,dt);
  stepProjectiles(m,map,dt);
  // Keep blast-jump impulse, but restore health and never award or end a round.
  if(m.freePlay){for(const p of m.players)p.hp=100;return;}
  const living=m.players.filter(p=>p.hp>0);
  if(living.length<2){endRound(m,living[0]);return;}
  if(m.clock<=0){const [a,b]=m.players;endRound(m,a.hp===b.hp?null:a.hp>b.hp?a:b);}
}
export function stepProjectiles(m,map,dt){
  for(let n=m.projectiles.length-1;n>=0;n--){const q=m.projectiles[n],w=WEAPONS[q.weapon];q.life-=dt;q.v[1]-=w.gravity*dt;const distance=length(q.v)*dt,d=norm(q.v),hit=castShot(q.p,d,map,m.players,q.owner,distance),travel=length(hit.p.map((v,i)=>v-q.p[i]));
    const impact=hit.target||travel<distance-.00001;
    if(impact||q.life<=0){
      if(q.kind==='rocket'){
        const center=impact?hit.p.map((v,i)=>v-d[i]*.05):hit.p;
        for(const target of m.players){if(target.hp<=0)continue;const point=[target.p[0],target.p[1]+eyeHeight(target)*.65,target.p[2]],delta=point.map((v,i)=>v-center[i]),dist=length(delta);
          if(target!==hit.target&&(dist>w.radius||rayWorld(center,norm(delta),map,dist)<dist-.1))continue;
          const self=target.id===q.owner,amount=Math.round(q.damage*(target===hit.target?1:Math.max(.15,1-dist/w.radius))*(self?.45:1));
          damagePlayer(m,target,q.owner,q.weapon,amount,false,point);
          if(self){target.v[0]+=delta[0]/(dist||1)*7;target.v[2]+=delta[2]/(dist||1)*7;target.v[1]=Math.max(target.v[1],10*(1-dist/w.radius));target.ground=false;}
        }
        emit(m,'explosion',{position:center,radius:w.radius});
      }else if(hit.target){const amount=Math.round(q.damage*(hit.head?w.head:1));damagePlayer(m,hit.target,q.owner,q.weapon,amount,hit.head,hit.p);}
      m.projectiles.splice(n,1);
    }else q.p=hit.p;
  }
}
export function snapshot(m){return {map:m.map,phase:m.phase,clock:m.clock,round:m.round,winner:m.winner,roundWinner:m.roundWinner,players:m.players,projectiles:m.projectiles,time:m.time,events:m.events.slice(-48)};}
