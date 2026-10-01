import test from 'node:test';
import assert from 'node:assert/strict';
import {MOVEMENT,TICK,MAPS,createPlayer,createMatch,cleanInput,stepMatch,movePlayer,resolveMelee,startRound,horizontalSpeed} from '../src/shared.js';
import {createBot,botInput} from '../src/bot.js';
const empty={extent:100,boxes:[],ramps:[]};
function duel(aSpeed=18,bSpeed=8,reverse=false,weapons=[4,10]){
  const m=createMatch(),a=createPlayer('a','A'),b=createPlayer('b','B',1);m.phase='live';m.clock=90;
  for(const [p,id,z,yaw,speed]of [[a,weapons[0],1.1,0,aSpeed],[b,weapons[1],-1.1,Math.PI,bSpeed]]){p.p=[-12,0,z];p.weapon=id;p.loadout=[id,0,1,2,3];p.yaw=yaw;p.v=[0,0,(p===a?-1:1)*speed];p.dash=.15;}
  m.players=reverse?[b,a]:[a,b];return {m,a,b};
}
function tick(m,a={},b={}){const players=Object.fromEntries(m.players.map(p=>[p.id,p]));stepMatch(m,Object.fromEntries(['a','b'].map(id=>[id,cleanInput({weapon:players[id].weapon,yaw:players[id].yaw,...(id==='a'?a:b)})])));}
test('every melee pairing clashes without damage; actual faster player wins in either iteration order',()=>{
  for(const weaponA of [4,10,14,18])for(const weaponB of [4,10,14,18])for(const reversed of [false,true]){
    const {m,a,b}=duel(18,8,reversed,[weaponA,weaponB]);tick(m,{fireId:1},{fireId:1});
    const event=m.events.find(e=>e.type==='clash');assert(event);assert.equal(event.winner,'a');assert.equal(event.loser,'b');assert.equal(a.hp,100);assert.equal(b.hp,100);assert.equal(b.stun,MOVEMENT.clashStun);assert.equal(a.stun,0);assert.equal(a.swing,null);assert.equal(b.swing,null);
    tick(m,{fireId:1},{fireId:1});assert.equal(m.events.filter(e=>e.type==='clash').length,1);
  }
});
test('a later opposing swing inside the windup can clash before either hit lands',()=>{
  const {m,a,b}=duel(7,5);tick(m,{fireId:1});for(let n=0;n<2;n++)tick(m,{fireId:1});assert.equal(b.hp,100);
  tick(m,{fireId:1},{fireId:1});assert.equal(m.events.find(e=>e.type==='clash').winner,a.id);assert.equal(b.hp,100);
});
test('close speeds tie and repel both players; faster second slot wins instead of first-slot advantage',()=>{
  const tied=duel(12,12.5);tick(tied.m,{fireId:1},{fireId:1});assert.equal(tied.m.events.find(e=>e.type==='clash').winner,null);assert(tied.a.v[2]>0&&tied.b.v[2]<0);assert(tied.a.stun>0&&tied.b.stun>0);
  const second=duel(8,18);tick(second.m,{fireId:1},{fireId:1});assert.equal(second.m.events.find(e=>e.type==='clash').winner,'b');assert.equal(second.a.stun,.75);
});
test('clashes require two facing swings in reach with unobstructed contact',()=>{
  for(const mode of ['far','back','wall']){const {m,a,b}=duel();a.swing={weapon:4,remaining:.12};b.swing={weapon:10,remaining:.12};let map=empty;
    if(mode==='far')b.p[2]=-10;if(mode==='back')b.yaw=0;if(mode==='wall')map={...empty,boxes:[{x:-12,z:0,y:0,w:4,h:4,d:.3}]};
    resolveMelee(m,map,TICK);assert(!m.events.some(e=>e.type==='clash'),mode);assert.equal(a.stun,0);assert.equal(b.stun,0);
  }
});
test('stun consumes attempted actions, prevents attacks and ability escapes, then ends and resets cleanly',()=>{
  const {m,a,b}=duel(18,8,false,[4,14]);tick(m,{fireId:1},{fireId:1});const shots=b.shots;
  for(let n=0;n<30;n++)tick(m,{fireId:1},{fireId:99,fire:true,altId:99,ads:true,jump:99,slide:99,z:1,sprint:true,weapon:0,reload:true});
  assert(b.stun>0);assert.equal(b.shots,shots);assert.equal(b.weapon,14);assert.equal(b.dash,0);assert.equal(b.jumps,0);assert.equal(b.lastFire,99);
  for(let n=0;n<20;n++)tick(m,{fireId:1},{fireId:99,altId:99,jump:99,slide:99});assert.equal(b.stun,0);assert.equal(b.shots,shots);
  startRound(m);for(const p of m.players){assert.equal(p.stun,0);assert.equal(p.swing,null);}
  const forged=cleanInput({stun:0,swing:{},speed:999,v:[0,0,999]});for(const key of ['stun','swing','speed','v'])assert.equal(forged[key],undefined);
});
test('a lone melee swing resolves after its windup and still respects reach and cover',()=>{
  const {m,a,b}=duel(0,0);tick(m,{fireId:1});assert.equal(b.hp,100);for(let n=0;n<8;n++)tick(m,{fireId:1});assert.equal(b.hp,45);assert.equal(a.shots,1);
});
test('slide-jump carries speed through airtime, controlled turns can add momentum, and velocity is bounded',()=>{
  const p=createPlayer('a','A');for(let n=0;n<60;n++)movePlayer(p,cleanInput({z:1,sprint:true}),empty,TICK);
  movePlayer(p,cleanInput({z:1,slide:1}),empty,TICK);movePlayer(p,cleanInput({z:1,slide:1,jump:1}),empty,TICK);const launch=horizontalSpeed(p);
  for(let n=0;n<24;n++)movePlayer(p,cleanInput({z:1,slide:1,jump:1}),empty,TICK);assert(horizontalSpeed(p)>launch*.94);
  const before=horizontalSpeed(p);for(let n=0;n<12;n++)movePlayer(p,cleanInput({x:1,slide:1,jump:1}),empty,TICK);assert(horizontalSpeed(p)>before);
  p.p[1]=100;p.ground=false;p.v=[100,0,100];movePlayer(p,cleanInput(),empty,TICK);assert(horizontalSpeed(p)<=MOVEMENT.maxSpeed+1e-9);
});
test('high-speed movement cannot tunnel through thin cover or retain speed against arena boundaries',()=>{
  const p=createPlayer('a','A');p.p=[0,0,.7];p.v=[0,0,-32];p.dash=.5;
  movePlayer(p,cleanInput(),{...empty,boxes:[{x:0,z:0,y:0,w:5,h:4,d:.05}]},.075);assert(p.p[2]>=.385-1e-9);assert.equal(p.v[2],0);
  p.p=[99.3,0,0];p.v=[32,0,0];p.dash=.5;movePlayer(p,cleanInput(),empty,TICK);assert.equal(p.p[0],99.4);assert.equal(p.v[0],0);
});
test('solo rival approaches with a blade for melee practice, then returns to gunplay at range',()=>{
  const {m,a,b}=duel(0,0,false,[4,4]);a.weapon=4;b.weapon=0;const bot=createBot();bot.yaw=Math.PI;
  const close=botInput(bot,b,a,m,TICK);assert.equal(close.weapon,4);assert(close.sprint);assert(close.z>0);
  a.p[2]=15;const far=botInput(bot,b,a,m,TICK);assert.equal(far.weapon,0);
});
