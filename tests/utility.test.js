import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {WEAPONS,STARTER_WEAPONS,DEFAULT_LOADOUT,weaponSlot,validLoadout,createMatch,createPlayer,createFreePlay,resetFreePlay,startRound,stepMatch,stepProjectiles,stepHazards,snapshot,TICK} from '../src/shared.js';
import {freshProfile,equipLoadout,buyWeapon,migrateLoadout} from '../src/economy.js';
import {attackEffects,weaponMotion} from '../src/weapon-presentation.js';
import {ProfileStore} from '../profile-store.js';
import {openDatabaseProfiles} from '../database/profile-store.js';
import {createArenaServer} from '../server.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const empty={extent:100,boxes:[],ramps:[]};
function fixture(){const m=createMatch();m.phase='live';m.clock=90;const a=createPlayer('a','A'),b=createPlayer('b','B',1);a.p=[20,0,20];b.p=[0,0,1];m.players=[a,b];return {m,a,b};}
function projectile(m,id,{p=[0,.08,0],v=[0,-5,0],life=.05}={}){const q={id:++m.projectileSeq,owner:'a',weapon:id,kind:WEAPONS[id].projectile,p,v,life,damage:WEAPONS[id].damage};m.projectiles.push(q);return q;}

test('every weapon has one category; four slots enforce category and ownership without charging coins',()=>{
  const p=freshProfile();assert.deepEqual(p.loadout,DEFAULT_LOADOUT);assert.deepEqual(p.owned,STARTER_WEAPONS);assert.equal(p.coins,100);
  assert(WEAPONS.every((w,id)=>weaponSlot(id)>=0));assert.equal(weaponSlot('19'),-1);assert.equal(weaponSlot(99),-1);
  assert.deepEqual([6,7,13,17,21].map(weaponSlot),[1,1,1,1,1]);assert.equal(weaponSlot(20),3);
  for(const kit of [new Array(4),[0,1,2,3,4],[0,1,4,19],[4,21,0,19],[0,21,4,4],[0,17,4,19],[0,21,4,20],['0',21,4,19],null]){
    const before=structuredClone(p);assert.throws(()=>equipLoadout(p,kit));assert.deepEqual(p,before);
  }
  buyWeapon(p,20);assert.equal(p.coins,0);equipLoadout(p,[2,21,4,20]);assert(validLoadout(p.loadout));assert.equal(p.coins,0);
});
test('legacy loadouts keep the first equipped item of each category and all purchases; migration is idempotent',()=>{
  const p={coins:763,earned:1800,revision:12,owned:[0,1,2,3,4,6,10,15,18],loadout:[15,2,6,18,10]};
  assert(migrateLoadout(p));assert.deepEqual(p.loadout,[15,6,18,19]);assert(p.owned.includes(10)&&p.owned.includes(2));assert.equal(p.coins,763);assert.equal(p.earned,1800);assert.equal(p.revision,13);
  assert.equal(migrateLoadout(p),false);assert.equal(p.revision,13);
});
test('version 3 accounts migrate on disk with a backup, preserving email sign-in and active sessions',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-four-slots-')),store=new ProfileStore(),guest=store.create();store.reward(guest.profileToken,600);store.purchase(guest.profileToken,10);
  const session=await store.register('SlotFixture','Disposable slot fixture 593!',guest.profileToken,undefined,'slots@example.test');
  const old=store.serialize();old.version=3;old.profiles[session.profileId].owned=[0,1,2,3,4,10];old.profiles[session.profileId].loadout=[2,1,0,10,4];
  writeFileSync(path.join(dir,'profiles.json'),JSON.stringify(old));const restored=new ProfileStore(dir),p=restored.getById(session.profileId);
  assert.deepEqual(p.loadout,[2,21,10,19]);assert.equal(p.coins,400);assert.equal(restored.authenticate(session.token).user.username,'SlotFixture');
  assert.equal((await restored.login('slots@example.test','Disposable slot fixture 593!')).profileId,session.profileId);
  assert.equal(JSON.parse(readFileSync(path.join(dir,'profiles.json.v3.bak'),'utf8')).version,3);
  assert.deepEqual(new ProfileStore(dir).getById(session.profileId),p);
});
test('database migration commits the four-slot profile once before accepting traffic',async()=>{
  const oldStore=new ProfileStore(),guest=oldStore.create();let data=oldStore.serialize(),revision=0,writes=0;data.version=3;
  const p=data.profiles[oldStore.guestId(guest.profileToken)];p.owned=[0,1,2,3,4];p.loadout=[1,0,2,3,4];p.coins=173;p.revision=9;
  const repo={async load(){return {data:structuredClone(data),revision};},async write(expected,next){assert.equal(expected,revision);writes++;data=structuredClone(next);return ++revision;}};
  const store=await openDatabaseProfiles(repo);assert.equal(data.version,4);assert.equal(writes,1);assert.deepEqual(store.get(guest.profileToken).loadout,[1,21,4,19]);assert.equal(store.get(guest.profileToken).coins,173);
  await openDatabaseProfiles(repo);assert.equal(writes,1);
});
test('grenades have two charges, one throw per click, no reload refill, and replenish on reset',()=>{
  const m=createFreePlay(),p=m.players[0];p.weapon=19;p.cooldown=0;
  const tick=(fireId,fire=true,reload=false)=>stepMatch(m,{you:{weapon:19,fireId,fire,reload,pitch:.4}});
  for(let i=0;i<100;i++)tick(1);assert.equal(p.shots,1);assert.equal(p.ammo[19],1);
  tick(2);for(let i=0;i<100;i++)tick(2,true,true);assert.equal(p.shots,2);assert.equal(p.ammo[19],0);assert.equal(p.reload,0);
  tick(3);assert.equal(p.shots,2);assert(!m.events.some(e=>e.type==='reload'));resetFreePlay(m);assert.equal(p.ammo[19],2);assert.equal(m.projectiles.length,0);
});
test('grenades bounce from floors, thin boxes and ramp slopes without exploding on contact',()=>{
  const {m}=fixture(),q=projectile(m,19,{life:2});stepProjectiles(m,empty,TICK);assert(q.v[1]>0);assert(q.p[1]>0);assert.equal(m.events.length,0);
  const wall={...empty,boxes:[{x:0,z:0,y:0,w:.02,h:4,d:4}]};q.p=[-1,1,0];q.v=[120,0,0];stepProjectiles(m,wall,TICK);assert(q.p[0]<-.01);assert(q.v[0]<0);
  const slope={...empty,ramps:[{x:0,z:0,y:0,w:6,h:3,d:6,dir:1}]};q.p=[0,1.6,0];q.v=[0,-20,0];stepProjectiles(m,slope,TICK);assert(q.v[1]>0);assert(q.v[2]<0);assert(q.p[1]>1.5);
});
test('fused grenade splash damages nearby players, respects walls and timed parry, and never bypasses radius',()=>{
  for(const mode of ['open','wall','parry','far']){const {m,b}=fixture();if(mode==='parry'){b.weapon=10;b.parry=.5;}if(mode==='far')b.p=[0,0,7];
    const map=mode==='wall'?{...empty,boxes:[{x:0,z:.5,y:0,w:6,h:5,d:.1}]}:empty;
    projectile(m,19);for(let i=0;i<4;i++)stepProjectiles(m,map,TICK);
    assert.equal(m.projectiles.length,0);assert.equal(m.events.filter(e=>e.type==='explosion').length,1);assert.equal(b.hp<100,mode==='open');
  }
  const {m,a}=fixture();a.p=[0,0,1];projectile(m,19);for(let i=0;i<4;i++)stepProjectiles(m,empty,TICK);assert(a.hp<100);
});
test('Molotov shatters into a shared fire patch that ticks, stops at cover, and expires',()=>{
  const {m,b}=fixture();projectile(m,20,{life:4});stepProjectiles(m,empty,TICK);assert.equal(m.projectiles.length,0);assert.equal(m.hazards.length,1);assert.equal(snapshot(m).hazards.length,1);
  stepHazards(m,empty,TICK);assert.equal(b.hp,93);for(let i=0;i<10;i++)stepHazards(m,empty,TICK);assert.equal(b.hp,93);for(let i=0;i<5;i++)stepHazards(m,empty,TICK);assert.equal(b.hp,86);
  b.p=[0,3,1];stepHazards(m,empty,.25);assert.equal(b.hp,86);b.p=[0,0,5];stepHazards(m,empty,.25);assert.equal(b.hp,86);
  b.p=[0,0,1];b.weapon=10;b.parry=.5;stepHazards(m,empty,.25);assert.equal(b.hp,86);b.parry=0;
  const wall={...empty,boxes:[{x:0,z:.5,y:0,w:6,h:5,d:.1}]};stepHazards(m,wall,.25);assert.equal(b.hp,86);
  for(let i=0;i<360;i++)stepHazards(m,wall,TICK);assert.equal(m.hazards.length,0);assert.equal(b.hp,86);
});
test('round and free-play resets remove active fire and restore throwable charges',()=>{
  const m=createFreePlay(),p=m.players[0];projectile(m,20);stepProjectiles(m,empty,TICK);p.ammo[19]=p.ammo[20]=0;
  resetFreePlay(m);assert.equal(m.hazards.length,0);assert.equal(p.ammo[20],1);projectile(m,20);stepProjectiles(m,empty,TICK);startRound(m);assert.equal(m.hazards.length,0);assert.equal(p.ammo[19],2);
});
test('throw feedback has a returning arm pose without a muzzle flash, tracer, casing or gun recoil',()=>{
  for(const id of [19,20]){const e=attackEffects(id);assert.equal(e.sound,'throw');for(const k of ['recoil','muzzle'])assert.equal(e[k],0);assert(!e.tracer&&!e.casings);
    assert(weaponMotion(id,.2).throw>.9);assert.equal(weaponMotion(id,1).throw,0);assert.equal(weaponMotion(id,NaN).throw,0);assert.equal(weaponMotion(id,.1).kick,0);assert(weaponMotion(id,.2,{reduced:true}).throw<.4);
  }
});
test('HTTP and WebSocket share throws, fire patches and limited charges; forged utility stats and invalid kits are rejected',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const request=async data=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,...await r.json()};};
  const guest=await request({action:'profile'}),auth={profileToken:guest.profileToken};assert.equal((await request({...auth,action:'loadout',loadout:[0,1,4,19]})).status,400);
  await request({...auth,action:'purchase',weapon:20});assert.equal((await request({...auth,action:'loadout',loadout:[0,21,4,20]})).status,200);
  const a=await request({...auth,action:'create'}),b=await request({action:'join',room:a.room}),ws=new WebSocket(base.replace('http:','ws:')+'/socket');t.after(()=>ws.terminate());let observed;
  ws.on('message',raw=>{const s=JSON.parse(raw);if(s.hazards?.length)observed=s;});await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({token:b.token}));
  const m=app.rooms.get(a.room).match;m.phase='live';m.clock=90;const p=m.players.find(p=>p.id===a.you);p.weapon=20;p.cooldown=0;
  await request({action:'input',token:a.token,input:{seq:1,weapon:20,fireId:1,pitch:-1.2,damage:999,ammo:999,radius:100,life:999}});await delay(450);
  const polled=await request({action:'poll',token:b.token});assert(observed);assert.equal(polled.hazards.length,1);assert.equal(polled.hazards[0].radius,3.3);assert(polled.hazards[0].life<=5.5);assert.equal(polled.hazards[0].id,observed.hazards[0].id);assert.equal(polled.players.find(p=>p.id===a.you).ammo[20],0);
  await request({action:'input',token:a.token,input:{seq:2,weapon:20,fireId:2,reload:true,pitch:-1.2}});await delay(500);assert.equal(m.players.find(p=>p.id===a.you).shots,1);
});
