import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {WEAPONS,TICK,createMatch,createPlayer,cleanInput,stepMatch,stepProjectiles} from '../src/shared.js';
import {attackEffects} from '../src/weapon-presentation.js';
import {ProfileStore} from '../profile-store.js';
import {createArenaServer} from '../server.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const empty={extent:100,boxes:[],ramps:[]};
function duel(id){const m=createMatch();m.phase='live';m.clock=90;const a=createPlayer('a','A'),b=createPlayer('b','B',1);a.p=[-12,0,12];b.p=[12,0,-12];a.loadout=[id,0,1,2,3];a.weapon=id;m.players=[a,b];return {m,a,b};}
function tick(m,input={},other={}){stepMatch(m,{a:cleanInput({weapon:m.players[0].weapon,...input}),b:cleanInput({weapon:m.players[1].weapon,...other})});}
test('crossbow launches a full-power bolt immediately, recocks and respects cover and parry',()=>{
  const {m,a}=duel(15);tick(m,{fireId:1});const bolt=m.projectiles[0];assert.equal(bolt.kind,'bolt');assert.equal(bolt.damage,68);assert.equal(a.ammo[15],0);assert.equal(a.reload,1.35);assert(Math.abs(bolt.v[2])===72);
  for(let i=0;i<85;i++)tick(m,{fireId:1});assert.equal(a.ammo[15],1);assert.equal(a.shots,1);
  for(const mode of ['hit','cover','parry']){const {m,b}=duel(15);b.p=[-12,0,4];b.weapon=10;b.loadout=[10,0,1,2,3];b.parry=mode==='parry'?.75:0;tick(m,{fireId:1,pitch:-.03},{weapon:10});
    const map=mode==='cover'?{...empty,boxes:[{x:-12,y:0,z:8,w:3,h:4,d:.2}]}:empty;
    for(let i=0;i<20;i++)stepProjectiles(m,map,TICK);
    assert.equal(b.hp,mode==='hit'?32:100);assert.equal(m.projectiles.length,0);if(mode==='parry')assert(m.events.some(e=>e.type==='parry'&&e.weapon===15));
  }
});
test('marksman and silenced pistol require separate clicks, consume ammo and reload correctly',()=>{
  for(const id of [16,17]){const {m,a}=duel(id);for(let i=0;i<120;i++)tick(m,{fire:true,fireId:1});assert.equal(a.shots,1);assert.equal(a.ammo[id],WEAPONS[id].ammo-1);
    tick(m,{fireId:1});tick(m,{fireId:2});assert.equal(a.shots,2);tick(m,{reload:true,fireId:2});assert(a.reload>0);
    for(let i=0;i<130;i++)tick(m,{fireId:2});assert.equal(a.ammo[id],WEAPONS[id].ammo);assert.equal(a.shots,2);
  }
  assert(attackEffects(17).muzzle<attackEffects(0).muzzle);assert.equal(attackEffects(15).muzzle,0);
});
test('hammer swings once, breaks katana guard, knocks back, and never creates gun effects',()=>{
  const {m,a,b}=duel(18);b.p=[-12,0,9.4];b.weapon=10;b.loadout=[10,0,1,2,3];tick(m,{fire:true,fireId:1},{weapon:10,altId:1});
  for(let i=0;i<7;i++)tick(m,{fire:true,fireId:1},{weapon:10,altId:1});
  assert.equal(b.hp,28);assert(b.v[2]<-7);assert(b.v[1]>2);assert(!b.ground);assert.equal(a.ammo[18],-1);assert.equal(m.projectiles.length,0);assert(!m.events.some(e=>e.type==='parry'));
  const fx=attackEffects(18);assert.equal(fx.sound,'swing');assert.equal(fx.muzzle,0);assert(!fx.tracer&&!fx.casings);
  for(let i=0;i<80;i++)tick(m,{fire:true,fireId:1},{weapon:10,altId:1});assert.equal(a.shots,1);
});
test('new unlocks preserve 100 starting coins, charge exactly once and survive store serialization',()=>{
  const store=new ProfileStore(),{profileToken}=store.create();assert.equal(store.get(profileToken).coins,100);
  for(const id of [15,16,17,18])assert.throws(()=>store.purchase(profileToken,id),/more coins/);
  store.reward(profileToken,1000);for(const id of [15,16,17,18]){store.purchase(profileToken,id);store.purchase(profileToken,id);}
  store.equip(profileToken,[15,16,17,18,0]);assert.equal(store.get(profileToken).coins,175);
  const restored=new ProfileStore();restored.restore(store.serialize());assert.deepEqual(restored.get(profileToken),store.get(profileToken));
});
test('HTTP purchases equip all new weapons and a WebSocket observer receives their real attacks',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async data=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200);return r.json();};
  const wallet=await post({action:'profile'}),auth={profileToken:wallet.profileToken};app.profiles.reward(wallet.profileToken,1000);
  for(const weapon of [15,16,17,18])await post({...auth,action:'purchase',weapon});await post({...auth,action:'loadout',loadout:[15,16,17,18,0]});
  const a=await post({...auth,action:'create'}),b=await post({action:'join',room:a.room});
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket'),seen=new Set();t.after(()=>ws.terminate());
  ws.on('message',raw=>{const view=JSON.parse(raw);for(const e of view.events||[])if(e.type==='shot'&&e.player===a.you)seen.add(e.weapon);});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});ws.send(JSON.stringify({token:b.token}));
  await post({action:'ready',token:a.token});await post({action:'ready',token:b.token});await delay(3100);
  let seq=0,fireId=0;for(const weapon of [15,16,17,18]){
    await post({action:'input',token:a.token,input:{seq:++seq,weapon,yaw:1.5,fireId}});await delay(1000);
    await post({action:'input',token:a.token,input:{seq:++seq,weapon,yaw:1.5,fireId:++fireId}});await delay(100);
  }
  assert.deepEqual([...seen].sort(),[15,16,17,18]);assert.deepEqual((await post({action:'poll',token:b.token})).players.find(p=>p.id===a.you).loadout,[15,16,17,18,0]);
});
