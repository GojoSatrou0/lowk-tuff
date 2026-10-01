import {mapById,rayWorld,eyeHeight,clamp} from './shared.js';
// Small grid pathfinder, so the opponent can route around cover instead of walking into it.
function path(map,from,to){
  const cell=v=>clamp(Math.round((v+26)/2),0,26),key=(x,z)=>z*27+x,start=key(cell(from[0]),cell(from[2])),goal=key(cell(to[0]),cell(to[2]));
  const blocked=(x,z)=>{const wx=x*2-26,wz=z*2-26;return map.boxes.some(b=>b.y<1.5&&Math.abs(wx-b.x)<b.w/2+.6&&Math.abs(wz-b.z)<b.d/2+.6)||map.ramps.some(r=>Math.abs(wx-r.x)<r.w/2+.5&&Math.abs(wz-r.z)<r.d/2+.5);};
  const queue=[start],parents=new Map([[start,null]]);let end=start,best=Infinity;
  for(let i=0;i<queue.length&&i<730;i++){const k=queue[i],x=k%27,z=Math.floor(k/27),dist=(x-goal%27)**2+(z-Math.floor(goal/27))**2;if(dist<best){best=dist;end=k;}if(k===goal)break;for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,nk=key(nx,nz);if(nx<0||nx>26||nz<0||nz>26||parents.has(nk)||blocked(nx,nz))continue;parents.set(nk,k);queue.push(nk);}}
  const result=[];while(end!==start&&end!==null){result.push([end%27*2-26,Math.floor(end/27)*2-26]);end=parents.get(end);}return result.reverse();
}
export function createBot(){return {yaw:Math.PI,pitch:0,jump:0,slide:0,route:[],repath:0,fireClock:0,stuck:0,last:[0,0,0]};}
export function botInput(bot,p,target,match,dt,difficulty='normal'){
  const map=mapById(match.map),delta=target.p.map((v,i)=>v-p.p[i]),dist=Math.hypot(delta[0],delta[2]);
  const factor=difficulty==='easy'?.55:difficulty==='hard'?1.5:1;
  const yaw=Math.atan2(delta[0],-delta[2]),pitch=Math.atan2(delta[1]+eyeHeight(target)*.65-eyeHeight(p),dist);
  const angle=Math.atan2(Math.sin(yaw-bot.yaw),Math.cos(yaw-bot.yaw));bot.yaw+=clamp(angle,-dt*3.6*factor,dt*3.6*factor);bot.pitch+=(pitch-bot.pitch)*Math.min(1,dt*5*factor);
  const origin=[p.p[0],p.p[1]+eyeHeight(p),p.p[2]],dir=[delta[0],delta[1],delta[2]],len=Math.hypot(...dir)||1;for(let i=0;i<3;i++)dir[i]/=len;
  const visible=rayWorld(origin,dir,map,dist)>=dist-.8;
  bot.repath-=dt;bot.fireClock+=dt;
  if(bot.repath<=0){bot.route=path(map,p.p,target.p);bot.repath=.8;}
  let wx=0,wz=0;
  if(visible&&dist<22){const strafe=Math.sin(match.time*.8)>0?1:-1;wx=Math.cos(yaw)*strafe;wz=Math.sin(yaw)*strafe;if(dist<7){wx-=Math.sin(yaw);wz+=Math.cos(yaw);}}
  else {while(bot.route.length&&Math.hypot(bot.route[0][0]-p.p[0],bot.route[0][1]-p.p[2])<1.2)bot.route.shift();const node=bot.route[0];if(node){wx=node[0]-p.p[0];wz=node[1]-p.p[2];const len=Math.hypot(wx,wz)||1;wx/=len;wz/=len;}}
  if(p.ground&&Math.hypot(p.p[0]-bot.last[0],p.p[2]-bot.last[2])<.005&&(wx||wz))bot.stuck+=dt;else bot.stuck=0;
  if(bot.stuck>.5){bot.jump++;bot.stuck=0;}bot.last=[...p.p];
  const error=Math.sin(match.time*3)*.017/factor;
  return {seq:Math.floor(match.time*60),x:Math.cos(bot.yaw)*wx+Math.sin(bot.yaw)*wz,z:Math.sin(bot.yaw)*wx-Math.cos(bot.yaw)*wz,yaw:bot.yaw+error,pitch:bot.pitch,jump:bot.jump,slide:bot.slide,fire:visible&&Math.abs(angle)<.12&&bot.fireClock%(1.7/factor)<.65&&match.time>4/factor,reload:p.ammo[0]===0,ads:visible&&dist>12,sprint:!visible,weapon:0};
}
