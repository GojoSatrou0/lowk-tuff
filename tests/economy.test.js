import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {freshProfile,buyWeapon,equipLoadout,rewardFor} from '../src/economy.js';
import {ProfileStore} from '../profile-store.js';
import {createArenaServer} from '../server.js';
import {endRound} from '../src/shared.js';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('wallet charges once, rejects insufficient funds, and requires one owned weapon per category',()=>{
  const p=freshProfile();assert.equal(p.coins,100);assert.deepEqual(p.loadout,[0,21,4,19]);
  assert(buyWeapon(p,13));assert.equal(p.coins,0);assert(!buyWeapon(p,13));assert.equal(p.coins,0);
  const before=structuredClone(p);assert.throws(()=>buyWeapon(p,9),/more coins/);assert.deepEqual(p,before);
  for(const invalid of [-1,99,6.1,'6',null])assert.throws(()=>buyWeapon(p,invalid));
  for(const invalid of [[0,1,2,3,9],[0,0,2,3,4],[0,1,2,3],null])assert.throws(()=>equipLoadout(p,invalid));
  equipLoadout(p,[0,13,4,19]);assert.deepEqual(p.loadout,[0,13,4,19]);
});
test('round and match rewards have no duplicate final-round payment, draws earn nothing',()=>{
  assert.equal(rewardFor({type:'roundEnd',winner:'a'},'a'),35);assert.equal(rewardFor({type:'roundEnd',winner:'a'},'b'),10);
  assert.equal(rewardFor({type:'matchEnd',winner:'a'},'a'),155);assert.equal(rewardFor({type:'matchEnd',winner:'a'},'b'),50);
  assert.equal(rewardFor({type:'roundEnd',winner:null},'a'),0);assert.equal(rewardFor({type:'coins',winner:'a',amount:999},'a'),0);
});
test('profiles persist purchases, rewards, and loadouts across server-store restart without storing raw tokens',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-wallet-test-')),a=new ProfileStore(dir),{profileToken}=a.create();
  a.purchase(profileToken,13);a.equip(profileToken,[0,13,4,19]);a.reward(profileToken,35);
  const b=new ProfileStore(dir),p=b.get(profileToken);assert.equal(p.coins,35);assert.equal(p.earned,35);assert(p.owned.includes(13));assert.equal(p.loadout[1],13);
  assert(!readFileSync(path.join(dir,'profiles.json'),'utf8').includes(profileToken));assert.equal(b.get('forged'),null);
});
test('real API protects coins and ownership, locks changes in rooms, awards exactly once, and pauses solo',async t=>{
  const app=createArenaServer({port:0,host:'127.0.0.1'}),address=await app.listen();t.after(()=>app.close());const base=`http://127.0.0.1:${address.port}`;
  const post=async data=>{const r=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:r.status,...await r.json()};};
  const a=await post({action:'profile',coins:999999});assert.equal(a.profile.coins,100);const auth={profileToken:a.profileToken};
  assert.equal((await post({action:'profile',profileToken:'f'.repeat(64)})).status,410);
  assert.equal((await post({...auth,action:'purchase',weapon:9,coins:999999,price:0})).status,400);
  assert.equal((await post({...auth,action:'purchase',weapon:13})).profile.coins,0);
  assert.equal((await post({...auth,action:'loadout',loadout:[0,9,2,3,4]})).status,400);
  await post({...auth,action:'loadout',loadout:[0,13,4,19]});
  const s=await post({...auth,action:'practice'});assert.equal(s.practice,true);assert.equal(s.players.length,2);assert.equal(s.players[0].loadout[1],13);
  assert.equal((await post({...auth,action:'practice'})).status,409);assert.equal((await post({...auth,action:'purchase',weapon:7})).status,409);
  assert.equal((await post({action:'reward',token:s.token,amount:999})).status,400);
  assert.equal((await fetch(base+'/data/profiles.json')).status,404);assert.equal((await fetch(base+'/profile-store.js')).status,404);
  const r=app.rooms.get(s.room);await delay(100);assert.equal(r.match.clock,3);
  await post({action:'input',token:s.token,input:{seq:1,paused:false}});await delay(110);assert(r.match.clock<3);
  await post({action:'input',token:s.token,input:{seq:2,paused:true}});await delay(60);const frozen=r.match.clock;await delay(100);assert.equal(r.match.clock,frozen);
  // Inject an authoritative round conclusion, never a client reward claim.
  r.match.phase='live';r.match.clock=90;endRound(r.match,r.match.players[0]);
  await post({action:'input',token:s.token,input:{seq:3,paused:false}});await delay(80);
  assert.equal(app.profiles.get(a.profileToken).coins,35);await delay(110);assert.equal(app.profiles.get(a.profileToken).coins,35);
  assert.equal(r.match.events.filter(e=>e.type==='coins').length,1);
  r.match.phase='live';r.match.players[0].score=4;endRound(r.match,r.match.players[0]);await delay(80);
  assert.equal(app.profiles.get(a.profileToken).coins,190);assert.equal(app.profiles.get(a.profileToken).earned,190);
  await post({action:'leave',token:s.token});assert(!app.rooms.has(s.room));
  assert.equal((await post({...auth,action:'purchase',weapon:6})).profile.coins,40);
  assert.equal((await post({...auth,action:'profile'})).profile.coins,40);
});
test('starter-grant migration only changes untouched 300-coin wallets and is idempotent',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'velocity-migration-test-')),store=new ProfileStore(dir);
  const fresh=store.create().profileToken,played=store.create().profileToken,custom=store.create().profileToken;
  store.get(fresh).owned=[0,1,2,3,4];store.get(fresh).loadout=[0,1,2,3,4];store.get(fresh).coins=300;store.get(played).coins=300;store.reward(played,35);store.get(custom).coins=300;store.equip(custom,[1,21,4,19]);store.save();
  const migrated=new ProfileStore(dir);assert.equal(migrated.get(fresh).coins,100);assert.equal(migrated.get(played).coins,335);assert.equal(migrated.get(custom).coins,300);
  const again=new ProfileStore(dir);assert.deepEqual(again.get(fresh),migrated.get(fresh));
});
