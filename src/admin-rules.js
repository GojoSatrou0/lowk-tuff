import {emit,releaseGrapple} from './shared.js';
export const ADMIN_TOYS=Object.freeze([
  {id:'lowGravity',label:'Moon gravity',note:'Floaty jumps for everyone',toggle:true},
  {id:'turbo',label:'Turbo movement',note:'Everyone runs 60% faster',toggle:true},
  {id:'bigHeads',label:'Big heads',note:'Silly visuals; normal hitboxes',toggle:true},
  {id:'launch',label:'Popcorn launch',note:'Send the target into the air',live:true,target:true},
  {id:'freeze',label:'Freeze tag',note:'Freeze the target for 1.5 seconds',live:true,target:true},
  {id:'confetti',label:'Confetti burst',note:'Celebrate around the target',target:true},
  {id:'reset',label:'Reset all toys',note:'Restore movement and clear freezes'}
]);
export function applyAdminToy(match,actor,command,target='rival'){
  const toy=ADMIN_TOYS.find(t=>t.id===command),fail=message=>{throw Object.assign(new Error(message),{status:400});};
  if(!toy)fail('Unknown admin toy.');
  if(toy.live&&match.phase!=='live')fail('Start the round before using this toy.');
  if(toy.target&&!['self','rival','everyone'].includes(target))fail('Choose yourself, your rival, or everyone.');
  const players=match.players.filter(p=>p.hp>0&&(target==='everyone'||(target==='self'?p.id===actor:p.id!==actor)));
  if(toy.target&&!players.length)fail('There is no living target for this toy.');
  match.playground??={lowGravity:false,turbo:false,bigHeads:false,used:false};
  match.playground.used=true;
  if(toy.toggle)match.playground[command]=!match.playground[command];
  if(command==='launch'||command==='freeze')for(const p of players){releaseGrapple(p);p.swing=null;p.slide=0;p.dash=0;
    if(command==='launch'){p.v[1]=18;p.ground=false;p.jumps=1;}
    else {p.stun=1.5;p.v=[0,0,0];p.parry=0;p.burstLeft=0;p.charge=0;p.spin=0;p.cooldown=Math.max(p.cooldown,1.5);}
  }
  if(command==='reset'){Object.assign(match.playground,{lowGravity:false,turbo:false,bigHeads:false});for(const p of match.players){p.stun=0;p.v=[0,0,0];p.cooldown=0;releaseGrapple(p);}}
  emit(match,'adminToy',{command,label:toy.label,enabled:toy.toggle?match.playground[command]:true,players:toy.target?players.map(p=>p.id):match.players.map(p=>p.id),positions:command==='confetti'?players.map(p=>[p.p[0],p.p[1]+1.7,p.p[2]]):[]});
}
